const express = require("express");
const router = express.Router();
const {
  upsertOvertimeSupervisor,
} = require("../handlers/overtimeSupervisorHandler");

router.post("/overtime-upsert-supervisor", upsertOvertimeSupervisor);

module.exports = router;
