// const vendorService = require("../services/vendorService");
// const { insertVendor } = require("../services/vendorService");

// // Add a new vendor

// const addVendorHandler = async (req, res) => {
//     try {
//       const {
//         company_name, registered_address, city, state, pin_code,
//         gst_number, pan_number, company_type,
//         contact1_name, contact1_designation, contact1_mobile, contact1_email,
//         contact2_name, contact2_designation, contact2_mobile, contact2_email,
//         contact3_name, contact3_designation, contact3_mobile, contact3_email,
//         bank_name, branch, account_number, ifsc_code,
//         nature_of_business, product_category, years_of_experience,
//         gst_certificate, pan_card, cancelled_cheque, msme_certificate, incorporation_certificate
//       } = req.body;
  
//       const vendorData = [
//         company_name, registered_address, city, state, pin_code,
//         gst_number, pan_number, company_type,
//         contact1_name, contact1_designation, contact1_mobile, contact1_email,
//         contact2_name, contact2_designation, contact2_mobile, contact2_email,
//         contact3_name, contact3_designation, contact3_mobile, contact3_email,
//         bank_name, branch, account_number, ifsc_code,
//         nature_of_business, product_category, years_of_experience,
//         gst_certificate, pan_card, cancelled_cheque, msme_certificate, incorporation_certificate
//       ];
  
//       const result = await insertVendor(vendorData);
//       res.status(201).json({ message: "Vendor added successfully", result });
//     } catch (error) {
//       console.error("Error in addVendorHandler:", error);
//       res.status(500).json({ error: "Failed to add vendor" });
//     }
//   };

// // Get all vendors
// const getAllVendorsHandler = async (req, res) => {
//   try {
//     const vendors = await vendorService.getAllVendors();
//     res.status(200).json({ success: true, data: vendors });
//   } catch (error) {
//     console.error("Error in getAllVendorsHandler:", error);
//     res.status(500).json({ success: false, message: "Error fetching vendors" });
//   }
// };

// module.exports = {
//   addVendorHandler,
//   getAllVendorsHandler,
// };




// const { insertVendor } = require("../services/vendorService");
// const addVendorHandler = async (req, res) => {
//   try {
//     // Extract text fields from req.body
//     const {
//       name,
//       contact_person,
//       email,
//       phone,
//       address,
//       company_name,
//       registered_address,
//       city,
//       state,
//       pin_code,
//       gst_number,
//       pan_number,
//       company_type,
//       contact1_name,
//       contact1_designation,
//       contact1_mobile,
//       contact1_email,
//       contact2_name,
//       contact2_designation,
//       contact2_mobile,
//       contact2_email,
//       contact3_name,
//       contact3_designation,
//       contact3_mobile,
//       contact3_email,
//       bank_name,
//       branch,
//       account_number,
//       ifsc_code,
//       nature_of_business,
//       product_category,
//       years_of_experience,
//     } = req.body;

//     // Extract file paths from req.files
//     const files = req.files || {};
//     const gst_certificate = files.gst_certificate ? files.gst_certificate[0].path : null;
//     const pan_card = files.pan_card ? files.pan_card[0].path : null;
//     const cancelled_cheque = files.cancelled_cheque ? files.cancelled_cheque[0].path : null;
//     const msme_certificate = files.msme_certificate ? files.msme_certificate[0].path : null;
//     const incorporation_certificate = files.incorporation_certificate ? files.incorporation_certificate[0].path : null;

//     // Validate required fields
//     if (!company_name) {
//       return res.status(400).json({ error: 'Company name is required' });
//     }

