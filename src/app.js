// // const express = require("express");
// // const http = require("http");
// // const bodyParser = require("body-parser");
// // const cors = require("cors");
// // require("dotenv").config();
// // const path = require("path");
// // const session = require("express-session");
// // const { Server } = require("socket.io");

// // const chatService = require("./services/chatService");
// // const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
// // const idleTimeout = require("./middleware/idleTimeout");

// // const holidayRoutes = require("./routes/holidayRoutes");
// // const loginRoutes = require("./routes/login");
// // const leaveRoutes = require("./routes/leave");
// // const employeeRoutes = require("./routes/employee");
// // const employeeQueries = require("./routes/employeeQueries");
// // const projects = require("./routes/project");
// // const invoices = require("./routes/invoiceRoutes");
// // const resetPasswordRoutes = require("./routes/resetPassword");
// // const forgotPasswordRoutes = require("./routes/forgotPassword");
// // const addDepartmentRoutes = require("./routes/addDepartment");
// // const attendanceRoutes = require("./routes/attendance_Routes");
// // const empSessionRoutes = require("./routes/empSessionRoute");
// // const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
// // const workDayRoutes = require("./routes/empWorkDay");
// // const workHourSummaryRoutes = require("./routes/empWorkHour");
// // const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
// // const regFaceRoutes = require("./routes/reg_faceRoutes");
// // const faceRoutes = require("./routes/faceRoutes");
// // const faceDataRoutes = require("./routes/faceDataRoutes");
// // const checkFaceRoute = require("./routes/checkFaceRoute");
// // const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
// // const salaryRoutes = require("./routes/salaryRoutes");
// // const payrollRoutes = require("./routes/payrollRoutes");
// // const bankDetailsRoutes = require("./routes/payrollRoutes");
// // const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
// // const reimbursementRoutes = require("./routes/reimbursementRoute");
// // const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
// // const assetsRoutes = require("./routes/assetsRoutes");
// // const validateApiKey = require("./middleware/apiKeyMiddleware");
// // //attendancetracker
// // const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
// // const adminAttendancetrackerRoute = require("./routes/adminAttendancetrackerRoute");
// // const face_admin_page = require("./routes/face_adminpageRoutes");
// // const employeeloginRoutes = require("./routes/employeeloginRoutes");
// // // require("./services/punchCronService");
// // const employeeBirthdayRoutes = require("./routes/employeeBirthday");

// // //vendors
// // const vendorRoutes = require("./routes/vendorRoutes"); // ✅ Import vendor routes

// // //generatepaysliproutes
// // const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const empExcelRoutes = require('./routes/emp_excelsheetRoutes');



// // //letters
// // const letterRoutes = require("./routes/letterRoutes");
// // const letterheadRoutes = require('./routes/letterheadRoute');
// // const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');


// // const app = express();
// // const server = http.createServer(app);
// // //assets
// // app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// // const assetsRoutesforreturn = require("./routes/assetsRoutes");
// // const chatRoutes = require("./routes/chatRoutes");
// // const webpush = require('web-push');
// // const cron = require('node-cron');
// // //////////////////////////
// // /////////////////////////////
// // const subscriptions = new Map();
// // ////////////////////



// // webpush.setVapidDetails(
// //   'mailto:vaibhavichinchure@gmail.com', // change to your email
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );
// // const allowedOrigins = [
// //   "https://localhost",
// //   "capacitor://localhost",
// //   "https://sukalpatechsolutions.com",
// //   "http://localhost:3000"
// //   // Add your production domain
// // ];


// // // Endpoint to send the VAPID public key to frontend
// // app.get('/vapidPublicKey', (req, res) => {
// //   res.json({ publicKey: process.env.VAPID_PUBLIC });
// // });

// // // Endpoint for frontend to send subscription object
// // app.post('/subscribe', (req, res) => {
// //   const sub = req.body.subscription;
// //   if (!sub || !sub.endpoint) {
// //     return res.status(400).send('Invalid subscription');
// //   }
// //   subscriptions.set(sub.endpoint, sub);
// //   res.status(201).json({ success: true });
// // });

// // // Daily notification at 10:00 AM
// // cron.schedule('56 12 * * *', async () => {
// //   console.log('Sending daily notifications...');
// //   const payload = JSON.stringify({
// //     title: 'Daily Reminder',
// //     body: 'This is your scheduled notification.',
// //     icon: '/logo192.png',
// //     url: '/'
// //   });

// //   // Assuming you store subscriptions in an array
// // //   subscriptions.forEach(sub => {
// // //     webPush.sendNotification(sub, payload).catch(err => console.error(err));
// // //   });
// // // });


// //   for (const [endpoint, sub] of subscriptions.entries()) {
// //     try {
// //       await webpush.sendNotification(sub, payload);
// //     } catch (err) {
// //       console.error('Push failed', err);
// //       if (err.statusCode === 410 || err.statusCode === 404) {
// //         subscriptions.delete(endpoint);
// //       }
// //     }
// //   }
// // });

// // // Replace the current CORS middleware with this:
// // app.use((req, res, next) => {
// //   const origin = req.headers.origin;
  
// //   // Only allow specific origins for credentialed requests
// //   if (allowedOrigins.includes(origin)) {
// //     res.setHeader('Access-Control-Allow-Origin', origin);
// //     res.setHeader('Vary', 'Origin'); // Important for caching
// //   }

// //   res.setHeader('Access-Control-Allow-Credentials', 'true');
// //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

// // res.setHeader('Access-Control-Allow-Headers', 
// //   'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
// //   // res.setHeader('Access-Control-Allow-Headers', 
// //   //   'Content-Type, Authorization, x-api-key, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
// //   res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
// //   res.setHeader('Access-Control-Max-Age', '86400');

// //   if (req.method === 'OPTIONS') {
// //     return res.status(204).end();
// //   }

// //   next();
// // });

// // app.use(express.json());
// // app.use(bodyParser.urlencoded({ extended: true }));

// // app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// // app.use("/assets", express.static(path.join(__dirname, "assets")));

// // app.use(apiKeyMiddleware);

// // app.use(
// //   session({
// //     secret: process.env.SESSION_SECRET,
// //     resave: false,
// //     saveUninitialized: false,
// //     cookie: {
// //       secure: false,
// //       httpOnly: true,
// //       maxAge: 24 * 60 * 60 * 1000,
// //       sameSite: "lax",
// //     },
// //   })
// // );

