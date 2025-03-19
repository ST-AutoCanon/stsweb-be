const { getApprovedReimbursementLastMonth } = require("../services/adminDashReimbursement");

const handleGetApprovedReimbursementLastMonth = async (req, res) => {
  try {
    const totalApprovedReimbursement = await getApprovedReimbursementLastMonth();
    res.status(200).json({ totalApprovedReimbursement });
  } catch (error) {
    console.error("Error fetching approved reimbursement:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  handleGetApprovedReimbursementLastMonth,
};
