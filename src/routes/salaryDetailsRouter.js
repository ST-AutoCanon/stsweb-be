// const express = require("express");
// const router = express.Router();
// const pool = require("../config");
// const {
//   createTableQuery,
//   insertSalaryData,
// } = require("../constants/salaryQueries");

// const formatColumnName = (name) =>
//   name
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "_")
//     .replace(/[^a-z0-9_]/g, "");

// const ensurePayslipColumn = async (tableName) => {
//   const [columns] = await pool.query(
//     `SHOW COLUMNS FROM \`${tableName}\` LIKE 'payslip_generated'`
//   );

//   if (columns.length === 0) {
//     await pool.query(
//       `ALTER TABLE \`${tableName}\` 
//        ADD COLUMN payslip_generated INT DEFAULT 0 NOT NULL`
//     );
//   }
// };

// router.post("/save", async (req, res) => {
//   try {
//     const { salaryData, month, year } = req.body;

//     if (!Array.isArray(salaryData) || salaryData.length === 0) {
//       return res.status(400).json({ error: "No salary data provided" });
//     }
//     if (!month || !year) {
//       return res.status(400).json({ error: "Month and year are required" });
//     }

//     const tableName = `salary_sts_${month}_${year}`;

//     // collect columns dynamically
//     const columnSet = new Set();
//     salaryData.forEach((row) => {
//       Object.keys(row).forEach((key) =>
//         columnSet.add(formatColumnName(key))
//       );
//     });
//     columnSet.add("payslip_generated");

//     const columns = Array.from(columnSet);

//     // create table if not exists
//     await pool.query(createTableQuery(tableName, columns));

//     // ensure unique employee_id for UPSERT
//     try {
//       await pool.query(
//         `ALTER TABLE \`${tableName}\` 
//          ADD UNIQUE KEY uniq_employee (employee_id)`
//       );
//     } catch (_) {
//       // ignore if already exists
//     }

//     await ensurePayslipColumn(tableName);

//     let insertedOrUpdated = 0;

//     for (const row of salaryData) {
//       const formattedRow = {};
//       Object.keys(row).forEach((key) => {
//         formattedRow[formatColumnName(key)] = row[key];
//       });

//       if (!formattedRow.employee_id || !formattedRow.full_name) {
//         console.warn("Skipping invalid row:", formattedRow);
//         continue;
//       }

//       if (formattedRow.payslip_generated == null) {
//         formattedRow.payslip_generated = 0;
//       }

//       const { query, values } = insertSalaryData(
//         tableName,
//         formattedRow
//       );
//       await pool.query(query, values);
//       insertedOrUpdated++;
//     }

//     res.json({
//       success: true,
//       tableName,
//       message: `${insertedOrUpdated} rows inserted/updated successfully`,
//     });
//   } catch (error) {
//     console.error("❌ Salary save error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../config");
const {
  createTableQuery,
  insertSalaryData,
} = require("../constants/salaryQueries");

const formatColumnName = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const ensurePayslipColumn = async (tableName) => {
  const [columns] = await pool.query(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE 'payslip_generated'`
  );
  if (columns.length === 0) {
    await pool.query(
      `ALTER TABLE \`${tableName}\`
       ADD COLUMN payslip_generated INT DEFAULT 0 NOT NULL`
    );
  }
};

router.post("/save", async (req, res) => {
  try {
    const { salaryData, month, year } = req.body;

    if (!Array.isArray(salaryData) || salaryData.length === 0) {
      return res.status(400).json({ error: "No salary data provided" });
    }
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year required" });
    }

    const tableName = `salary_sts_${month}_${year}`;

    // Collect all columns dynamically
    const columnSet = new Set();
    salaryData.forEach((row) => {
      Object.keys(row).forEach((key) =>
        columnSet.add(formatColumnName(key))
      );
    });
    columnSet.add("payslip_generated");

    const columns = Array.from(columnSet);

    // Create table
    await pool.query(createTableQuery(tableName, columns));

    // Ensure UNIQUE employee_id
    try {
      await pool.query(
        `ALTER TABLE \`${tableName}\`
         ADD UNIQUE KEY uniq_employee (employee_id)`
      );
    } catch (_) {
      // already exists
    }

    await ensurePayslipColumn(tableName);

    let processed = 0;

    for (const row of salaryData) {
      const formattedRow = {};
      Object.keys(row).forEach((key) => {
        formattedRow[formatColumnName(key)] = row[key];
      });

      if (!formattedRow.employee_id || !formattedRow.full_name) {
        console.warn("Skipping invalid row", formattedRow);
        continue;
      }

      // 🔒 Normalize employee_id (CRITICAL)
      formattedRow.employee_id = String(formattedRow.employee_id)
        .trim()
        .toUpperCase();

      if (formattedRow.payslip_generated == null) {
        formattedRow.payslip_generated = 0;
      }

      const { query, values } = insertSalaryData(
        tableName,
        formattedRow
      );
      await pool.query(query, values);
      processed++;
    }

    res.json({
      success: true,
      tableName,
      message: `${processed} rows inserted/updated successfully`,
    });
  } catch (err) {
    console.error("❌ Salary save error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