// // app.use(idleTimeout);
// // app.use(bodyParser.json());
// // app.use(bodyParser.urlencoded({ extended: true }));
// // app.use("/", holidayRoutes);
// // app.use("/", loginRoutes);
// // app.use("/", leaveRoutes);
// // app.use("/", projects);
// // app.use("/", invoices);
// // app.use("/", employeeRoutes);
// // app.use("/", employeeQueries);
// // app.use("/", resetPasswordRoutes);
// // app.use("/", forgotPasswordRoutes);
// // app.use("/", addDepartmentRoutes);
// // app.use("/", reimbursementRoutes);
// // app.use("/", chatRoutes);
// // app.use("/attendance", attendanceRoutes);
// // app.use("/", dashboardReimbursementRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/", empSessionRoutes);
// // app.use("/api", workHourSummaryRoutes);
// // app.use("/", empLeaveQueryDashboard);
// // app.use("/salary", salaryRoutes);
// // app.use("/api", payrollRoutes);
// // app.use("/api", bankDetailsRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/api", adminSalaryStatementRoutes);
// // app.use("/", salarylastmonthtotal);
// // app.use("/", admindashboardReimbursementRoutes);
// // app.use("/api", regFaceRoutes);
// // app.use("/api/face", faceRoutes);
// // app.use("/", faceDataRoutes);
// // app.use(checkFaceRoute);
// // app.get("/", (req, res) => {
// //   res.send("Employee Face Recognition API");
// // });
// // app.use("/assets", assetsRoutes);
// // app.use("/api/assets", assetsRoutes);
// // app.use("/api", assetsRoutesforreturn);
// // app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // //attendancetracker
// // app.use("/api/attendance", adminAttendanceRoutes);
// // app.use("/admin/attendance", adminAttendanceRoutes);
// // app.use("/admin-attendance", adminAttendanceRoutes);
// // app.use("/face-punch", face_admin_page);
// // app.use("/api/employeelogin", employeeloginRoutes);
// // app.use('/api', empExcelRoutes);
// // app.use("/api/employee", employeeBirthdayRoutes);


// // // vendor Route definitions
// // app.use("/", vendorRoutes); // ✅ Prefix all vendor routes with /vendors

// // //generatepayslip at adminside
// // app.use("/", oldEmployeeRoutes);
// // app.use("/", oldEmployeeDetailsRoutes);



// // //letterheadroutes
// // // Routes
// // // app.use("/api/letters", letterRoutes); // Mount letter routes
// // app.use('/api', letterRoutes);
// // app.use('/letterheadfiles', express.static(path.join(__dirname, 'letterheadfiles'))); 
// // app.use('/api', letterheadRoutes); 
// // app.use('/api', letterheadTemplateRoutes);
// // app.get("/", (req, res) => {
// //   res.send("LetterHead API is running");
// // });
// // app.use('/api/templates', letterheadTemplateRoutes);

// // //

// // app.use("/api", payrollRoutes);
// // const io = new Server(server, {
// //   cors: { origin: process.env.FRONTEND_URL || "*" },
// // });

// // io.use((socket, next) => {
// //   const userId = socket.handshake.query.userId;
// //   if (!userId) return next(new Error("Auth error"));
// //   socket.userId = userId;
// //   next();
// // });

// // io.on("connection", (socket) => {
// //   chatService
// //     .getUserRooms(socket.userId)
// //     .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
// //     .catch(console.error);

// //   socket.on(
// //     "send_message",
// //     async ({ roomId, content, type, fileUrl, location }) => {
// //       if (!location?.lat || !location?.lng) {
// //         socket.emit("error", "Location required");
// //         return;
// //       }

// //       const { lat, lng, address } = location;

// //       const saved = await chatService.saveMessage(
// //         roomId,
// //         socket.userId,
// //         content,
// //         type,
// //         fileUrl,
// //         lat,
// //         lng,
// //         address
// //       );

// //       io.to(roomId.toString()).emit("new_message", {
// //         roomId: saved.roomId,
// //         id: saved.id,
// //         senderId: saved.senderId,
// //         content: saved.content,
// //         type: saved.type,
// //         fileUrl: saved.fileUrl,
// //         sentAt: saved.sentAt,
// //         location: {
// //           lat: saved.latitude,
// //           lng: saved.longitude,
// //           address: saved.address,
// //         },
// //       });
// //     }
// //   );

// //   socket.on("create_room", async ({ name, isGroup, members }) => {
// //     const roomId = await chatService.createRoom(
// //       name,
// //       isGroup,
// //       socket.userId,
// //       members
// //     );
// //     socket.join(roomId.toString());
// //     socket.emit("room_created", { roomId, name, isGroup });
// //   });
// // });

// // const PORT = process.env.PORT;
// // server.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// // });

// // module.exports = { app, server };

// // const express = require("express");
// // const http = require("http");
// // const bodyParser = require("body-parser");
// // const cors = require("cors");
// // require("dotenv").config();
// // const path = require("path");
// // const session = require("express-session");
// // const { Server } = require("socket.io");

// // const chatService = require("./services/chatService");
// // const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
// // const idleTimeout = require("./middleware/idleTimeout");

// // const holidayRoutes = require("./routes/holidayRoutes");
// // const loginRoutes = require("./routes/login");
// // const leaveRoutes = require("./routes/leave");
// // const employeeRoutes = require("./routes/employee");
// // const employeeQueries = require("./routes/employeeQueries");
// // const projects = require("./routes/project");
// // const invoices = require("./routes/invoiceRoutes");
// // const resetPasswordRoutes = require("./routes/resetPassword");
// // const forgotPasswordRoutes = require("./routes/forgotPassword");
// // const addDepartmentRoutes = require("./routes/addDepartment");
// // const attendanceRoutes = require("./routes/attendance_Routes");
// // const empSessionRoutes = require("./routes/empSessionRoute");
// // const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
// // const workDayRoutes = require("./routes/empWorkDay");
// // const workHourSummaryRoutes = require("./routes/empWorkHour");
// // const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
// // const regFaceRoutes = require("./routes/reg_faceRoutes");
// // const faceRoutes = require("./routes/faceRoutes");
// // const faceDataRoutes = require("./routes/faceDataRoutes");
// // const checkFaceRoute = require("./routes/checkFaceRoute");
// // const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
// // const salaryRoutes = require("./routes/salaryRoutes");
// // const payrollRoutes = require("./routes/payrollRoutes");
// // const bankDetailsRoutes = require("./routes/payrollRoutes");
// // const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
// // const reimbursementRoutes = require("./routes/reimbursementRoute");
// // const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
// // const assetsRoutes = require("./routes/assetsRoutes");
// // const validateApiKey = require("./middleware/apiKeyMiddleware");
// // //attendancetracker
// // const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
// // const adminAttendancetrackerRoute = require("./routes/adminAttendancetrackerRoute");
// // const face_admin_page = require("./routes/face_adminpageRoutes");
// // const employeeloginRoutes = require("./routes/employeeloginRoutes");
// // // require("./services/punchCronService");
// // const employeeBirthdayRoutes = require("./routes/employeeBirthday");

// // //vendors
// // const vendorRoutes = require("./routes/vendorRoutes");

// // //generatepaysliproutes
// // const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const empExcelRoutes = require('./routes/emp_excelsheetRoutes');

// // //letters
// // const letterRoutes = require("./routes/letterRoutes");
// // const letterheadRoutes = require('./routes/letterheadRoute');
// // const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');

// // const app = express();
// // const server = http.createServer(app);

// // app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// // const assetsRoutesforreturn = require("./routes/assetsRoutes");
// // const chatRoutes = require("./routes/chatRoutes");
// // const webpush = require('web-push');
// // const cron = require('node-cron');

