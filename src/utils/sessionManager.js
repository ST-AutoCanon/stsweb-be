const jwt = require('jsonwebtoken');

/**
 * Check if a given session token is valid.
 * @param {string} token - The JWT token to validate.
 * @returns {boolean} - True if the session is valid, false otherwise.
 */
const isSessionValid = (token) => {
  try {
    const decoded = jwt.decode(token); // Decode token without verification
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

    if (currentTime >= decoded.exp) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Check if a session is about to expire soon.
 * @param {number} expiry - The expiration timestamp of the session.
 * @param {number} [threshold=300] - The threshold in seconds to consider as "expiring soon."
 * @returns {boolean} - True if the session will expire within the threshold.
 */
const expireSoon = (expiry, threshold = 300) => {
  const currentTime = Math.floor(Date.now() / 1000);

  if (expiry - currentTime <= threshold) {
    console.log("Session will expire soon.");
    return true;
  }

  return false;
};

module.exports = {
  isSessionValid,
  expireSoon,
};
