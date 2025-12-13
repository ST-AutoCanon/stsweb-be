// const checkIfTableExists = (tableName) => `
//   SELECT COUNT(*) AS count 
//   FROM information_schema.tables 
//   WHERE table_schema = DATABASE() 
//   AND table_name = '${tableName}';
// `;

// const createTableQuery = (tableName, columns) => {
//   const columnDefinitions = columns
//     .map((col) =>
//       col === "payslip_generated"
//         ? `\`${col}\` INT DEFAULT 0 NOT NULL`
//         : `\`${col}\` TEXT`
//     )
//     .join(", ");

//   return `
//     CREATE TABLE IF NOT EXISTS \`${tableName}\` (
//       ${columnDefinitions}
//     );
//   `;
// };

// /**
//  * UPSERT salary row:
//  * - Inserts new employee rows
//  * - Updates existing employee rows
//  * - Preserves payslip_generated unless explicitly sent
//  */
// const insertSalaryData = (tableName, row) => {
//   const columns = Object.keys(row);
//   const values = Object.values(row);

//   const colNames = columns.map((c) => `\`${c}\``).join(", ");
//   const placeholders = columns.map(() => "?").join(", ");

//   const updates = columns
//     .filter((c) => c !== "employee_id") // primary key
//     .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
//     .join(", ");

//   const query = `
//     INSERT INTO \`${tableName}\` (${colNames})
//     VALUES (${placeholders})
//     ON DUPLICATE KEY UPDATE ${updates}
//   `;

//   return { query, values };
// };

// module.exports = {
//   checkIfTableExists,
//   createTableQuery,
//   insertSalaryData,
// };

const createTableQuery = (tableName, columns) => {
  const columnDefinitions = columns
    .map((col) =>
      col === "payslip_generated"
        ? `\`${col}\` INT DEFAULT 0 NOT NULL`
        : col === "employee_id"
        ? `\`${col}\` VARCHAR(50) NOT NULL`
        : `\`${col}\` TEXT`
    )
    .join(", ");

  return `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      ${columnDefinitions}
    );
  `;
};

/**
 * UPSERT:
 * - employee_id is UNIQUE
 * - existing rows UPDATE
 * - new rows INSERT
 * - payslip_generated preserved
 */
const insertSalaryData = (tableName, row) => {
  const columns = Object.keys(row);
  const values = Object.values(row);

  const colNames = columns.map((c) => `\`${c}\``).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  const updates = columns
    .filter(
      (c) => c !== "employee_id" && c !== "payslip_generated"
    )
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(", ");

  const query = `
    INSERT INTO \`${tableName}\` (${colNames})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  return { query, values };
};

module.exports = {
  createTableQuery,
  insertSalaryData,
};
