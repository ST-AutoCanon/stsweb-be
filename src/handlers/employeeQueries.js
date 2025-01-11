const employeeQueries = require('../services/employeeQueries');
const ErrorHandler = require('../utils/errorHandler');

exports.addQuery = async (req, res) => {
  const { sender_id, department, question } = req.body;
  try {
    await employeeQueries.addQuery(sender_id, department, question);
    res.status(201).send(
      ErrorHandler.generateSuccessResponse(201, 'Query submitted successfully!')
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(
      ErrorHandler.generateErrorResponse(500, 'Failed to submit query.')
    );
  }
};

exports.getQueriesByEmployee = async (req, res) => {
  const { sender_id } = req.params;
  try {
    const queries = await employeeQueries.getQueriesByEmployee(sender_id);
    res.status(200).send(
      ErrorHandler.generateSuccessResponse(200, 'Queries retrieved successfully!', queries)
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(
      ErrorHandler.generateErrorResponse(500, 'Failed to retrieve queries.')
    );
  }
};

exports.getAllQueries = async (req, res) => {
  try {
    const queries = await employeeQueries.getAllQueries();
    res.status(200).send(
      ErrorHandler.generateSuccessResponse(200, 'All queries retrieved successfully!', queries)
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(
      ErrorHandler.generateErrorResponse(500, 'Failed to retrieve queries.')
    );
  }
};

exports.addAdminReply = async (req, res) => {
  const { id, reply } = req.body;
  try {
    await employeeQueries.addAdminReply(id, reply);
    res.status(200).send(
      ErrorHandler.generateSuccessResponse(200, 'Reply added successfully!')
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(
      ErrorHandler.generateErrorResponse(500, 'Failed to add reply.')
    );
  }
};
