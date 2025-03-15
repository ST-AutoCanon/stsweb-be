const reimbursementService = require("../services/reimbursementService");
const path = require("path");
const fs = require("fs");
const { generateDocx } = require("../services/docxService");
const { convertDocxToPdf } = require("../services/pdfService");
const db = require("../config");
const queries = require("../constants/reimbursementQueries");


exports.generateReimbursementPDF = async (req, res) => {
    try {
        const { claimId } = req.params;
        console.log("Fetching claim details for Claim ID:", claimId);

        // Fetch claim details
        const claimResult = await db.query(queries.GET_CLAIM_DETAILS, [claimId]);
        if (!claimResult.length) {
            console.error("❌ Claim not found for Claim ID:", claimId);
            return res.status(404).json({ error: "Claim not found" });
        }

        let claim = claimResult && claimResult.length ? claimResult[0] : null;

// Ensure claim is an object, not an array
if (Array.isArray(claim)) {
    claim = claim[0]; // Extract first object inside the array
}

if (!claim || !claim.employee_id) {
    console.error("❌ Claim extraction failed or Employee ID is missing!", claim);
    return res.status(404).json({ error: "Claim not found" });
}

console.log("✅ Claim after extraction:", claim);
console.log("🔍 Searching Employee ID:", claim.employee_id);

const employeeResult = await db.query(queries.GET_EMPLOYEE_DETAILS, [claim.employee_id]);

console.log("🟡 Raw Employee Result:", employeeResult);

// ✅ Fix: Ensure we extract the first row correctly
const employee = employeeResult[0] && Array.isArray(employeeResult[0]) ? employeeResult[0][0] : null;

console.log("✅ Extracted Employee:", employee);

if (!employee || !employee.name) {
    console.error("❌ Employee details extraction failed:", employee);
    return res.status(404).json({ error: "Employee details not found" });
}


        // Fetch attachments
        const rawAttachments = await db.query(queries.GET_ATTACHMENTS, [claimId]);

// Flatten the array to get only objects
const attachments = rawAttachments.flat();

console.log("✅ Flattened Attachments:", attachments);

attachments.forEach((att, index) => {
    console.log(`Attachment ${index + 1}:`, att);
   
    if (!att || !att.file_path) {
        console.error(`⚠️ Attachment ${index + 1} is missing a file path:`, att);
        return; // Skip this iteration
    }

    if (!fs.existsSync(att.file_path)) {
        console.error(`⚠️ File does not exist: ${att.file_path}`);
    } else {
        console.log(`✅ Valid attachment found: ${att.file_path}`);
    }
});


        // Generate DOCX file
        const docxPath = await generateDocx(claim, employee, attachments);

        // Convert to PDF & merge attachments
        const pdfPath = await convertDocxToPdf(docxPath, claim, attachments);


        // Send final PDF for download
        res.download(pdfPath, `Reimbursement_${claimId}.pdf`, (err) => {
            if (err) {
                console.error("❌ Download error:", err);
            }
            // Clean up files after sending
            fs.unlinkSync(docxPath);
            fs.unlinkSync(pdfPath);
        });

    } catch (error) {
        console.error("❌ Error generating reimbursement PDF:", error);
        res.status(500).json({ error: "Failed to generate document" });
    }
};



exports.getReimbursementsByEmployee = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const { fromDate, toDate } = req.query;

        const reimbursements = await reimbursementService.getReimbursementsByEmployee(employeeId, fromDate, toDate);
        res.status(200).json(reimbursements);
    } catch (error) {
        console.error("Error fetching reimbursements:", error);
        res.status(500).json({ message: "Failed to fetch reimbursements" });
    }
};

exports.getAllReimbursements = async (req, res) => {
    try {
        let { fromDate, toDate } = req.query;

        // Ensure dates are properly formatted or set to null
        fromDate = fromDate && fromDate !== 'null' ? fromDate : null;
        toDate = toDate && toDate !== 'null' ? toDate : null;

        const reimbursements = await reimbursementService.getAllReimbursements(fromDate, toDate);
        res.status(200).json(reimbursements);
    } catch (error) {
        console.error("Error fetching all reimbursements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.createReimbursement = async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        console.log("Uploaded Files:", req.files);

        const reimbursementData = {
            employeeId: req.body.employeeId,
            department_id: req.body.department_id,
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
            purchasing_item: req.body.purchasing_item,
            accommodation_fees: req.body.accommodation_fees,
            no_of_days: req.body.no_of_days,
            total_amount: req.body.total_amount,
            meal_type: req.body.meal_type,
            stationary: req.body.stationary,
            service_provider: req.body.service_provider,
            attachments: req.files ? req.files.map(file => ({
                file_name: file.filename,
                file_path: file.path
            })) : []
        };

        const newReimbursement = await reimbursementService.createReimbursement(reimbursementData);

        res.status(201).json({
            message: "Reimbursement request submitted successfully",
            data: newReimbursement,
        });

    } catch (error) {
        console.error("Error creating reimbursement:", error);

        // Send specific error message if it's a known issue
        if (error.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: "Error creating reimbursement" });
    }
};


