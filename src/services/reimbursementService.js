// services/reimbursementService.js
const db = require("../config");
const queries = require("../constants/reimbursementQueries");
const path = require("path");
const fs = require("fs").promises;

/**
 * Helper: turn any JS Date (from MySQL DATETIME) into local YYYY-MM-DD
 */
const toLocalDateString = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Normalize strings for status fields
 */
const normalizeRow = (r) => ({
  ...r,
  status: r.status ? String(r.status).toLowerCase().trim() : "",
  payment_status: r.payment_status
    ? String(r.payment_status).toLowerCase().trim()
    : "",
});

/**
 * Map attachments array to reimbursements array (mutates reimbursements to add .attachments)
 */
const mapAttachmentsToReimbursements = (
  reimbursements,
  attachments,
  employeeIdRef = null
) => {
  const attachmentMap = {};
  attachments.forEach((att) => {
    const key = att.reimbursement_id;
    if (!attachmentMap[key]) attachmentMap[key] = [];
    attachmentMap[key].push({
      filename: att.file_name,
      url: `/reimbursement/${att.year}/${att.month}/${att.employee_id}/${att.file_name}`,
      file_path: att.file_path || null,
      id: att.id || null,
    });
  });

  reimbursements.forEach((r) => {
    r.attachments = attachmentMap[r.id] || [];
  });

  return reimbursements;
};

/**
 * Save attachments bulk (expects files array with { file_name, file_path }).
 * Uses your SAVE_ATTACHMENTS query which expects bulk insert values.
 */
const saveAttachmentsBulk = async (reimbursementId, files = []) => {
  if (!files || !files.length) return;
  const attachmentValues = files.map((f) => [
    reimbursementId,
    f.file_name,
    f.file_path,
  ]);
  await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
};

/**
 * Process uploaded files array (from multer) for a reimbursement id.
 * This implementation will simply store file path and name in attachments table.
 * If you want PDF->image conversion, replace this block with your convertPdfToImages flow.
 */
exports.processUploadedFiles = async (files, reimbursementId) => {
  if (!files || !files.length) return;
  try {
    const toSave = files.map((file) => {
      const filename = file.originalname || path.basename(file.path);
      const filePath = file.path;
      return { file_name: filename, file_path: filePath };
    });
    await saveAttachmentsBulk(reimbursementId, toSave);
  } catch (err) {
    console.error("Error in processUploadedFiles:", err);
    throw err;
  }
};

/**
 * Get reimbursements for a single employee (optionally by date range).
 * Returns array of reimbursements (each with attachments[])
 */
exports.getReimbursementsByEmployee = async (
  employeeId,
  fromDate = null,
  toDate = null
) => {
  try {
    const params = [employeeId, fromDate || null, toDate || null];
    const [rawRows] = await db.query(
      queries.GET_REIMBURSEMENTS_BY_EMPLOYEE,
      params
    );

    if (!rawRows || rawRows.length === 0) return [];

    const reimbursements = rawRows.map((r) => {
      const n = normalizeRow(r);
      return {
        ...n,
        from_date: toLocalDateString(r.from_date),
        to_date: toLocalDateString(r.to_date),
        date: toLocalDateString(r.date),
      };
    });

    const reimbursementIds = reimbursements.map((r) => r.id);
    const safeIds = reimbursementIds.length ? reimbursementIds : [-1];
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [safeIds]
    );

    return mapAttachmentsToReimbursements(
      reimbursements,
      attachments,
      employeeId
    );
  } catch (err) {
    console.error("Error in getReimbursementsByEmployee:", err);
    throw err;
  }
};

/**
 * Get all reimbursements grouped by employee.
 * Filters optionally by created_at range using submittedFrom/submittedTo.
 * Returns: [{ employee_id, claims: [...] }, ...]
 */
exports.getAllReimbursements = async (
  submittedFrom = null,
  submittedFromForBetween = null,
  submittedTo = null
) => {
  try {
    const params = [
      submittedFrom || null,
      submittedFromForBetween || null,
      submittedTo || null,
    ];
    const [rawRows] = await db.query(queries.GET_ALL_REIMBURSEMENTS, params);

    if (!rawRows || rawRows.length === 0) return [];

    const reimbursements = rawRows.map((r) => {
      const n = normalizeRow(r);
      return {
        ...n,
        from_date: toLocalDateString(r.from_date),
        to_date: toLocalDateString(r.to_date),
        date: toLocalDateString(r.date),
      };
    });

    const reimbursementIds = reimbursements.map((r) => r.id);
    const safeIds = reimbursementIds.length ? reimbursementIds : [-1];
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [safeIds]
    );

    // attach attachments
    mapAttachmentsToReimbursements(reimbursements, attachments);

    // group by employee_id
    const grouped = reimbursements.reduce((acc, r) => {
      const eid = r.employee_id;
      if (!acc[eid]) acc[eid] = [];
      acc[eid].push(r);
      return acc;
    }, {});

    return Object.entries(grouped).map(([employee_id, claims]) => ({
      employee_id,
      claims,
    }));
  } catch (err) {
    console.error("Error in getAllReimbursements:", err);
    throw err;
  }
};

