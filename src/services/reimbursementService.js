const db = require("../config");
const queries = require("../constants/reimbursementQueries");
const path = require("path");
const fs = require("fs").promises;

const toLocalDateString = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const normalizeRow = (r) => ({
  ...r,
  status: r.status ? String(r.status).toLowerCase().trim() : "",
  payment_status: r.payment_status
    ? String(r.payment_status).toLowerCase().trim()
    : "",
});

const parseInvoices = (val) => {
  if (!val && val !== 0) return [];
  if (Array.isArray(val))
    return val.map((v) => String(v).trim()).filter(Boolean);
  try {
    const s = typeof val === "string" ? val : JSON.stringify(val);
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed))
      return parsed.map((v) => String(v).trim()).filter(Boolean);
    if (typeof parsed === "string") {
      return parsed
        .split(",")
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
    return [];
  } catch (e) {
    try {
      if (typeof val === "string" && val.includes(",")) {
        return val
          .split(",")
          .map((v) => String(v).trim())
          .filter(Boolean);
      }
    } catch (_) {}
    return [];
  }
};

const parseParticipants = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseParticipantsSafe = (val) => {
  if (!val) return [];

  if (Array.isArray(val)) return val;

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}

    return val
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

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

const saveAttachmentsBulk = async (reimbursementId, files = []) => {
  if (!files || !files.length) return;
  const attachmentValues = files.map((f) => [
    reimbursementId,
    f.file_name,
    f.file_path,
  ]);
  await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
};

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

