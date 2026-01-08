// handlers/reimbursementHandlerOld.js
const reimbursementService = require("../services/reimbursementServiceOld");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateDocx } = require("../services/docxServiceOld");
const { convertDocxToPdf } = require("../services/pdfServiceOld");
const db = require("../config");
const queries = require("../constants/reimbursementQueriesOld");
const XLSX = require("xlsx");

// forbidden file extensions for uploads
const forbiddenExts = new Set([
  ".xlsx",
  ".xls",
  ".xlsm",
  ".csv",
  ".zip",
  ".docx",
  ".xlsb",
  ".xltx",
  ".xltm",
]);

// Multer storage: saves to reimbursement/{year}/{month}/{employeeId}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isoDate = req.body.date || new Date().toISOString().slice(0, 10);
    const [year, month] = isoDate.split("-");
    const empId =
      (req.user && req.user.employeeId) || req.body.employeeId || "unknown";

    const dest = path.join(
      __dirname,
      "..",
      "..",
      "reimbursement",
      year,
      month,
      empId
    );
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const datePrefix = new Date().toISOString().slice(0, 10);
    const filename = `${datePrefix}-${Date.now()}-${file.originalname}`;
    cb(null, filename);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (forbiddenExts.has(ext)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Files of type "${ext}" are not allowed.`
      ),
      false
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function validateAttachments(files) {
  for (const file of files || []) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (forbiddenExts.has(ext)) {
      return `Attachment "${file.originalname}" of type "${ext}" is not allowed.`;
    }
  }
  return null;
}
exports.generateReimbursementPDF = async (req, res) => {
  try {
    const { claimId } = req.params;
    if (!claimId) return res.status(400).json({ error: "claimId required" });

    const [claimRows] = await db.query(queries.GET_CLAIM_DETAILS, [claimId]);
    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
    if (!claim || !claim.employee_id) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const [employeeRows] = await db.query(queries.GET_EMPLOYEE_DETAILS, [
      claim.employee_id,
    ]);
    const employee = Array.isArray(employeeRows)
      ? employeeRows[0]
      : employeeRows;
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const [rawAttachments] = await db.query(queries.GET_ATTACHMENTS, [claimId]);
    const attachments = rawAttachments || [];

    // Only keep attachments that have a reachable file_path
    const attachmentsWithFiles = (attachments || []).filter(
      (a) => a && a.file_path && fs.existsSync(a.file_path)
    );

    // 1) Generate DOCX
    let docxPath;
    try {
      docxPath = await generateDocx(claim, employee, attachmentsWithFiles);
    } catch (gErr) {
      console.error("generateDocx failed:", gErr);
      return res.status(500).json({
        error: "Failed to generate DOCX",
        detail: String(gErr.message || gErr),
      });
    }

    if (!docxPath || !fs.existsSync(docxPath)) {
      console.error(
        "generateReimbursementPDF error: DOCX not found:",
        docxPath
      );
      return res
        .status(500)
        .json({ error: "Failed to generate document (DOCX missing)" });
    }

    // quick size check
    try {
      const st = fs.statSync(docxPath);
      if (!st || st.size === 0) {
        console.error(
          "generateReimbursementPDF error: DOCX is empty:",
          docxPath
        );
        // remove the empty docx to avoid clutter
        try {
          fs.unlinkSync(docxPath);
        } catch (e) {
          /* ignore */
        }
        return res.status(500).json({ error: "Generated DOCX is empty" });
      }
    } catch (statErr) {
      console.warn(
        "Could not stat DOCX, continuing to conversion. statErr:",
        statErr
      );
    }

    // 2) Convert to PDF (may throw an error with stdout/stderr attached)
    let pdfPath;
    try {
      pdfPath = await convertDocxToPdf(docxPath, claim, attachmentsWithFiles);
    } catch (convErr) {
      console.error("Error during DOCX -> PDF conversion:", convErr);

      // attempt cleanup of docx (we won't send DOCX; user requested PDF)
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (cleanupErr) {
        console.warn("Cleanup docx failed:", cleanupErr);
      }

      // Return structured error for client (includes stdout/stderr when available)
      const payload = {
        error: "Failed to generate PDF",
        detail: convErr.message || String(convErr),
      };
      // include limited stdout/stderr if available for debugging
      if (convErr.stdout) {
        try {
          payload.stdout = String(convErr.stdout).slice(0, 2000);
        } catch {}
      }
      if (convErr.stderr) {
        try {
          payload.stderr = String(convErr.stderr).slice(0, 2000);
        } catch {}
      }
      return res.status(500).json(payload);
    }

    // final verification
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      // cleanup docx
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (e) {}
      return res.status(500).json({
        error: "Conversion completed but PDF file not found",
        detail: String(pdfPath),
      });
    }
    const pdfStat = fs.statSync(pdfPath);
    if (!pdfStat || pdfStat.size === 0) {
      // cleanup both files
      try {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch (e) {}
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (e) {}
      return res.status(500).json({ error: "Generated PDF is empty" });
    }

    // 3) Send the PDF to the client as a download, then cleanup files
    const safeName = (
      employee.name ||
      employee.employee_name ||
      "reimbursement"
    )
      .toString()
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_\-\.]/g, "")
      .substring(0, 120);
    const pdfFilename = `${safeName}_Reimbursement_${claimId}.pdf`;

    res.download(pdfPath, pdfFilename, (err) => {
      // always attempt cleanup afterwards
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (e) {
        console.warn("Failed to remove temp DOCX:", e);
      }
      try {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch (e) {
        console.warn("Failed to remove temp PDF:", e);
      }

      if (err) {
        console.error("Error sending PDF to client:", err);
        // If headers already sent, nothing more to do; otherwise return JSON
        if (!res.headersSent) {
          return res
            .status(500)
            .json({ error: "Failed to send PDF", detail: err.message });
        }
      } else {
        // sent successfully
        console.info(`PDF sent: ${pdfFilename}`);
      }
    });
  } catch (err) {
    // catch-all
    console.error("generateReimbursementPDF unexpected error:", err);
    return res.status(500).json({
      error: "Failed to generate document",
      detail: err && err.message ? err.message : String(err),
    });
  }
};

/**
 * GET /old/reimbursement/:employeeId
 */
exports.getReimbursementsByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const { fromDate, toDate } = req.query;
    const reimbursements =
      await reimbursementService.getReimbursementsByEmployee(
        employeeId,
        fromDate,
        toDate
      );
    res.status(200).json(reimbursements);
  } catch (err) {
    console.error("getReimbursementsByEmployee handler error:", err);
    res.status(500).json({ message: "Failed to fetch reimbursements" });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { payment_status, user_role } = req.body;

    // normalize inputs
    payment_status = String(payment_status || "").toLowerCase();
    user_role = user_role || (req.user && req.user.role) || "employee";

    if (!["pending", "paid", "rejected"].includes(payment_status)) {
      return res.status(400).json({ error: "Invalid payment status." });
    }
    if (user_role === "employee") {
      return res.status(403).json({ error: "Not authorized." });
    }

    // Read the claim from the correct table: reimbursement_old
    const [rows] = await db.query(
      "SELECT id, status, approved_date, approver_id, payment_status AS current_payment_status FROM reimbursement_old WHERE id = ?",
      [id]
    );

    if (!rows || rows.length === 0) {
      console.warn("[Handler:updatePaymentStatus] claim not found for id:", id);
      return res.status(404).json({ error: "Claim not found", claimId: id });
    }

    const claim = rows[0];
    console.info("[Handler:updatePaymentStatus] fetched claim:", claim);

    // If status is not approved, return a clear error including server-side values
    if (String(claim.status || "").toLowerCase() !== "approved") {
      return res.status(400).json({
        error:
          "Payment status can only be updated for approved reimbursements.",
        claimStatus: claim.status,
        approved_date: claim.approved_date,
        claimId: id,
      });
    }

    // Build paid_date only when payment_status === 'paid'
    const paid_date = payment_status === "paid" ? new Date() : null;

    // Delegate to service (service also double-checks)
    try {
      const updated = await reimbursementService.updatePaymentStatus(
        id,
        payment_status,
        paid_date
      );
      return res.json({ message: "Payment status updated", data: updated });
    } catch (svcErr) {
      console.error("[Handler:updatePaymentStatus] service error:", svcErr);
      // If service attached statusCode or claimStatus, forward that nicely
      const code =
        svcErr.statusCode && Number(svcErr.statusCode) >= 400
          ? svcErr.statusCode
          : 500;
      const payload = {
        error: svcErr.message || "Error updating payment status",
      };
      if (svcErr.claimStatus) payload.claimStatus = svcErr.claimStatus;
      if (svcErr.approved_date) payload.approved_date = svcErr.approved_date;
      return res.status(code).json(payload);
    }
  } catch (err) {
    console.error("updatePaymentStatus handler error:", err);
    res.status(500).json({ error: "Error updating payment status" });
  }
};
exports.getAllReimbursements = async (req, res) => {
  try {
    let { submittedFrom, submittedTo, status } = req.query;
    submittedFrom =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    submittedTo = submittedTo && submittedTo !== "null" ? submittedTo : null;

    // Call service with correct date range
    // If your service supports a status argument, pass it; otherwise we'll filter server-side.
    let reimbursements = await reimbursementService.getAllReimbursements(
      submittedFrom,
      submittedTo
    );

    // Optional: server-side filter for status (composite filters)
    if (status && status !== "all") {
      const s = String(status).toLowerCase().trim();
      reimbursements = (reimbursements || [])
        .map((group) => ({
          ...group,
          claims: (group.claims || []).filter((claim) => {
            const rowStatus = (claim.status || "").toLowerCase().trim();
            const pay = (claim.payment_status || "").toLowerCase().trim();
            if (s === "approved_pending")
              return (
                rowStatus === "approved" && (pay === "pending" || pay === "")
              );
            if (s === "approved_paid")
              return rowStatus === "approved" && pay === "paid";
            if (["approved", "rejected", "pending"].includes(s))
              return rowStatus === s;
            return true;
          }),
        }))
        .filter((g) => g.claims && g.claims.length > 0);
    }

    res.status(200).json(reimbursements);
  } catch (err) {
    console.error("getAllReimbursements handler error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
/**
 * GET /old/reimbursements/export
 * Export Excel of all reimbursements (flat)
 */
exports.exportReimbursements = async (req, res) => {
  try {
    let { submittedFrom, submittedTo } = req.query;
    submittedFrom =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    submittedTo = submittedTo && submittedTo !== "null" ? submittedTo : null;

    const rowsGrouped = await reimbursementService.getAllReimbursements(
      submittedFrom,
      submittedFrom,
      submittedTo
    );
    const flat = (rowsGrouped || []).reduce(
      (acc, r) => acc.concat(r.claims || []),
      []
    );

    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reimbursements");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fname = `Reimbursements_${submittedFrom || "all"}-to-${
      submittedTo || "all"
    }.xlsx`;

    res
      .setHeader("Content-Disposition", `attachment; filename="${fname}"`)
      .setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .send(buf);
  } catch (err) {
    console.error("exportReimbursements handler error:", err);
    res.status(500).json({ error: "Failed to export Excel" });
  }
};

/**
 * POST /old/reimbursement  (use upload.array('attachments', 5))
 */
exports.createReimbursement = async (req, res) => {
  try {
    if (req.files && req.files.length) {
      const errMsg = validateAttachments(req.files);
      if (errMsg) {
        req.files.forEach(
          (f) => fs.existsSync(f.path) && fs.unlinkSync(f.path)
        );
        return res.status(400).json({ error: errMsg });
      }
    }

    const employeeId = (req.user && req.user.employeeId) || req.body.employeeId;
    const role = (req.user && req.user.role) || req.body.role || "Employee";
    if (!employeeId)
      return res.status(400).json({ error: "Employee ID missing." });

    const reimbursementData = {
      employeeId,
      department_id: role === "Admin" ? null : req.body.department_id,
      claim_type: req.body.claim_type,
      transport_type: req.body.transport_type,
      transport_amount: req.body.transport_amount,
      da: req.body.da,
      from_date: req.body.fromDate,
      to_date: req.body.toDate,
      date: req.body.date,
      travel_from: req.body.travel_from,
      travel_to: req.body.travel_to,
      purpose: req.body.purpose,
      meals_objective: req.body.meals_objective,
      purchasing_item: req.body.purchasing_item,
      accommodation_fees: req.body.accommodation_fees,
      no_of_days: req.body.no_of_days,
      total_amount: req.body.total_amount,
      meal_type: req.body.meal_type,
      stationary: req.body.stationary,
      service_provider: req.body.service_provider,
      project: req.body.project,
      attachments: req.files
        ? req.files.map((file) => ({
            file_name: file.filename,
            file_path: file.path,
          }))
        : [],
    };

    const newReimbursement = await reimbursementService.createReimbursement(
      reimbursementData
    );

    if (role === "Admin") {
      // auto-approve admin submissions
      await reimbursementService.updateReimbursementStatus(
        newReimbursement.id,
        "approved",
        "Auto-approved by Admin",
        employeeId,
        "Admin",
        "Administrator"
      );
    }

    res.status(201).json({
      message: "Reimbursement request submitted successfully",
      data: newReimbursement,
    });
  } catch (err) {
    console.error("createReimbursement handler error:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Error creating reimbursement" });
  }
};

/**
 * PUT /old/reimbursement/:id  (use upload.array('attachments', 5) before)
 */
exports.updateReimbursement = async (req, res) => {
  try {
    if (req.files && req.files.length) {
      const errMsg = validateAttachments(req.files);
      if (errMsg) {
        req.files.forEach(
          (f) => fs.existsSync(f.path) && fs.unlinkSync(f.path)
        );
        return res.status(400).json({ error: errMsg });
      }
    }

    const { id } = req.params;
    const role = (req.user && req.user.role) || req.body.role || "Employee";

    const updateData = {
      employeeId: req.body.employeeId,
      department_id:
        role === "Admin"
          ? null
          : req.body.department_id !== undefined
          ? parseInt(req.body.department_id, 10)
          : null,
      claim_type: req.body.claim_type,
      comments: req.body.comments || "",
      fromDate: req.body.fromDate || null,
      toDate: req.body.toDate || null,
      date: req.body.date || null,
      travel_from: req.body.travel_from || null,
      travel_to: req.body.travel_to || null,
      meals_objective: req.body.meals_objective || null,
      purpose: req.body.purpose || null,
      da: parseFloat(req.body.da) || 0,
      transport_amount: parseFloat(req.body.transport_amount) || 0,
      purchasing_item: req.body.purchasing_item || null,
      accommodation_fees: parseFloat(req.body.accommodation_fees) || 0,
      no_of_days: parseInt(req.body.no_of_days, 10) || 0,
      total_amount: parseFloat(req.body.total_amount) || 0,
      meal_type: req.body.meal_type || null,
      stationary: req.body.stationary || null,
      service_provider: req.body.service_provider || null,
      project: req.body.project || null,
      attachments: req.files
        ? req.files.map((file) => ({
            file_name: file.filename,
            file_path: file.path,
          }))
        : [],
    };

    const updated = await reimbursementService.updateReimbursement(
      id,
      updateData
    );
    res.json({ message: "Reimbursement updated", data: updated });
  } catch (err) {
    console.error("updateReimbursement handler error:", err);
    res.status(500).json({ error: "Error updating reimbursement" });
  }
};

/**
 * PUT /old/reimbursement/status/:id
 */
exports.updateReimbursementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approver_comments, approver_id, project } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const approverDetails = await reimbursementService.getApproverDetails(
      approver_id
    );
    const approver_row = Array.isArray(approverDetails)
      ? approverDetails[0]
      : approverDetails;
    const approver_name = approver_row ? approver_row.name : "";
    const approver_designation = approver_row ? approver_row.role : "";

    const updatedStatus = await reimbursementService.updateReimbursementStatus(
      id,
      status,
      approver_comments,
      approver_id,
      approver_name,
      approver_designation,
      project
    );

    res.json({ message: `Reimbursement ${status}`, data: updatedStatus });
  } catch (err) {
    console.error("updateReimbursementStatus handler error:", err);
    res.status(500).json({ error: "Error updating reimbursement status" });
  }
};

/**
 * DELETE /old/reimbursement/:id
 */
exports.deleteReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    await reimbursementService.deleteReimbursement(id);
    res.json({ message: "Reimbursement deleted" });
  } catch (err) {
    console.error("deleteReimbursement handler error:", err);
    res.status(500).json({ error: "Error deleting reimbursement" });
  }
};

/**
 * GET /old/reimbursement/:year/:month/:employeeId/:filename
 * Serves attachment files from disk
 */
exports.getAttachments = async (req, res) => {
  try {
    const { year, month, employeeId, filename } = req.params;
    if (
      [year, month, employeeId, filename].some(
        (p) => p.includes("..") || p.includes("/")
      )
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "reimbursement",
      year,
      month,
      employeeId,
      filename
    );
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const mimeType =
        {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".pdf": "application/pdf",
        }[ext] || "application/octet-stream";

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (err) {
    console.error("getAttachments handler error:", err);
    res.status(500).json({ error: "Error fetching file" });
  }
};

/**
 * GET /old/reimbursement/:reimbursementId/attachments (returns JSON with attachments)
 */
exports.getAttachmentsByReimbursementId = async (req, res) => {
  try {
    const { reimbursementId } = req.params;
    if (!reimbursementId)
      return res.status(400).json({ message: "Reimbursement ID is required" });

    const attachments =
      await reimbursementService.getAttachmentsByReimbursementIds([
        reimbursementId,
      ]);
    if (!attachments.length)
      return res.status(404).json({ message: "No attachments found." });
    res.json({ attachments });
  } catch (err) {
    console.error("getAttachmentsByReimbursementId handler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTeamReimbursements = async (req, res) => {
  try {
    const { teamLeadId } = req.params;
    const { departmentId, submittedFrom, submittedTo, status } = req.query;

    if (!departmentId || !teamLeadId) {
      return res
        .status(400)
        .json({ error: "Department ID and Team Lead ID are required" });
    }

    const start =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    const end = submittedTo && submittedTo !== "null" ? submittedTo : null;

    // fetch raw team reimbursements (flat array) from service
    const teamReimbursements = await reimbursementService.getTeamReimbursements(
      departmentId,
      start,
      end,
      teamLeadId
    );

    // If no status filter requested, just return the rows
    if (!status || status === "all") {
      return res.status(200).json(teamReimbursements);
    }

    // server-side filter - supports composite filters
    const s = String(status).toLowerCase().trim();

    const filtered = (teamReimbursements || []).filter((r) => {
      const rowStatus = (r.status || "").toLowerCase().trim();
      const pay = (r.payment_status || "").toLowerCase().trim();

      if (s === "approved_pending") {
        return rowStatus === "approved" && pay === "pending";
      }
      if (s === "approved_paid") {
        return rowStatus === "approved" && pay === "paid";
      }
      // single-word statuses: approved / rejected / pending
      if (["approved", "rejected", "pending"].includes(s)) {
        return rowStatus === s;
      }
      // fallback: return true so client can still post-filter if it wants
      return true;
    });

    return res.status(200).json(filtered);
  } catch (err) {
    console.error("getTeamReimbursements handler error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /old/projectdrop
 */
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await reimbursementService.getAllProjects();
    res.status(200).json({ projects });
  } catch (err) {
    console.error("getAllProjects handler error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Upload endpoint simple response after multer stores file
 * POST /old/attachment (upload.single('file'))
 */
exports.uploadReimbursementAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      path: req.file.path,
    });
  } catch (err) {
    console.error("uploadReimbursementAttachment handler error:", err);
    res.status(500).json({ error: "Error uploading file" });
  }
};

// Export multer middleware so routes can use upload.array('attachments', 5)
exports.upload = upload;