/**
 * Create a reimbursement (with optional attachments array)
 * reimbursementData should contain the expected props used by your CREATE_REIMBURSEMENT query.
 */
exports.createReimbursement = async (reimbursementData) => {
  try {
    // Validate minimum required fields
    if (!reimbursementData || !reimbursementData.employeeId) {
      const e = new Error("Missing reimbursement data or employeeId");
      e.statusCode = 400;
      throw e;
    }

    // Prepare department_id safely
    let department_id = null;
    if (
      reimbursementData.department_id !== undefined &&
      reimbursementData.department_id !== null
    ) {
      const pid = parseInt(reimbursementData.department_id, 10);
      department_id = isNaN(pid) ? null : pid;
    }

    // Build the insertion array in the same order as your CREATE_REIMBURSEMENT query expects
    const reimbursementArray = [
      reimbursementData.employeeId,
      department_id,
      reimbursementData.claim_type || null,
      reimbursementData.transport_type || null,
      reimbursementData.from_date || null,
      reimbursementData.to_date || null,
      reimbursementData.date || null,
      reimbursementData.travel_from || null,
      reimbursementData.travel_to || null,
      reimbursementData.meals_objective || null,
      reimbursementData.purpose || null,
      reimbursementData.purchasing_item || null,
      reimbursementData.accommodation_fees || 0,
      reimbursementData.no_of_days !== undefined
        ? reimbursementData.no_of_days
        : 0,
      reimbursementData.transport_amount &&
      reimbursementData.transport_amount !== "undefined"
        ? reimbursementData.transport_amount
        : 0,
      reimbursementData.da && reimbursementData.da !== "undefined"
        ? reimbursementData.da
        : 0,
      reimbursementData.total_amount !== undefined
        ? reimbursementData.total_amount
        : 0,
      reimbursementData.meal_type || null,
      reimbursementData.stationary || null,
      reimbursementData.service_provider || null,
      reimbursementData.project || null,
    ];

    // 1) Check overlapping / existing claims (your CHECK_EXISTING_CLAIM query)
    const [existingClaims] = await db.query(queries.CHECK_EXISTING_CLAIM, [
      reimbursementData.employeeId,
      reimbursementData.claim_type,
      reimbursementData.date || null,
      reimbursementData.from_date || null,
      reimbursementData.to_date || null,
    ]);

    const blocking = existingClaims.filter((c) => {
      const st = c.status ? String(c.status).toLowerCase().trim() : "";
      return st && st !== "rejected";
    });

    if (blocking.length > 0) {
      const err = new Error(
        "A reimbursement with the same claim type and date already exists."
      );
      err.statusCode = 400;
      throw err;
    }

    // 2) Insert the reimbursement
    const [result] = await db.query(
      queries.CREATE_REIMBURSEMENT,
      reimbursementArray
    );
    const reimbursementId = result.insertId;

    // 3) Save attachments if provided (attachments: [{ file_name, file_path }])
    if (reimbursementData.attachments && reimbursementData.attachments.length) {
      await saveAttachmentsBulk(reimbursementId, reimbursementData.attachments);
    }

    return { id: reimbursementId, ...reimbursementData };
  } catch (err) {
    console.error("Error in createReimbursement:", err);
    throw err;
  }
};

/**
 * Update the main reimbursement record and optionally replace attachments
 */
