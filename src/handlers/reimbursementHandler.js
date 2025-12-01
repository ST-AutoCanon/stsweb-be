const reimbursementService = require("../services/reimbursementService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateDocx } = require("../services/docxService");
const { convertDocxToPdf } = require("../services/pdfService");
const db = require("../config");
const queries = require("../constants/reimbursementQueries");
const XLSX = require("xlsx");

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isoDate = req.body.date || new Date().toISOString().slice(0, 10);
    const [year, month] = isoDate.split("-");

    const dest = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "reimbursement",
      year,
      month,
      String(req.user?.employeeId || req.body.employeeId || "unknown")
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
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (forbiddenExts.has(ext)) {
      return `Attachment "${file.originalname}" of type "${ext}" is not allowed.`;
    }
  }
  return null;
}

function safeUnlinkSync(fp) {
  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (e) {
    console.warn("Failed to delete file:", fp, e.message);
  }
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
    if (!employee || !employee.name) {
      return res.status(404).json({ error: "Employee details not found" });
    }

    const [attachmentsRows] = await db.query(queries.GET_ATTACHMENTS, [
      claimId,
    ]);
    const attachments = Array.isArray(attachmentsRows)
      ? attachmentsRows
      : attachmentsRows || [];

    const attachmentsWithFiles = attachments.filter(
      (att) => att && att.file_path
    );
    if (attachmentsWithFiles.length !== attachments.length) {
      console.warn(
        `Filtered out ${
          attachments.length - attachmentsWithFiles.length
        } attachments without file_path`
      );
    }

    attachmentsWithFiles.forEach((att) => {
      if (!fs.existsSync(att.file_path)) {
        console.warn(`File not found on disk: ${att.file_path}`);
      }
    });

    const docxPath = await generateDocx(claim, employee, attachmentsWithFiles);

    const pdfPath = await convertDocxToPdf(
      docxPath,
      claim,
      attachmentsWithFiles
    );

    const fileNameBase = (employee.name || `claim_${claimId}`).replace(
      /\s+/g,
      "_"
    );
    const fileName = `${fileNameBase}.pdf`;

    res.download(pdfPath, fileName, (err) => {
      if (err) console.error("Download error:", err);
      safeUnlinkSync(docxPath);
      safeUnlinkSync(pdfPath);
    });
  } catch (error) {
    console.error("Error generating reimbursement PDF:", error);
    res.status(500).json({ error: "Failed to generate document" });
  }
};

exports.getReimbursementsByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const { fromDate, toDate } = req.query;
    if (!employeeId)
      return res.status(400).json({ message: "employeeId required" });

    const reimbursements =
      await reimbursementService.getReimbursementsByEmployee(
        employeeId,
        fromDate,
        toDate
      );
    res.status(200).json(reimbursements);
  } catch (error) {
    console.error("Error fetching reimbursements:", error);
    res.status(500).json({ message: "Failed to fetch reimbursements" });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { payment_status, user_role } = req.body;

    if (!id) return res.status(400).json({ error: "id required" });

    if (
      !["pending", "paid", "rejected"].includes(
        String(payment_status).toLowerCase()
      )
    ) {
      return res.status(400).json({ error: "Invalid payment status." });
    }

    if (String(user_role).toLowerCase() === "employee") {
      return res.status(403).json({ error: "Not authorized." });
    }

    const [rows] = await db.query(
      "SELECT status FROM reimbursement WHERE id = ?",
      [id]
    );
    const statusVal =
      rows && rows[0] && rows[0].status
        ? String(rows[0].status).toLowerCase()
        : null;
    if (!statusVal || statusVal !== "approved") {
      return res.status(400).json({
        error:
          "Payment status can only be updated for approved reimbursements.",
      });
    }

    const paid_date =
      String(payment_status).toLowerCase() === "paid" ? new Date() : null;
    const updated = await reimbursementService.updatePaymentStatus(
      id,
      String(payment_status).toLowerCase(),
      paid_date
    );

    res.json({ message: "Payment status updated", data: updated });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ error: "Error updating payment status" });
  }
};

