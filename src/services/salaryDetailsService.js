const db = require("../config");
const {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
  SALARY_COLUMNS,
} = require("../constants/salaryDetailsQueries");
const moment = require("moment");

// Function to check if a table exists
const tableExists = async (tableName) => {
  const [result] = await db.query(checkIfTableExists(tableName));
  return result[0].count > 0;
};

// Function to create table dynamically
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

// NEW: Ensure all required columns exist (migration for broken schemas)
const ensureColumns = async (tableName) => {
  const OTHER_COLUMNS = SALARY_COLUMNS.slice(1);
  const ALL_COLUMNS = ['employee_id', ...OTHER_COLUMNS];
  const MONETARY_COLUMNS = require("../constants/salaryDetailsQueries").MONETARY_COLUMNS; // Import if needed

  for (const col of ALL_COLUMNS) {
    try {
      const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${col.replace(/`/g, '\\`')}';`);
      if (rows.length === 0) {
        // Determine type
        const type = col === 'employee_id' 
          ? 'VARCHAR(50) UNIQUE NOT NULL'  // Special for PK-like
          : MONETARY_COLUMNS.includes(col) 
            ? 'DECIMAL(12,2) DEFAULT NULL' 
            : 'VARCHAR(255) DEFAULT NULL';
        
        // For employee_id NOT NULL, ok since we DELETE first (table empty)
        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${type};`);
        console.log(`Added missing column \`${col}\` to ${tableName}`);
      }
    } catch (error) {
      console.error(`Error ensuring column ${col}:`, error);
      // Continue for other cols, but throw if critical
      if (col === 'employee_id') throw error;
    }
  }
  console.log(`Schema verified for ${tableName}`);
};

// Function to generate table name based on current month/year
const generateTableName = () => {
  const now = moment();
  const month = now.format('MMM').toLowerCase(); // e.g., 'oct'
  const year = now.format('YYYY'); // e.g., '2025'
  return `salary_sts_${month}_${year}`;
};

// Function to delete existing data
const deleteExistingSalaryData = async (tableName) => {
  try {
    // Only DELETE if table exists
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

// Function to insert salary data (bulk)
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

// Main service to save salary details
const saveSalaryDetails = async (salaryData) => {
  const tableName = generateTableName();
  console.log(`Processing save for table: ${tableName}`);

  // Create table if not exists
  if (!(await tableExists(tableName))) {
    await createTableIfNotExists(tableName);
  }

  // NEW: Ensure schema is complete (adds missing columns)
  await ensureColumns(tableName);

  // Delete existing
  await deleteExistingSalaryData(tableName);

  // Insert new
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
  ensureColumns,  // Export if needed for manual calls
};