exports.updateReimbursement = async (reimbursementId, updateData) => {
  try {
    if (!reimbursementId) {
      const e = new Error("reimbursementId is required");
      e.statusCode = 400;
      throw e;
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      const e = new Error("updateData is missing or empty.");
      e.statusCode = 400;
      throw e;
    }

    // Extract fields (keep same order as UPDATE_REIMBURSEMENT)
    const {
      department_id,
      claim_type,
      transport_type,
      fromDate,
      toDate,
      date,
      travel_from,
      travel_to,
      meals_objective,
      purpose,
      purchasing_item,
      accommodation_fees,
      no_of_days,
      transport_amount,
      da,
      total_amount,
      meal_type,
      stationary,
      service_provider,
      project,
      attachments,
    } = updateData;

    let processedDepartmentId = null;
    if (department_id !== undefined && department_id !== null) {
      const pid = parseInt(department_id, 10);
      processedDepartmentId = isNaN(pid) ? null : pid;
    }

    const params = [
      processedDepartmentId,
      claim_type || null,
      transport_type || null,
      fromDate || null,
      toDate || null,
      date || null,
      travel_from || null,
      travel_to || null,
      meals_objective || null,
      purpose || null,
      purchasing_item || null,
      accommodation_fees || 0,
      no_of_days !== undefined ? no_of_days : 0,
      transport_amount !== undefined ? transport_amount : 0,
      da !== undefined ? da : 0,
      total_amount !== undefined ? total_amount : 0,
      meal_type || null,
      stationary || null,
      service_provider || null,
      project || null,
      reimbursementId,
    ];

    const [result] = await db.query(queries.UPDATE_REIMBURSEMENT, params);

    if (!result || result.affectedRows === 0) {
      const e = new Error("No reimbursement found or unauthorized update.");
      e.statusCode = 404;
      throw e;
    }

    // If attachments provided, remove old ones and insert new ones
    if (attachments && attachments.length > 0) {
      await db.query(queries.DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID, [
        reimbursementId,
      ]);
      await saveAttachmentsBulk(reimbursementId, attachments);
    }

    return { success: true, message: "Reimbursement updated successfully." };
  } catch (err) {
    console.error("Error in updateReimbursement:", err);
    throw err;
  }
};
exports.getTeamReimbursements = async (
  departmentId,
  submittedFrom,
  submittedTo,
  teamLeadId
) => {
  try {
    // Normalize inputs
    const dept =
      departmentId !== undefined && departmentId !== null ? departmentId : null;
    const excludedId =
      teamLeadId !== undefined && teamLeadId !== null ? teamLeadId : null;
    const from =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    // placeholders: dept, excludedId, excludedId, from, from, from
    const params = [dept, excludedId, excludedId, from, from, from];

    console.log("[Service:getTeamReimbursements] SQL params:", params);

    const [reimbursementsRaw] = await db.query(
      queries.GET_TEAM_REIMBURSEMENTS,
      params
    );

    if (!reimbursementsRaw || reimbursementsRaw.length === 0) return [];

    // Normalize rows and format dates
    const normalized = reimbursementsRaw.map((r) => {
      const n = normalizeRow(r);
      return {
        ...n,
        from_date: toLocalDateString(r.from_date),
        to_date: toLocalDateString(r.to_date),
        date: toLocalDateString(r.date),
      };
    });

    // Build map reimbursementId -> employee_id (we got employee_id from the reimbursement rows)
    const reimbursementEmployeeMap = {};
    normalized.forEach((r) => {
      reimbursementEmployeeMap[r.id] = r.employee_id;
    });

    // Collect reimbursement ids
    const reimbursementIds = normalized.map((r) => r.id);
    const safeIds = reimbursementIds.length ? reimbursementIds : [-1];

    // Fetch attachments (queries now return id, reimbursement_id, file_name, file_path)
    const [attachmentsRows] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [safeIds]
    );
    const attachments = Array.isArray(attachmentsRows) ? attachmentsRows : [];

    // Helper: try to extract year/month/employeeId/filename from file_path if file_path contains the canonical structure
    const extractMetaFromPath = (filePath) => {
      try {
        if (!filePath)
          return { year: null, month: null, employeeId: null, filename: null };
        const normalizedPath = filePath.replace(/\\/g, "/");
        const m = normalizedPath.match(
          /\/reimbursement\/(\d{4})\/(\d{2})\/([^\/]+)\/([^\/]+)$/
        );
        if (m) {
          return { year: m[1], month: m[2], employeeId: m[3], filename: m[4] };
        }
        // fallback: take last segments
        const parts = normalizedPath.split("/");
        const filename = parts[parts.length - 1] || null;
        const employeeId = parts[parts.length - 2] || null;
        const month = parts[parts.length - 3] || null;
        const year = parts[parts.length - 4] || null;
        const okYear = year && /^\d{4}$/.test(year) ? year : null;
        const okMonth = month && /^\d{2}$/.test(month) ? month : null;
        return {
          year: okYear,
          month: okMonth,
          employeeId: employeeId || null,
          filename,
        };
      } catch (e) {
        return { year: null, month: null, employeeId: null, filename: null };
      }
    };

    // Build attachment map using reimbursement's employee_id as primary source
    const attachmentMap = {};
    for (const att of attachments) {
      const rid = att.reimbursement_id;
      const empIdFromReimbursement = reimbursementEmployeeMap[rid] || null;

      const meta = extractMetaFromPath(att.file_path);
      const yearForUrl = meta.year || "unknown";
      const monthForUrl = meta.month || "unknown";
      const empForUrl = empIdFromReimbursement || meta.employeeId || "unknown";
      const filename =
        att.file_name || meta.filename || path.basename(att.file_path || "");

      const url = `/reimbursement/${yearForUrl}/${monthForUrl}/${empForUrl}/${filename}`;

      if (!attachmentMap[rid]) attachmentMap[rid] = [];
      attachmentMap[rid].push({
        id: att.id,
        filename,
        file_path: att.file_path,
        url,
      });
    }

    // Attach to reimbursements
    normalized.forEach((r) => {
      r.attachments = attachmentMap[r.id] || [];
    });

    return normalized;
  } catch (err) {
    console.error("Error in getTeamReimbursements:", err);
    throw err;
  }
};
/**
 * Update reimbursement status (approve / reject)
 */