exports.getAllReimbursements = async (req, res) => {
  try {
    let { submittedFrom, submittedTo } = req.query;
    submittedFrom =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    submittedTo = submittedTo && submittedTo !== "null" ? submittedTo : null;

    const reimbursements = await reimbursementService.getAllReimbursements(
      submittedFrom,
      submittedFrom,
      submittedTo
    );
    res.status(200).json(reimbursements);
  } catch (error) {
    console.error("Error fetching all reimbursements:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.exportReimbursements = async (req, res) => {
  try {
    let { submittedFrom, submittedTo } = req.query;
    submittedFrom = submittedFrom !== "null" ? submittedFrom : null;
    submittedTo = submittedTo !== "null" ? submittedTo : null;

    const rows = await reimbursementService.getAllReimbursements(
      submittedFrom,
      submittedFrom,
      submittedTo
    );

    const flat = rows.reduce((acc, r) => acc.concat(r.claims || []), []);

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
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export Excel" });
  }
};

exports.createReimbursement = async (req, res) => {
  try {
    if (req.files && req.files.length) {
      const errMsg = validateAttachments(req.files);
      if (errMsg) {
        req.files.forEach((f) => safeUnlinkSync(f.path));
        return res.status(400).json({ error: errMsg });
      }
    }

    const employeeId = req.user?.employeeId || req.body.employeeId;
    const role = req.user?.role || req.body.role;
    if (!employeeId || employeeId === "undefined") {
      return res.status(400).json({ error: "Employee ID missing." });
    }

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
      const approverId = req.user?.employeeId || "Admin";
      await reimbursementService.updateReimbursementStatus(
        newReimbursement.id,
        "approved",
        "Auto-approved by Admin",
        approverId,
        "Admin",
        "Administrator"
      );
    }

    res.status(201).json({
      message: "Reimbursement request submitted successfully",
      data: newReimbursement,
    });
  } catch (error) {
    console.error("Error creating reimbursement:", error);
    if (req.files && req.files.length) {
      req.files.forEach((f) => safeUnlinkSync(f.path));
    }
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Error creating reimbursement" });
  }
};

exports.updateReimbursement = async (req, res) => {
  try {
    if (req.files && req.files.length) {
      const errMsg = validateAttachments(req.files);
      if (errMsg) {
        req.files.forEach((f) => safeUnlinkSync(f.path));
        return res.status(400).json({ error: errMsg });
      }
    }

    const { id } = req.params;
    if (!id)
      return res.status(400).json({ error: "Reimbursement id required" });

    const role = req.user?.role || req.body.role;
    const updateData = {
      employeeId: req.body.employeeId,
      department_id:
        role === "Admin"
          ? null
          : req.body.department_id !== undefined
          ? parseInt(req.body.department_id, 10)
          : null,
      claim_type: req.body.claim_type,
      comments: req.body.comments !== "undefined" ? req.body.comments : "",
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

    const updatedReimbursement = await reimbursementService.updateReimbursement(
      id,
      updateData
    );
    res.json({ message: "Reimbursement updated", data: updatedReimbursement });
  } catch (error) {
    console.error("Error updating reimbursement:", error);
    if (req.files && req.files.length) {
      req.files.forEach((f) => safeUnlinkSync(f.path));
    }
    res.status(500).json({ error: "Error updating reimbursement" });
  }
};

exports.updateReimbursementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approver_comments, approver_id, project } = req.body;
    if (!id) return res.status(400).json({ error: "id required" });
    if (!["approved", "rejected"].includes(String(status).toLowerCase())) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const approverDetails = await reimbursementService.getApproverDetails(
      approver_id
    );

    let approver_name = null;
    let approver_designation = null;
    if (approverDetails) {
      const row = Array.isArray(approverDetails)
        ? approverDetails[0]
        : approverDetails;
      approver_name = row?.name || row?.employee_name || null;
      approver_designation = row?.role || row?.designation || null;
    }

    const updatedStatus = await reimbursementService.updateReimbursementStatus(
      id,
      String(status).toLowerCase(),
      approver_comments,
      approver_id,
      approver_name,
      approver_designation,
      project
    );

    res.json({ message: `Reimbursement ${status}`, data: updatedStatus });
  } catch (error) {
    console.error("Error updating reimbursement status:", error);
    res.status(500).json({ error: "Error updating reimbursement status" });
  }
};

exports.deleteReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id required" });

    await reimbursementService.deleteReimbursement(id);
    res.json({ message: "Reimbursement deleted" });
  } catch (error) {
    console.error("Error deleting reimbursement:", error);
    res.status(500).json({ error: "Error deleting reimbursement" });
  }
};

exports.uploadReimbursementAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Error uploading file" });
  }
};

exports.getAttachments = async (req, res) => {
  try {
    const { year, month, employeeId, filename } = req.params;
    if (!year || !month || !employeeId || !filename) {
      return res.status(400).json({ error: "Missing path parameters" });
    }

    if (
      [year, month, employeeId, filename].some(
        (p) => p.includes("..") || p.includes("/") || p.includes("\\")
      )
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(
      __dirname,
      "..",
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
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ error: "Error fetching file" });
  }
};

exports.getAttachmentsByReimbursementId = async (req, res) => {
  try {
    const { reimbursementId } = req.params;
    if (!reimbursementId) {
      return res.status(400).json({ message: "Reimbursement ID is required" });
    }

    const attachments =
      await reimbursementService.getAttachmentsByReimbursementIds([
        reimbursementId,
      ]);
    if (!attachments || attachments.length === 0) {
      return res.status(404).json({ message: "No attachments found." });
    }
    res.json({ attachments });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTeamReimbursements = async (req, res) => {
  try {
    const { teamLeadId } = req.params;
    const { departmentId } = req.query;
    let { submittedFrom, submittedTo } = req.query;

    if (!teamLeadId) {
      return res.status(400).json({ error: "Team Lead ID is required" });
    }
    if (!departmentId) {
      return res.status(400).json({ error: "Department ID is required" });
    }

    const start =
      submittedFrom && submittedFrom !== "null" ? submittedFrom : null;
    const end = submittedTo && submittedTo !== "null" ? submittedTo : null;

    const teamReimbursements = await reimbursementService.getTeamReimbursements(
      departmentId,
      start,
      end,
      teamLeadId
    );
    res.status(200).json(teamReimbursements);
  } catch (error) {
    console.error("Error fetching team reimbursements:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await reimbursementService.getAllProjects();
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.upload = upload;
