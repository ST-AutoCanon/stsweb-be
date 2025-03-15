const projectService = require("../services/projectService");

exports.createProject = async (req, res) => {
    try {
        console.log("Request Body:", req.body); // Debugging incoming data

        const {
            company_name, project_name, project_poc, company_gst, company_pan, company_address,
            project_category, start_date, end_date, service_mode, service_location, project_status,
            description, attachment_url,
            sts_owners = [], milestones = [], financialDetails = []
        } = req.body;
        
        // ✅ Convert project_category & employee_list to JSON
        const projectCategoryJson = JSON.stringify(project_category);
        const employeeListJson = JSON.stringify(req.body.employee_list || []);

        // ✅ Insert Project
        const projectId = await projectService.addProject([
            company_name, project_name, project_poc, company_gst, company_pan, company_address,
            projectCategoryJson, start_date, end_date, service_mode, service_location, project_status,
            description, attachment_url
        ]);

        // ✅ Insert STS Owner
        await projectService.addSTSOwner([
            projectId,
            req.body.sts_owner_id,
            req.body.sts_owner,
            req.body.sts_contact,
            employeeListJson, // Store employee_list as JSON
            JSON.stringify(req.body.key_considerations || [])
        ]);

        // ✅ Insert Milestones and Collect Their IDs
        let milestoneIds = [];
        if (Array.isArray(milestones)) {
            for (const milestone of milestones) {
                const milestoneId = await projectService.addMilestone([
                    projectId, milestone.details, milestone.start_date,
                    milestone.end_date, milestone.status, milestone.dependency, milestone.assigned_to
                ]);
                milestoneIds.push({ id: milestoneId, details: milestone.details });
            }
        }

        console.log("Stored Milestone IDs:", milestoneIds); // Debugging

        // ✅ Insert Financial Details
        if (Array.isArray(financialDetails)) {
            for (const financial of financialDetails) {
                // ✅ Find the corresponding milestone ID
                const milestone = milestoneIds.find(m => m.details === financial.milestone_details);
                const milestoneId = milestone ? milestone.id : null;

                if (!milestoneId) {
                    console.error("Milestone ID not found for", financial.milestone_details);
                    continue; // Skip this financial entry if no matching milestone is found
                }

                await projectService.addFinancialDetails([
                    projectId, milestoneId, 
                    req.body.project_amount || 0, req.body.tds_percentage || 0, req.body.tds_amount || 0, 
                    req.body.gst_percentage || 0, req.body.gst_amount || 0, req.body.total_amount || 0,
                    financial.m_actual_percentage || 0, financial.m_actual_amount || 0,
                    financial.m_tds_percentage || 0, financial.m_tds_amount || 0,
                    financial.m_gst_percentage || 0, financial.m_gst_amount || 0,
                    financial.m_total_amount || 0, financial.status || 'Pending'
                ]);
            }
        }

        res.status(201).json({ message: "Project created successfully", projectId });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
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

exports.getEmployees = async (req, res) => {
    try {
      const employees = await projectService.fetchEmployees();
      res.status(200).json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Internal Server Error" });
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
    const {
      company_name, project_name, project_poc, company_gst, company_pan, company_address,
      project_category, start_date, end_date, service_mode, service_location, project_status,
      description, attachment_url, employee_list, milestones, financialDetails
    } = req.body;

    console.log("Request Body", req.body);

    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Convert JSON fields
    const projectCategoryJson = JSON.stringify(project_category);
    const employeeListJson = JSON.stringify(employee_list || []);

    // Format dates for project
    const formattedStartDate = start_date ? new Date(start_date).toISOString().split('T')[0] : null;
    const formattedEndDate = end_date ? new Date(end_date).toISOString().split('T')[0] : null;

    // Update project details
    await projectService.updateProject(id, [
      company_name, project_name, project_poc, company_gst, company_pan, company_address,
      projectCategoryJson, formattedStartDate, formattedEndDate, service_mode, service_location,
      project_status, description, attachment_url, id
    ]);

    // Update STS Owner
    await projectService.updateSTSOwner(id, [
      req.body.sts_owner_id,
      req.body.sts_owner,
      req.body.sts_contact,
      employeeListJson,
      req.body.key_considerations,
      id
    ]);

    // Update milestones
    if (Array.isArray(milestones)) {
      for (const milestone of milestones) {
        const formattedMilestoneStart = milestone.start_date ? new Date(milestone.start_date).toISOString().split('T')[0] : null;
        const formattedMilestoneEnd = milestone.end_date ? new Date(milestone.end_date).toISOString().split('T')[0] : null;

        if (milestone.id) {
          // Update existing milestone
          await projectService.updateMilestone(milestone.id, [
            milestone.details, formattedMilestoneStart, formattedMilestoneEnd, milestone.status,
            milestone.dependency, milestone.assigned_to, milestone.id
          ]);
        } else {
          // Insert new milestone and capture its new id
          const newMilestoneId = await projectService.addMilestone([
            id, milestone.details, formattedMilestoneStart, formattedMilestoneEnd, milestone.status,
            milestone.dependency, milestone.assigned_to
          ]);
          milestone.id = newMilestoneId;
        }
      }
    }

    // Wrap the financial details update block in its own try/catch so that errors here don't block the overall update.
    try {
      // In your updateProject handler, replace your financial details update block with:
if (Array.isArray(financialDetails) && financialDetails.length > 0) {
  // Synchronize financialDetails with milestones based on a common field
  if (Array.isArray(milestones)) {
    financialDetails.forEach(finance => {
      if (!finance.milestone_id) {
        const matchedMilestone = milestones.find(m => m.details === finance.milestone_details);
        if (matchedMilestone) {
          finance.milestone_id = matchedMilestone.id;
        } else {
          console.error('No matching milestone found for:', finance.milestone_details);
        }
      }
    });
  }

  for (const financial of financialDetails) {
    if (!financial.milestone_id) {
      console.error('Missing milestone_id for financial detail', financial);
      continue;
    }

    // Convert values to numbers for consistency
    const project_amount = Number(req.body.project_amount) || 0;
    const tds_percentage = Number(req.body.tds_percentage) || 0;
    const tds_amount = Number(req.body.tds_amount) || 0;
    const gst_percentage = Number(req.body.gst_percentage) || 0;
    const gst_amount = Number(req.body.gst_amount) || 0;
    const total_amount = Number(req.body.total_amount) || 0;
    const m_actual_percentage = Number(financial.m_actual_percentage) || 0;
    const m_actual_amount = Number(financial.m_actual_amount) || 0;
    const m_tds_percentage = Number(financial.m_tds_percentage) || 0;
    const m_tds_amount = Number(financial.m_tds_amount) || 0;
    const m_gst_percentage = Number(financial.m_gst_percentage) || 0;
    const m_gst_amount = Number(financial.m_gst_amount) || 0;
    const m_total_amount = Number(financial.m_total_amount) || 0;

    // Convert completed_date if provided (format as MySQL datetime string) or null
    const formattedCompletedDate = financial.completed_date 
      ? new Date(financial.completed_date).toISOString().slice(0, 19).replace('T', ' ')
      : null;

    const updateParams = [
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
      financial.status || 'Pending',
      formattedCompletedDate, // will be a formatted date string or null
      financial.milestone_id,
      financial.id              // WHERE clause
    ];
    console.log("Update Financial Details Params:", updateParams);
    await projectService.updateFinancialDetails(updateParams);
  }
} else {
  console.log("No financial details provided; skipping financial details update.");
}

    } catch (financialError) {
      console.error("Error updating financial details (ignored):", financialError);
    }

    res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
