const db = require("../config");
const {
  createTable,
  deleteExistingData,
  insertData,
} = require("../constants/salaryQueries");

const createTableIfNotExists = async (tableName, columns) => {
  try {
    const createTableQuery = createTable(tableName, columns);
    await db.query(createTableQuery);
  } catch (error) {
    throw error;
  }
};

const deleteExistingSalaryData = async (tableName) => {
  try {
    await db.query(deleteExistingData(tableName));
  } catch (error) {
    throw error;
  }
};

const insertSalaryData = async (tableName, columns, values) => {
  try {
    const insertQuery = insertData(tableName, columns);
    await db.query(insertQuery, [values]);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createTableIfNotExists,
  deleteExistingSalaryData,
  insertSalaryData,
};
