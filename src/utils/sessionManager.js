const sessions = new Map();

/**
 * @param {string} token 
 * @param {number} duration 
 */
function createSession(token, duration = 20 * 60 * 1000) {
  sessions.set(token, Date.now() + duration);
}

function isSessionValid(token) {
  const expiryTime = sessions.get(token);
  if (!expiryTime) return false;
  if (Date.now() > expiryTime) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function expireSoon(token) {
  const expiryTime = sessions.get(token);
  if (!expiryTime) return false;
  const remaining = expiryTime - Date.now();
  return remaining < 2 * 60 * 1000; // 2 minutes left
}

module.exports = { createSession, isSessionValid, expireSoon };
