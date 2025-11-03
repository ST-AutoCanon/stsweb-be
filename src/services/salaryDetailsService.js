const db = require("../config");
const {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
  getApprovedIdsQuery
} = require("../constants/salaryDetailsQueries");
const moment = require("moment");

const tableExists = async (tableName) => {
  const [result] = await db.query(checkIfTableExists(tableName));
  return result[0].count > 0;
};

const getApprovedEmployeeIds = async () => {
  const tableName = generateTableName();
  if (!(await tableExists(tableName))) return [];

  const [rows] = await db.query(getApprovedIdsQuery(tableName));
  return rows.map(r => r.employee_id);
};

const createTableIfNotExists = async (tableName) => {
  const query = createTableQuery(tableName);
  try {
    await db.query(query);
    console.log(`Table ${tableName} is ready.`);
    return true;
  } catch (error) {
    console.error("Error creating table:", error);
    throw new Error("Failed to create table.");
  }
};

const ensureColumns = async (tableName) => {
  const OTHER_COLUMNS = require("../constants/salaryDetailsQueries").SALARY_COLUMNS.slice(1);
  const ALL_COLUMNS = ['employee_id', ...OTHER_COLUMNS];
  const MONETARY_COLUMNS = require("../constants/salaryDetailsQueries").MONETARY_COLUMNS;

  for (const col of ALL_COLUMNS) {
    try {
      const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${col.replace(/`/g, '\\`')}';`);
      if (rows.length === 0) {
        let type;
        if (col === 'employee_id') {
          type = 'VARCHAR(50) UNIQUE NOT NULL';
        } else if (col === 'status') {
          type = 'VARCHAR(20) DEFAULT \'Pending\'';
        } else {
          type = MONETARY_COLUMNS.includes(col) 
            ? 'DECIMAL(12,2) DEFAULT NULL' 
            : 'VARCHAR(255) DEFAULT NULL';
        }
        
        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${type};`);
        console.log(`Added missing column \`${col}\` to ${tableName}`);
      }
    } catch (error) {
      console.error(`Error ensuring column ${col}:`, error);
      if (col === 'employee_id') throw error;
    }
  }
  console.log(`Schema verified for ${tableName}`);
};

const generateTableName = () => {
  const now = moment();
  const month = now.format('MMM').toLowerCase();
  const year = now.format('YYYY');
  return `salary_sts_${month}_${year}`;
};

const deleteExistingSalaryData = async (tableName) => {
  try {
    if (await tableExists(tableName)) {
      await db.query(deleteExistingData(tableName));
      console.log(`Old data deleted from table: ${tableName}`);
    } else {
      console.log(`Table ${tableName} does not exist, skipping DELETE.`);
    }
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
};

const insertSalaryRecords = async (tableName, rows) => {
  try {
    if (rows.length === 0) {
      console.warn("No rows to insert.");
      return;
    }

    const { query, values } = insertSalaryData(tableName, rows);
    if (query) {
      await db.query(query, values);
      console.log(`Inserted ${rows.length} rows into ${tableName}`);
    }
  } catch (error) {
    console.error("Error inserting data:", error);
    throw error;
  }
};

const saveSalaryDetails = async (salaryData) => {
  const tableName = generateTableName();
  console.log(`Processing save for table: ${tableName}`);

  if (!(await tableExists(tableName))) {
    await createTableIfNotExists(tableName);
  }

  await ensureColumns(tableName);
  await deleteExistingSalaryData(tableName);
  await insertSalaryRecords(tableName, salaryData);

  return { success: true, tableName, rowsInserted: salaryData.length };
};

module.exports = {
  saveSalaryDetails,
  generateTableName,
  tableExists,
  createTableIfNotExists,
  deleteExistingSalaryData,
  insertSalaryRecords,
  ensureColumns,
  getApprovedEmployeeIds,
};