// // // Store subscriptions in memory (for testing; use DB for production)
// // const subscriptions = [];

// // webpush.setVapidDetails(
// //   'mailto:vaibhavichinchure@gmail.com',
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );


// // const allowedOrigins = [
// //   "https://localhost",
// //   "capacitor://localhost",
// //   "https://sukalpatechsolutions.com",
// //   "http://localhost:3000"
// // ];

// // // Endpoint to send the VAPID public key to frontend
// // // app.get('/vapidPublicKey', (req, res) => {
// // //   res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
// // // });
// // app.get("/vapidPublicKey", (req, res) => {
// //   if (!process.env.VAPID_PUBLIC_KEY) {
// //     return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
// //   }
// //   res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
// // });


// // // Endpoint for frontend to send subscription object
// // app.post('/subscribe', (req, res) => {
// //   const sub = req.body; // read subscription directly
// //   if (!sub || !sub.endpoint) {
// //     return res.status(400).send('Invalid subscription');
// //   }

// //   // Avoid duplicates
// //   if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
// //     subscriptions.push(sub);
// //     console.log("New subscription stored:", sub.endpoint);
// //   }

// //   res.status(201).json({ success: true });
// // });

// // // Daily notification at 10:00 AM (adjust time as needed)
// // cron.schedule('18 16 * * *', async () => {
// //   console.log('Sending daily notifications...');
// //   const payload = JSON.stringify({
// //     title: 'Daily Reminder',
// //     body: 'This is your scheduled notification.',
// //     icon: '/logo192.png',
// //     url: '/'
// //   });

// //   for (const sub of subscriptions) {
// //     try {
// //       await webpush.sendNotification(sub, payload);
// //     } catch (err) {
// //       console.error('Push failed', err);
// //     }
// //   }
// // });

// // app.use((req, res, next) => {
// //   const origin = req.headers.origin;
// //   if (allowedOrigins.includes(origin)) {
// //     res.setHeader('Access-Control-Allow-Origin', origin);
// //     res.setHeader('Vary', 'Origin');
// //   }
// //   res.setHeader('Access-Control-Allow-Credentials', 'true');
// //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
// //   res.setHeader('Access-Control-Allow-Headers',
// //     'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
// //   res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
// //   res.setHeader('Access-Control-Max-Age', '86400');
// //   if (req.method === 'OPTIONS') {
// //     return res.status(204).end();
// //   }
// //   next();
// // });

// // app.use(express.json());
// // app.use(bodyParser.urlencoded({ extended: true }));

// // app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// // app.use("/assets", express.static(path.join(__dirname, "assets")));

// // app.use(apiKeyMiddleware);

// // app.use(
// //   session({
// //     secret: process.env.SESSION_SECRET,
// //     resave: false,
// //     saveUninitialized: false,
// //     cookie: {
// //       secure: false,
// //       httpOnly: true,
// //       maxAge: 24 * 60 * 60 * 1000,
// //       sameSite: "lax",
// //     },
// //   })
// // );

// // app.use(idleTimeout);
// // app.use(bodyParser.json());
// // app.use(bodyParser.urlencoded({ extended: true }));
// // app.use("/", holidayRoutes);
// // app.use("/", loginRoutes);
// // app.use("/", leaveRoutes);
// // app.use("/", projects);
// // app.use("/", invoices);
// // app.use("/", employeeRoutes);
// // app.use("/", employeeQueries);
// // app.use("/", resetPasswordRoutes);
// // app.use("/", forgotPasswordRoutes);
// // app.use("/", addDepartmentRoutes);
// // app.use("/", reimbursementRoutes);
// // app.use("/", chatRoutes);
// // app.use("/attendance", attendanceRoutes);
// // app.use("/", dashboardReimbursementRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/", empSessionRoutes);
// // app.use("/api", workHourSummaryRoutes);
// // app.use("/", empLeaveQueryDashboard);
// // app.use("/salary", salaryRoutes);
// // app.use("/api", payrollRoutes);
// // app.use("/api", bankDetailsRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/api", adminSalaryStatementRoutes);
// // app.use("/", salarylastmonthtotal);
// // app.use("/", admindashboardReimbursementRoutes);
// // app.use("/api", regFaceRoutes);
// // app.use("/api/face", faceRoutes);
// // app.use("/", faceDataRoutes);
// // app.use(checkFaceRoute);
// // app.get("/", (req, res) => {
// //   res.send("Employee Face Recognition API");
// // });
// // app.use("/assets", assetsRoutes);
// // app.use("/api/assets", assetsRoutes);
// // app.use("/api", assetsRoutesforreturn);
// // app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // //attendancetracker
// // app.use("/api/attendance", adminAttendanceRoutes);
// // app.use("/admin/attendance", adminAttendanceRoutes);
// // app.use("/admin-attendance", adminAttendanceRoutes);
// // app.use("/face-punch", face_admin_page);
// // app.use("/api/employeelogin", employeeloginRoutes);
// // app.use('/api', empExcelRoutes);
// // app.use("/api/employee", employeeBirthdayRoutes);

// // // vendor Route definitions
// // app.use("/", vendorRoutes);

// // //generatepayslip at adminside
// // app.use("/", oldEmployeeRoutes);
// // app.use("/", oldEmployeeDetailsRoutes);

// // //letterheadroutes
// // app.use('/api', letterRoutes);
// // app.use('/letterheadfiles', express.static(path.join(__dirname, 'letterheadfiles'))); 
// // app.use('/api', letterheadRoutes); 
// // app.use('/api', letterheadTemplateRoutes);
// // app.get("/", (req, res) => {
// //   res.send("LetterHead API is running");
// // });
// // app.use('/api/templates', letterheadTemplateRoutes);

// // app.use("/api", payrollRoutes);

// // const io = new Server(server, {
// //   cors: { origin: process.env.FRONTEND_URL || "*" },
// // });

// // io.use((socket, next) => {
// //   const userId = socket.handshake.query.userId;
// //   if (!userId) return next(new Error("Auth error"));
// //   socket.userId = userId;
// //   next();
// // });

// // io.on("connection", (socket) => {
// //   chatService
// //     .getUserRooms(socket.userId)
// //     .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
// //     .catch(console.error);

// //   socket.on(
// //     "send_message",
// //     async ({ roomId, content, type, fileUrl, location }) => {
// //       if (!location?.lat || !location?.lng) {
// //         socket.emit("error", "Location required");
// //         return;
// //       }

// //       const { lat, lng, address } = location;

// //       const saved = await chatService.saveMessage(
// //         roomId,
// //         socket.userId,
// //         content,
// //         type,
// //         fileUrl,
// //         lat,
// //         lng,
// //         address
// //       );

// //       io.to(roomId.toString()).emit("new_message", {
// //         roomId: saved.roomId,
// //         id: saved.id,
// //         senderId: saved.senderId,
// //         content: saved.content,
// //         type: saved.type,
// //         fileUrl: saved.fileUrl,
// //         sentAt: saved.sentAt,
// //         location: {
// //           lat: saved.latitude,
// //           lng: saved.longitude,
// //           address: saved.address,
// //         },
// //       });
// //     }
// //   );