exports.updateReimbursement = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Update Body:", req.body);
        console.log("Uploaded Files:", req.files);

        // Convert string fields to numbers where necessary
        const updateData = {
            employeeId: req.body.employeeId,
            department_id: parseInt(req.body.department_id, 10) || null, // Convert to number if needed
            claim_type: req.body.claim_type,
            comments: req.body.comments !== "undefined" ? req.body.comments : "",
            fromDate: req.body.fromDate || null,
            toDate: req.body.toDate || null,
            date: req.body.date || null,
            travel_from: req.body.travel_from || null,
            travel_to: req.body.travel_to || null,
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
            attachments: req.files ? req.files.map(file => file.path) : [], // Store file paths
        };

        console.log("Final Update Data:", updateData);

        // Pass the data to the service function
        const updatedReimbursement = await reimbursementService.updateReimbursement(id, updateData);

        res.json({ message: "Reimbursement updated", data: updatedReimbursement });
    } catch (error) { 
        console.error("Error updating reimbursement:", error);
        res.status(500).json({ error: "Error updating reimbursement" });
    }
};



exports.updateReimbursementStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approver_comments, approver_id } = req.body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Allowed values: 'approved', 'rejected'" });
        }

        console.log("Received Request to Update Reimbursement Status");
        console.log("Request Body:", req.body);

        // Fetch approver details
const approverDetails = await reimbursementService.getApproverDetails(approver_id);

console.log("Approver Details Retrieved (Raw):", approverDetails);

// Extract actual data correctly
const { name: approver_name, role: approver_designation } = approverDetails[0] || {};

console.log("Extracted Approver Name:", approver_name);
console.log("Extracted Approver Designation:", approver_designation);

// Pass correct values to update function
const updatedStatus = await reimbursementService.updateReimbursementStatus(
    id,
    status,
    approver_comments,
    approver_id,
    approver_name,
    approver_designation
);


        console.log("Reimbursement Update Response:", updatedStatus);

        res.json({ message: `Reimbursement ${status}`, data: updatedStatus });
    } catch (error) {
        console.error("Error updating reimbursement status:", error);
        res.status(500).json({ error: "Error updating reimbursement status" });
    }
};



exports.deleteReimbursement = async (req, res) => {
    try {
        const { id } = req.params;
        await reimbursementService.deleteReimbursement(id);
        res.json({ message: "Reimbursement deleted" });
    } catch (error) { 
        console.error("Error deleting reimbursement:", error);
        res.status(500).json({ error: "Error deleting reimbursement" });
    }
};

// Handle reimbursement file uploads
exports.uploadReimbursementAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        res.json({ message: "File uploaded successfully", filename: req.file.filename });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Error uploading file" });
    }
};

// Fetch reimbursement attachments securely
exports.getAttachments = async (req, res) => {
    try {
        const { year, month, employeeId, filename } = req.params;

        // Validate filename input to prevent security issues
        if ([year, month, employeeId, filename].some((param) => param.includes("..") || param.includes("/"))) {
            return res.status(400).json({ error: "Invalid filename" });
        }

        const filePath = path.join(__dirname, "..", "reimbursement", year, month, employeeId, filename);

        if (fs.existsSync(filePath)) {
            const mimeType = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".pdf": "application/pdf",
            }[path.extname(filename).toLowerCase()] || "application/octet-stream";

            res.setHeader("Content-Type", mimeType);
            res.setHeader("Content-Disposition", `inline; filename=${filename}`);

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
            console.error("Missing reimbursement ID in request.");
            return res.status(400).json({ message: "Reimbursement ID is required" });
        }

        // Fetch attachments from the service
        const attachments = await reimbursementService.getAttachmentsByReimbursementIds([reimbursementId]);

        if (!attachments || attachments.length === 0) {
            console.warn(`No attachments found for reimbursement ID ${reimbursementId}`);
            return res.status(404).json({ message: "No attachments found for this reimbursement." });
        }

        res.json({ attachments });
    } catch (error) {
        console.error(" Error fetching attachments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getTeamReimbursements = async (req, res) => {
    try {
        // Read departmentId directly from query parameters
        const { departmentId, fromDate, toDate } = req.query;
        if (!departmentId) {
            return res.status(400).json({ error: "Department ID is required" });
        }
        
        // Convert empty date filters to null
        const effectiveFromDate = fromDate && fromDate.trim() !== "" ? fromDate : null;
        const effectiveToDate = toDate && toDate.trim() !== "" ? toDate : null;
        
        // Fetch reimbursements using the optional date filters
        const teamReimbursements = await reimbursementService.getTeamReimbursements(
            departmentId, effectiveFromDate, effectiveToDate
        );
        res.status(200).json(teamReimbursements);
    } catch (error) {
        console.error("Error fetching team reimbursements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