exports.getReimbursementsByEmployee = async (
  employeeId,
  fromDate = null,
  toDate = null
) => {
  const [rows] = await db.query(queries.GET_REIMBURSEMENTS_BY_EMPLOYEE, [
    employeeId,
  ]);
  if (!rows || rows.length === 0) return [];

  const reimbursements = rows.map((r) => ({
    ...r,
    participants: parseParticipantsSafe(r.participants),
    aggregated_total: r.aggregated_total,
  }));
  const ids = reimbursements.map((r) => r.id);
  const safeIds = ids.length ? ids : [-1];

  const [linesRows] = await db.query(queries.GET_LINES_BY_REIMBURSEMENT_IDS, [
    safeIds,
  ]);
  const [attachRows] = await db.query(
    queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
    [safeIds]
  );

  const linesByReim = {};
  linesRows.forEach((l) => {
    let parsedMeta = {};
    if (l.meta !== undefined && l.meta !== null) {
      if (typeof l.meta === "string") {
        try {
          parsedMeta = JSON.parse(l.meta);
        } catch (e) {
          console.warn("Failed to parse l.meta:", e?.message || e, l.meta);
          parsedMeta = {};
        }
      } else if (typeof l.meta === "object") {
        parsedMeta = l.meta;
      }
    }

    const payload = {
      ...parsedMeta,
      purpose: parsedMeta.purpose || l.purpose || null,
      date: parsedMeta.date || (l.date ? toLocalDateString(l.date) : null),
      from_date:
        parsedMeta.from_date ||
        (l.from_date ? toLocalDateString(l.from_date) : null),
      to_date:
        parsedMeta.to_date || (l.to_date ? toLocalDateString(l.to_date) : null),
      travel_from: parsedMeta.travel_from || l.travel_from || null,
      travel_to: parsedMeta.travel_to || l.travel_to || null,

      transport_amount:
        parsedMeta.transport_amount ??
        (l.transport_amount !== null ? parseFloat(l.transport_amount) : null),
      accommodation_fees:
        parsedMeta.accommodation_fees ??
        (l.accommodation_fees !== null
          ? parseFloat(l.accommodation_fees)
          : null),
      da: parsedMeta.da ?? (l.da !== null ? parseFloat(l.da) : null),
      total_amount:
        parsedMeta.total_amount ??
        (l.total_amount !== null ? parseFloat(l.total_amount) : null),

      meal_type: parsedMeta.meal_type || l.meal_type || null,
      meals_objective: parsedMeta.meals_objective || l.meals_objective || null,
      purchasing_item: parsedMeta.purchasing_item || l.purchasing_item || null,
      stationairy_item:
        parsedMeta.stationairy_item || l.stationairy_item || null,
      service_provider:
        parsedMeta.service_provider || l.service_provider || null,

      invoices: parseInvoices(parsedMeta.invoices),
      attachments: Array.isArray(parsedMeta.attachments)
        ? parsedMeta.attachments
        : parsedMeta.attachments
        ? [parsedMeta.attachments]
        : [],
    };

    if (!linesByReim[l.reimbursement_id]) linesByReim[l.reimbursement_id] = [];
    linesByReim[l.reimbursement_id].push({
      id: l.id,
      line_index: l.line_index,
      line_type: l.line_type || null,
      payload,
      total_amount: parseFloat(l.total_amount || 0).toFixed(2),
    });
  });

  const attByReim = {};
  attachRows.forEach((a) => {
    if (!attByReim[a.reimbursement_id]) attByReim[a.reimbursement_id] = [];
    attByReim[a.reimbursement_id].push({
      id: a.id,
      line_id: a.line_id,
      file_name: a.file_name,
      url: `/reimbursement/${""}`,
      file_path: a.file_path,
    });
  });

  const result = reimbursements.map((r) => ({
    ...r,
    lines: linesByReim[r.id] || [],
    attachments: (attByReim[r.id] || []).filter((a) => !a.line_id),
    line_attachments_map: (attByReim[r.id] || [])
      .filter((a) => a.line_id)
      .reduce((acc, a) => {
        if (!acc[a.line_id]) acc[a.line_id] = [];
        acc[a.line_id].push(a);
        return acc;
      }, {}),
  }));

  return result;
};

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

    // normalize top-level rows
    const reimbursements = rawRows.map((r) => {
      const n = normalizeRow(r);
      const participants = parseParticipantsSafe(r.participants);
      const invoices = parseInvoices(r.invoices);
      return {
        ...n,
        participants,
        invoices,
        from_date: toLocalDateString(r.from_date),
        to_date: toLocalDateString(r.to_date),
        date: toLocalDateString(r.date),
      };
    });

    // fetch lines + attachments for all reimbursements
    const reimbursementIds = reimbursements.map((r) => r.id);
    const safeIds = reimbursementIds.length ? reimbursementIds : [-1];

    const [linesRows] = await db.query(queries.GET_LINES_BY_REIMBURSEMENT_IDS, [
      safeIds,
    ]);
    const [attachRows] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [safeIds]
    );

    // build lines map (same parsing logic as getReimbursementsByEmployee)
    const linesByReim = {};
    (linesRows || []).forEach((l) => {
      let parsedMeta = {};
      try {
        parsedMeta = l.meta
          ? typeof l.meta === "string"
            ? JSON.parse(l.meta)
            : l.meta
          : {};
      } catch (e) {
        parsedMeta = {};
        console.warn("Failed to parse line.meta:", e?.message || e, l.meta);
      }

      const payload = {
        ...parsedMeta,
        purpose: parsedMeta.purpose || l.purpose || null,
        date: parsedMeta.date || (l.date ? toLocalDateString(l.date) : null),
        from_date:
          parsedMeta.from_date ||
          (l.from_date ? toLocalDateString(l.from_date) : null),
        to_date:
          parsedMeta.to_date ||
          (l.to_date ? toLocalDateString(l.to_date) : null),
        travel_from: parsedMeta.travel_from || l.travel_from || null,
        travel_to: parsedMeta.travel_to || l.travel_to || null,

        transport_amount:
          parsedMeta.transport_amount ??
          (l.transport_amount !== null ? parseFloat(l.transport_amount) : null),
        accommodation_fees:
          parsedMeta.accommodation_fees ??
          (l.accommodation_fees !== null
            ? parseFloat(l.accommodation_fees)
            : null),
        da: parsedMeta.da ?? (l.da !== null ? parseFloat(l.da) : null),
        total_amount:
          parsedMeta.total_amount ??
          (l.total_amount !== null ? parseFloat(l.total_amount) : null),

        meal_type: parsedMeta.meal_type || l.meal_type || null,
        meals_objective:
          parsedMeta.meals_objective || l.meals_objective || null,
        purchasing_item:
          parsedMeta.purchasing_item || l.purchasing_item || null,
        stationairy_item:
          parsedMeta.stationairy_item || l.stationairy_item || null,
        service_provider:
          parsedMeta.service_provider || l.service_provider || null,

        // ensure invoices and attachments come from parsedMeta if present
        invoices: parseInvoices(parsedMeta.invoices),
        attachments: Array.isArray(parsedMeta.attachments)
          ? parsedMeta.attachments
          : parsedMeta.attachments
          ? [parsedMeta.attachments]
          : [],
      };

      if (!linesByReim[l.reimbursement_id])
        linesByReim[l.reimbursement_id] = [];
      linesByReim[l.reimbursement_id].push({
        id: l.id,
        line_index: l.line_index,
        line_type: l.line_type || null,
        payload,
        total_amount: parseFloat(l.total_amount || 0).toFixed(2),
      });
    });

    // build attachments map by reimbursement (and keep line_id)
    const attByReim = {};
    (attachRows || []).forEach((a) => {
      if (!attByReim[a.reimbursement_id]) attByReim[a.reimbursement_id] = [];
      attByReim[a.reimbursement_id].push({
        id: a.id,
        line_id: a.line_id,
        file_name: a.file_name,
        file_path: a.file_path,
      });
    });

    // --- inside getAllReimbursements, where finalReims is composed ---
    const finalReims = reimbursements.map((r) => {
      const lines = (linesByReim[r.id] || []).sort(
        (x, y) => (x.line_index || 0) - (y.line_index || 0)
      );
      const attList = attByReim[r.id] || [];

      const claimLevelAttachments = attList
        .filter((a) => !a.line_id)
        .map((a) => ({
          id: a.id,
          file_name: a.file_name,
          file_path: a.file_path,
          url: `/reimbursement/${""}`,
        }));

      const line_attachments_map = attList
        .filter((a) => a.line_id)
        .reduce((acc, a) => {
          if (!acc[a.line_id]) acc[a.line_id] = [];
          acc[a.line_id].push({
            id: a.id,
            line_id: a.line_id,
            file_name: a.file_name,
            file_path: a.file_path,
            url: `/reimbursement/${""}`,
          });
          return acc;
        }, {});

      // --- NEW: aggregate invoices from claim-level + all line.payload.invoices ---
      const invoiceSet = new Set();
      // claim-level invoices if any (column r.invoices)
      (Array.isArray(r.invoices)
        ? r.invoices
        : parseInvoices(r.invoices)
      ).forEach((inv) => inv && invoiceSet.add(String(inv).trim()));
      // line-level invoices
      (lines || []).forEach((ln) => {
        const linv = ln?.payload?.invoices || [];
        (Array.isArray(linv) ? linv : parseInvoices(linv)).forEach((inv) => {
          if (inv) invoiceSet.add(String(inv).trim());
        });
      });
      const aggregatedInvoices = Array.from(invoiceSet);

      return {
        ...r,
        lines,
        attachments: claimLevelAttachments,
        line_attachments_map,
        invoices: aggregatedInvoices, // <- populated now
      };
    });

    // group by employee id (same output shape your existing code expects)
    const grouped = finalReims.reduce((acc, r) => {
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

exports.getEmployees = async (q = null, departmentId = null, limit = 200) => {
  try {
    let sql =
      queries.GET_EMPLOYEES ||
      `
      SELECT e.employee_id,
             CONCAT(e.first_name, ' ', e.last_name) AS name,
             ep.position,
             d.name as department_name
      FROM employees e
      LEFT JOIN employee_professional ep ON e.employee_id = ep.employee_id
      LEFT JOIN departments d ON ep.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      String(departmentId).trim() !== ""
    ) {
      sql += " AND ep.department_id = ?";
      params.push(departmentId);
    }

    if (q && String(q).trim() !== "") {
      const like = `%${String(q).trim()}%`;
      sql += ` AND (
        e.employee_id LIKE ?
        OR e.first_name LIKE ?
        OR e.last_name LIKE ?
        OR CONCAT(e.first_name, ' ', e.last_name) LIKE ?
      )`;
      params.push(like, like, like, like);
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 2000);
    sql += " ORDER BY e.first_name ASC LIMIT ?";
    params.push(safeLimit);

    const [rows] = await db.query(sql, params);
    const list = (rows || []).map((r) => ({
      employee_id: r.employee_id,
      name: r.name || `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      position: r.position || null,
      department_name: r.department_name || null,
    }));
    return list;
  } catch (err) {
    console.error("Error in getEmployees:", err);
    throw err;
  }
};