exports.updateReimbursementStatus = async (
  id,
  status,
  approver_comments,
  approver_id,
  approver_name,
  approver_designation,
  project
) => {
  try {
    if (!id) throw new Error("id is required");
    const allowed = ["approved", "rejected"];
    if (!allowed.includes(String(status).toLowerCase())) {
      const e = new Error(
        "Invalid status. Allowed values: 'approved', 'rejected'"
      );
      e.statusCode = 400;
      throw e;
    }

    const params = [
      status,
      approver_comments || null,
      approver_id || null,
      approver_name || null,
      approver_designation || null,
      project || null,
      new Date(),
      id,
    ];

    const [result] = await db.query(
      queries.UPDATE_REIMBURSEMENT_STATUS,
      params
    );

    if (!result || result.affectedRows === 0) {
      const e = new Error("No reimbursement updated");
      e.statusCode = 404;
      throw e;
    }

    return {
      id,
      status,
      approver_comments,
      approver_id,
      approver_name,
      approver_designation,
      project,
      approved_date: new Date(),
    };
  } catch (err) {
    console.error("Error in updateReimbursementStatus:", err);
    throw err;
  }
};

/**
 * Update payment status (paid / pending / rejected)
 */
exports.updatePaymentStatus = async (id, payment_status, paid_date = null) => {
  try {
    if (!id) throw new Error("id is required");
    const params = [payment_status || null, paid_date || null, id];
    const [result] = await db.query(queries.UPDATE_PAYMENT_STATUS, params);

    if (!result || result.affectedRows === 0) {
      const e = new Error("No reimbursement updated for payment status");
      e.statusCode = 404;
      throw e;
    }

    return { id, payment_status, paid_date };
  } catch (err) {
    console.error("Error in updatePaymentStatus:", err);
    throw err;
  }
};

/**
 * Get attachments for a reimbursement id
 */
exports.getAttachments = async (reimbursementId) => {
  try {
    if (!reimbursementId) return [];
    const [rows] = await db.query(queries.GET_ATTACHMENTS, [reimbursementId]);
    return rows || [];
  } catch (err) {
    console.error("Error in getAttachments:", err);
    throw err;
  }
};

exports.getAttachmentsByReimbursementIds = async (reimbursementIds = []) => {
  try {
    if (!reimbursementIds || !reimbursementIds.length) return [];
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds]
    );
    return attachments || [];
  } catch (err) {
    console.error("Error in getAttachmentsByReimbursementIds:", err);
    throw err;
  }
};

/**
 * Delete reimbursement (and optionally attachments depending on your queries)
 */
exports.deleteReimbursement = async (id) => {
  try {
    if (!id) throw new Error("id is required");
    await db.query(queries.DELETE_REIMBURSEMENT, [id]);
    // optionally delete attachments entries too depending on your DB constraints
    return { id };
  } catch (err) {
    console.error("Error in deleteReimbursement:", err);
    throw err;
  }
};

/**
 * Approver details and projects helpers
 */
exports.getApproverDetails = async (approver_id) => {
  try {
    const [rows] = await db.query(queries.GET_APPROVER_DETAILS, [approver_id]);
    return rows && rows.length ? rows[0] : null;
  } catch (err) {
    console.error("Error in getApproverDetails:", err);
    throw err;
  }
};

exports.getAllProjects = async () => {
  try {
    const [projects] = await db.query(queries.GET_ALL_PROJECTS);
    if (!projects || projects.length === 0) return [];
    return projects.map((p) => p.project_name);
  } catch (err) {
    console.error("Error in getAllProjects:", err);
    throw err;
  }
};

module.exports = exports;
