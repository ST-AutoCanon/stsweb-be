
const INSERT_LETTERHEAD = `
  INSERT INTO letterhead (
    letterhead_code, template_name, letter_type, subject, body,
    recipient_name, title, mobile_number, email, address, date, signature,
    employee_name, position, annual_salary, effective_date, date_of_appointment, attachment, place
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

const UPDATE_LETTERHEAD_BY_ID = `
  UPDATE letterhead SET
    letterhead_code = ?, template_name = ?, letter_type = ?, subject = ?, body = ?,
    recipient_name = ?, title = ?, mobile_number = ?, email = ?, address = ?, date = ?, signature = ?,
    employee_name = ?, position = ?, annual_salary = ?, effective_date = ?, date_of_appointment = ?, attachment = ?, place = ?
  WHERE id = ?;
`;

const GET_ALL_LETTERHEADS = `
  SELECT id, letterhead_code, template_name, letter_type, subject, body,
         recipient_name, title, mobile_number, email, address, date, signature,
         employee_name, position, annual_salary, effective_date, date_of_appointment, attachment, place
  FROM letterhead ORDER BY id DESC;
`;

const GET_LETTERHEAD_BY_ID = `
  SELECT id, letterhead_code, template_name, letter_type, subject, body,
         recipient_name, title, mobile_number, email, address, date, signature,
         employee_name, position, annual_salary, effective_date, date_of_appointment, attachment, place
  FROM letterhead WHERE id = ?;
`;

module.exports = {
  INSERT_LETTERHEAD,
  UPDATE_LETTERHEAD_BY_ID,
  GET_ALL_LETTERHEADS,
  GET_LETTERHEAD_BY_ID
};