exports.createReimbursement = async (reimbursementData) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const participantsArr = parseParticipants(reimbursementData.participants);
    const participantsJSON = JSON.stringify(participantsArr);

    const lines = Array.isArray(reimbursementData.lines)
      ? reimbursementData.lines
      : [];

    const aggregated_total = lines.reduce(
      (s, l) => s + (parseFloat(l.total_amount) || 0),
      0
    );

    const [res] = await conn.query(queries.CREATE_REIMBURSEMENT, [
      reimbursementData.employeeId,
      reimbursementData.department_id || null,
      reimbursementData.claim_type || null,
      reimbursementData.transport_type || null,
      reimbursementData.project || null,
      participantsJSON,
      reimbursementData.comments || null,
      aggregated_total,
    ]);
    const reimbursementId = res.insertId;

    if (lines.length) {
      const now = new Date();
      const values = lines.map((l, idx) => {
        const payload =
          l.payload && typeof l.payload === "object" ? l.payload : {};
        const purpose = payload.purpose || null;
        const date = payload.date || null;
        const from_date = payload.from_date || payload.fromDate || null;
        const to_date = payload.to_date || payload.toDate || null;
        const travel_from = payload.travel_from || payload.travelFrom || null;
        const travel_to = payload.travel_to || payload.travelTo || null;
        const transport_amount =
          payload.transport_amount ?? payload.transportAmount ?? null;
        const accommodation_fees =
          payload.accommodation_fees ?? payload.accommodationFees ?? null;
        const da = payload.da ?? null;
        const total_amount = (
          parseFloat(l.total_amount || payload.total_amount || 0) || 0
        ).toFixed(2);
        const meal_type = payload.meal_type || payload.mealType || null;
        const meals_objective =
          payload.meals_objective || payload.mealsObjective || null;
        const purchasing_item =
          payload.purchasing_item || payload.purchasingItem || null;
        const stationairy_item =
          payload.stationairy_item ||
          payload.stationary ||
          payload.stationary_item ||
          null;
        const service_provider =
          payload.service_provider || payload.serviceProvider || null;
        const meta = JSON.stringify(payload || {});
        return [
          reimbursementId,
          idx,
          purpose,
          date,
          from_date,
          to_date,
          travel_from,
          travel_to,
          transport_amount,
          accommodation_fees,
          da,
          total_amount,
          meal_type,
          meals_objective,
          purchasing_item,
          stationairy_item,
          service_provider,
          meta,
          now,
          now,
        ];
      });
      await conn.query(queries.SAVE_REIMBURSEMENT_LINES_BULK, [values]);
    }

    if (
      Array.isArray(reimbursementData.attachments) &&
      reimbursementData.attachments.length
    ) {
      const [insertedLines] = await conn.query(
        `SELECT id, line_index FROM reimbursement_lines WHERE reimbursement_id = ?`,
        [reimbursementId]
      );
      const lineIndexToId = {};
      insertedLines.forEach((l) => (lineIndexToId[l.line_index] = l.id));

      const attachmentsInput = reimbursementData.attachments;
      const attValues = attachmentsInput.map((a) => {
        const li =
          a.line_index !== undefined && a.line_index !== null
            ? lineIndexToId[a.line_index] || null
            : null;
        return [reimbursementId, li, a.file_name, a.file_path];
      });
      if (attValues.length)
        await conn.query(queries.SAVE_ATTACHMENTS, [attValues]);
    }

    await conn.commit();
    return { id: reimbursementId, aggregated_total };
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("createReimbursement error:", err);
    throw err;
  } finally {
    conn.release();
  }
};

