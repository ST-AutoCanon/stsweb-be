
const GET_FULL_EMPLOYEE_HIERARCHY = `
    WITH RECURSIVE employee_tree AS (
        -- Level 1: Direct employees under the supervisor
        SELECT 
            ep.employee_id,
            ep.supervisor_id,
            1 AS level
        FROM sukalpadata.employee_professional ep
        WHERE ep.supervisor_id = ?

        UNION ALL

        -- Level 2+, recursive sub employees
        SELECT 
            ep.employee_id,
            ep.supervisor_id,
            et.level + 1
        FROM sukalpadata.employee_professional ep
        INNER JOIN employee_tree et ON ep.supervisor_id = et.employee_id
    )
    SELECT 
        et.employee_id,
        et.supervisor_id,
        et.level,
        CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
        epersonal.photo_url,
        emp.status
    FROM employee_tree et
    JOIN sukalpadata.employees emp 
        ON emp.employee_id = et.employee_id
    LEFT JOIN sukalpadata.employee_personal epersonal
        ON emp.employee_id = epersonal.employee_id
    WHERE emp.status = 'Active'
    ORDER BY et.level, et.employee_id;
`;
module.exports = {
//   GET_EMPLOYEES_BY_SUPERVISOR,
  GET_FULL_EMPLOYEE_HIERARCHY
};
