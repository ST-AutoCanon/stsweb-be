const express = require("express");
const router = express.Router();

const {
  saveOldEmployeeDetails,
  fetchOldEmployeeDetails,
  editOldEmployeeDetails,
} = require("../handlers/oldEmployeeDetailsHandler");

router.post("/old-employee/save", saveOldEmployeeDetails);

router.get("/old-employee/list", fetchOldEmployeeDetails);

router.put("/old-employee/edit", editOldEmployeeDetails);

module.exports = router;