exports.updateReimbursement = async (reimbursementId, updateData) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const participantsArr = parseParticipants(updateData.participants);
    const participantsJSON = JSON.stringify(participantsArr);

    const lines = Array.isArray(updateData.lines) ? updateData.lines : [];
    const aggregated_total = lines.reduce(
      (s, l) => s + (parseFloat(l.total_amount) || 0),
      0
    );

    await conn.query(queries.UPDATE_REIMBURSEMENT, [
      updateData.department_id || null,
      updateData.claim_type || null,
      updateData.transport_type || null,
      updateData.project || null,
      participantsJSON,
      updateData.comments || null,
      aggregated_total,
      reimbursementId,
    ]);

    await conn.query(queries.DELETE_LINES_BY_REIMBURSEMENT_ID, [
      reimbursementId,
    ]);
    if (lines.length) {
      const now = new Date();
      const values = lines.map((l, idx) => {
        const payload =
          l.payload && typeof l.payload === "object" ? l.payload : {};
        const purpose = payload.purpose || null;
        const date = payload.date || null;
        const from_date = payload.from_date || payload.fromDate || null;
        const to_date = payload.to_date || payload.toDate || null;
        const travel_from = payload.travel_from || payload.travelFrom || null;
        const travel_to = payload.travel_to || payload.travelTo || null;
        const transport_amount =
          payload.transport_amount ?? payload.transportAmount ?? null;
        const accommodation_fees =
          payload.accommodation_fees ?? payload.accommodationFees ?? null;
        const da = payload.da ?? null;
        const total_amount = (
          parseFloat(l.total_amount || payload.total_amount || 0) || 0
        ).toFixed(2);
        const meal_type = payload.meal_type || payload.mealType || null;
        const meals_objective =
          payload.meals_objective || payload.mealsObjective || null;
        const purchasing_item =
          payload.purchasing_item || payload.purchasingItem || null;
        const stationairy_item =
          payload.stationairy_item ||
          payload.stationary ||
          payload.stationary_item ||
          null;
        const service_provider =
          payload.service_provider || payload.serviceProvider || null;
        const meta = JSON.stringify(payload || {});
        return [
          reimbursementId,
          idx,
          purpose,
          date,
          from_date,
          to_date,
          travel_from,
          travel_to,
          transport_amount,
          accommodation_fees,
          da,
          total_amount,
          meal_type,
          meals_objective,
          purchasing_item,
          stationairy_item,
          service_provider,
          meta,
          now,
          now,
        ];
      });
      await conn.query(queries.SAVE_REIMBURSEMENT_LINES_BULK, [values]);
    }

    if (
      Array.isArray(updateData.attachments) &&
      updateData.attachments.length
    ) {
      await conn.query(queries.DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID, [
        reimbursementId,
      ]);

      const [insertedLines] = await conn.query(
        `SELECT id, line_index FROM reimbursement_lines WHERE reimbursement_id = ?`,
        [reimbursementId]
      );
      const lineIndexToId = {};
      insertedLines.forEach((l) => (lineIndexToId[l.line_index] = l.id));

      const attValues = updateData.attachments.map((a) => {
        const li =
          a.line_index !== undefined && a.line_index !== null
            ? lineIndexToId[a.line_index] || null
            : null;
        return [reimbursementId, li, a.file_name, a.file_path];
      });
      if (attValues.length)
        await conn.query(queries.SAVE_ATTACHMENTS, [attValues]);
    }

    await conn.commit();
    return { success: true, aggregated_total };
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("updateReimbursement error:", err);
    throw err;
  } finally {
    conn.release();
  }
};

