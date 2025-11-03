const express = require("express");
const router = express.Router();
const pool = require("../config"); // Adjust path to your DB config

// Helper to format column name (for consistency)
const formatColumnName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
};

// Helper function to ensure payslip_generated column exists
const ensurePayslipColumn = async (tableName) => {
  try {
    console.log(`🔍 Checking payslip_generated column in table: ${tableName}`);
    // Check if column exists
    const [columns] = await pool.query(
      `SHOW COLUMNS FROM \`${tableName}\` LIKE 'payslip_generated'`
    );
    if (columns.length === 0) {
      // Add the column if it doesn't exist
      await pool.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`payslip_generated\` INT DEFAULT 0 NOT NULL`
      );
      console.log(`✅ Added payslip_generated column to table: ${tableName}`);
    } else {
      console.log(`✅ payslip_generated column already exists in: ${tableName}`);
    }
    // Update existing rows to default 0 if null/undefined
    const [nullRows] = await pool.query(
      `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE payslip_generated IS NULL OR payslip_generated = ''`
    );
    if (nullRows[0].count > 0) {
      await pool.query(
        `UPDATE \`${tableName}\` SET payslip_generated = 0 WHERE payslip_generated IS NULL OR payslip_generated = ''`
      );
      console.log(`🔧 Set default 0 for ${nullRows[0].count} null rows in: ${tableName}`);
    }
  } catch (error) {
    console.error("❌ Error ensuring payslip column:", error);
    throw error;
  }
};

// GET /api/salary-statement/:month/:year - Fetch salary data for the month/year
router.get("/:month/:year", async (req, res) => {
  const { month, year } = req.params;
  const tableName = `salary_sts_${month}_${year}`;
  try {
    console.log(`📥 GET request for table: ${tableName}`);
    // Ensure column exists before fetching (in case of old tables)
    await ensurePayslipColumn(tableName);

    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    console.log(`📊 Fetched ${rows.length} rows from: ${tableName}`);
    if (rows.length === 0) {
      return res.json({ salary_statement: [] });
    }
    res.json({ salary_statement: rows });
  } catch (error) {
    console.error("❌ Error fetching salary data:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/salary-statement/update-payslip/:month/:year/:employeeId - Toggle payslip_generated
router.post("/update-payslip/:month/:year/:employeeId", async (req, res) => {
  const { month, year, employeeId } = req.params;
  const { payslip_generated } = req.body;
  const tableName = `salary_sts_${month}_${year}`;
  try {
    console.log(`🔄 Update request: Table=${tableName}, EmployeeID=${employeeId}, NewValue=${payslip_generated}`);

    // Ensure column exists
    await ensurePayslipColumn(tableName);

    // Verify table and record exist
    const [existingRows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE employee_id = ?`, [employeeId]);
    console.log(`🔍 Found ${existingRows.length} matching rows for ${employeeId}`);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Employee record not found for this month/year" });
    }

    const currentValue = existingRows[0].payslip_generated ?? 0;
    console.log(`📝 Current value: ${currentValue}, Updating to: ${payslip_generated}`);

    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET payslip_generated = ? WHERE employee_id = ?`,
      [payslip_generated, employeeId]
    );

    console.log(`📈 Update result: affectedRows=${result.affectedRows}, changedRows=${result.changedRows}`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No rows updated - record may not exist or value unchanged" });
    }

    // Verify the update
    const [updatedRow] = await pool.query(`SELECT payslip_generated FROM \`${tableName}\` WHERE employee_id = ?`, [employeeId]);
    console.log(`✅ Verified update: New value in DB = ${updatedRow[0].payslip_generated}`);

    res.json({ success: true, message: `Payslip status updated to ${payslip_generated}` });
  } catch (error) {
    console.error("❌ Error updating payslip status:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;