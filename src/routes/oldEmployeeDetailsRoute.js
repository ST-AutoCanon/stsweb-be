// const express = require("express");
// const router = express.Router();

// const {
//   saveOldEmployeeDetails,
//   fetchOldEmployeeDetails,
// } = require("../handlers/oldEmployeeDetailsHandler");

// // 🆕 Route to save old employee details
// router.post("/old-employee/save", saveOldEmployeeDetails);

// // 🆕 Route to fetch all old employee details
// router.get("/old-employee/list", fetchOldEmployeeDetails);

// module.exports = router;

const express = require("express");
const router = express.Router();

const {
  saveOldEmployeeDetails,
  fetchOldEmployeeDetails,
  editOldEmployeeDetails,
} = require("../handlers/oldEmployeeDetailsHandler");

// Route to save old employee details
router.post("/old-employee/save", saveOldEmployeeDetails);

// Route to fetch all old employee details
router.get("/old-employee/list", fetchOldEmployeeDetails);

// Route to update old employee details
router.put("/old-employee/edit", editOldEmployeeDetails);

module.exports = router;
