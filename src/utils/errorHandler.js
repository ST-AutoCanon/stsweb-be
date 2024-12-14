class ErrorHandler {
  static generateErrorResponse(code, message) {
    return { status: "error", code, message };
  }

  static generateSuccessResponse(data) {
    return { status: "success", code: 200, data };
  }
}

module.exports = ErrorHandler;