// //   socket.on("create_room", async ({ name, isGroup, members }) => {
// //     const roomId = await chatService.createRoom(
// //       name,
// //       isGroup,
// //       socket.userId,
// //       members
// //     );
// //     socket.join(roomId.toString());
// //     socket.emit("room_created", { roomId, name, isGroup });
// //   });
// // });

// // const PORT = process.env.PORT;
// // server.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// // });

// // module.exports = { app, server };

// // const express = require("express");
// // const http = require("http");
// // const bodyParser = require("body-parser");
// // const cors = require("cors");
// // require("dotenv").config();
// // const path = require("path");
// // const session = require("express-session");
// // const { Server } = require("socket.io");

// // const chatService = require("./services/chatService");
// // const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
// // const idleTimeout = require("./middleware/idleTimeout");

// // const holidayRoutes = require("./routes/holidayRoutes");
// // const loginRoutes = require("./routes/login");
// // const leaveRoutes = require("./routes/leave");
// // const employeeRoutes = require("./routes/employee");
// // const employeeQueries = require("./routes/employeeQueries");
// // const projects = require("./routes/project");
// // const invoices = require("./routes/invoiceRoutes");
// // const resetPasswordRoutes = require("./routes/resetPassword");
// // const forgotPasswordRoutes = require("./routes/forgotPassword");
// // const addDepartmentRoutes = require("./routes/addDepartment");
// // const attendanceRoutes = require("./routes/attendance_Routes");
// // const empSessionRoutes = require("./routes/empSessionRoute");
// // const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
// // const workDayRoutes = require("./routes/empWorkDay");
// // const workHourSummaryRoutes = require("./routes/empWorkHour");
// // const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
// // const regFaceRoutes = require("./routes/reg_faceRoutes");
// // const faceRoutes = require("./routes/faceRoutes");
// // const faceDataRoutes = require("./routes/faceDataRoutes");
// // const checkFaceRoute = require("./routes/checkFaceRoute");
// // const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
// // const salaryRoutes = require("./routes/salaryRoutes");
// // const payrollRoutes = require("./routes/payrollRoutes");
// // const bankDetailsRoutes = require("./routes/payrollRoutes");
// // const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
// // const reimbursementRoutes = require("./routes/reimbursementRoute");
// // const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
// // const assetsRoutes = require("./routes/assetsRoutes");
// // const validateApiKey = require("./middleware/apiKeyMiddleware");
// // const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
// // const face_admin_page = require("./routes/face_adminpageRoutes");
// // const employeeloginRoutes = require("./routes/employeeloginRoutes");
// // const employeeBirthdayRoutes = require("./routes/employeeBirthday");
// // const vendorRoutes = require("./routes/vendorRoutes");
// // const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const empExcelRoutes = require('./routes/emp_excelsheetRoutes');
// // const letterRoutes = require("./routes/letterRoutes");
// // const letterheadRoutes = require('./routes/letterheadRoute');
// // const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');

// // const app = express();
// // const server = http.createServer(app);

// // // ✅ CORS moved here
// // const allowedOrigins = [
// //   "https://localhost",
// //   "capacitor://localhost",
// //   "https://sukalpatechsolutions.com",
// //   "http://localhost:3000"
// // ];

// // app.use((req, res, next) => {
// //   const origin = req.headers.origin;
// //   if (allowedOrigins.includes(origin)) {
// //     res.setHeader('Access-Control-Allow-Origin', origin);
// //     res.setHeader('Vary', 'Origin');
// //   }
// //   res.setHeader('Access-Control-Allow-Credentials', 'true');
// //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
// //   res.setHeader('Access-Control-Allow-Headers',
// //     'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
// //   res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
// //   res.setHeader('Access-Control-Max-Age', '86400');
// //   if (req.method === 'OPTIONS') {
// //     return res.status(204).end();
// //   }
// //   next();
// // });

// // app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// // const assetsRoutesforreturn = require("./routes/assetsRoutes");
// // const chatRoutes = require("./routes/chatRoutes");
// // const webpush = require('web-push');
// // const cron = require('node-cron');

// // const subscriptions = [];

// // webpush.setVapidDetails(
// //   'mailto:vaibhavichinchure@gmail.com',
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );

// // app.get("/vapidPublicKey", (req, res) => {
// //   if (!process.env.VAPID_PUBLIC_KEY) {
// //     return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
// //   }
// //   res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
// // });

// // app.post('/subscribe', (req, res) => {
// //   const sub = req.body;
// //   if (!sub || !sub.endpoint) {
// //     return res.status(400).send('Invalid subscription');
// //   }
// //   if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
// //     subscriptions.push(sub);
// //     console.log("New subscription stored:", sub.endpoint);
// //   }
// //   res.status(201).json({ success: true });
// // });

// // cron.schedule('46 20 * * *', async () => {
// //   console.log('Sending daily notifications...');
// //   const payload = JSON.stringify({
// //     title: 'Daily Reminder',
// //     body: 'This is your scheduled notification.',
// //     icon: '/logo192.png',
// //     url: '/'
// //   });
// //   for (const sub of subscriptions) {
// //     try {
// //       await webpush.sendNotification(sub, payload);
// //     } catch (err) {
// //       console.error('Push failed', err);
// //     }
// //   }
// // });

// // app.use(express.json());
// // app.use(bodyParser.urlencoded({ extended: true }));

// // app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// // app.use("/assets", express.static(path.join(__dirname, "assets")));

// // app.use(apiKeyMiddleware);

// // app.use(
// //   session({
// //     secret: process.env.SESSION_SECRET,
// //     resave: false,
// //     saveUninitialized: false,
// //     cookie: {
// //       secure: false,
// //       httpOnly: true,
// //       maxAge: 24 * 60 * 60 * 1000,
// //       sameSite: "lax",
// //     },
// //   })
// // );

// // /////notification
// // app.use(cors({ origin: 'http://localhost:3000' })); // Allow frontend
// // app.use(express.json());


