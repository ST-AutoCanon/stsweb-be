const express = require("express");
const bodyParser = require("body-parser");
const loginRoutes = require("./routes/login");
const leaveRoutes = require("./routes/leave");
const employeeRoutes = require("./routes/employee");
const employeeQueries = require("./routes/employeeQueries");
const resetPasswordRoutes = require("./routes/resetPassword");
const forgotPasswordRoutes = require("./routes/forgotPassword");
const apiKeyMiddleware = require("./middleware/apiKeyMiddleware"); 
const sessionMiddleware = require("./middleware/sessionMiddleware"); 
const cors = require('cors');
require("dotenv").config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Only allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'], // Allowed headers
}));


// Apply API key middleware universally
app.use(apiKeyMiddleware);

// Apply session middleware to all routes except login
app.use(sessionMiddleware);

app.use(bodyParser.json());
app.use("/", loginRoutes);
app.use("/", leaveRoutes);
app.use("/", employeeRoutes);
app.use("/", employeeQueries);
app.use("/", resetPasswordRoutes);
app.use("/", forgotPasswordRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
