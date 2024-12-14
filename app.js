const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const leaveRoutes = require('./src/routes/leaveRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/employee', leaveRoutes);
app.use('/', notificationRoutes);
app.use('/employee', attendanceRoutes);
app.use('/employee', profileRoutes);
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
