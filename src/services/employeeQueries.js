const db = require("../config");
const queries = require("../constants/empDetailsQueries");

class EmployeeQueries {
  /**
   * Add a new query from an employee.
   *
   * @param {string} sender_id - ID of the employee submitting the query.
   * @param {string} department - Department associated with the query.
   * @param {string} question - The query or question.
   * @returns {Promise<void>} A promise that resolves when the query is added.
   */
  static async addQuery(sender_id, department, question) {
    console.log("Executing query:", queries.ADD_QUERY);
  console.log("With parameters:", sender_id, department, question);
    await db.execute(queries.ADD_QUERY, [sender_id, department, question]);
  }

  /**
   * Retrieve queries submitted by a specific employee.
   *
   * @param {string} sender_id - ID of the employee.
   * @returns {Promise<Array>} List of queries submitted by the employee.
   */
  static async getQueriesByEmployee(sender_id) {
    const [rows] = await db.execute(queries.GET_QUERIES_BY_EMPLOYEE, [sender_id]);
    return rows;
  }

  /**
   * Retrieve all queries for admin review.
   *
   * @returns {Promise<Array>} List of all queries.
   */
  static async getAllQueries() {
    const [rows] = await db.execute(queries.GET_ALL_QUERIES);
    return rows;
  }

  /**
   * Add a reply from the admin to a specific query.
   *
   * @param {number} queryId - ID of the query being replied to.
   * @param {string} reply - Admin's reply to the query.
   * @returns {Promise<void>} A promise that resolves when the reply is added.
   */
  static async addAdminReply(queryId, reply) {
    await db.execute(queries.ADD_ADMIN_REPLY, [reply, queryId]);
  }
}

module.exports = EmployeeQueries;