// // app.use(idleTimeout);
// // app.use(bodyParser.json());
// // app.use(bodyParser.urlencoded({ extended: true }));
// // app.use("/", holidayRoutes);
// // app.use("/", loginRoutes);
// // app.use("/", leaveRoutes);
// // app.use("/", projects);
// // app.use("/", invoices);
// // app.use("/", employeeRoutes);
// // app.use("/", employeeQueries);
// // app.use("/", resetPasswordRoutes);
// // app.use("/", forgotPasswordRoutes);
// // app.use("/", addDepartmentRoutes);
// // app.use("/", reimbursementRoutes);
// // app.use("/", chatRoutes);
// // app.use("/attendance", attendanceRoutes);
// // app.use("/", dashboardReimbursementRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/", empSessionRoutes);
// // app.use("/api", workHourSummaryRoutes);
// // app.use("/", empLeaveQueryDashboard);
// // app.use("/salary", salaryRoutes);
// // app.use("/api", payrollRoutes);
// // app.use("/api", bankDetailsRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/api", adminSalaryStatementRoutes);
// // app.use("/", salarylastmonthtotal);
// // app.use("/", admindashboardReimbursementRoutes);
// // app.use("/api", regFaceRoutes);
// // app.use("/api/face", faceRoutes);
// // app.use("/", faceDataRoutes);
// // app.use(checkFaceRoute);
// // app.get("/", (req, res) => {
// //   res.send("Employee Face Recognition API");
// // });
// // app.use("/assets", assetsRoutes);
// // app.use("/api/assets", assetsRoutes);
// // app.use("/api", assetsRoutesforreturn);
// // app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// // app.use("/api/attendance", adminAttendanceRoutes);
// // app.use("/admin/attendance", adminAttendanceRoutes);
// // app.use("/admin-attendance", adminAttendanceRoutes);
// // app.use("/face-punch", face_admin_page);
// // app.use("/api/employeelogin", employeeloginRoutes);
// // app.use('/api', empExcelRoutes);
// // app.use("/api/employee", employeeBirthdayRoutes);
// // app.use("/", vendorRoutes);
// // app.use("/", oldEmployeeRoutes);
// // app.use("/", oldEmployeeDetailsRoutes);
// // app.use('/api', letterRoutes);
// // app.use('/letterheadfiles', express.static(path.join(__dirname, 'letterheadfiles')));
// // app.use('/api', letterheadRoutes);
// // app.use('/api', letterheadTemplateRoutes);
// // app.get("/", (req, res) => {
// //   res.send("LetterHead API is running");
// // });
// // app.use('/api/templates', letterheadTemplateRoutes);
// // app.use("/api", payrollRoutes);

// // const io = new Server(server, {
// //   cors: { origin: process.env.FRONTEND_URL || "*" },
// // });

// // io.use((socket, next) => {
// //   const userId = socket.handshake.query.userId;
// //   if (!userId) return next(new Error("Auth error"));
// //   socket.userId = userId;
// //   next();
// // });

// // io.on("connection", (socket) => {
// //   chatService
// //     .getUserRooms(socket.userId)
// //     .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
// //     .catch(console.error);

// //   socket.on(
// //     "send_message",
// //     async ({ roomId, content, type, fileUrl, location }) => {
// //       if (!location?.lat || !location?.lng) {
// //         socket.emit("error", "Location required");
// //         return;
// //       }
// //       const { lat, lng, address } = location;
// //       const saved = await chatService.saveMessage(
// //         roomId,
// //         socket.userId,
// //         content,
// //         type,
// //         fileUrl,
// //         lat,
// //         lng,
// //         address
// //       );
// //       io.to(roomId.toString()).emit("new_message", {
// //         roomId: saved.roomId,
// //         id: saved.id,
// //         senderId: saved.senderId,
// //         content: saved.content,
// //         type: saved.type,
// //         fileUrl: saved.fileUrl,
// //         sentAt: saved.sentAt,
// //         location: {
// //           lat: saved.latitude,
// //           lng: saved.longitude,
// //           address: saved.address,
// //         },
// //       });
// //     }
// //   );

// //   socket.on("create_room", async ({ name, isGroup, members }) => {
// //     const roomId = await chatService.createRoom(
// //       name,
// //       isGroup,
// //       socket.userId,
// //       members
// //     );
// //     socket.join(roomId.toString());
// //     socket.emit("room_created", { roomId, name, isGroup });
// //   });
// // });

// // const PORT = process.env.PORT;
// // server.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// // });

// // module.exports = { app, server };

// ////////////working........

// /////.........



// // const express = require("express");
// // const http = require("http");
// // const bodyParser = require("body-parser");
// // const cors = require("cors");
// // require("dotenv").config();
// // const path = require("path");
// // const session = require("express-session");
// // const { Server } = require("socket.io");

// // const chatService = require("./services/chatService");
// // const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
// // const idleTimeout = require("./middleware/idleTimeout");

// // const holidayRoutes = require("./routes/holidayRoutes");
// // const loginRoutes = require("./routes/login");
// // const leaveRoutes = require("./routes/leave");
// // const employeeRoutes = require("./routes/employee");
// // const employeeQueries = require("./routes/employeeQueries");
// // const projects = require("./routes/project");
// // const invoices = require("./routes/invoiceRoutes");
// // const resetPasswordRoutes = require("./routes/resetPassword");
// // const forgotPasswordRoutes = require("./routes/forgotPassword");
// // const addDepartmentRoutes = require("./routes/addDepartment");
// // const attendanceRoutes = require("./routes/attendance_Routes");
// // const empSessionRoutes = require("./routes/empSessionRoute");
// // const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
// // const workDayRoutes = require("./routes/empWorkDay");
// // const workHourSummaryRoutes = require("./routes/empWorkHour");
// // const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
// // const regFaceRoutes = require("./routes/reg_faceRoutes");
// // const faceRoutes = require("./routes/faceRoutes");
// // const faceDataRoutes = require("./routes/faceDataRoutes");
// // const checkFaceRoute = require("./routes/checkFaceRoute");
// // const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
// // const salaryRoutes = require("./routes/salaryRoutes");
// // const payrollRoutes = require("./routes/payrollRoutes");
// // const bankDetailsRoutes = require("./routes/payrollRoutes");
// // const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
// // const reimbursementRoutes = require("./routes/reimbursementRoute");
// // const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
// // const assetsRoutes = require("./routes/assetsRoutes");
// // const validateApiKey = require("./middleware/apiKeyMiddleware");
// // const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
// // const face_admin_page = require("./routes/face_adminpageRoutes");
// // const employeeloginRoutes = require("./routes/employeeloginRoutes");
// // const employeeBirthdayRoutes = require("./routes/employeeBirthday");
// // const vendorRoutes = require("./routes/vendorRoutes");
// // const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
// // const empExcelRoutes = require('./routes/emp_excelsheetRoutes');
// // const letterRoutes = require("./routes/letterRoutes");
// // const letterheadRoutes = require('./routes/letterheadRoute');
// // const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');

// // const app = express();
// // const server = http.createServer(app);

// // // ✅ CORS configuration
// // const allowedOrigins = [
// //   "https://localhost",
// //   "capacitor://localhost",
// //   "https://sukalpatechsolutions.com",
// //   "http://localhost:3000"
// // ];

// // app.use((req, res, next) => {
// //   const origin = req.headers.origin;
// //   if (allowedOrigins.includes(origin)) {
// //     res.setHeader('Access-Control-Allow-Origin', origin);
// //     res.setHeader('Vary', 'Origin');
// //   }
// //   res.setHeader('Access-Control-Allow-Credentials', 'true');
// //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
// //   res.setHeader('Access-Control-Allow-Headers',
// //     'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
// //   res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
// //   res.setHeader('Access-Control-Max-Age', '86400');
// //   if (req.method === 'OPTIONS') {
// //     return res.status(204).end();
// //   }
// //   next();
// // });

// // // Body parsing middleware
// // app.use(express.json());
// // app.use(bodyParser.urlencoded({ extended: true }));

