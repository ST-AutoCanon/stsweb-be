const db = require("../config");
const { GET_APPROVED_REIMBURSEMENT_LAST_MONTH } = require("../constants/admindashreimbursement");

const getApprovedReimbursementLastMonth = async () => {
  try {
    const [result] = await db.query(GET_APPROVED_REIMBURSEMENT_LAST_MONTH);
    return result[0]?.total_approved_reimbursement_last_month || 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getApprovedReimbursementLastMonth,
};
