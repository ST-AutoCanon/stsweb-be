const employeeService = require('../services/employeeService');
const ErrorHandler = require('../utils/errorHandler');

exports.addEmployee = async (req, res) => {
  try {
    const employeeData = req.body;
    const newEmployee = await employeeService.addEmployee(employeeData);
    return res.status(201).json(ErrorHandler.generateSuccessResponse(201, "Employee added successfully. Reset email sent.", { data: employeeData })
    );
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      // Handle duplicate entry error
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
 * Handler to fetch all employees or search employees based on the search query.
 */
exports.searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const employees = await employeeService.searchEmployees(search);
    return res.status(200).json(ErrorHandler.generateSuccessResponse(200, { data: employees }));
  } catch (error) {
    console.log(error);
    return res.status(500).json(ErrorHandler.generateErrorResponse(500, 'Failed to fetch employees'));
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
 * Handler to delete an employee.
 */
exports.deleteEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    await employeeService.deleteEmployee(employeeId);
    return res.status(200).json(ErrorHandler.generateSuccessResponse(200, 'Employee deleted successfully' ));
  } catch (error) {
    console.log(error);
    return res.status(400).json(ErrorHandler.generateErrorResponse(400, 'Failed to delete employee'));
  }
};
