
// Function to check if a table exists
const checkIfTableExists = (tableName) => `
  SELECT COUNT(*) AS count FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '${tableName}';
`;

// Function to create a CREATE TABLE SQL query dynamically
const createTableQuery = (tableName, columns) => {
  // Ensure 'employee_id' is included in the columns
  

  // Construct column definitions
  const columnDefinitions = columns
    .map((col) => `\`${col}\` TEXT`)
    .join(', ');

  // Create the SQL query
  return `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
     
      ${columnDefinitions}
    );
  `;
};

// Function to delete all data from a table
const deleteExistingData = (tableName) => `DELETE FROM \`${tableName}\`;`;

// Function to insert salary data into a table
const insertSalaryData = (tableName, row) => {
  // Ensure 'employee_id' exists in the row
  

  const columns = Object.keys(row).map((col) => `\`${col}\``).join(', ');
  const placeholders = Object.keys(row).map(() => '?').join(', ');
  const values = Object.values(row);

  return {
    query: `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders});`,
    values: values,
  };
};

// Function to generate a unique Employee ID (if missing)
const generateEmployeeId = () => {
  return `EMP${Math.floor(10000 + Math.random() * 90000)}`; // Example: EMP12345
};

module.exports = {
  checkIfTableExists,
  createTableQuery,
  deleteExistingData,
  insertSalaryData,
};
