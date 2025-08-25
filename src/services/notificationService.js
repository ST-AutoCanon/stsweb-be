const express = require("express");
const router = express.Router();
const { sendNotification } = require("../services/notificationService");

let subscriptions = []; // In production, store in DB

router.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: "Subscription saved" });
});

router.post("/send", async (req, res) => {
  const payload = { title: "Punch Reminder", body: "Please do the punchin punchout properly" };
  await Promise.all(subscriptions.map(sub => sendNotification(sub, payload)));
  res.json({ message: "Notifications sent" });
});

module.exports = router;
