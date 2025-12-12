
const express = require("express");
// const { getEmployeesBySupervisorHandler } = require("../handlers/supervisorEmployeesHandler");

// const router = express.Router();

// router.get("/employees", getEmployeesBySupervisorHandler);

// module.exports = router;

const { getFullHierarchyHandler } = require("../handlers/supervisorEmployeesHandler");
 const router = express.Router();
router.get("/hierarchy", getFullHierarchyHandler);

module.exports = router;