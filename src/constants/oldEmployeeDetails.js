
const INSERT_OLD_EMPLOYEE_DETAILS = `
 INSERT INTO old_employee_details (
  employee_name, employee_id, gender, designation, date_of_joining,
  account_no, working_days, leaves_taken, uin_no, pan_number,
  esi_number, pf_number, basic, hra, other_allowance, pf, esi_insurance,
  professional_tax, tds, gross_earnings, total_deductions, net_salary,
  month, year
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const GET_ALL_OLD_EMPLOYEE_DETAILS = `
  SELECT * FROM old_employee_details ORDER BY created_at DESC
`;

const UPDATE_OLD_EMPLOYEE_DETAILS = `
  UPDATE old_employee_details SET
    employee_name = ?, gender = ?, designation = ?, date_of_joining = ?,
    account_no = ?, working_days = ?, leaves_taken = ?, uin_no = ?, pan_number = ?,
    esi_number = ?, pf_number = ?, basic = ?, hra = ?, other_allowance = ?,
    pf = ?, esi_insurance = ?, professional_tax = ?, tds = ?, gross_earnings = ?,
    total_deductions = ?, net_salary = ?, month = ?, year = ?
  WHERE employee_id = ?
`;

module.exports = {
  INSERT_OLD_EMPLOYEE_DETAILS,
  GET_ALL_OLD_EMPLOYEE_DETAILS,
  UPDATE_OLD_EMPLOYEE_DETAILS,
};