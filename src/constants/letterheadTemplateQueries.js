const CREATE_LETTERHEAD_TEMPLATES_TABLE = `
  CREATE TABLE IF NOT EXISTS letterhead_templates (
    id SERIAL PRIMARY KEY,
    letter_type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`;

const INSERT_DEFAULT_TEMPLATES = `
  INSERT INTO letterhead_templates (letter_type, content, subject, company_name, company_address) VALUES
  (
    'Offer Letter',
    'Dear [Recipient Name],\n\nWe are pleased to offer you the position of [Position] at [Company Name]. Your skills and experience align perfectly with our team’s vision. Below are the details of your employment:\n\n- <strong>Position</strong>: [Position]\n- <strong>Start Date</strong>: [Start Date]\n- <strong>Salary</strong>: [Salary Details]\n- <strong>Benefits</strong>: [Benefits Details]\n\nPlease confirm your acceptance by signing and returning a copy of this letter by [Date].\n\nWe look forward to welcoming you to the team!\n\nBest Regards,',
    'Offer of Employment',
    'Sukalpa Tech Solutions Pvt Ltd',
    '#71, Bauxite Road, Sarathi Nagar, Belagavi -591108, Karnataka, India'
  ),
  (
    'Relieving Letter',
    'Dear [Recipient Name],\n\nThis is to certify that [Employee Name] has been relieved from their duties as [Position] at [Company Name], effective [Date]. During their tenure, [Employee Name] demonstrated professionalism and dedication.\n\nWe wish them the very best in their future endeavors.\n\nSincerely,',
    'Relieving Letter',
    'Sukalpa Tech Solutions Pvt Ltd',
    '#71, Bauxite Road, Sarathi Nagar, Belagavi -591108, Karnataka, India'
  ),
  (
    'Bank Details Request Letter',
    'Dear [Recipient Name],\n\nSubject: Request for Bank Details\n\nWe hope this message finds you well. To facilitate [Purpose, e.g., salary processing, vendor payments], kindly provide the following bank details:\n\n- <strong>Bank Name</strong>:\n- <strong>Account Number</strong>:\n- <strong>IFSC Code</strong>:\n- <strong>Branch Name</strong>:\n\nPlease submit these details by [Date] to ensure timely processing.\n\nThank you for your cooperation.\n\nRegards,',
    'Request for Bank Details',
    'Sukalpa Tech Solutions Pvt Ltd',
    '#71, Bauxite Road, Sarathi Nagar, Belagavi -591108, Karnataka, India'
  ),
  (
    'Letter',
    'Dear [Recipient Name],\n\nThis is a general letter template. Please edit the content as needed to suit your requirements.\n\nThank you.\n\nRegards,',
    'General Letter',
    'Sukalpa Tech Solutions Pvt Ltd',
    '#71, Bauxite Road, Sarathi Nagar, Belagavi -591108, Karnataka, India'
  );
`;

const GET_ALL_TEMPLATES = `
  SELECT * FROM letterhead_templates;
`;

const INSERT_TEMPLATE = `
  INSERT INTO letterhead_templates (letter_type, content, subject, company_name, company_address)
  VALUES (?, ?, ?, ?, ?);
`;

const UPDATE_TEMPLATE_BY_LETTER_TYPE = `
  UPDATE letterhead_templates
  SET content = ?, subject = ?, company_name = ?, company_address = ?, updated_at = CURRENT_TIMESTAMP
  WHERE letter_type = ?;
`;

module.exports = {
  CREATE_LETTERHEAD_TEMPLATES_TABLE,
  INSERT_DEFAULT_TEMPLATES,
  GET_ALL_TEMPLATES,
  INSERT_TEMPLATE,
  UPDATE_TEMPLATE_BY_LETTER_TYPE,
};