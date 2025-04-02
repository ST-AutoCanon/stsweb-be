const db = require("../config");
const queries = require("../constants/reimbursementQueries");
const path = require("path");

exports.getReimbursementsByEmployee = async (
  employeeId,
  fromDate = null,
  toDate = null
) => {
  let query = queries.GET_REIMBURSEMENTS_BY_EMPLOYEE;
  let queryParams = [employeeId];

  // Dynamically append date filters only if provided
  if (fromDate) {
    query += " AND r.date >= ?";
    queryParams.push(fromDate);
  }
  if (toDate) {
    query += " AND r.date <= ?";
    queryParams.push(toDate);
  }

  query += " ORDER BY r.date DESC"; // Append ORDER BY at the end

  try {
    // Fetch reimbursements
    const [reimbursements] = await db.query(query, queryParams);

    if (!reimbursements.length) return [];

    // Fetch attachments for these reimbursements
    const reimbursementIds = reimbursements.map((r) => r.id);
    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds]
    );

    return mapAttachmentsToReimbursements(
      reimbursements,
      attachments,
      employeeId
    );
  } catch (error) {
    console.error("Error fetching reimbursements:", error);
    throw new Error("Database query failed.");
  }
};

// Utility function for mapping attachments
const mapAttachmentsToReimbursements = (
  reimbursements,
  attachments,
  employeeId
) => {
  const attachmentMap = {};

  attachments.forEach((attachment) => {
    if (!attachmentMap[attachment.reimbursement_id]) {
      attachmentMap[attachment.reimbursement_id] = [];
    }
    const { file_name, year, month } = attachment;
    attachmentMap[attachment.reimbursement_id].push({
      filename: file_name,
      url: `/reimbursement/${year}/${month}/${employeeId}/${file_name}`,
    });
  });

  reimbursements.forEach((reimbursement) => {
    reimbursement.attachments = attachmentMap[reimbursement.id] || [];
  });

  return reimbursements;
};

// New service function to update payment status and paid_date
exports.updatePaymentStatus = async (id, payment_status, paid_date) => {
  try {
    console.log("Service: Updating payment status...");
    console.log("Reimbursement ID:", id);
    console.log("New Payment Status:", payment_status);
    console.log("Paid Date:", paid_date);

    // Assumes you have defined UPDATE_PAYMENT_STATUS in your queries constants.
    const result = await db.query(queries.UPDATE_PAYMENT_STATUS, [
      payment_status,
      paid_date,
      id,
    ]);

    console.log("Database update result:", result);

    // Return an object with updated information
    return { id, payment_status, paid_date };
  } catch (error) {
    console.error("Error in updatePaymentStatus service:", error);
    throw error;
  }
};

exports.getAttachmentsByReimbursementIds = async (reimbursementIds) => {
  if (!reimbursementIds.length) return [];
  const [attachments] = await db.query(
    queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
    [reimbursementIds]
  );
  return attachments;
};

exports.getAllReimbursements = async (fromDate = null, toDate = null) => {
  try {
    const [reimbursements] = await db.query(queries.GET_ALL_REIMBURSEMENTS, [
      fromDate,
      fromDate,
      toDate, // Single-date claims
      fromDate,
      fromDate,
      toDate, // From date overlaps
      fromDate,
      fromDate,
      toDate, // To date overlaps
      fromDate,
      toDate,
      fromDate, // Full range inside a claim period
    ]);

    if (!reimbursements.length) return [];

    // Fetch attachments for all reimbursements
    const reimbursementIds = reimbursements.map((r) => r.id);
    if (reimbursementIds.length === 0) return reimbursements;

    const [attachments] = await db.query(
      queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
      [reimbursementIds]
    );

    // Map attachments to reimbursements
    const attachmentMap = {};
    attachments.forEach((attachment) => {
      if (!attachmentMap[attachment.reimbursement_id]) {
        attachmentMap[attachment.reimbursement_id] = [];
      }
      attachmentMap[attachment.reimbursement_id].push({
        filename: attachment.file_name,
        url: `/reimbursement/${attachment.year}/${attachment.month}/${attachment.employee_id}/${attachment.file_name}`,
      });
    });

    // Attach the files to each claim
    reimbursements.forEach((reimbursement) => {
      reimbursement.attachments = attachmentMap[reimbursement.id] || [];
    });

    // Group reimbursements by employee_id
    const groupedReimbursements = {};
    reimbursements.forEach((reimbursement) => {
      if (!groupedReimbursements[reimbursement.employee_id]) {
        groupedReimbursements[reimbursement.employee_id] = [];
      }
      groupedReimbursements[reimbursement.employee_id].push(reimbursement);
    });

    // Convert to array format for response
    return Object.keys(groupedReimbursements).map((employee_id) => ({
      employee_id,
      claims: groupedReimbursements[employee_id],
    }));
  } catch (error) {
    console.error("Error fetching all reimbursements:", error);
    throw new Error("Database query failed.");
  }
};

