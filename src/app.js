const express = require("express");
const bodyParser = require("body-parser");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware"); 
const sessionMiddleware = require("./middleware/sessionMiddleware"); 
require("dotenv").config();

const app = express();

// Apply API key middleware universally
app.use(apiKeyMiddleware);

// Apply session middleware to all routes except login
app.use(sessionMiddleware);

app.use(bodyParser.json());
app.use("/", loginRoutes);
app.use("/", leaveRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
