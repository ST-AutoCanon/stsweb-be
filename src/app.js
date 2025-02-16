const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const holidayRoutes = require("./routes/holidayRoutes");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const employeeRoutes = require("./routes/employee");
const employeeQueries = require("./routes/employeeQueries");
const resetPasswordRoutes = require("./routes/resetPassword");
const forgotPasswordRoutes = require("./routes/forgotPassword");
const addDepartmentRoutes = require("./routes/addDepartment");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
const sessionMiddleware = require("./middleware/sessionMiddleware");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware"); 
const sessionMiddleware = require("./middleware/sessionMiddleware"); 



// const employeeRoutes2 = require("./routes/adminDashboardRoutes");

const cors = require('cors');
require("dotenv").config();

const { initializeSocket } = require("./socket"); // Import socket initialization function

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server); // Initialize socket.io

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);


// Apply middlewares


// Apply API key middleware universally

app.use(apiKeyMiddleware);
app.use(sessionMiddleware);
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

// app.use("/", employeeRoutes2);


// app.use("/admindash", validateApiKey, adminDashboardRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => {

  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