exports.getTeamReimbursements = async (
  departmentId,
  submittedFrom,
  submittedTo,
  teamLeadId
) => {
  try {
    const dept =
      departmentId !== undefined && departmentId !== null ? departmentId : null;
    const excludedId =
      teamLeadId !== undefined && teamLeadId !== null ? teamLeadId : null;
    const from =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    const params = [dept, excludedId, excludedId, from, from, from];

    console.log("[Service:getTeamReimbursements] SQL params:", params);

    const [reimbursementsRaw] = await db.query(
      queries.GET_TEAM_REIMBURSEMENTS,
      params
    );

    if (!reimbursementsRaw || reimbursementsRaw.length === 0) return [];

    // normalize rows (claim-level)
    const normalized = reimbursementsRaw.map((r) => {
      const n = normalizeRow(r);
      const participants = parseParticipantsSafe(r.participants);
      const invoices = parseInvoices(r.invoices);
      return {
        ...n,
        participants,
        invoices,
        from_date: toLocalDateString(r.from_date),
        to_date: toLocalDateString(r.to_date),
        date: toLocalDateString(r.date),
      };
    });

    const reimbursementEmployeeMap = {};
    normalized.forEach((r) => {
      reimbursementEmployeeMap[r.id] = r.employee_id;
    });

    const reimbursementIds = normalized.map((r) => r.id);
    const safeIds = reimbursementIds.length ? reimbursementIds : [-1];

    // fetch lines + attachments for these reimbursements
    const [linesRows] = await db.query(queries.GET_LINES_BY_REIMBURSEMENT_IDS, [
      safeIds,
    ]);
    const [attachmentsRows] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [safeIds]
    );

    // parse lines meta -> linesByReim
    const linesByReim = {};
    (linesRows || []).forEach((l) => {
      let parsedMeta = {};
      try {
        parsedMeta = l.meta
          ? typeof l.meta === "string"
            ? JSON.parse(l.meta)
            : l.meta
          : {};
      } catch (e) {
        parsedMeta = {};
        console.warn("Failed to parse line.meta:", e?.message || e, l.meta);
      }

      const payload = {
        ...parsedMeta,
        purpose: parsedMeta.purpose || l.purpose || null,
        date: parsedMeta.date || (l.date ? toLocalDateString(l.date) : null),
        from_date:
          parsedMeta.from_date ||
          (l.from_date ? toLocalDateString(l.from_date) : null),
        to_date:
          parsedMeta.to_date ||
          (l.to_date ? toLocalDateString(l.to_date) : null),
        travel_from: parsedMeta.travel_from || l.travel_from || null,
        travel_to: parsedMeta.travel_to || l.travel_to || null,

        transport_amount:
          parsedMeta.transport_amount ??
          (l.transport_amount !== null ? parseFloat(l.transport_amount) : null),
        accommodation_fees:
          parsedMeta.accommodation_fees ??
          (l.accommodation_fees !== null
            ? parseFloat(l.accommodation_fees)
            : null),
        da: parsedMeta.da ?? (l.da !== null ? parseFloat(l.da) : null),
        total_amount:
          parsedMeta.total_amount ??
          (l.total_amount !== null ? parseFloat(l.total_amount) : null),

        meal_type: parsedMeta.meal_type || l.meal_type || null,
        meals_objective:
          parsedMeta.meals_objective || l.meals_objective || null,
        purchasing_item:
          parsedMeta.purchasing_item || l.purchasing_item || null,
        stationairy_item:
          parsedMeta.stationairy_item || l.stationairy_item || null,
        service_provider:
          parsedMeta.service_provider || l.service_provider || null,

        invoices: parseInvoices(parsedMeta.invoices),
        attachments: Array.isArray(parsedMeta.attachments)
          ? parsedMeta.attachments
          : parsedMeta.attachments
          ? [parsedMeta.attachments]
          : [],
      };

      if (!linesByReim[l.reimbursement_id])
        linesByReim[l.reimbursement_id] = [];
      linesByReim[l.reimbursement_id].push({
        id: l.id,
        line_index: l.line_index,
        line_type: l.line_type || null,
        payload,
        total_amount: parseFloat(l.total_amount || 0).toFixed(2),
      });
    });

    // attachment rows -> map (line-level and claim-level)
    const attachmentMap = {};
    (attachmentsRows || []).forEach((att) => {
      const rid = att.reimbursement_id;
      if (!attachmentMap[rid]) attachmentMap[rid] = [];
      attachmentMap[rid].push({
        id: att.id,
        line_id: att.line_id,
        file_name: att.file_name,
        file_path: att.file_path,
      });
    });

    // ... inside normalized.map -> enriched mapping ...
    const enriched = normalized.map((r) => {
      const lines = (linesByReim[r.id] || []).sort(
        (a, b) => (a.line_index || 0) - (b.line_index || 0)
      );
      const attList = attachmentMap[r.id] || [];

      const claimLevelAttachments = attList
        .filter((a) => !a.line_id)
        .map((a) => ({
          id: a.id,
          file_name: a.file_name,
          file_path: a.file_path,
          url: `/reimbursement/${""}`,
        }));

      const line_attachments_map = attList
        .filter((a) => a.line_id)
        .reduce((acc, a) => {
          if (!acc[a.line_id]) acc[a.line_id] = [];
          acc[a.line_id].push({
            id: a.id,
            line_id: a.line_id,
            file_name: a.file_name,
            file_path: a.file_path,
            url: `/reimbursement/${""}`,
          });
          return acc;
        }, {});

      // --- NEW: aggregate invoices ---
      const invoiceSet = new Set();
      (Array.isArray(r.invoices)
        ? r.invoices
        : parseInvoices(r.invoices)
      ).forEach((inv) => inv && invoiceSet.add(String(inv).trim()));
      (lines || []).forEach((ln) => {
        const linv = ln?.payload?.invoices || [];
        (Array.isArray(linv) ? linv : parseInvoices(linv)).forEach((inv) => {
          if (inv) invoiceSet.add(String(inv).trim());
        });
      });
      const aggregatedInvoices = Array.from(invoiceSet);

      return {
        ...r,
        lines,
        attachments: claimLevelAttachments,
        line_attachments_map,
        invoices: aggregatedInvoices, // <- populated now
      };
    });

    return enriched;
  } catch (err) {
    console.error("Error in getTeamReimbursements:", err);
    throw err;
  }
};

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

exports.deleteReimbursement = async (id) => {
  try {
    if (!id) throw new Error("id is required");
    await db.query(queries.DELETE_REIMBURSEMENT, [id]);
    return { id };
  } catch (err) {
    console.error("Error in deleteReimbursement:", err);
    throw err;
  }
};

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
