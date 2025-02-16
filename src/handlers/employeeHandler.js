const employeeService = require('../services/employeeService');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Handler to add an employee and send password reset link through email.
 */
exports.addEmployee = async (req, res) => {
  try {
    const employeeData = req.body;
    const newEmployee = await employeeService.addEmployee(employeeData);
    return res.status(201).json(ErrorHandler.generateSuccessResponse(201, "Employee added successfully. Reset email sent.", { data: employeeData })
    );
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json(
        ErrorHandler.generateErrorResponse(400, "Email already exists. Please try a different email.")
      );
    }
    return res.status(500).json(
      ErrorHandler.generateErrorResponse(500, "Failed to add employee and send email")
    );
  }
};

/**
 * Handler to fetch all employees or search employees based on the search query and date filters.
 */
exports.searchEmployees = async (req, res) => {
  try {
    const { search, fromDate, toDate } = req.query;

    const employees = await employeeService.searchEmployees(search, fromDate, toDate);

    return res
      .status(200)
      .json(ErrorHandler.generateSuccessResponse(200, { data: employees }));
  } catch (error) {
    console.error('Error fetching employees:', error);

    return res
      .status(500)
      .json(ErrorHandler.generateErrorResponse(500, 'Failed to fetch employees'));
  }
};


/**
 * Handler to edit an employee.
 */
exports.editEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const updatedData = req.body;
    await employeeService.editEmployee(employeeId, updatedData);
    return res.status(200).json(
      ErrorHandler.generateSuccessResponse(200, 'Employee updated successfully.')
    );
  } catch (error) {
    console.error('Error in editEmployee:', error);
    return res.status(500).json(
      ErrorHandler.generateErrorResponse(500, 'Failed to update employee.')
    );
  }
};

/**
 * Handler to deactivate an employee.
 */
exports.deactivateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    await employeeService.deactivateEmployee(employeeId);
    return res.status(200).json(ErrorHandler.generateSuccessResponse(200, 'Employee deactivated successfully' ));
  } catch (error) {
    console.log(error);
    return res.status(400).json(ErrorHandler.generateErrorResponse(400, 'Failed to deactivate employee'));
  }
};


/**
 * Handler to fetch an employee.
 */
exports.getEmployee = async (req, res) => {
  const employeeId = req.query.employeeId || req.params.employeeId;
  if (!employeeId) {
    return res.status(400).json(ErrorHandler.generateErrorResponse(400, "Employee ID is required."));
  }
try {
  const profile = await employeeService.getEmployee(employeeId);
  return res.status(200).json({
    status: 'success',
    code:200,
    message: "Profile fetched successfully.",
    data: profile,
  });
} catch (error) {
  console.error("Error in getEmployee:", error.message);
  return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Failed to fetch employee profile."));
}
};