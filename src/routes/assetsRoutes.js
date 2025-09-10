
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

// Define the uploads directory (outside src)
const uploadDir = path.join(__dirname, '..', 'uploads'); // Points to F:\STS2\stsweb-be\Uploads

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

router.post('/add', upload.single('document'), addAssetHandler);
router.get('/list', getAssetsHandler);
router.post('/assign', assignAsset);
router.get('/assigned/:assetId', getAssetAssignmentHandler);
router.put('/assets/return-date', updateReturnDateHandler);
router.get('/assets/counts', getAssetCountsHandler);
router.get('/counts', getAssetCountsHandler);
router.get('/search-employees', searchEmployeesHandler);
router.get("/assigned-assets/:employeeId", getAssignedAssetsByEmployee);

// Download route
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename); // Use uploadDir (F:\STS2\stsweb-be\Uploads)
    console.log('Serving file:', filePath);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.log('File not found:', filePath);
        res.status(404).json({ message: 'File not found' });
    }
});

module.exports = router;