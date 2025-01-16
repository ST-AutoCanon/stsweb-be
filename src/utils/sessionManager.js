const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

// Define the fixed timezone (Indian Standard Time - IST)
const TIMEZONE = 'Asia/Kolkata';

/**
 * Check if a given session token is valid based on the fixed timezone.
 * @param {string} token - The JWT token to validate.
 * @returns {boolean} - True if the session is valid, false otherwise.
 */
const isSessionValid = (token) => {
  try {
    const decoded = jwt.decode(token); // Decode token without verification
    const currentTime = moment.tz(TIMEZONE).unix(); // Current time in seconds (fixed timezone)

    if (currentTime >= decoded.exp) {
      return false; // Session has expired
    }

    return true; // Session is valid
  } catch (err) {
    return false; // Invalid token
  }
};

/**
 * Check if a session is about to expire soon based on the fixed timezone.
 * @param {number} expiry - The expiration timestamp of the session.
 * @param {number} [threshold=300] - The threshold in seconds to consider as "expiring soon."
 * @returns {boolean} - True if the session will expire within the threshold.
 */
const expireSoon = (expiry, threshold = 300) => {
  const currentTime = moment.tz(TIMEZONE).unix(); // Current time in seconds (fixed timezone)

  if (expiry - currentTime <= threshold) {
    console.log("Session will expire soon.");
    return true; // Session is expiring soon
  }

  return false; // Session is not expiring soon
};

module.exports = {
  isSessionValid,
  expireSoon,
};
