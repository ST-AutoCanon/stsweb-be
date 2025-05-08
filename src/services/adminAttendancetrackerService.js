const db = require("../config");
const queries = require("../constants/adminAttendancetracker");

// Get missing punch-in employees for the given month (2025-04-01 in this case)
const getMissingPunchInEmployees = async () => {
  try {
    const [rows] = await db.query(queries.GET_MISSING_PUNCH_IN_EMPLOYEES);
    return rows;
  } catch (error) {
    console.error("Error fetching missing punch-in employees:", error);
    throw new Error("Error fetching missing punch-in employees");
  }
};

// Get employees who have punched in but not punched out
const getEmployeesWithPunchInNotPunchedOut = async () => {
  try {
    const [rows] = await db.query(queries.GET_EMPLOYEES_WITH_PUNCH_IN_NOT_PUNCHED_OUT);
    return rows;
  } catch (error) {
    console.error("Error fetching employees with punch-in but not punched out:", error);
    throw new Error("Error fetching employees with punch-in but not punched out");
  }
};

// Get employees who worked less than 8 hours
const getEmployeesWorkedLessThan8Hours = async () => {
  try {
    const [rows] = await db.query(queries.GET_EMPLOYEES_WORKED_LESS_THAN_8_HOURS);
    return rows;
  } catch (error) {
    console.error("Error fetching employees who worked less than 8 hours:", error);
    throw new Error("Error fetching employees who worked less than 8 hours");
  }
};

// Get employees who worked between 8 to 10 hours
const getEmployeesWorked8To10Hours = async () => {
  try {
    const [rows] = await db.query(queries.GET_EMPLOYEES_WORKED_8_TO_10_HOURS);
    return rows;
  } catch (error) {
    console.error("Error fetching employees who worked 8 to 10 hours:", error);
    throw new Error("Error fetching employees who worked 8 to 10 hours");
  }
};

const getApprovedLeavesCurrentMonth = async () => {
  try {
    const [rows] = await db.query(queries.GET_APPROVED_LEAVES_CURRENT_MONTH);
    return rows;
  } catch (error) {
    console.error("Error fetching approved leaves for the current month:", error);
    throw new Error("Error fetching approved leaves for the current month");
  }
};

module.exports = {
  getMissingPunchInEmployees,
  getEmployeesWithPunchInNotPunchedOut,
  getEmployeesWorkedLessThan8Hours,
  getEmployeesWorked8To10Hours,
  getApprovedLeavesCurrentMonth, // ✅ Don't forget to export it

};
