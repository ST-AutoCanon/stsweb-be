const db = require("../config");
const queries = require("../constants/reimbursementQueriesOld");
const path = require("path");
const fs = require("fs");

/**
 * Helper to convert JS Date / MySQL DATETIME into YYYY-MM-DD (local)
 */
const toLocalDateString = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Get reimbursements for a single employee (old table)
 * - Accepts optional fromDate/toDate for filtering (strings in YYYY-MM-DD)
 * - Returns array of reimbursements with attachments attached
 */
exports.getReimbursementsByEmployee = async (
  employeeId,
  fromDate = null,
  toDate = null
) => {
  try {
    const [rawRows] = await db.query(queries.GET_REIMBURSEMENTS_BY_EMPLOYEE, [
      employeeId,
      fromDate,
      fromDate, // used for BETWEEN queries that some SQL setups use
      toDate,
    ]);

    const reimbursements = (rawRows || []).map((r) => ({
      ...r,
      from_date: toLocalDateString(r.from_date),
      to_date: toLocalDateString(r.to_date),
      date: toLocalDateString(r.date),
    }));

    if (!reimbursements.length) return [];

    const reimbursementIds = reimbursements.map((r) => r.id);
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds.length ? reimbursementIds : [-1]]
    );

    // Map attachments to reimbursements
    const attachmentMap = {};
    (attachments || []).forEach((att) => {
      if (!attachmentMap[att.reimbursement_id])
        attachmentMap[att.reimbursement_id] = [];
      attachmentMap[att.reimbursement_id].push({
        file_name: att.file_name,
        file_path: att.file_path,
        year: att.year,
        month: att.month,
        employee_id: att.employee_id,
      });
    });

    reimbursements.forEach((r) => {
      r.attachments = attachmentMap[r.id] || [];
    });

    return reimbursements;
  } catch (err) {
    console.error("Service.getReimbursementsByEmployee error:", err);
    throw err;
  }
};

/**
 * Get attachments by reimbursement IDs (flat array)
 */
exports.getAttachmentsByReimbursementIds = async (reimbursementIds = []) => {
  try {
    if (!Array.isArray(reimbursementIds) || reimbursementIds.length === 0)
      return [];
    const [rows] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds]
    );
    return rows || [];
  } catch (err) {
    console.error("Service.getAttachmentsByReimbursementIds error:", err);
    throw err;
  }
};

/**
 * Get all reimbursements grouped by employee (for admin view)
 * - accepts submittedFrom/submittedTo to filter by created_at
 * - returns [{ employee_id, claims: [ ... ] }, ...]
 */
exports.getAllReimbursements = async (
  submittedFrom = null,
  submittedFromForBetween = null,
  submittedTo = null
) => {
  try {
    const [rawRows] = await db.query(queries.GET_ALL_REIMBURSEMENTS, [
      submittedFrom,
      submittedFromForBetween,
      submittedTo,
    ]);

    const reimbursements = (rawRows || []).map((r) => ({
      ...r,
      from_date: toLocalDateString(r.from_date),
      to_date: toLocalDateString(r.to_date),
      date: toLocalDateString(r.date),
    }));

    if (!reimbursements.length) return [];

    const reimbursementIds = reimbursements.map((r) => r.id);
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds.length ? reimbursementIds : [-1]]
    );

    const attachmentMap = {};
    (attachments || []).forEach((att) => {
      const key = att.reimbursement_id;
      if (!attachmentMap[key]) attachmentMap[key] = [];
      attachmentMap[key].push({
        file_name: att.file_name,
        year: att.year,
        month: att.month,
        employee_id: att.employee_id,
      });
    });

    reimbursements.forEach((r) => {
      r.attachments = attachmentMap[r.id] || [];
    });

    // group by employee_id and return array
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
    console.error("Service.getAllReimbursements error:", err);
    throw err;
  }
};

/**
 * Create reimbursement (old)
 * - reimbursementData must contain fields mapped to CREATE_REIMBURSEMENT query
 * - attachments is expected to be array of { file_name, file_path } saved by multer
 */
