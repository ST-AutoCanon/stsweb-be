
const db = require("../config");
const {
  GET_EMPLOYEES_BY_SUPERVISOR,
  GET_FULL_EMPLOYEE_HIERARCHY
} = require("../constants/supervisorEmployeesQueries");

const getEmployeesBySupervisorService = async (supervisorId) => {
  const [rows] = await db.query(GET_EMPLOYEES_BY_SUPERVISOR, [supervisorId]);
  return rows;
};

const getFullHierarchyService = async (supervisorId) => {
  console.log("Using query:", GET_FULL_EMPLOYEE_HIERARCHY); // debug
  console.log("Supervisor ID:", supervisorId);

  const [rows] = await db.query(GET_FULL_EMPLOYEE_HIERARCHY, [supervisorId]);
  console.log("HIERARCHY RESULT FROM DB:", rows);

  return rows;
};

module.exports = { 
//   getEmployeesBySupervisorService,
  getFullHierarchyService 
};
