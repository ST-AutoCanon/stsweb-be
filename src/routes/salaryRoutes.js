const express = require("express");
const router = express.Router();
const pool = require("../config");

const formatColumnName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
};

const ensurePayslipColumn = async (tableName) => {
  try {
    const [columns] = await pool.query(
      `SHOW COLUMNS FROM \`${tableName}\` LIKE 'payslip_generated'`
    );
    if (columns.length === 0) {
      await pool.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`payslip_generated\` INT DEFAULT 0 NOT NULL`
      );
    } else {
    }
    const [nullRows] = await pool.query(
      `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE payslip_generated IS NULL OR payslip_generated = ''`
    );
    if (nullRows[0].count > 0) {
      await pool.query(
        `UPDATE \`${tableName}\` SET payslip_generated = 0 WHERE payslip_generated IS NULL OR payslip_generated = ''`
      );
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
    // Ensure column exists before fetching (in case of old tables)
    await ensurePayslipColumn(tableName);

    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length === 0) {
      return res.json({ salary_statement: [] });
    }
    res.json({ salary_statement: rows });
  } catch (error) {
    console.error("❌ Error fetching salary data:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/update-payslip/:month/:year/:employeeId", async (req, res) => {
  const { month, year, employeeId } = req.params;
  const { payslip_generated } = req.body;
  const tableName = `salary_sts_${month}_${year}`;
  try {
    await ensurePayslipColumn(tableName);

    const [existingRows] = await pool.query(
      `SELECT * FROM \`${tableName}\` WHERE employee_id = ?`,
      [employeeId]
    );
    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ error: "Employee record not found for this month/year" });
    }

    const currentValue = existingRows[0].payslip_generated ?? 0;

    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET payslip_generated = ? WHERE employee_id = ?`,
      [payslip_generated, employeeId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "No rows updated - record may not exist or value unchanged",
        });
    }

    const [updatedRow] = await pool.query(
      `SELECT payslip_generated FROM \`${tableName}\` WHERE employee_id = ?`,
      [employeeId]
    );

    res.json({
      success: true,
      message: `Payslip status updated to ${payslip_generated}`,
    });
  } catch (error) {
    console.error("❌ Error updating payslip status:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