exports.createReimbursement = async (reimbursementData) => {
  try {
    // sanitize department
    let department_id = parseInt(reimbursementData.department_id, 10);
    if (isNaN(department_id)) department_id = null;

    const reimbursementArray = [
      reimbursementData.employeeId,
      department_id,
      reimbursementData.claim_type,
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
      reimbursementData.transport_amount !== undefined
        ? reimbursementData.transport_amount
        : 0,
      reimbursementData.da !== undefined ? reimbursementData.da : 0,
      reimbursementData.total_amount !== undefined
        ? reimbursementData.total_amount
        : 0,
      reimbursementData.meal_type || null,
      reimbursementData.stationary || null,
      reimbursementData.service_provider || null,
      reimbursementData.project || null,
    ];

    // check existing claims that overlap
    const [existingClaims] = await db.query(queries.CHECK_EXISTING_CLAIM, [
      reimbursementData.employeeId,
      reimbursementData.claim_type,
      reimbursementData.date || null,
      reimbursementData.from_date || null,
      reimbursementData.to_date || null,
    ]);

    const stillActive = (existingClaims || []).filter(
      (c) => c.status && String(c.status).toLowerCase().trim() !== "rejected"
    );

    if (stillActive.length > 0) {
      const err = new Error(
        "A reimbursement with the same claim type and date already exists."
      );
      err.statusCode = 400;
      throw err;
    }

    const [result] = await db.query(
      queries.CREATE_REIMBURSEMENT,
      reimbursementArray
    );
    const reimbursementId = result.insertId;

    if (reimbursementData.attachments && reimbursementData.attachments.length) {
      const attachmentValues = reimbursementData.attachments.map((f) => [
        reimbursementId,
        f.file_name,
        f.file_path,
      ]);
      await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
    }

    return { id: reimbursementId, ...reimbursementData };
  } catch (err) {
    console.error("Service.createReimbursement error:", err);
    throw err;
  }
};

/**
 * Update the main reimbursement row (and optionally replace attachments)
 */
exports.updateReimbursement = async (reimbursementId, updateData) => {
  try {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error("updateData is missing or empty.");
    }

    let processedDepartmentId = parseInt(updateData.department_id, 10);
    if (isNaN(processedDepartmentId)) processedDepartmentId = null;

    const [result] = await db.query(queries.UPDATE_REIMBURSEMENT, [
      processedDepartmentId,
      updateData.claim_type,
      updateData.transport_type,
      updateData.fromDate,
      updateData.toDate,
      updateData.date,
      updateData.travel_from,
      updateData.travel_to,
      updateData.meals_objective,
      updateData.purpose,
      updateData.purchasing_item,
      updateData.accommodation_fees,
      updateData.no_of_days,
      updateData.transport_amount,
      updateData.da,
      updateData.total_amount,
      updateData.meal_type,
      updateData.stationary,
      updateData.service_provider,
      updateData.project,
      reimbursementId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("No reimbursement found or unauthorized update.");
    }

    if (updateData.attachments && updateData.attachments.length) {
      // delete old attachments and insert new ones
      await db.query(queries.DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID, [
        reimbursementId,
      ]);

      const attachmentValues = updateData.attachments.map((a) => [
        reimbursementId,
        a.file_name,
        a.file_path,
      ]);
      await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
    }

    return { success: true, message: "Reimbursement updated successfully." };
  } catch (err) {
    console.error("Service.updateReimbursement error:", err);
    throw err;
  }
};

