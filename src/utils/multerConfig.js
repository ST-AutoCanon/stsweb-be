const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'photos'); 
  },
  filename: (req, file, cb) => {
    const email = req.body.email;
    if (email) {
      // Replace special characters in email to avoid filesystem issues
      const sanitizedEmail = email.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${sanitizedEmail}${path.extname(file.originalname)}`);
    } else {
      cb(new Error('Email is required to save the photo.'));
    }
  },  
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

const upload = multer({ storage, fileFilter });
module.exports = upload;
