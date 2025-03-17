const db = require("../config");
const queries = require("../constants/projectQueries");

const addProject = async (projectData) => {
  const [result] = await db.execute(queries.INSERT_PROJECT, projectData);
  return result.insertId;
};

const addSTSOwner = async (stsOwnerData) => {
  await db.execute(queries.INSERT_STS_OWNER, stsOwnerData);
};

const addMilestone = async (milestoneData) => {
  const [result] = await db.execute(queries.INSERT_MILESTONE, milestoneData);
  return result.insertId; // Return the milestone ID
};

const addFinancialDetails = async (financialData) => {
  await db.execute(queries.INSERT_FINANCIAL_DETAILS, financialData);
};

const getAllProjects = async () => {
  const [rows] = await db.query(queries.GET_ALL_PROJECTS);
  return rows;
};

const getEmployeeProjects = async (employeeId) => {
  // Wrap the employeeId in quotes so it becomes a valid JSON string for JSON_CONTAINS
  const jsonEmployeeId = `"${employeeId}"`;
  const [rows] = await db.query(queries.GET_EMPLOYEE_PROJECTS, [
    jsonEmployeeId,
  ]);
  return rows;
};

// Fetch single project by ID
const getProjectById = async (id) => {
  const [rows] = await db.query(queries.GET_PROJECT_BY_ID, [id]);

  if (rows.length === 0) {
    return null;
  }

  let project = {
    ...rows[0],
    project_category: [],
    milestones: [],
    financialDetails: [],
    employee_list: [],
    key_considerations: [],
    attachment_url: [], // Ensure this field is set up as an array
  };

  // Helper function to parse JSON fields
  const parseJSONField = (field) => {
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch (error) {
        console.warn("Invalid JSON format for field:", field);
        return [];
      }
    }
    return field || [];
  };

  project.project_category = parseJSONField(rows[0].project_category);
  project.employee_list = parseJSONField(rows[0].employee_list);
  project.key_considerations = parseJSONField(rows[0].key_considerations);
  project.milestones = parseJSONField(rows[0].milestones);
  project.financialDetails = parseJSONField(rows[0].financial_details);
  project.attachment_url = parseJSONField(rows[0].attachment_url); // New: parse attachments

  // Convert any numeric fields as needed
  project.project_amount = parseFloat(project.project_amount) || 0;
  project.tds_percentage = parseFloat(project.tds_percentage) || 0;
  project.tds_amount = parseFloat(project.tds_amount) || 0;
  project.gst_percentage = parseFloat(project.gst_percentage) || 0;
  project.gst_amount = parseFloat(project.gst_amount) || 0;
  project.total_amount = parseFloat(project.total_amount) || 0;

  return project;
};

const updateProject = async (id, projectData) => {
  // Update project details
  await db.execute(queries.UPDATE_PROJECT, projectData);
};

const updateSTSOwner = async (id, stsOwnerData) => {
  await db.execute(queries.UPDATE_STS_OWNER, stsOwnerData);
};

const updateMilestone = async (id, milestoneData) => {
  await db.execute(queries.UPDATE_MILESTONE, milestoneData);
};

const updateFinancialDetails = async (params) => {
  await db.execute(queries.UPDATE_FINANCIAL_DETAILS, params);
};

const searchEmployees = async (search) => {
  try {
    let query = queries.GET_ALL_EMPLOYEES;
    let params = [];

    if (search) {
      query = queries.SEARCH_EMPLOYEES;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching employees from database:", error);
    throw new Error("Error fetching employees from database");
  }
};

module.exports = {
  addProject,
  addSTSOwner,
  addMilestone,
  addFinancialDetails,
  getAllProjects,
  getEmployeeProjects,
  getProjectById,
  updateProject,
  updateSTSOwner,
  updateMilestone,
  updateFinancialDetails,
  searchEmployees,
};
