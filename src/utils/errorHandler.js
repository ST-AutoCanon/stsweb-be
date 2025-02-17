/** 
 * ErrorHandler class to handle generating success and error responses.
 */
class ErrorHandler {

  static generateErrorResponse(code, message) {
    return { status: "error", code, message };
  }

  static generateSuccessResponse(code, message, data) {
    return { status: "success", code, message, data };
  }
};

module.exports = ErrorHandler;