// // // Static file serving (consolidated)
// // app.use("/uploads", express.static(path.join(__dirname, "../Uploads")));
// // app.use("/assets", express.static(path.join(__dirname, "assets")));
// // app.use("/letterheadfiles", express.static(path.join(__dirname, "letterheadfiles")));

// // const assetsRoutesforreturn = require("./routes/assetsRoutes");
// // const chatRoutes = require("./routes/chatRoutes");
// // const webpush = require('web-push');
// // const cron = require('node-cron');

// // const subscriptions = [];

// // webpush.setVapidDetails(
// //   'mailto:vaibhavichinchure@gmail.com',
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );

// // app.get("/vapidPublicKey", (req, res) => {
// //   if (!process.env.VAPID_PUBLIC_KEY) {
// //     return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
// //   }
// //   res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
// // });

// // app.post('/subscribe', (req, res) => {
// //   console.log('Request headers:', req.headers); // Debug headers
// //   console.log('Raw body:', req.body); // Debug raw body
// //   const sub = req.body;
// //   console.log('Received subscription:', sub);
// //   if (!sub || !sub.endpoint) {
// //     return res.status(400).send('Invalid subscription');
// //   }
// //   if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
// //     subscriptions.push(sub);
// //     console.log("New subscription stored:", sub.endpoint);
// //   }
// //   res.status(201).json({ success: true });
// // });

// // cron.schedule('08 01 * * *', async () => {
// //   console.log('Sending daily notifications...');
// //   const payload = JSON.stringify({
// //     title: 'Daily Reminder',
// //     body: 'This is your scheduled notification.',
// //     icon: '/logo192.png',
// //     url: '/'
// //   });
// //   for (const sub of subscriptions) {
// //     try {
// //       await webpush.sendNotification(sub, payload);
// //     } catch (err) {
// //       console.error('Push failed', err);
// //     }
// //   }
// // });

// // app.use(apiKeyMiddleware);

// // app.use(
// //   session({
// //     secret: process.env.SESSION_SECRET,
// //     resave: false,
// //     saveUninitialized: false,
// //     cookie: {
// //       secure: false,
// //       httpOnly: true,
// //       maxAge: 24 * 60 * 60 * 1000,
// //       sameSite: "lax",
// //     },
// //   })
// // );

// // app.use(idleTimeout);
// // app.use("/", holidayRoutes);
// // app.use("/", loginRoutes);
// // app.use("/", leaveRoutes);
// // app.use("/", projects);
// // app.use("/", invoices);
// // app.use("/", employeeRoutes);
// // app.use("/", employeeQueries);
// // app.use("/", resetPasswordRoutes);
// // app.use("/", forgotPasswordRoutes);
// // app.use("/", addDepartmentRoutes);
// // app.use("/", reimbursementRoutes);
// // app.use("/", chatRoutes);
// // app.use("/attendance", attendanceRoutes);
// // app.use("/", dashboardReimbursementRoutes);
// // app.use("/", workDayRoutes);
// // app.use("/", empSessionRoutes);
// // app.use("/api", workHourSummaryRoutes);
// // app.use("/", empLeaveQueryDashboard);
// // app.use("/salary", salaryRoutes);
// // app.use("/api", payrollRoutes);
// // app.use("/api", bankDetailsRoutes);
// // app.use("/api", adminSalaryStatementRoutes);
// // app.use("/", salarylastmonthtotal);
// // app.use("/", admindashboardReimbursementRoutes);
// // app.use("/api", regFaceRoutes);
// // app.use("/api/face", faceRoutes);
// // app.use("/", faceDataRoutes);
// // app.use(checkFaceRoute);
// // app.get("/", (req, res) => {
// //   res.send("Employee Face Recognition API");
// // });
// // app.use("/assets", assetsRoutes);
// // app.use("/api/assets", assetsRoutes);
// // app.use("/api", assetsRoutesforreturn);
// // app.use("/api/attendance", adminAttendanceRoutes);
// // app.use("/admin/attendance", adminAttendanceRoutes);
// // app.use("/admin-attendance", adminAttendanceRoutes);
// // app.use("/face-punch", face_admin_page);
// // app.use("/api/employeelogin", employeeloginRoutes);
// // app.use('/api', empExcelRoutes);
// // app.use("/api/employee", employeeBirthdayRoutes);
// // app.use("/", vendorRoutes);
// // app.use("/", oldEmployeeRoutes);
// // app.use("/", oldEmployeeDetailsRoutes);
// // app.use('/api', letterRoutes);
// // app.use('/api', letterheadRoutes);
// // app.use('/api', letterheadTemplateRoutes);
// // app.get("/", (req, res) => {
// //   res.send("LetterHead API is running");
// // });
// // app.use('/api/templates', letterheadTemplateRoutes);
// // app.use("/api", payrollRoutes);

// // const io = new Server(server, {
// //   cors: { origin: process.env.FRONTEND_URL || "*" },
// // });

// // io.use((socket, next) => {
// //   const userId = socket.handshake.query.userId;
// //   if (!userId) return next(new Error("Auth error"));
// //   socket.userId = userId;
// //   next();
// // });

// // io.on("connection", (socket) => {
// //   chatService
// //     .getUserRooms(socket.userId)
// //     .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
// //     .catch(console.error);

// //   socket.on(
// //     "send_message",
// //     async ({ roomId, content, type, fileUrl, location }) => {
// //       if (!location?.lat || !location?.lng) {
// //         socket.emit("error", "Location required");
// //         return;
// //       }
// //       const { lat, lng, address } = location;
// //       const saved = await chatService.saveMessage(
// //         roomId,
// //         socket.userId,
// //         content,
// //         type,
// //         fileUrl,
// //         lat,
// //         lng,
// //         address
// //       );
// //       io.to(roomId.toString()).emit("new_message", {
// //         roomId: saved.roomId,
// //         id: saved.id,
// //         senderId: saved.senderId,
// //         content: saved.content,
// //         type: saved.type,
// //         fileUrl: saved.fileUrl,
// //         sentAt: saved.sentAt,
// //         location: {
// //           lat: saved.latitude,
// //           lng: saved.longitude,
// //           address: saved.address,
// //         },
// //       });
// //     }
// //   );

// //   socket.on("create_room", async ({ name, isGroup, members }) => {
// //     const roomId = await chatService.createRoom(
// //       name,
// //       isGroup,
// //       socket.userId,
// //       members
// //     );
// //     socket.join(roomId.toString());
// //     socket.emit("room_created", { roomId, name, isGroup });
// //   });
// // });

// // const PORT = process.env.PORT;
// // server.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// // });

// // module.exports = { app, server };

// //////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////////////////////////




// const express = require("express");
// const http = require("http");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// require("dotenv").config();
// const path = require("path");
// const session = require("express-session");
// const { Server } = require("socket.io");

// const chatService = require("./services/chatService");
// const apiKeyMiddleware = require("./middleware/apiKeyMiddleware");
// const idleTimeout = require("./middleware/idleTimeout");

