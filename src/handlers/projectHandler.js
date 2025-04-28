const projectService = require("../services/projectService");

exports.createProject = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debug incoming text fields
    console.log("Uploaded Files:", req.files); // Debug uploaded files

    // Destructure other fields from req.body
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
          req.body.monthly_fixed_amount || 0,
          req.body.service_description || null,
          req.body.month_year || null,
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
    //    Pull top‑level month_year (e.g. "April 2025")
    const month_year = req.body.month_year || null;

    let parsedFinancial = [];
    if (financialDetails) {
      parsedFinancial =
        typeof financialDetails === "string"
          ? JSON.parse(financialDetails)
          : financialDetails;
    }

    if (Array.isArray(parsedFinancial) && parsedFinancial.length > 0) {
      // Optionally link milestone_id by matching details
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

      // Inside your loop for parsedFinancial
      for (const fin of parsedFinancial) {
        if (!fin.milestone_id) {
          console.error("Skipping financial detail without milestone_id", fin);
          continue;
        }

        // Shared topline values
        const project_amount = Number(req.body.project_amount) || 0;
        const tds_percentage = Number(req.body.tds_percentage) || 0;
        const tds_amount = Number(req.body.tds_amount) || 0;
        const gst_percentage = Number(req.body.gst_percentage) || 0;
        const gst_amount = Number(req.body.gst_amount) || 0;
        const total_amount = Number(req.body.total_amount) || 0;

        const monthly_fixed_amount =
          fin.monthly_fixed_amount != null &&
          fin.monthly_fixed_amount !== "" &&
          fin.monthly_fixed_amount !== "null"
            ? Number(fin.monthly_fixed_amount)
            : req.body.monthly_fixed_amount != null &&
              req.body.monthly_fixed_amount !== "null"
            ? Number(req.body.monthly_fixed_amount)
            : 0;

        const service_description =
          fin.service_description != null &&
          fin.service_description !== "" &&
          fin.service_description !== "null"
            ? fin.service_description
            : req.body.service_description &&
              req.body.service_description !== "null"
            ? req.body.service_description
            : null;

        // Per‑row actuals
        const m_actual_percentage = Number(fin.m_actual_percentage) || 0;
        const m_actual_amount = Number(fin.m_actual_amount) || 0;
        const m_tds_percentage = Number(fin.m_tds_percentage) || 0;
        const m_tds_amount = Number(fin.m_tds_amount) || 0;
        const m_gst_percentage = Number(fin.m_gst_percentage) || 0;
        const m_gst_amount = Number(fin.m_gst_amount) || 0;
        const m_total_amount = Number(fin.m_total_amount) || 0;

        // Format completed_date
        const formattedCompleted = fin.completed_date
          ? new Date(fin.completed_date)
              .toISOString()
              .slice(0, 19)
              .replace("T", " ")
          : null;

        if (payment_type === "Monthly Scheduled") {
          // 8a. For monthly, insert when month_year is new
          const existing =
            await projectService.getFinancialDetailByMilestoneAndMonthYear(
              fin.milestone_id,
              month_year
            );

          if (existing) {
            // update existing row
            await projectService.updateFinancialDetails([
              project_amount,
              tds_percentage,
              tds_amount,
              gst_percentage,
              gst_amount,
              total_amount,
              monthly_fixed_amount, // This will be null if not provided
              service_description, // This will be null if not provided
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
              fin.milestone_id,
              existing.id,
            ]);
          } else {
            // insert new row
            const newId = await projectService.addFinancialDetails([
              fin.milestone_id,
              project_amount,
              tds_percentage,
              tds_amount,
              gst_percentage,
              gst_amount,
              total_amount,
              monthly_fixed_amount, // This will be null if not provided
              service_description, // This will be null if not provided
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
            fin.id = newId;
          }
        } else {
          const financialId = fin.id || null; // Instead of undefined

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
            fin.milestone_id,
            financialId, // <-- use this
          ]);
        }
      }
    } else {
      console.log("No financial details provided; skipping.");
    }

    return res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
