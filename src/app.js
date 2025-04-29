const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const session = require("express-session");

const holidayRoutes = require("./routes/holidayRoutes");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const employeeRoutes = require("./routes/employee");
const employeeQueries = require("./routes/employeeQueries");
const projects = require("./routes/project");
const invoices = require("./routes/invoiceRoutes");
const resetPasswordRoutes = require("./routes/resetPassword");
const forgotPasswordRoutes = require("./routes/forgotPassword");
const addDepartmentRoutes = require("./routes/addDepartment");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
const idleTimeout = require("./middleware/idleTimeout");

///employeedashboardroutes////
const attendanceRoutes = require("./routes/attendance_Routes");
const empSessionRoutes = require("./routes/empSessionRoute");
const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
const workDayRoutes = require("./routes/empWorkDay");
const workHourSummaryRoutes = require("./routes/empWorkHour");
const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
const regFaceRoutes = require("./routes/reg_faceRoutes");
const faceRoutes = require('./routes/faceRoutes');
const faceDataRoutes = require('./routes/faceDataRoutes');
const checkFaceRoute = require('./routes/checkFaceRoute');

//payrollroutes

const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");

const salaryRoutes = require("./routes/salaryRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const bankDetailsRoutes = require("./routes/payrollRoutes"); // Ensure correct path
const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
//reimbursement
const reimbursementRoutes = require("./routes/reimbursementRoute");
const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");

//assets
const assetsRoutes = require("./routes/assetsRoutes");
const validateApiKey = require("./middleware/apiKeyMiddleware");
const assetsRoutesforreturn = require("./routes/assetsRoutes"); // Ensure this is correctly imported

const app = express();
const server = http.createServer(app);

//assets
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    exposedHeaders: ["Content-Disposition"], // ← Expose the filename header
    credentials: true,
  })
);

// Apply API key middleware first
app.use(apiKeyMiddleware);

// Initialize session before idleTimeout
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

// Apply idleTimeout after session is initialized
app.use(idleTimeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/", holidayRoutes);
app.use("/", loginRoutes);
app.use("/", leaveRoutes);
app.use("/", projects);
app.use("/", invoices);
app.use("/", employeeRoutes);
app.use("/", employeeQueries);
app.use("/", resetPasswordRoutes);
app.use("/", forgotPasswordRoutes);
app.use("/", addDepartmentRoutes);
app.use("/", reimbursementRoutes);

//Esmpdashboard Routes
app.use("/attendance", attendanceRoutes);
app.use("/", dashboardReimbursementRoutes);
app.use("/", workDayRoutes);
app.use("/", empSessionRoutes);
app.use("/api", workHourSummaryRoutes);
app.use("/", empLeaveQueryDashboard);
app.use("/salary", salaryRoutes); // This means all salary routes are prefixed with "/salary"
app.use("/api", payrollRoutes);
app.use("/api", bankDetailsRoutes); // Make sure prefix matches your request
app.use("/", workDayRoutes);
app.use("/api", adminSalaryStatementRoutes);
app.use("/", salarylastmonthtotal);
app.use("/", admindashboardReimbursementRoutes);
app.use("/api", regFaceRoutes);
app.use('/api/face', faceRoutes);

app.use('/',faceDataRoutes);
app.use(checkFaceRoute);
app.get("/", (req, res) => {
  res.send("Employee Face Recognition API");
});


//assets
app.use("/assets", assetsRoutes); // Attach routes
app.use("/api/assets", assetsRoutes); // Register asset routes
app.use("/api", assetsRoutesforreturn); // Ensure this is correctly mounted
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
