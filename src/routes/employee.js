const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs'); 
const employeeHandler = require('../handlers/employeeHandler');
const upload = require('../utils/multerConfig');

// Define routes
router.post('/admin/employees', upload.single('photo'), employeeHandler.addEmployee);
router.get('/admin/employees', employeeHandler.searchEmployees);
router.put('/admin/employees/:employeeId', upload.single('photo'), employeeHandler.editEmployee);
router.get('/employee/:employeeId', employeeHandler.getEmployee);
router.put('/admin/employees/:employeeId/deactivate', employeeHandler.deactivateEmployee);

router.get('/photos/:photoUrl', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    console.log('API Key:', apiKey);
    console.log('Requested photoUrl:', req.params.photoUrl);

    if (!apiKey) {
        return res.status(403).json({ message: "API key required" });
    }

    // Log the constructed file path
    const filePath = path.join(__dirname, '../../photos', req.params.photoUrl);
    console.log('Constructed File Path:', filePath);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Image not found:', err);
            console.log('File Path Checked:', filePath);
            return res.status(404).json({ message: "Image not found" });
        }
        console.log('Image found. Sending file:', filePath);
        res.sendFile(filePath);
    });
});

module.exports = router;
