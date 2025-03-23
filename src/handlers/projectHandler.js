const projectService = require("../services/projectService");

exports.createProject = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debug incoming text fields
    console.log("Uploaded Files:", req.files); // Debug uploaded files

    // Destructure other fields from req.body
    const {
      company_name,
      project_name,
      project_poc,
      company_gst,
      company_pan,
      company_address,
      project_category,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      description,
    } = req.body;

    // For fields that represent arrays (like project_category or employee_list),
    // they might be received as JSON strings. Adjust as needed.
    const projectCategoryJson =
      typeof project_category === "string"
        ? project_category
        : JSON.stringify(project_category);

    const employeeListJson = req.body.employee_list
      ? typeof req.body.employee_list === "string"
        ? req.body.employee_list
        : JSON.stringify(req.body.employee_list)
      : JSON.stringify([]);

    // Extract file information from req.files.
    // For example, store the filenames (or you can use file.path if you need the full path).
    const attachments =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    // Insert Project. Pass the attachments as a JSON string.
    const projectId = await projectService.addProject([
      company_name,
      project_name,
      project_poc,
      company_gst,
      company_pan,
      company_address,
      projectCategoryJson,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      description,
      JSON.stringify(attachments),
    ]);

    // Insert STS Owner
    await projectService.addSTSOwner([
      projectId,
      req.body.sts_owner_id,
      req.body.sts_owner,
      req.body.sts_contact,
      employeeListJson, // Store employee_list as JSON
      req.body.key_considerations,
    ]);

    // Insert Milestones and collect their IDs
    let milestoneIds = [];
    const { milestones = [] } = req.body; // milestones may come as a JSON string; adjust if needed.
    // If milestones is a string, parse it
    const parsedMilestones =
      typeof milestones === "string" ? JSON.parse(milestones) : milestones;
    if (Array.isArray(parsedMilestones)) {
      for (const milestone of parsedMilestones) {
        const milestoneId = await projectService.addMilestone([
          projectId,
          milestone.details,
          milestone.start_date,
          milestone.end_date,
          milestone.status,
          milestone.dependency,
          milestone.assigned_to,
        ]);
        milestoneIds.push({ id: milestoneId, details: milestone.details });
      }
    }

    console.log("Stored Milestone IDs:", milestoneIds); // Debugging

    // Insert Financial Details
    let { financialDetails = [] } = req.body;
    const parsedFinancialDetails =
      typeof financialDetails === "string"
        ? JSON.parse(financialDetails)
        : financialDetails;
    if (Array.isArray(parsedFinancialDetails)) {
      for (const financial of parsedFinancialDetails) {
        // Find the corresponding milestone ID based on milestone details
        const milestone = milestoneIds.find(
          (m) => m.details === financial.milestone_details
        );
        const milestoneId = milestone ? milestone.id : null;

        if (!milestoneId) {
          console.error(
            "Milestone ID not found for",
            financial.milestone_details
          );
          continue; // Skip this financial entry if no matching milestone is found
        }

        await projectService.addFinancialDetails([
          projectId,
          milestoneId,
          req.body.project_amount || 0,
          req.body.tds_percentage || 0,
          req.body.tds_amount || 0,
          req.body.gst_percentage || 0,
          req.body.gst_amount || 0,
          req.body.total_amount || 0,
          financial.m_actual_percentage || 0,
          financial.m_actual_amount || 0,
          financial.m_tds_percentage || 0,
          financial.m_tds_amount || 0,
          financial.m_gst_percentage || 0,
          financial.m_gst_amount || 0,
          financial.m_total_amount || 0,
          financial.status || "Pending",
        ]);
      }
    }

    res
      .status(201)
      .json({ message: "Project created successfully", projectId });
  } catch (error) {
    console.error("Error creating project:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getEmployeeProjects = async (req, res) => {
  try {
    // Assume employeeId is passed as a query parameter
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }
    const projects = await projectService.getEmployeeProjects(employeeId);
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error fetching employee projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const employees = await projectService.searchEmployees(search);
    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    console.log("Session ID on GET:", req.sessionID);
    console.log("Session data on GET:", req.session);
    const { id } = req.params;
    const project = await projectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Read userRole from session
    const userRole = req.session.userRole;
    console.log("User role from session:", userRole);

    // If the user is Employee or Team Lead, remove sensitive financial fields.
    if (userRole === "Employee" || userRole === "Team Lead") {
      // Remove the project-level financial fields
      delete project.project_amount;
      delete project.tds_percentage;
      delete project.tds_amount;
      delete project.gst_percentage;
      delete project.gst_amount;
      delete project.total_amount;

      // Remove the raw aggregated financial_details if present
      delete project.financial_details;

      // Also, set the parsed financialDetails to an empty array
      project.financialDetails = [];
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Destructure fields from req.body
    const {
      company_name,
      project_name,
      project_poc,
      company_gst,
      company_pan,
      company_address,
      project_category,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      description,
      employee_list,
      milestones,
      financialDetails,
    } = req.body;

    console.log("Request Body", req.body);
    console.log("Uploaded Files:", req.files);

    // Get the existing project so we can fallback on its attachments if needed
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Determine attachments:
    let attachmentsArr = [];
    if (req.files && req.files.length > 0) {
      attachmentsArr = req.files.map((file) => file.filename);
    } else if (req.body.attachment_url) {
      attachmentsArr =
        typeof req.body.attachment_url === "string"
          ? JSON.parse(req.body.attachment_url)
          : req.body.attachment_url;
    } else {
      // Fallback to previously stored attachments if update form does not send them
      attachmentsArr = existingProject.attachment_url || [];
    }
    const attachmentsJson = JSON.stringify(attachmentsArr);

    // Convert JSON fields
    const projectCategoryJson =
      typeof project_category === "string"
        ? project_category
        : JSON.stringify(project_category || []);
    const employeeListJson =
      typeof employee_list === "string"
        ? employee_list
        : JSON.stringify(employee_list || []);

    // Format dates for project
    const formattedStartDate = start_date
      ? new Date(start_date).toISOString().split("T")[0]
      : null;
    const formattedEndDate = end_date
      ? new Date(end_date).toISOString().split("T")[0]
      : null;

    // Update project details (pass attachmentsJson)
    await projectService.updateProject(id, [
      company_name,
      project_name,
      project_poc,
      company_gst,
      company_pan,
      company_address,
      projectCategoryJson,
      formattedStartDate,
      formattedEndDate,
      service_mode,
      service_location,
      project_status,
      description,
      attachmentsJson,
      id,
    ]);

    // Update STS Owner
    await projectService.updateSTSOwner(id, [
      req.body.sts_owner_id,
      req.body.sts_owner,
      req.body.sts_contact,
      employeeListJson,
      req.body.key_considerations,
      id,
    ]);

    // Update milestones
    let parsedMilestones = [];
    if (milestones) {
      parsedMilestones =
        typeof milestones === "string" ? JSON.parse(milestones) : milestones;
    }

    if (Array.isArray(parsedMilestones)) {
      for (const milestone of parsedMilestones) {
        const formattedMilestoneStart = milestone.start_date
          ? new Date(milestone.start_date).toISOString().split("T")[0]
          : null;
        const formattedMilestoneEnd = milestone.end_date
          ? new Date(milestone.end_date).toISOString().split("T")[0]
          : null;

        if (milestone.id) {
          // Update existing milestone (including the status)
          await projectService.updateMilestone(milestone.id, [
            milestone.details,
            formattedMilestoneStart,
            formattedMilestoneEnd,
            milestone.status, // this should be "Completed" if sent that way
            milestone.dependency,
            milestone.assigned_to,
            milestone.id,
          ]);
        } else {
          // Insert new milestone and capture its new id
          const newMilestoneId = await projectService.addMilestone([
            id,
            milestone.details,
            formattedMilestoneStart,
            formattedMilestoneEnd,
            milestone.status,
            milestone.dependency,
            milestone.assigned_to,
          ]);
          milestone.id = newMilestoneId;
        }
      }
    }

    // Update financial details
    try {
      // Extract financialDetails from req.body and parse if it's a string
      let { financialDetails = [] } = req.body;
      const parsedFinancialDetails =
        typeof financialDetails === "string"
          ? JSON.parse(financialDetails)
          : financialDetails;

      if (
        Array.isArray(parsedFinancialDetails) &&
        parsedFinancialDetails.length > 0
      ) {
        // Synchronize financialDetails with milestones based on a common field
        if (Array.isArray(milestones)) {
          parsedFinancialDetails.forEach((finance) => {
            if (!finance.milestone_id) {
              const matchedMilestone = milestones.find(
                (m) => m.details === finance.milestone_details
              );
              if (matchedMilestone) {
                finance.milestone_id = matchedMilestone.id;
              } else {
                console.error(
                  "No matching milestone found for:",
                  finance.milestone_details
                );
              }
            }
          });
        }

        for (const financial of parsedFinancialDetails) {
          if (!financial.milestone_id) {
            console.error(
              "Missing milestone_id for financial detail",
              financial
            );
            continue;
          }

          // Convert values to numbers for consistency
          const project_amount = Number(req.body.project_amount) || 0;
          const tds_percentage = Number(req.body.tds_percentage) || 0;
          const tds_amount = Number(req.body.tds_amount) || 0;
          const gst_percentage = Number(req.body.gst_percentage) || 0;
          const gst_amount = Number(req.body.gst_amount) || 0;
          const total_amount = Number(req.body.total_amount) || 0;
          const m_actual_percentage =
            Number(financial.m_actual_percentage) || 0;
          const m_actual_amount = Number(financial.m_actual_amount) || 0;
          const m_tds_percentage = Number(financial.m_tds_percentage) || 0;
          const m_tds_amount = Number(financial.m_tds_amount) || 0;
          const m_gst_percentage = Number(financial.m_gst_percentage) || 0;
          const m_gst_amount = Number(financial.m_gst_amount) || 0;
          const m_total_amount = Number(financial.m_total_amount) || 0;

          // Format completed_date if provided, else set to null
          const formattedCompletedDate = financial.completed_date
            ? new Date(financial.completed_date)
                .toISOString()
                .slice(0, 19)
                .replace("T", " ")
            : null;

          let updateParams = [
            project_amount,
            tds_percentage,
            tds_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            m_actual_percentage,
            m_actual_amount,
            m_tds_percentage,
            m_tds_amount,
            m_gst_percentage,
            m_gst_amount,
            m_total_amount,
            financial.status || "Pending",
            formattedCompletedDate,
            financial.milestone_id,
            financial.id, // Unique financial detail ID for WHERE clause
          ];

          // Sanitize parameters: replace undefined with null
          updateParams = updateParams.map((param) =>
            param === undefined ? null : param
          );

          console.log(
            "Sanitized Update Financial Details Params:",
            updateParams
          );
          await projectService.updateFinancialDetails(updateParams);
        }
      } else {
        console.log(
          "No financial details provided; skipping financial details update."
        );
      }
    } catch (financialError) {
      console.error(
        "Error updating financial details (ignored):",
        financialError
      );
    }

    res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
