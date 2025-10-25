module.exports = {
    getSalarySlipQuery: (tableName) => `SELECT * FROM ${tableName} WHERE employee_id = ?`,

    GETEMPLOYEEBANKDETAILSQUERY: `SELECT * FROM employee_bank_details WHERE employee_id = ?`,
    GET_EMPLOYEE_DETAILS_QUERY: `SELECT * FROM employees WHERE employee_id = ?`,
    
    GET_EMPLOYEE_PERSONAL_PROFESSIONAL_QUERY: `
        SELECT 
            ep.employee_id,
            epp.gender,
            epp.pan_number,
            epp.pf_number,
            epp.esi_number,
            epp.uan_number,
            ep.position AS designation,
            ep.joining_date
        FROM 
            employee_professional ep
        INNER JOIN 
            employee_personal epp ON ep.employee_id = epp.employee_id
        WHERE 
            ep.employee_id = ?
    `
};