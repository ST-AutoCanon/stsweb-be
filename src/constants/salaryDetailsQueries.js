// Function to check if a table exists
const checkIfTableExists = (tableName) => `
  SELECT COUNT(*) AS count FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '${tableName}';
`;

// Columns based on frontend (employee_id handled separately)
const SALARY_COLUMNS = [
  'employee_id', 'full_name', 'annual_ctc', 'basic_salary', 'hra', 'lta',
  'other_allowances', 'incentives', 'overtime', 'statutory_bonus', 'bonus',
  'advance_recovery', 'employee_pf', 'employer_pf', 'esic', 'gratuity',
  'professional_tax', 'income_tax', 'insurance', 'lop_days', 'lop_deduction',
  'gross_salary', 'net_salary'
];

// Optional: Monetary columns for better typing (use DECIMAL)
const MONETARY_COLUMNS = [
  'annual_ctc', 'basic_salary', 'hra', 'lta', 'other_allowances', 'incentives',
  'overtime', 'statutory_bonus', 'bonus', 'advance_recovery', 'employee_pf',
  'employer_pf', 'esic', 'gratuity', 'professional_tax', 'income_tax',
  'insurance', 'lop_deduction', 'gross_salary', 'net_salary'
];

const createTableQuery = (tableName) => {
  // Exclude 'employee_id' from dynamic columns
  const OTHER_COLUMNS = SALARY_COLUMNS.slice(1);
  const columnDefinitions = OTHER_COLUMNS
    .map((col) => {
      const type = MONETARY_COLUMNS.includes(col) ? 'DECIMAL(12,2) DEFAULT NULL' : 'VARCHAR(255) DEFAULT NULL';
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

// Function to delete all data from a table
const deleteExistingData = (tableName) => `DELETE FROM \`${tableName}\`;`;

// Fixed: Proper multi-row INSERT with correct placeholders per row-set
const insertSalaryData = (tableName, rows) => {
  if (rows.length === 0) return { query: '', values: [] };

  const columnsStr = SALARY_COLUMNS.map(col => `\`${col}\``).join(', ');
  const placeholders = SALARY_COLUMNS.map(() => '?').join(', ');
  const valueSets = Array(rows.length).fill(`(${placeholders})`).join(', ');
  const query = `INSERT INTO \`${tableName}\` (${columnsStr}) VALUES ${valueSets}`;

  // FlatMap values; use ?? for null/undefined
  const values = rows.flatMap(row => SALARY_COLUMNS.map(col => row[col] ?? null));

  return { query, values };
};

module.exports = {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
  SALARY_COLUMNS,
  MONETARY_COLUMNS
};