// const holidayRoutes = require("./routes/holidayRoutes");
// const loginRoutes = require("./routes/login");
// const leaveRoutes = require("./routes/leave");
// const employeeRoutes = require("./routes/employee");
// const employeeQueries = require("./routes/employeeQueries");
// const projects = require("./routes/project");
// const invoices = require("./routes/invoiceRoutes");
// const resetPasswordRoutes = require("./routes/resetPassword");
// const forgotPasswordRoutes = require("./routes/forgotPassword");
// const addDepartmentRoutes = require("./routes/addDepartment");
// const attendanceRoutes = require("./routes/attendance_Routes");
// const empSessionRoutes = require("./routes/empSessionRoute");
// const dashboardReimbursementRoutes = require("./routes/dashboardReimbursementRoutes");
// const workDayRoutes = require("./routes/empWorkDay");
// const workHourSummaryRoutes = require("./routes/empWorkHour");
// const empLeaveQueryDashboard = require("./routes/empLeaveQueryDashboardRoutes");
// const regFaceRoutes = require("./routes/reg_faceRoutes");
// const faceRoutes = require("./routes/faceRoutes");
// const faceDataRoutes = require("./routes/faceDataRoutes");
// const checkFaceRoute = require("./routes/checkFaceRoute");
// const admindashboardReimbursementRoutes = require("./routes/adminDashReimbursementRoutes");
// const salaryRoutes = require("./routes/salaryRoutes");
// const payrollRoutes = require("./routes/payrollRoutes");
// const bankDetailsRoutes = require("./routes/payrollRoutes");
// const salarylastmonthtotal = require("./routes/adminPayrollRoutes");
// const reimbursementRoutes = require("./routes/reimbursementRoute");
// const adminSalaryStatementRoutes = require("./routes/adminSalaryStatementRoute");
// const assetsRoutes = require("./routes/assetsRoutes");
// const validateApiKey = require("./middleware/apiKeyMiddleware");
// const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
// const face_admin_page = require("./routes/face_adminpageRoutes");
// const employeeloginRoutes = require("./routes/employeeloginRoutes");
// const employeeBirthdayRoutes = require("./routes/employeeBirthday");
// const vendorRoutes = require("./routes/vendorRoutes");
// const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
// const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
// const empExcelRoutes = require('./routes/emp_excelsheetRoutes');
// const letterRoutes = require("./routes/letterRoutes");
// const letterheadRoutes = require('./routes/letterheadRoute');
// const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');

// const app = express();
// const server = http.createServer(app);

// // ✅ CORS configuration
// const allowedOrigins = [
//   "https://localhost",
//   "capacitor://localhost",
//   "https://sukalpatechsolutions.com",
//   "http://localhost:3000"
// ];

// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//     res.setHeader('Vary', 'Origin');
//   }
//   res.setHeader('Access-Control-Allow-Credentials', 'true');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   res.setHeader('Access-Control-Allow-Headers',
//     'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
//   res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
//   res.setHeader('Access-Control-Max-Age', '86400');
//   if (req.method === 'OPTIONS') {
//     return res.status(204).end();
//   }
//   next();
// });

// // Body parsing middleware
// app.use(express.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Static file serving (consolidated)
// app.use("/uploads", express.static(path.join(__dirname, "../Uploads")));
// app.use("/assets", express.static(path.join(__dirname, "assets")));
// app.use("/letterheadfiles", express.static(path.join(__dirname, "letterheadfiles")));

// const assetsRoutesforreturn = require("./routes/assetsRoutes");
// const chatRoutes = require("./routes/chatRoutes");
// const webpush = require('web-push');
// const cron = require('node-cron');

// const subscriptions = [];

// webpush.setVapidDetails(
//   'mailto:vaibhavichinchure@gmail.com',
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );

// app.get("/vapidPublicKey", (req, res) => {
//   if (!process.env.VAPID_PUBLIC_KEY) {
//     return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
//   }
//   res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
// });

// app.post('/subscribe', (req, res) => {
//   console.log('Request headers:', req.headers); // Debug headers
//   console.log('Raw body:', req.body); // Debug raw body
//   const sub = req.body;
//   console.log('Received subscription:', sub);
//   if (!sub || !sub.endpoint) {
//     return res.status(400).send('Invalid subscription');
//   }
//   if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
//     subscriptions.push(sub);
//     console.log("New subscription stored:", sub.endpoint);
//   }
//   res.status(201).json({ success: true });
// });

// cron.schedule('39 12 * * *', async () => {
//   console.log('Sending daily notifications...');
//   const payload = JSON.stringify({
//     title: 'Daily Reminder',
//     body: 'This is your scheduled notification.',
//     icon: '/logo192.png',
//     url: '/'
//   });
//   for (const sub of subscriptions) {
//     try {
//       await webpush.sendNotification(sub, payload);
//     } catch (err) {
//       console.error('Push failed', err);
//     }
//   }
// });

// app.use(apiKeyMiddleware);

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: false,
//       httpOnly: true,
//       maxAge: 24 * 60 * 60 * 1000,
//       sameSite: "lax",
//     },
//   })
// );

// app.use(idleTimeout);
// app.use("/", holidayRoutes);
// app.use("/", loginRoutes);
// app.use("/", leaveRoutes);
// app.use("/", projects);
// app.use("/", invoices);
// app.use("/", employeeRoutes);
// app.use("/", employeeQueries);
// app.use("/", resetPasswordRoutes);
// app.use("/", forgotPasswordRoutes);
// app.use("/", addDepartmentRoutes);
// app.use("/", reimbursementRoutes);
// app.use("/", chatRoutes);
// app.use("/attendance", attendanceRoutes);
// app.use("/", dashboardReimbursementRoutes);
// app.use("/", workDayRoutes);
// app.use("/", empSessionRoutes);
// app.use("/api", workHourSummaryRoutes);
// app.use("/", empLeaveQueryDashboard);
// app.use("/salary", salaryRoutes);
// app.use("/api", payrollRoutes);
// app.use("/api", bankDetailsRoutes);
// app.use("/api", adminSalaryStatementRoutes);
// app.use("/", salarylastmonthtotal);
// app.use("/", admindashboardReimbursementRoutes);
// app.use("/api", regFaceRoutes);
// app.use("/api/face", faceRoutes);
// app.use("/", faceDataRoutes);
// app.use(checkFaceRoute);
// app.get("/", (req, res) => {
//   res.send("Employee Face Recognition API");
// });
// app.use("/assets", assetsRoutes);
// app.use("/api/assets", assetsRoutes);
// app.use("/api", assetsRoutesforreturn);
// app.use("/api/attendance", adminAttendanceRoutes);
// app.use("/admin/attendance", adminAttendanceRoutes);
// app.use("/admin-attendance", adminAttendanceRoutes);
// app.use("/face-punch", face_admin_page);
// app.use("/api/employeelogin", employeeloginRoutes);
// app.use('/api', empExcelRoutes);
// app.use("/api/employee", employeeBirthdayRoutes);
// app.use("/", vendorRoutes);
// app.use("/", oldEmployeeRoutes);
// app.use("/", oldEmployeeDetailsRoutes);
// app.use('/api', letterRoutes);
// app.use('/api', letterheadRoutes);
// app.use('/api', letterheadTemplateRoutes);
// app.get("/", (req, res) => {
//   res.send("LetterHead API is running");
// });
// app.use('/api/templates', letterheadTemplateRoutes);
// app.use("/api", payrollRoutes);

