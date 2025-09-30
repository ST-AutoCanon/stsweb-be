
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const { Server } = require("socket.io");
//tasks
const planRoutes = require("./routes/planRoute");
const supervisorEmployeesRoutes = require("./routes/supervisorEmployeesRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const taskEmployeesRoutes = require("./routes/taskEmployeesRoutes");
const taskRoutes = require("./routes/taskroutes");
const taskMessagesRoutes = require("./routes/taskMessagesRoutes");
const employeeTaskRoutes = require("./routes/employeeTaskUpdateRoutes");
const weeklyTaskSupervisorRoutes = require("./routes/weekly_task_supervisor");
const weekTaskRoutes = require("./routes/weekTaskRoutes");

// const supervisorEmployeesRoutes = require("./routes/supervisorEmployeesRoutes");

// const taskEmployeesRoutes = require("./routes/taskEmployeesRoutes");
// const employeeTaskRoutes = require("./routes/employeeTaskUpdateRoutes");


// const cron = require("node-cron");

const EmployeeQueries = require("./services/employeeQueries");
const chatService = require("./services/chatService");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
const idleTimeout = require("./middleware/idleTimeout");

const holidayRoutes = require("./routes/holidayRoutes");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const leavePolicy = require("./routes/leavePolicyRoutes");

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
const face_admin_page = require("./routes/face_adminpageRoutes");
const employeeloginRoutes = require("./routes/employeeloginRoutes");
// require("./services/punchCronService");
const employeeBirthdayRoutes = require("./routes/employeeBirthday");

const meetingRoutes = require("./routes/meetingRoutes");
const notificationsRouter = require("./routes/notifications");

//vendors
const vendorRoutes = require("./routes/vendorRoutes");

//generatepaysliproutes
const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
const empExcelRoutes = require("./routes/emp_excelsheetRoutes");

//letters
const letterRoutes = require("./routes/letterRoutes");
const letterheadRoutes = require("./routes/letterheadRoute");
const letterheadTemplateRoutes = require("./routes/letterheadTemplateRoutes");

//compensation
const compensationRoutes = require("./routes/compensationRoutes");
const assignCompensationRoutes = require("./routes/assignCompensationRoute");
const employeeRoutesforsalarybreakup = require("./routes/compensationRoutes");
const overtimeRoutes = require("./routes/assignCompensationRoute");
const overtimeSummaryRoutes = require("./routes/overtimeSummaryRoutes");
const employeeProjectsRoute = require("./routes/employeeProjectsRoute");
const lossofPayCalculationRoutes = require("./routes/lossofPayCalculationRoutes");
const incentivesRoutes = require("./routes/incentivesRoutes");
const app = express();
const server = http.createServer(app);

// ✅ JSON + body parser must come FIRST
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔹 CORS setup
const allowedOrigins = [
  "https://localhost",
  "capacitor://localhost",
  "https://sukalpatechsolutions.com",
  "https://sts-test.site",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://122.166.77.12:3000", // ✅ added from second file
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

//assets
app.use("/api/weekly_task_supervisor", weeklyTaskSupervisorRoutes);
app.use("/api/week_tasks", weekTaskRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", taskMessagesRoutes);
app.use("/api/supervisor", supervisorRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/supervisor", supervisorEmployeesRoutes);

app.use("/api/task-emp-emp", taskEmployeesRoutes);
app.use("/api/employee-tasks", employeeTaskRoutes);


app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const assetsRoutesforreturn = require("./routes/assetsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const webpush = require("web-push");
const cron = require("node-cron");
const policyNotificationService = require("./services/policyNotificationService");

// ✅ Cron job #1
cron.schedule(
  "30 17 * * *",
  async () => {
    try {
      await policyNotificationService.sendPolicyEndNotifications(10);
      await policyNotificationService.sendPolicyEndNotifications(5);
      console.log("[cron] policy end alerts executed at 17:22 Asia/Kolkata");
    } catch (err) {
      console.error("[cron] policy alert error:", err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

// ✅ Cron job #2 (from second file)
cron.schedule(
  "00 12 * * *",
  async () => {
    try {
      await policyNotificationService.sendPolicyEndNotifications(10);
      await policyNotificationService.sendPolicyEndNotifications(5);
      console.log("[cron] policy end alerts executed at 12:00 Asia/Kolkata");
    } catch (err) {
      console.error("[cron] policy alert error:", err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

// ✅ Profile Missing Notifier (from second file)
const { scheduleJob } = require("./jobs/profileMissingNotifier");
(async function initProfileNotifier() {
  if (process.env.ENABLE_PROFILE_NOTIFIER !== "true") {
    console.log(
      "[startup] profileMissingNotifier disabled (ENABLE_PROFILE_NOTIFIER != true)"
    );
    return;
  }

  const db = require("./config");
  const maxAttempts = 6;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      await db.execute("SELECT 1");
      scheduleJob();
      console.log("[startup] profileMissingNotifier scheduled (DB ready)");
      return;
    } catch (err) {
      console.warn(
        `[startup] profileMissingNotifier DB ping failed (attempt ${attempt}/${maxAttempts}) — retrying in 5s`,
        err && err.message ? err.message : err
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  console.error(
    "[startup] profileMissingNotifier: DB did not become ready — job not scheduled"
  );
})();

// Push notifications
const subscriptions = [];
webpush.setVapidDetails(
  "mailto:vaibhavichinchure@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.get("/vapidPublicKey", (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post("/subscribe", (req, res) => {
  console.log("Request headers:", req.headers);
  console.log("Raw body:", req.body);
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).send("Invalid subscription");
  }
  if (!subscriptions.find((s) => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
    console.log("New subscription stored:", sub.endpoint);
  }
  res.status(201).json({ success: true });
});

app.post("/check-subscription", (req, res) => {
  const { endpoint } = req.body;
  const exists = subscriptions.some((s) => s.endpoint === endpoint);
  res.json({ exists });
});

cron.schedule("0 20 * * *", async () => {
  console.log(
    "Sending daily notifications to",
    subscriptions.length,
    "subscribers:",
    subscriptions.map((s) => s.endpoint)
  );
  const payload = JSON.stringify({
    title: "Friendly Reminder",
    body: "🕒 After today’s work, please log off 💻from STS Web.",
    icon: "/logo192.png",
    url: "/",
  });
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Push failed for", sub.endpoint, ":", err);
    }
  }
});

// 🔹 Secure routes AFTER push/public routes
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
//tasks
// app.use("/api/task-emp-emp", taskEmployeesRoutes);
// app.use("/api/supervisor", supervisorRoutes);
// app.use("/api/plans", planRoutes);

// app.use("/api/tasks", taskRoutes);
// app.use("/api/messages", taskMessagesRoutes);
// app.use("/api/task-emp-emp", taskEmployeesRoutes);

//tasks


app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/api/leave-policies", leavePolicy);

app.use(idleTimeout);



// ✅ Your routes (unchanged below) …
app.use("/", holidayRoutes);
app.use("/", loginRoutes);
app.use("/", leaveRoutes);
app.use("/", projects);
app.use("/", invoices);
app.use("/", employeeRoutes);
app.use("/", meetingRoutes);
app.use("/api", notificationsRouter);
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

//attendancetracker
app.use("/api/attendance", adminAttendanceRoutes);
app.use("/admin/attendance", adminAttendanceRoutes);
app.use("/admin-attendance", adminAttendanceRoutes);
app.use("/face-punch", face_admin_page);
app.use("/api/employeelogin", employeeloginRoutes);
app.use("/api", empExcelRoutes);
app.use("/api/employee", employeeBirthdayRoutes);

// vendor routes
app.use("/", vendorRoutes);

//generatepayslip
app.use("/", oldEmployeeRoutes);
app.use("/", oldEmployeeDetailsRoutes);

//letters
app.use("/api", letterRoutes);
app.use(
  "/letterheadfiles",
  express.static(path.join(__dirname, "letterheadfiles"))
);
app.use("/api", letterheadRoutes);
app.use("/api", letterheadTemplateRoutes);
app.get("/", (req, res) => {
  res.send("LetterHead API is running");
});
app.use("/api/templates", letterheadTemplateRoutes);

//lossof pay and employee project names
app.use("/api", employeeProjectsRoute);
app.use("/api/lop", lossofPayCalculationRoutes);

//add incentives
app.use("/api/incentives", incentivesRoutes);

//compensation
app.use("/api/overtime", overtimeRoutes);
app.use("/api/overtime-summary", overtimeSummaryRoutes);


app.use("/api/compensations", compensationRoutes);
app.use("/api/compensation", assignCompensationRoutes);
app.use("/api", employeeRoutesforsalarybreakup);

////////////



// server side (app.js)
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*", credentials: true },
  path: "/api/socket.io",
});
app.set("io", io);

// keep/replace your io.use(...) with the permissive one we used earlier:
io.use((socket, next) => {
  const queryUser = socket.handshake.query?.userId || null;
  const authUser = socket.handshake.auth?.userId || null;
  const headerUser = socket.handshake.headers?.["x-employee-id"] || null;
  const userId = queryUser || authUser || headerUser || null;

  if (!userId) {
    console.warn(
      "[socket] no userId in handshake; allowing connection but functionality may be limited"
    );
    socket.userId = null;
    return next();
  }

  socket.userId = String(userId);
  return next();
});

io.on("connection", (socket) => {
  console.log(`[socket] new connection ${socket.id} userId=${socket.userId}`, {
    query: socket.handshake.query,
    auth: socket.handshake.auth,
  });

  // If we have a userId from handshake, join their chat rooms + query rooms.
  if (socket.userId) {
    chatService
      .getUserRooms(socket.userId)
      .then((rooms) => {
        console.log(
          `[socket:${socket.id}] joining ${rooms.length} rooms for user ${socket.userId}`
        );
        rooms.forEach((r) => socket.join(String(r.id)));
      })
      .catch((err) => console.error("[socket] getUserRooms error:", err));

    EmployeeQueries.getThreadsByEmployee(socket.userId)
      .then((threads) => {
        console.log(
          `[socket:${socket.id}] joining ${threads.length} query threads for user ${socket.userId}`
        );
        threads.forEach((t) => socket.join(`query_${String(t.id)}`));
      })
      .catch((err) =>
        console.error("[socket] getThreadsByEmployee error:", err)
      );
  } else {
    console.log(
      `[socket:${socket.id}] connected without userId — will require payload senderId for message saves.`
    );
  }

  // joinThread (employee queries)
  socket.on("joinThread", (threadId) => {
    try {
      console.log(`[socket:${socket.id}] joinThread ${threadId}`);
      socket.join(`query_${String(threadId)}`);
    } catch (e) {
      console.error(`[socket:${socket.id}] joinThread error`, e);
    }
  });

  // sendQueryMessage (employee queries) — prefer socket.userId but respect payload.sender_id
  socket.on("sendQueryMessage", async (payload, callback) => {
    console.log(`[socket:${socket.id}] sendQueryMessage payload:`, payload);
    try {
      if (!payload || !payload.thread_id) {
        const errMsg =
          "Invalid payload for sendQueryMessage (missing thread_id)";
        if (typeof callback === "function")
          callback({ success: false, error: errMsg });
        return;
      }

      const senderIdToUse = payload.sender_id ?? socket.userId ?? null;
      if (!senderIdToUse) {
        const errMsg = "Missing sender id for sendQueryMessage";
        if (typeof callback === "function")
          callback({ success: false, error: errMsg });
        socket.emit("error", errMsg);
        return;
      }

      const messageId = await EmployeeQueries.addMessage(
        payload.thread_id,
        senderIdToUse,
        payload.sender_role,
        payload.message,
        payload.recipient_id,
        null,
        payload.attachmentBase64
      );

      console.log(
        `[socket:${socket.id}] sendQueryMessage inserted id=${messageId}`
      );

      const newMsg = {
        id: messageId,
        thread_id: String(payload.thread_id),
        sender_id: senderIdToUse,
        sender_role: payload.sender_role,
        recipient_id: payload.recipient_id,
        sender_name: payload.sender_name || null,
        message: payload.message,
        created_at: new Date().toISOString(),
        attachment_url: payload.attachmentBase64
          ? `/attachments/${messageId}`
          : null,
      };

      io.to(`query_${String(payload.thread_id)}`).emit("newMessage", newMsg);
      // ack to sender
      if (typeof callback === "function")
        callback({ success: true, message: newMsg });
      // also emit an immediate ack event (compat)
      socket.emit("messageAck", newMsg);
    } catch (err) {
      console.error(
        "[socket] sendQueryMessage error:",
        err && err.message ? err.message : err
      );
      if (typeof callback === "function")
        callback({ success: false, error: err.message || "Unknown error" });
      socket.emit("error", err.message || "sendQueryMessage failed");
    }
  });

  // send_message (chat) — accept missing location, accept sender from socket or payload
  socket.on("send_message", async (payload = {}, ack) => {
    // payload: { roomId, content, type, fileUrl, location, senderId }
    console.log(
      `[socket:${socket.id}] send_message payload:`,
      payload && { ...payload, location: payload?.location ? "present" : null }
    );

    try {
      const { roomId, content, type, fileUrl, location } = payload;
      const payloadSenderId = payload.senderId ?? payload.sender_id ?? null;

      if (!roomId) {
        const errMsg = "Missing roomId in send_message";
        if (typeof ack === "function") ack({ success: false, error: errMsg });
        socket.emit("error", errMsg);
        return;
      }

      const effectiveSenderId = socket.userId ?? payloadSenderId ?? null;
      if (!effectiveSenderId) {
        const errMsg =
          "Missing sender id in send_message (socket not authed and payload has no senderId)";
        console.warn(`[socket:${socket.id}] ${errMsg}`);
        if (typeof ack === "function") ack({ success: false, error: errMsg });
        socket.emit("error", errMsg);
        return;
      }

      // allow location to be missing
      const lat = location?.lat ?? null;
      const lng = location?.lng ?? null;
      const address = location?.address ?? null;

      const saved = await chatService.saveMessage(
        roomId,
        effectiveSenderId,
        content,
        type,
        fileUrl,
        lat,
        lng,
        address
      );

      console.log(
        `[socket:${socket.id}] saved chat message id=${saved.id} room=${roomId} sender=${effectiveSenderId}`
      );

      const emitted = {
        roomId: saved.roomId,
        id: saved.id,
        senderId: saved.senderId,
        senderName: saved.senderName ?? saved.sender_name ?? null,
        photoUrl: saved.photoUrl ?? saved.photo_url ?? null,
        content: saved.content,
        type: saved.type,
        fileUrl: saved.fileUrl ?? saved.file_url ?? null,
        sentAt: saved.sentAt,
        readAt: saved.readAt ?? null,
        location: lat != null && lng != null ? { lat, lng, address } : null,
      };

      io.to(String(roomId)).emit("new_message", emitted);

      if (typeof ack === "function") ack({ success: true, message: emitted });
    } catch (err) {
      console.error(
        "[socket] send_message error:",
        err && err.message ? err.message : err
      );
      if (typeof ack === "function")
        ack({ success: false, error: err.message || "send_message failed" });
      socket.emit("error", err.message || "send_message failed");
    }
  });

  // create_room (unchanged, but with logs)
  socket.on("create_room", async ({ name, isGroup, members } = {}) => {
    try {
      const roomId = await chatService.createRoom(
        name,
        isGroup,
        socket.userId,
        members
      );
      socket.join(String(roomId));
      const [room] = await chatService.getUserRooms(socket.userId);
      socket.emit("room_created", room);
    } catch (err) {
      console.error("[socket] create_room error:", err);
      socket.emit("error", err.message || "create_room failed");
    }
  });

  // optional: clean disconnect log
  socket.on("disconnect", (reason) => {
    console.log(
      `[socket] ${socket.id} disconnected (${reason}) userId=${socket.userId}`
    );
  });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
