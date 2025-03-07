


const multer = require("multer");
const XLSX = require("xlsx");
const moment = require("moment");
const pool = require("../config.js");
const {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
} = require("../constants/salaryQueries");

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Function to check if a table exists
const tableExists = async (tableName) => {
  const result = await pool.query(checkIfTableExists(tableName));
  return result[0].count > 0;
};

// Function to create table dynamically
const createTableIfNotExists = async (tableName, columns) => {
  const query = createTableQuery(tableName, columns);
  try {
    await pool.query(query);
    console.log(`Table ${tableName} is ready.`);
  } catch (error) {
    console.error("Error creating table:", error);
    throw new Error("Failed to create table.");
  }
};

// Function to generate Employee ID if missing
const generateEmployeeId = () => {
  return `EMP${Math.floor(10000 + Math.random() * 90000)}`;
};

// Function to format column names to MySQL-friendly format
const formatColumnName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, ""); // Remove special characters
};

// Upload and Save Salary Data (Replace Existing Data)
const uploadSalaryData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "❌ No file uploaded" });
    }

    // Extract filename without extension and format it
    const fileName = req.file.originalname.split(".")[0].replace(/\s+/g, "_").toLowerCase();
    const tableName = `salary_${fileName}`; // Prefix to avoid conflicts

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: "❌ Empty Excel file" });
    }

    // Normalize column names
    const rawColumns = Object.keys(jsonData[0]);
    console.log("📌 Extracted Columns:", rawColumns); // Debugging log

    const formattedColumns = rawColumns.map(formatColumnName);
    console.log("✅ Formatted Columns:", formattedColumns); // Debugging log

    // Rename keys in data rows
    const processedData = jsonData.map((row) => {
      let newRow = {};
      rawColumns.forEach((col, index) => {
        newRow[formattedColumns[index]] = row[col] || null;
      });

      // Ensure "employee_id" column exists
      if (!newRow.employee_id) {
        newRow.employee_id = newRow.id || generateEmployeeId();
        delete newRow.id;
      }

      // Convert date columns to YYYY-MM-DD
      Object.keys(newRow).forEach((key) => {
        if (key.includes("date")) {
          let cellValue = newRow[key];

          if (!isNaN(cellValue) && cellValue > 30000) { // Excel Serial Date
            let excelDate = XLSX.SSF.parse_date_code(cellValue);
            newRow[key] = moment(new Date(excelDate.y, excelDate.m - 1, excelDate.d)).format("YYYY-MM-DD");
          } else {
            newRow[key] = moment(new Date(cellValue)).isValid()
              ? moment(new Date(cellValue)).format("YYYY-MM-DD")
              : null;
          }
        }
      });

      return newRow;
    });

    // 🚀 Log processed data for debugging
    console.log("🔄 Processed Data Example:", processedData[0]);

    // Create table if it doesn't exist
    if (!(await tableExists(tableName))) {
      await createTableIfNotExists(tableName, formattedColumns);
    }

    // 🚀 Delete old data before inserting new data
    await pool.query(deleteExistingData(tableName));
    console.log(`🗑️ Old data deleted from table: ${tableName}`);

    // Insert new data
    for (const row of processedData) {
      const { query, values } = insertSalaryData(tableName, row);
      console.log("📝 Inserting Row:", values); // Log inserted values
      await pool.query(query, values);
    }

    res.status(200).json({ message: `✅ File uploaded. Data replaced in table: ${tableName}` });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "❌ Error processing file" });
  }
};

module.exports = { uploadSalaryData, upload };



