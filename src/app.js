const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const session = require('express-session');

const holidayRoutes = require("./routes/holidayRoutes");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const employeeRoutes = require("./routes/employee");
const employeeQueries = require("./routes/employeeQueries");
const resetPasswordRoutes = require("./routes/resetPassword");
const forgotPasswordRoutes = require("./routes/forgotPassword");
const addDepartmentRoutes = require("./routes/addDepartment");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
const idleTimeout = require('./middleware/idleTimeout');


const { initializeSocket } = require("./socket");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server); 

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

// Apply API key middleware first
app.use(apiKeyMiddleware);

// Initialize session before idleTimeout
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Apply idleTimeout after session is initialized
app.use(idleTimeout);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/", holidayRoutes);
app.use("/", loginRoutes);
app.use("/", leaveRoutes);
app.use("/", employeeRoutes);
app.use("/", employeeQueries);
app.use("/", resetPasswordRoutes);
app.use("/", forgotPasswordRoutes);
app.use("/", addDepartmentRoutes);

// Ensure the Server Starts Correctly
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
