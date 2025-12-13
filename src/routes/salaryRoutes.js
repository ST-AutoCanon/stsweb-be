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
router.post("/save", async (req, res) => {
  const { salaryData, month, year } = req.body;
  const tableName = `salary_sts_${month}_${year}`;

  try {
    // 1️⃣ Ensure table exists (DO NOT DROP / TRUNCATE)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        employee_id VARCHAR(50) PRIMARY KEY,
        full_name VARCHAR(100),
        annual_ctc DECIMAL(10,2),
        basic_salary DECIMAL(10,2),
        hra DECIMAL(10,2),
        lta DECIMAL(10,2),
        other_allowances DECIMAL(10,2),
        incentives DECIMAL(10,2),
        overtime DECIMAL(10,2),
        statutory_bonus DECIMAL(10,2),
        bonus DECIMAL(10,2),
        advance_recovery DECIMAL(10,2),
        employee_pf DECIMAL(10,2),
        employer_pf DECIMAL(10,2),
        esic DECIMAL(10,2),
        tds DECIMAL(10,2),
        gratuity DECIMAL(10,2),
        professional_tax DECIMAL(10,2),
        insurance DECIMAL(10,2),
        lop_days INT,
        lop_deduction DECIMAL(10,2),
        gross_salary DECIMAL(10,2),
        net_salary DECIMAL(10,2),
        payslip_generated INT DEFAULT 0,
        status VARCHAR(20),
        payslip_generation VARCHAR(20)
      )
    `);

    // 2️⃣ INSERT or UPDATE (NO DELETE)
    for (const emp of salaryData) {
      await pool.query(
        `
        INSERT INTO \`${tableName}\` (
          employee_id, full_name, annual_ctc, basic_salary, hra, lta,
          other_allowances, incentives, overtime, statutory_bonus, bonus,
          advance_recovery, employee_pf, employer_pf, esic, tds, gratuity,
          professional_tax, insurance, lop_days, lop_deduction,
          gross_salary, net_salary, payslip_generated, status, payslip_generation
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          annual_ctc = VALUES(annual_ctc),
          basic_salary = VALUES(basic_salary),
          hra = VALUES(hra),
          lta = VALUES(lta),
          other_allowances = VALUES(other_allowances),
          incentives = VALUES(incentives),
          overtime = VALUES(overtime),
          statutory_bonus = VALUES(statutory_bonus),
          bonus = VALUES(bonus),
          advance_recovery = VALUES(advance_recovery),
          employee_pf = VALUES(employee_pf),
          employer_pf = VALUES(employer_pf),
          esic = VALUES(esic),
          tds = VALUES(tds),
          gratuity = VALUES(gratuity),
          professional_tax = VALUES(professional_tax),
          insurance = VALUES(insurance),
          lop_days = VALUES(lop_days),
          lop_deduction = VALUES(lop_deduction),
          gross_salary = VALUES(gross_salary),
          net_salary = VALUES(net_salary),
          status = VALUES(status),
          payslip_generation = VALUES(payslip_generation)
        `,
        [
          emp.employee_id,
          emp.full_name,
          emp.annual_ctc,
          emp.basic_salary,
          emp.hra,
          emp.lta,
          emp.other_allowances,
          emp.incentives,
          emp.overtime,
          emp.statutory_bonus,
          emp.bonus,
          emp.advance_recovery,
          emp.employee_pf,
          emp.employer_pf,
          emp.esic,
          emp.tds,
          emp.gratuity,
          emp.professional_tax,
          emp.insurance,
          emp.lop_days,
          emp.lop_deduction,
          emp.gross_salary,
          emp.net_salary,
          emp.payslip_generated,
          emp.status,
          emp.payslip_generation
        ]
      );
    }

    res.json({
      success: true,
      tableName
    });
  } catch (error) {
    console.error("❌ Salary save error:", error);
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