exports.createReimbursement = async (reimbursementData) => {
  try {
    console.log("Received Data in Service Layer:", reimbursementData);

    // Validate employeeId
    const employeeId = reimbursementData.employeeId;
    if (!employeeId || employeeId === "undefined") {
      throw new Error("Employee ID is invalid or missing.");
    }

    const { claim_type, date, from_date, to_date } = reimbursementData;

    let existingClaim;
    if (date) {
      // Check if a claim with the same type & date already exists
      [existingClaim] = await db.query(
        queries.CHECK_EXISTING_REIMBURSEMENT_SINGLE_DATE,
        [employeeId, claim_type, date]
      );
    } else if (from_date && to_date) {
      // Check if a claim of the same type exists within the date range
      [existingClaim] = await db.query(
        queries.CHECK_EXISTING_REIMBURSEMENT_DATE_RANGE,
        [employeeId, claim_type, from_date, to_date, from_date, to_date]
      );
    }

    if (existingClaim.length > 0) {
      const error = new Error(
        "A reimbursement claim of this type has already been submitted."
      );
      error.statusCode = 400; // Custom status code
      throw error;
    }

    // Process department_id: parse and validate
    let department_id = parseInt(reimbursementData.department_id, 10);
    if (isNaN(department_id)) {
      department_id = null;
    }

    const reimbursementArray = [
      employeeId, // Use the validated employeeId here
      department_id,
      claim_type,
      reimbursementData.transport_type || null,
      from_date || null,
      to_date || null,
      date || null,
      reimbursementData.travel_from || null,
      reimbursementData.travel_to || null,
      reimbursementData.purpose || null,
      reimbursementData.purchasing_item || null,
      reimbursementData.accommodation_fees || null,
      reimbursementData.no_of_days !== undefined
        ? reimbursementData.no_of_days
        : 0, // Default to 0
      reimbursementData.transport_amount !== undefined &&
      reimbursementData.transport_amount !== "undefined"
        ? reimbursementData.transport_amount
        : 0, // Convert 'undefined' to 0
      reimbursementData.da !== undefined && reimbursementData.da !== "undefined"
        ? reimbursementData.da
        : 0, // Convert 'undefined' to 0
      reimbursementData.total_amount !== undefined
        ? reimbursementData.total_amount
        : 0,
      reimbursementData.meal_type || null,
      reimbursementData.stationary || null,
      reimbursementData.service_provider || null,
    ];

    const [result] = await db.query(
      queries.CREATE_REIMBURSEMENT,
      reimbursementArray
    );
    const reimbursementId = result.insertId;

    if (
      reimbursementData.attachments &&
      reimbursementData.attachments.length > 0
    ) {
      const attachmentValues = reimbursementData.attachments.map((file) => [
        reimbursementId,
        file.file_name,
        file.file_path,
      ]);

      await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
    }

    return { id: reimbursementId, ...reimbursementArray };
  } catch (error) {
    console.error("Error during reimbursement creation:", error);
    throw error;
  }
};

exports.getApproverDetails = async (approver_id) => {
  console.log("Fetching approver details for Approver ID:", approver_id);

  const result = await db.query(queries.GET_APPROVER_DETAILS, [approver_id]);

  console.log("Approver Query Result:", result);

  return result.length ? result[0] : null;
};

exports.updateReimbursementStatus = async (
  id,
  status,
  approver_comments,
  approver_id,
  approver_name,
  approver_designation,
  project // New parameter
) => {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Invalid status. Allowed values: 'approved', 'rejected'");
  }

  console.log("Updating reimbursement status...");
  console.log("Reimbursement ID:", id);
  console.log("Status:", status);
  console.log("Approver ID:", approver_id);
  console.log("Approver Name:", approver_name);
  console.log("Approver Designation:", approver_designation);
  console.log("Project:", project);

  // Update query now includes the project field. Make sure your query (UPDATE_REIMBURSEMENT_STATUS) is updated accordingly.
  const result = await db.query(queries.UPDATE_REIMBURSEMENT_STATUS, [
    status,
    approver_comments,
    approver_id,
    approver_name,
    approver_designation,
    project, // Include project here
    new Date(),
    id,
  ]);

  console.log("Update Query Result:", result);

  return {
    id,
    status,
    approver_comments,
    approver_id,
    approver_name,
    approver_designation,
    project, // Return project in the response as well
    approved_date: new Date(),
  };
};