//     // Prepare vendor data array for the query
//     const vendorData = [
//       company_name || null,
//       registered_address || null,
//       city || null,
//       state || null,
//       pin_code || null,
//       gst_number || null,
//       pan_number || null,
//       company_type || null,
//       contact1_name || null,
//       contact1_designation || null,
//       contact1_mobile || null,
//       contact1_email || null,
//       contact2_name || null,
//       contact2_designation || null,
//       contact2_mobile || null,
//       contact2_email || null,
//       contact3_name || null,
//       contact3_designation || null,
//       contact3_mobile || null,
//       contact3_email || null,
//       bank_name || null,
//       branch || null,
//       account_number || null,
//       ifsc_code || null,
//       nature_of_business || null,
//       product_category || null,
//       years_of_experience || null,
//       gst_certificate || null,
//       pan_card || null,
//       cancelled_cheque || null,
//       msme_certificate || null,
//       incorporation_certificate || null,
//     ];

//     const result = await insertVendor(vendorData);
//     res.status(201).json({ message: 'Vendor added successfully', result });
//   } catch (error) {
//     console.error('Error in addVendorHandler:', error);
//     res.status(500).json({ error: 'Failed to add vendor', details: error.message });
//   }
// };

// // Get all vendors
// const getAllVendorsHandler = async (req, res) => {
//   try {
//     const vendors = await vendorService.getAllVendors();
//     res.status(200).json({ success: true, data: vendors });
//   } catch (error) {
//     console.error('Error in getAllVendorsHandler:', error);
//     res.status(500).json({ success: false, message: 'Error fetching vendors' });
//   }
// };

// module.exports = {
//   addVendorHandler,
//   getAllVendorsHandler,
// };

const vendorService = require("../services/vendorService");

const addVendorHandler = async (req, res) => {
  try {
    // Extract text fields from req.body
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      company_name,
      registered_address,
      city,
      state,
      pin_code,
      gst_number,
      pan_number,
      company_type,
      contact1_name,
      contact1_designation,
      contact1_mobile,
      contact1_email,
      contact2_name,
      contact2_designation,
      contact2_mobile,
      contact2_email,
      contact3_name,
      contact3_designation,
      contact3_mobile,
      contact3_email,
      bank_name,
      branch,
      account_number,
      ifsc_code,
      nature_of_business,
      product_category,
      years_of_experience,
    } = req.body;

    // Extract file paths from req.files
    const files = req.files || {};
    const gst_certificate = files.gst_certificate ? files.gst_certificate[0].path : null;
    const pan_card = files.pan_card ? files.pan_card[0].path : null;
    const cancelled_cheque = files.cancelled_cheque ? files.cancelled_cheque[0].path : null;
    const msme_certificate = files.msme_certificate ? files.msme_certificate[0].path : null;
    const incorporation_certificate = files.incorporation_certificate ? files.incorporation_certificate[0].path : null;

    // Validate required fields
    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Prepare vendor data array for the query
    const vendorData = [
      company_name || null,
      registered_address || null,
      city || null,
      state || null,
      pin_code || null,
      gst_number || null,
      pan_number || null,
      company_type || null,
      contact1_name || null,
      contact1_designation || null,
      contact1_mobile || null,
      contact1_email || null,
      contact2_name || null,
      contact2_designation || null,
      contact2_mobile || null,
      contact2_email || null,
      contact3_name || null,
      contact3_designation || null,
      contact3_mobile || null,
      contact3_email || null,
      bank_name || null,
      branch || null,
      account_number || null,
      ifsc_code || null,
      nature_of_business || null,
      product_category || null,
      years_of_experience || null,
      gst_certificate || null,
      pan_card || null,
      cancelled_cheque || null,
      msme_certificate || null,
      incorporation_certificate || null,
    ];

    const result = await vendorService.insertVendor(vendorData);
    res.status(201).json({ message: 'Vendor added successfully', result });
  } catch (error) {
    console.error('Error in addVendorHandler:', error);
    res.status(500).json({ error: 'Failed to add vendor', details: error.message });
  }
};

// Get all vendors
const getAllVendorsHandler = async (req, res) => {
  try {
    const vendors = await vendorService.getAllVendors();
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error in getAllVendorsHandler:', error);
    res.status(500).json({ success: false, message: 'Error fetching vendors' });
  }
};

module.exports = {
  addVendorHandler,
  getAllVendorsHandler,
};