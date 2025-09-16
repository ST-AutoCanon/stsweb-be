const express = require("express");
const router = express.Router();
const planHandler = require("../handlers/planHandler");

router.post("/", planHandler.savePlan);
router.get("/:empId", planHandler.getPlansByEmployee);
router.put("/:plan_id", planHandler.updateMessages);
router.put("/:plan_id/approve", planHandler.approvePlan);

module.exports = router;