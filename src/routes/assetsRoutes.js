

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { addAssetHandler, getAssetsHandler ,getAssetAssignmentHandler,updateReturnDateHandler} = require('../handlers/assetsHandler');
// const { assignAsset,getAssetCountsHandler } = require("../handlers/assetsHandler");
// const { searchEmployeesHandler } = require("../handlers/assetsHandler");

// const router = express.Router();

// // Define the uploads directory
// const uploadDir = path.join(__dirname, '../uploads');

// // Multer storage configuration
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Ensure the directory exists before saving
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir, { recursive: true });
//         }
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename
//     }
// });

// const upload = multer({ storage });

// router.post('/add', upload.single('document'), addAssetHandler); // Accept file upload
// router.get("/list", getAssetsHandler); // Route to get all assets
// router.post("/assign", assignAsset);

// router.get('/assigned/:assetId', getAssetAssignmentHandler);

// router.put('/assets/return-date', updateReturnDateHandler);
// router.get('/assets/counts', getAssetCountsHandler); // Get asset counts by category & subcategory
// router.get("/counts", getAssetCountsHandler);
// router.get('/search-employees', searchEmployeesHandler);


// module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
    addAssetHandler, 
    getAssetsHandler, 
    getAssetAssignmentHandler, 
    updateReturnDateHandler, 
    assignAsset, 
    getAssetCountsHandler, 
    searchEmployeesHandler,
    getAssignedAssetsByEmployee, 
} = require('../handlers/assetsHandler');

const router = express.Router();

// Define the uploads directory
const uploadDir = path.join(__dirname, '..', 'uploads'); // ✅ goes to src/uploads

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

router.post('/add', upload.single('document'), addAssetHandler); // Accept file upload
router.get('/list', getAssetsHandler); // Route to get all assets
router.post('/assign', assignAsset);
router.get('/assigned/:assetId', getAssetAssignmentHandler);
router.put('/assets/return-date', updateReturnDateHandler);
router.get('/assets/counts', getAssetCountsHandler);
router.get('/counts', getAssetCountsHandler);
router.get('/search-employees', searchEmployeesHandler);

router.get("/assigned-assets/:employeeId", getAssignedAssetsByEmployee);



// 🔽 DOWNLOAD route added below
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    console.log('Serving file:', filePath);
  
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      console.log('File not found:', filePath);
      res.status(404).json({ message: 'File not found' });
    }
  });

module.exports = router;
