// const INSERT_VENDOR = `
//   INSERT INTO vendors (
//   company_name, registered_address, city, state, pin_code, gst_number, pan_number, company_type,
//   contact1_name, contact1_designation, contact1_mobile, contact1_email,
//   contact2_name, contact2_designation, contact2_mobile, contact2_email,
//   contact3_name, contact3_designation, contact3_mobile, contact3_email,
//   bank_name, branch, account_number, ifsc_code,
//   nature_of_business, product_category, years_of_experience,
//   gst_certificate, pan_card, cancelled_cheque, msme_certificate, incorporation_certificate
// )
// VALUES (?, ?, ?, ?, ?, ?, ?, ?,
//         ?, ?, ?, ?,
//         ?, ?, ?, ?,
//         ?, ?, ?, ?,
//         ?, ?, ?, ?,
//         ?, ?, ?,
//         ?, ?, ?, ?, ?);

// `;

// const GET_ALL_VENDORS = `
//   SELECT * FROM vendors;
// `;

// module.exports = {
//   INSERT_VENDOR,
//   GET_ALL_VENDORS
// };
const INSERT_VENDOR = `
  INSERT INTO vendors (
  company_name, registered_address, city, state, pin_code, gst_number, pan_number, company_type,
  contact1_name, contact1_designation, contact1_mobile, contact1_email,
  contact2_name, contact2_designation, contact2_mobile, contact2_email,
  contact3_name, contact3_designation, contact3_mobile, contact3_email,
  bank_name, branch, account_number, ifsc_code,
  nature_of_business, product_category, years_of_experience,
  gst_certificate, pan_card, cancelled_cheque, msme_certificate, incorporation_certificate
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?);
`;

const GET_ALL_VENDORS = `
  SELECT * FROM vendors;
`;

module.exports = {
  INSERT_VENDOR,
  GET_ALL_VENDORS,
};