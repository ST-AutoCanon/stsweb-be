const projectService = require("../services/projectService");

exports.createProject = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const {
      country,
      state,
      company_name,
      project_name,
      project_poc_name,
      project_poc_contact,
      company_gst,
      company_pan,
      company_address,
      project_category,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      payment_type,
      description,
      month_year, // extract top-level month_year if provided
    } = req.body;

    const projectCategoryJson =
      typeof project_category === "string"
        ? project_category
        : JSON.stringify(project_category);

    const employeeListJson = req.body.employee_list
      ? typeof req.body.employee_list === "string"
        ? req.body.employee_list
        : JSON.stringify(req.body.employee_list)
      : JSON.stringify([]);

    const attachments =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    const projectId = await projectService.addProject([
      country,
      state,
      company_name,
      project_name,
      project_poc_name,
      project_poc_contact,
      company_gst,
      company_pan,
      company_address,
      projectCategoryJson,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      payment_type,
      description,
      JSON.stringify(attachments),
    ]);

    await projectService.addSTSOwner([
      projectId,
      req.body.sts_owner_id,
      req.body.sts_owner,
      req.body.sts_contact,
      employeeListJson,
      req.body.key_considerations,
    ]);

    let milestoneIds = [];
    const { milestones = [] } = req.body;
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

    console.log("Stored Milestone IDs:", milestoneIds);

    // Insert Financial Details with monthly scheduled support
    let { financialDetails = [] } = req.body;
    const parsedFinancialDetails =
      typeof financialDetails === "string"
        ? JSON.parse(financialDetails)
        : financialDetails;

    if (Array.isArray(parsedFinancialDetails)) {
      for (const financial of parsedFinancialDetails) {
        // try to find milestone; monthly scheduled can omit milestones
        const milestone = milestoneIds.find(
          (m) => m.details === financial.milestone_details
        );
        let milestoneId = milestone ? milestone.id : null;
        // skip only if non-monthly and no milestone
        if (payment_type !== "Monthly Scheduled" && !milestoneId) continue;

        // for monthly scheduled without milestones, allow null milestoneId

        // Top-line values
        const project_amount = Number(req.body.project_amount) || 0;
        const tds_percentage = Number(req.body.tds_percentage) || 0;
        const tds_amount = Number(req.body.tds_amount) || 0;
        const gst_percentage = Number(req.body.gst_percentage) || 0;
        const gst_amount = Number(req.body.gst_amount) || 0;
        const total_amount = Number(req.body.total_amount) || 0;

        const monthly_fixed_amount = Number(req.body.monthly_fixed_amount) || 0;
        const service_description = req.body.service_description || null;

        const m_actual_percentage = Number(financial.m_actual_percentage) || 0;
        const m_actual_amount = Number(financial.m_actual_amount) || 0;
        const m_tds_percentage = Number(financial.m_tds_percentage) || 0;
        const m_tds_amount = Number(financial.m_tds_amount) || 0;
        const m_gst_percentage = Number(financial.m_gst_percentage) || 0;
        const m_gst_amount = Number(financial.m_gst_amount) || 0;
        const m_total_amount = Number(financial.m_total_amount) || 0;

        const completedDate = financial.completed_date
          ? new Date(financial.completed_date)
              .toISOString()
              .slice(0, 19)
              .replace("T", " ")
          : null;

        if (payment_type === "Monthly Scheduled") {
          await projectService.addFinancialDetails([
            projectId,
            milestoneId, // can be null
            project_amount,
            tds_percentage,
            tds_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            monthly_fixed_amount,
            service_description,
            month_year || null,
            m_actual_percentage,
            m_actual_amount,
            m_tds_percentage,
            m_tds_amount,
            m_gst_percentage,
            m_gst_amount,
            m_total_amount,
            financial.status || "Pending",
            completedDate,
          ]);
        } else {
          await projectService.addFinancialDetails([
            projectId,
            milestoneId,
            project_amount,
            tds_percentage,
            tds_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            monthly_fixed_amount,
            service_description,
            null,
            m_actual_percentage,
            m_actual_amount,
            m_tds_percentage,
            m_tds_amount,
            m_gst_percentage,
            m_gst_amount,
            m_total_amount,
            financial.status || "Pending",
            completedDate,
          ]);
        }
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

// controllers/projectController.js

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      country,
      state,
      company_name,
      project_name,
      project_poc_name,
      project_poc_contact,
      company_gst,
      company_pan,
      company_address,
      project_category,
      start_date,
      end_date,
      service_mode,
      service_location,
      project_status,
      payment_type,
      description,
      employee_list,
      milestones,
      financialDetails,
    } = req.body;

    console.log("Request Body", req.body);
    console.log("Uploaded Files:", req.files);

    // 1. Fetch existing project
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 2. Handle attachments
    let attachmentsArr = [];
    if (req.files && req.files.length > 0) {
      attachmentsArr = req.files.map((f) => f.filename);
    } else if (req.body.attachment_url) {
      attachmentsArr =
        typeof req.body.attachment_url === "string"
          ? JSON.parse(req.body.attachment_url)
          : req.body.attachment_url;
    } else {
      attachmentsArr = existingProject.attachment_url || [];
    }
    const attachmentsJson = JSON.stringify(attachmentsArr);

    // 3. JSON‑encode arrays
    const projectCategoryJson =
      typeof project_category === "string"
        ? project_category
        : JSON.stringify(project_category || []);
    const employeeListJson =
      typeof employee_list === "string"
        ? employee_list
        : JSON.stringify(employee_list || []);

    // 4. Format project dates
    const formattedStartDate = start_date
      ? new Date(start_date).toISOString().split("T")[0]
      : null;
    const formattedEndDate = end_date
      ? new Date(end_date).toISOString().split("T")[0]
      : null;

    // 5. Update core project row
    await projectService.updateProject(id, [
      country,
      state,
      company_name,
      project_name,
      project_poc_name,
      project_poc_contact,
      company_gst,
      company_pan,
      company_address,
      projectCategoryJson,
      formattedStartDate,
      formattedEndDate,
      service_mode,
      service_location,
      project_status,
      payment_type,
      description,
      attachmentsJson,
      id,
    ]);

    // 6. Update STS owner block
    await projectService.updateSTSOwner(id, [
      req.body.sts_owner_id,
      req.body.sts_owner,
      req.body.sts_contact,
      employeeListJson,
      req.body.key_considerations,
      id,
    ]);

    // 7. Sync milestones
    let parsedMilestones = [];
    if (milestones) {
      parsedMilestones =
        typeof milestones === "string" ? JSON.parse(milestones) : milestones;
    }
    if (Array.isArray(parsedMilestones)) {
      for (const m of parsedMilestones) {
        const start = m.start_date
          ? new Date(m.start_date).toISOString().split("T")[0]
          : null;
        const end = m.end_date
          ? new Date(m.end_date).toISOString().split("T")[0]
          : null;

        if (m.id) {
          await projectService.updateMilestone(m.id, [
            m.details,
            start,
            end,
            m.status,
            m.dependency,
            m.assigned_to,
            m.id,
          ]);
        } else {
          const newMilestoneId = await projectService.addMilestone([
            id,
            m.details,
            start,
            end,
            m.status,
            m.dependency,
            m.assigned_to,
          ]);
          m.id = newMilestoneId;
        }
      }
    }

    // 8. Handle financial details
    const month_year = req.body.month_year || null;

    let parsedFinancial = [];
    if (financialDetails) {
      parsedFinancial =
        typeof financialDetails === "string"
          ? JSON.parse(financialDetails)
          : financialDetails;
    }

    if (Array.isArray(parsedFinancial) && parsedFinancial.length > 0) {
      // link milestone_id by matching details if needed
      if (Array.isArray(parsedMilestones)) {
        parsedFinancial.forEach((f) => {
          if (!f.milestone_id && f.milestone_details) {
            const match = parsedMilestones.find(
              (m) => m.details === f.milestone_details
            );
            if (match) f.milestone_id = match.id;
          }
        });
      }

      for (const fin of parsedFinancial) {
        // determine milestoneId (null if missing)
        const milestoneId = fin.milestone_id || null;
        // skip only non-monthly entries lacking a milestone
        if (payment_type !== "Monthly Scheduled" && !milestoneId) {
          console.error("Skipping financial detail without milestone_id", fin);
          continue;
        }

        // shared top-line values
        const project_amount = Number(req.body.project_amount) || 0;
        const tds_percentage = Number(req.body.tds_percentage) || 0;
        const tds_amount = Number(req.body.tds_amount) || 0;
        const gst_percentage = Number(req.body.gst_percentage) || 0;
        const gst_amount = Number(req.body.gst_amount) || 0;
        const total_amount = Number(req.body.total_amount) || 0;

        const monthly_fixed_amount =
          fin.monthly_fixed_amount != null && fin.monthly_fixed_amount !== ""
            ? Number(fin.monthly_fixed_amount)
            : Number(req.body.monthly_fixed_amount) || 0;

        const service_description =
          fin.service_description != null && fin.service_description !== ""
            ? fin.service_description
            : req.body.service_description || null;

        const m_actual_percentage = Number(fin.m_actual_percentage) || 0;
        const m_actual_amount = Number(fin.m_actual_amount) || 0;
        const m_tds_percentage = Number(fin.m_tds_percentage) || 0;
        const m_tds_amount = Number(fin.m_tds_amount) || 0;
        const m_gst_percentage = Number(fin.m_gst_percentage) || 0;
        const m_gst_amount = Number(fin.m_gst_amount) || 0;
        const m_total_amount = Number(fin.m_total_amount) || 0;

        const formattedCompleted = fin.completed_date
          ? new Date(fin.completed_date)
              .toISOString()
              .slice(0, 19)
              .replace("T", " ")
          : null;

        if (payment_type === "Monthly Scheduled") {
          // always insert new monthly row (milestoneId can be null)
          await projectService.addFinancialDetails([
            id,
            milestoneId,
            project_amount,
            tds_percentage,
            tds_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            monthly_fixed_amount,
            service_description,
            month_year,
            m_actual_percentage,
            m_actual_amount,
            m_tds_percentage,
            m_tds_amount,
            m_gst_percentage,
            m_gst_amount,
            m_total_amount,
            fin.status || "Pending",
            formattedCompleted,
          ]);
        } else {
          // update existing or insert if id missing
          const finId = fin.id || null;
          await projectService.updateFinancialDetails([
            project_amount,
            tds_percentage,
            tds_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            monthly_fixed_amount,
            service_description,
            month_year,
            m_actual_percentage,
            m_actual_amount,
            m_tds_percentage,
            m_tds_amount,
            m_gst_percentage,
            m_gst_amount,
            m_total_amount,
            fin.status || "Pending",
            formattedCompleted,
            milestoneId,
            finId,
          ]);
        }
      }
    }

    return res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
