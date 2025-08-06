const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const FIELD_FOLDERS = {
  photo: "photo",
  aadhaar_doc: "gov",
  pan_doc: "gov",
  passport_doc: "gov",
  driving_license_doc: "gov",
  voter_id_doc: "gov",
  tenth_cert: path.join("edu", "tenth"),
  twelfth_cert: path.join("edu", "twelfth"),
  ug_cert: path.join("edu", "ug"),
  pg_cert: path.join("edu", "pg"),
  resume: "resume",
  other_docs: "other",
  father_gov_doc: "fam",
  mother_gov_doc: "fam",
  spouse_gov_doc: "fam",
  child1_gov_doc: "fam",
  child2_gov_doc: "fam",
  child3_gov_doc: "fam",
};

const BASE_UPLOADS = path.join(__dirname, "../../../EmployeeDetails");

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const email = req.body.email;
    if (!email) {
      return cb(new Error("Missing employee email"), false);
    }

    const safeEmail = email;

    const bracketMatch = file.fieldname.match(
      /^(experience|additional_certs)\[(\d+)\]\[(doc|file)\]$/
    );

    let subfolder;
    if (bracketMatch) {
      const [, type, idx] = bracketMatch;
      if (type === "experience") {
        subfolder = path.join("exp", `exp_${idx}`);
      } else {
        // additional_certs
        subfolder = path.join("edu", "additional", `cert_${idx}`);
      }
    } else {
      // 2) Fallback to simple fields mapping
      subfolder = FIELD_FOLDERS[file.fieldname] || "misc";
    }

    const uploadDir = path.join(BASE_UPLOADS, safeEmail, subfolder);
    ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ]);
  cb(null, allowed.has(file.mimetype));
};

module.exports = multer({ storage, fileFilter }).any();