exports.deleteReimbursement = async (id) => {
  await db.query(queries.DELETE_REIMBURSEMENT, [id]);
};

exports.getAttachments = async (reimbursementId) => {
  const [rows] = await db.query(queries.GET_ATTACHMENTS, [reimbursementId]);
  return rows;
};

// In your reimbursementService.js

exports.updateReimbursement = async (reimbursementId, updateData) => {
  try {
    console.log("Received updateData in service:", updateData);

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error("updateData is missing or empty.");
    }

    const {
      department_id,
      claim_type,
      transport_type,
      fromDate,
      toDate,
      date,
      travel_from,
      travel_to,
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
      attachments, // new attachments array from updateData
    } = updateData;

    // Process department_id to ensure it's either an integer or null
    let processedDepartmentId = parseInt(department_id, 10);
    if (isNaN(processedDepartmentId)) {
      processedDepartmentId = null;
    }

    // Update the main reimbursement record
    const [result] = await db.query(queries.UPDATE_REIMBURSEMENT, [
      processedDepartmentId,
      claim_type,
      transport_type,
      fromDate,
      toDate,
      date,
      travel_from,
      travel_to,
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
      reimbursementId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("No reimbursement found or unauthorized update.");
    }

    // If new attachments are provided, replace old ones with new ones
    if (attachments && attachments.length > 0) {
      // Optionally, delete old attachments from the database
      await db.query(queries.DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID, [
        reimbursementId,
      ]);

      // Optionally, delete old files from disk
      // (Loop through the old attachments, remove the files if needed)

      // Prepare new attachment values
      // Here, we're assuming each attachment is a file path.
      // Adjust as needed if you have additional fields such as file name, year, or month.
      const attachmentValues = attachments.map((filePath) => {
        const file_name = path.basename(filePath);
        return [reimbursementId, file_name, filePath];
      });

      // Insert new attachments in bulk
      await db.query(queries.SAVE_ATTACHMENTS, [attachmentValues]);
    }

    return { success: true, message: "Reimbursement updated successfully." };
  } catch (error) {
    console.error("Error updating reimbursement:", error);
    throw error;
  }
};

exports.getTeamReimbursements = async (
  departmentId,
  effectiveFromDate,
  effectiveToDate,
  teamLeadId
) => {
  const params = [
    departmentId,
    effectiveFromDate,
    effectiveFromDate,
    effectiveToDate,
    effectiveFromDate,
    effectiveToDate,
    effectiveFromDate,
  ];

  // Fetch reimbursements
  const [reimbursements] = await db.query(
    queries.GET_TEAM_REIMBURSEMENTS,
    params
  );

  if (!reimbursements.length) return [];

  // Exclude reimbursements from the team lead (self)
  const filteredReimbursements = reimbursements.filter(
    (r) => r.employee_id !== teamLeadId
  );

  // Fetch attachments for these filtered reimbursements
  const reimbursementIds = filteredReimbursements.map((r) => r.id);
  const safeIds = reimbursementIds.length ? reimbursementIds : [-1];

  const [attachments] = await db.query(
    queries.GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS,
    [safeIds]
  );

  // Map attachments to reimbursements
  const attachmentMap = {};
  attachments.forEach((attachment) => {
    if (!attachmentMap[attachment.reimbursement_id]) {
      attachmentMap[attachment.reimbursement_id] = [];
    }
    attachmentMap[attachment.reimbursement_id].push({
      filename: attachment.file_name,
      url: `/reimbursement/${attachment.year}/${attachment.month}/${attachment.employee_id}/${attachment.file_name}`,
    });
  });

  // Attach the files to each reimbursement
  filteredReimbursements.forEach((reimbursement) => {
    reimbursement.attachments = attachmentMap[reimbursement.id] || [];
  });

  return filteredReimbursements;
};

exports.getAllProjects = async () => {
  try {
    const [projects] = await db.query(queries.GET_ALL_PROJECTS);

    if (!projects.length) return [];

    // Extract only project names
    return projects.map((project) => project.project_name);
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw new Error("Database query failed.");
  }
};