// const io = new Server(server, {
//   cors: { origin: process.env.FRONTEND_URL || "*" },
// });

// io.use((socket, next) => {
//   const userId = socket.handshake.query.userId;
//   if (!userId) return next(new Error("Auth error"));
//   socket.userId = userId;
//   next();
// });

// io.on("connection", (socket) => {
//   chatService
//     .getUserRooms(socket.userId)
//     .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
//     .catch(console.error);

//   socket.on(
//     "send_message",
//     async ({ roomId, content, type, fileUrl, location }) => {
//       if (!location?.lat || !location?.lng) {
//         socket.emit("error", "Location required");
//         return;
//       }
//       const { lat, lng, address } = location;
//       const saved = await chatService.saveMessage(
//         roomId,
//         socket.userId,
//         content,
//         type,
//         fileUrl,
//         lat,
//         lng,
//         address
//       );
//       io.to(roomId.toString()).emit("new_message", {
//         roomId: saved.roomId,
//         id: saved.id,
//         senderId: saved.senderId,
//         content: saved.content,
//         type: saved.type,
//         fileUrl: saved.fileUrl,
//         sentAt: saved.sentAt,
//         location: {
//           lat: saved.latitude,
//           lng: saved.longitude,
//           address: saved.address,
//         },
//       });
//     }
//   );

//   socket.on("create_room", async ({ name, isGroup, members }) => {
//     const roomId = await chatService.createRoom(
//       name,
//       isGroup,
//       socket.userId,
//       members
//     );
//     socket.join(roomId.toString());
//     socket.emit("room_created", { roomId, name, isGroup });
//   });
// });

// const PORT = process.env.PORT;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// module.exports = { app, server };


//////////////////////////
//////////////////////////
/////////////////////////////


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
const adminAttendanceRoutes = require("./routes/adminAttendancetrackerRoute");
const face_admin_page = require("./routes/face_adminpageRoutes");
const employeeloginRoutes = require("./routes/employeeloginRoutes");
const employeeBirthdayRoutes = require("./routes/employeeBirthday");
const vendorRoutes = require("./routes/vendorRoutes");
const oldEmployeeRoutes = require("./routes/oldEmployeeDetailsRoute");
const oldEmployeeDetailsRoutes = require("./routes/oldEmployeeDetailsRoute");
const empExcelRoutes = require('./routes/emp_excelsheetRoutes');
const letterRoutes = require("./routes/letterRoutes");
const letterheadRoutes = require('./routes/letterheadRoute');
const letterheadTemplateRoutes = require('./routes/letterheadTemplateRoutes');

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  "https://localhost",
  "capacitor://localhost",
  "https://sukalpatechsolutions.com",
  "http://localhost:3000"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, x-employee-id, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static file serving (consolidated)
app.use("/uploads", express.static(path.join(__dirname, "../Uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/letterheadfiles", express.static(path.join(__dirname, "letterheadfiles")));

const assetsRoutesforreturn = require("./routes/assetsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const webpush = require('web-push');
const cron = require('node-cron');

const subscriptions = [];

webpush.setVapidDetails(
  'mailto:vaibhavichinchure@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Push notification routes (before apiKeyMiddleware)
app.get("/vapidPublicKey", (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: "VAPID_PUBLIC_KEY not set in env" });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/subscribe', (req, res) => {
  console.log('Request headers:', req.headers);
  console.log('Raw body:', req.body);
  const sub = req.body;
  console.log('Received subscription:', sub);
  console.log('Current subscriptions:', subscriptions.map(s => s.endpoint));
  if (!sub || !sub.endpoint) {
    return res.status(400).send('Invalid subscription');
  }
  if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
    console.log("New subscription stored:", sub.endpoint);
  }
  console.log('Sending response: 201, { success: true }');
  res.status(201).json({ success: true });
});

app.post('/check-subscription', (req, res) => {
  const { endpoint } = req.body;
  console.log('Checking subscription for endpoint:', endpoint);
  const exists = subscriptions.some(s => s.endpoint === endpoint);
  console.log('Subscription exists:', exists);
  res.json({ exists });
});

cron.schedule('14 16 * * *', async () => {
  console.log('Sending daily notifications to', subscriptions.length, 'subscribers:', subscriptions.map(s => s.endpoint));
  const payload = JSON.stringify({
    title: 'Daily Reminder',
    body: 'This is your scheduled notification.',
    icon: '/logo192.png',
    url: '/'
  });
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      console.log('Notification sent to:', sub.endpoint);
    } catch (err) {
      console.error('Push failed for', sub.endpoint, ':', err);
    }
  }
});

// Apply apiKeyMiddleware after push notification routes
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
app.use("/api/attendance", adminAttendanceRoutes);
app.use("/admin/attendance", adminAttendanceRoutes);
app.use("/admin-attendance", adminAttendanceRoutes);
app.use("/face-punch", face_admin_page);
app.use("/api/employeelogin", employeeloginRoutes);
app.use('/api', empExcelRoutes);
app.use("/api/employee", employeeBirthdayRoutes);
app.use("/", vendorRoutes);
app.use("/", oldEmployeeRoutes);
app.use("/", oldEmployeeDetailsRoutes);
app.use('/api', letterRoutes);
app.use('/api', letterheadRoutes);
app.use('/api', letterheadTemplateRoutes);
app.get("/", (req, res) => {
  res.send("LetterHead API is running");
});
app.use('/api/templates', letterheadTemplateRoutes);
app.use("/api", payrollRoutes);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*" },
});

io.use((socket, next) => {
  const userId = socket.handshake.query.userId;
  if (!userId) return next(new Error("Auth error"));
  socket.userId = userId;
  next();
});

io.on("connection", (socket) => {
  chatService
    .getUserRooms(socket.userId)
    .then((rooms) => rooms.forEach((r) => socket.join(r.id.toString())))
    .catch(console.error);

  socket.on(
    "send_message",
    async ({ roomId, content, type, fileUrl, location }) => {
      if (!location?.lat || !location?.lng) {
        socket.emit("error", "Location required");
        return;
      }
      const { lat, lng, address } = location;
      const saved = await chatService.saveMessage(
        roomId,
        socket.userId,
        content,
        type,
        fileUrl,
        lat,
        lng,
        address
      );
      io.to(roomId.toString()).emit("new_message", {
        roomId: saved.roomId,
        id: saved.id,
        senderId: saved.senderId,
        content: saved.content,
        type: saved.type,
        fileUrl: saved.fileUrl,
        sentAt: saved.sentAt,
        location: {
          lat: saved.latitude,
          lng: saved.longitude,
          address: saved.address,
        },
      });
    }
  );

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