const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const { Server } = require("socket.io");

const chatService = require("./services/chatService");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
const idleTimeout = require("./middleware/idleTimeout");

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
const attendanceRoutes = require("./routes/attendance_Routes");
const empSessionRoutes = require("./routes/empSessionRoute");
const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
const workDayRoutes = require("./routes/empWorkDay");
const workHourSummaryRoutes = require("./routes/empWorkHour");
const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
const regFaceRoutes = require("./routes/reg_faceRoutes");
const faceRoutes = require("./routes/faceRoutes");
const faceDataRoutes = require("./routes/faceDataRoutes");
const checkFaceRoute = require("./routes/checkFaceRoute");
const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const bankDetailsRoutes = require("./routes/payrollRoutes");
const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
const reimbursementRoutes = require("./routes/reimbursementRoute");
const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
const assetsRoutes = require("./routes/assetsRoutes");
const validateApiKey = require("./middleware/apiKeyMiddleware");
//attendancetracker
const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
const adminAttendancetrackerRoute = require("./routes/adminAttendancetrackerRoute");

//vendors
const vendorRoutes = require("./routes/vendorRoutes"); // ✅ Import vendor routes

const app = express();
const server = http.createServer(app);
require("./cronJob");
//assets
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
const assetsRoutesforreturn = require("./routes/assetsRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-employee-id",
    ],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(apiKeyMiddleware);

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

app.use(idleTimeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
app.use("/", chatRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/", dashboardReimbursementRoutes);
app.use("/", workDayRoutes);
app.use("/", empSessionRoutes);
app.use("/api", workHourSummaryRoutes);
app.use("/", empLeaveQueryDashboard);
app.use("/salary", salaryRoutes);
app.use("/api", payrollRoutes);
app.use("/api", bankDetailsRoutes);
app.use("/", workDayRoutes);
app.use("/api", adminSalaryStatementRoutes);
app.use("/", salarylastmonthtotal);
app.use("/", admindashboardReimbursementRoutes);
app.use("/api", regFaceRoutes);
app.use("/api/face", faceRoutes);
app.use("/", faceDataRoutes);
app.use(checkFaceRoute);
app.get("/", (req, res) => {
  res.send("Employee Face Recognition API");
});
app.use("/assets", assetsRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api", assetsRoutesforreturn);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//attendancetracker
app.use("/api/attendance", adminAttendanceRoutes);
app.use("/admin/attendance", adminAttendanceRoutes);
app.use("/admin-attendance", adminAttendanceRoutes);

// vendor Route definitions
app.use("/", vendorRoutes); // ✅ Prefix all vendor routes with /vendors

//
app.use("/api", payrollRoutes);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*" },
});

// Socket-auth handshake
io.use((socket, next) => {
  const userId = socket.handshake.query.userId;
  if (!userId) return next(new Error("Auth error"));
  socket.userId = userId;
  next();
});

// Socket events
io.on("connection", (socket) => {
  // auto-join existing rooms
  chatService
    .getUserRooms(socket.userId)
    .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
    .catch(console.error);

  socket.on("send_message", async ({ roomId, content, type, fileUrl }) => {
    await chatService.saveMessage(
      roomId,
      socket.userId,
      content,
      type,
      fileUrl
    );
    io.to(roomId.toString()).emit("new_message", {
      roomId,
      senderId: socket.userId,
      content,
      type,
      fileUrl,
      sentAt: new Date(),
    });
  });

  socket.on("create_room", async ({ name, isGroup, members }) => {
    const roomId = await chatService.createRoom(
      name,
      isGroup,
      socket.userId,
      members
    );
    socket.join(roomId.toString());
    socket.emit("room_created", { roomId, name, isGroup });
  });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
