
const checkIfTableExists = (tableName) => `
  SELECT COUNT(*) AS count FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '${tableName}';
`;

const SALARY_COLUMNS = [
  'employee_id', 'full_name', 'annual_ctc', 'basic_salary', 'hra', 'lta',
  'other_allowances', 'incentives', 'overtime', 'statutory_bonus', 'bonus',
  'advance_recovery', 'employee_pf', 'employer_pf', 'esic', 'gratuity',
  'professional_tax', 'income_tax', 'insurance', 'lop_days', 'lop_deduction',
  'gross_salary', 'net_salary',
  'status',
  'payslip_generation'
];

const MONETARY_COLUMNS = [
  'annual_ctc', 'basic_salary', 'hra', 'lta', 'other_allowances', 'incentives',
  'overtime', 'statutory_bonus', 'bonus', 'advance_recovery', 'employee_pf',
  'employer_pf', 'esic', 'gratuity', 'professional_tax', 'income_tax',
  'insurance', 'lop_deduction', 'gross_salary', 'net_salary'
];

const createTableQuery = (tableName) => {
  const OTHER_COLUMNS = SALARY_COLUMNS.slice(1);
  const columnDefinitions = OTHER_COLUMNS
    .map((col) => {
      let type;
      if (col === 'status') {
        type = 'VARCHAR(20) DEFAULT \'Pending\'';
      } else if (col === 'payslip_generation') {
        type = 'VARCHAR(10) DEFAULT \'disabled\'';
      } else {
        type = MONETARY_COLUMNS.includes(col) ? 'DECIMAL(12,2) DEFAULT NULL' : 'VARCHAR(255) DEFAULT NULL';
      }
      return `\`${col}\` ${type}`;
    })
    .join(', ');

  return `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`employee_id\` VARCHAR(50) UNIQUE NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ${columnDefinitions}
    );
  `;
};

const deleteExistingData = (tableName) => `DELETE FROM \`${tableName}\`;`;

const insertSalaryData = (tableName, rows) => {
  if (rows.length === 0) return { query: '', values: [] };

  const columnsStr = SALARY_COLUMNS.map(col => `\`${col}\``).join(', ');
  const placeholders = SALARY_COLUMNS.map(() => '?').join(', ');
  const valueSets = Array(rows.length).fill(`(${placeholders})`).join(', ');
  const query = `INSERT INTO \`${tableName}\` (${columnsStr}) VALUES ${valueSets}`;

  const values = rows.flatMap(row => SALARY_COLUMNS.map(col => row[col] ?? null));

  return { query, values };
};

const getApprovedIdsQuery = (tableName) => `
  SELECT DISTINCT employee_id 
  FROM \`${tableName}\` 
  WHERE status = 'Approved';
`;

module.exports = {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
  SALARY_COLUMNS,
  MONETARY_COLUMNS,
  getApprovedIdsQuery,
};