/**
 * Update reimbursement status (approve/reject) — includes approver meta and optional project
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
    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Invalid status. Allowed: 'approved' or 'rejected'.");
    }

    const now = new Date();
    await db.query(queries.UPDATE_REIMBURSEMENT_STATUS, [
      status,
      approver_comments,
      approver_id,
      approver_name,
      approver_designation,
      project,
      now,
      id,
    ]);

    return {
      id,
      status,
      approver_comments,
      approver_id,
      approver_name,
      approver_designation,
      project,
      approved_date: now,
    };
  } catch (err) {
    console.error("Service.updateReimbursementStatus error:", err);
    throw err;
  }
};

exports.updatePaymentStatus = async (id, payment_status, paid_date = null) => {
  try {
    // sanity
    if (!id) throw new Error("Missing reimbursement id");

    // fetch claim from reimbursement_old to validate current state
    const [rows] = await db.query(
      "SELECT id, status, approved_date, payment_status AS current_payment_status FROM reimbursement_old WHERE id = ?",
      [id]
    );
    const claim = rows && rows[0];
    console.info("[Service:updatePaymentStatus] claim fetched:", claim);

    if (!claim) {
      const err = new Error("Claim not found");
      err.statusCode = 404;
      throw err;
    }

    // only allow update if claim is approved
    if (String(claim.status || "").toLowerCase() !== "approved") {
      const err = new Error(
        "Payment status can only be updated for approved reimbursements."
      );
      err.claimStatus = claim.status;
      err.approved_date = claim.approved_date;
      err.statusCode = 400;
      throw err;
    }

    // Build update — set paid_date only when marking "paid"
    const paidDateValue =
      payment_status === "paid" ? paid_date || new Date() : null;

    // Prefer explicit update on reimbursement_old table
    const updateSql =
      "UPDATE reimbursement_old SET payment_status = ?, paid_date = ?, updated_at = NOW() WHERE id = ?";
    const [result] = await db.query(updateSql, [
      payment_status,
      paidDateValue,
      id,
    ]);

    if (result.affectedRows === 0) {
      const err = new Error(
        "Failed to update payment status (no rows affected)."
      );
      err.statusCode = 500;
      throw err;
    }

    return { id, payment_status, paid_date: paidDateValue };
  } catch (err) {
    console.error("Service.updatePaymentStatus error:", err);
    // rethrow so handler can map status codes
    throw err;
  }
};

/**
 * Delete reimbursement
 */
exports.deleteReimbursement = async (id) => {
  try {
    await db.query(queries.DELETE_REIMBURSEMENT, [id]);
    // optionally, delete attachments rows
    await db.query(queries.DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID, [id]);
    return { id };
  } catch (err) {
    console.error("Service.deleteReimbursement error:", err);
    throw err;
  }
};

/**
 * Get attachments for a reimbursement (rows from attachments table)
 */
exports.getAttachments = async (reimbursementId) => {
  try {
    const [rows] = await db.query(queries.GET_ATTACHMENTS, [reimbursementId]);
    return rows || [];
  } catch (err) {
    console.error("Service.getAttachments error:", err);
    throw err;
  }
};

/**
 * Team reimbursements: returns filtered reimbursements for a team (exclude team lead self)
 */
exports.getTeamReimbursements = async (
  departmentId,
  submittedFrom,
  submittedTo,
  teamLeadId
) => {
  try {
    const params = [
      departmentId,
      submittedFrom || null,
      submittedFrom || null,
      submittedTo || null,
    ];
    const [reimbursements] = await db.query(
      queries.GET_TEAM_REIMBURSEMENTS,
      params
    );

    if (!reimbursements.length) return [];

    const filtered = (reimbursements || []).filter(
      (r) => r.employee_id !== teamLeadId
    );
    const reimbursementIds = filtered.map((r) => r.id);
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds.length ? reimbursementIds : [-1]]
    );

    const attachmentMap = {};
    (attachments || []).forEach((att) => {
      if (!attachmentMap[att.reimbursement_id])
        attachmentMap[att.reimbursement_id] = [];
      attachmentMap[att.reimbursement_id].push({
        file_name: att.file_name,
        year: att.year,
        month: att.month,
        employee_id: att.employee_id,
      });
    });

    filtered.forEach((r) => {
      r.attachments = attachmentMap[r.id] || [];
    });

    return filtered;
  } catch (err) {
    console.error("Service.getTeamReimbursements error:", err);
    throw err;
  }
};

/**
 * Return array of project names
 */
exports.getAllProjects = async () => {
  try {
    const [projects] = await db.query(queries.GET_ALL_PROJECTS);
    if (!projects.length) return [];
    return projects.map((p) => p.project_name);
  } catch (err) {
    console.error("Service.getAllProjects error:", err);
    throw err;
  }
};

/**
 * Approver/employee lookup (returns first row)
 */
exports.getApproverDetails = async (approver_id) => {
  try {
    const [rows] = await db.query(queries.GET_APPROVER_DETAILS, [approver_id]);
    return rows || [];
  } catch (err) {
    console.error("Service.getApproverDetails error:", err);
    throw err;
  }
};
