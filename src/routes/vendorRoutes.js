// const express = require('express');
// const {
//   addVendorHandler,
//   getAllVendorsHandler,
// } = require('../handlers/vendorHandler');

// const router = express.Router();

// // Add a new vendor
// router.post('/add', addVendorHandler);

// // Get all vendors
// router.get('/list', getAllVendorsHandler);

// module.exports = router;
const express = require('express');
const multer = require('multer');
const { addVendorHandler, getAllVendorsHandler } = require('../handlers/vendorHandler'); // Adjust path

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Define fields for file uploads
const uploadFields = upload.fields([
  { name: 'gst_certificate', maxCount: 1 },
  { name: 'pan_card', maxCount: 1 },
  { name: 'cancelled_cheque', maxCount: 1 },
  { name: 'msme_certificate', maxCount: 1 },
  { name: 'incorporation_certificate', maxCount: 1 },
]);

// Routes
router.post('/vendors/add', uploadFields, addVendorHandler);
router.get('/vendors/list', getAllVendorsHandler);

module.exports = router;