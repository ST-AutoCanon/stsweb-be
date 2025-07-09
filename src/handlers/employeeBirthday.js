const { fetchEmployeeBirthday } = require("../services/employeeBirthday");

const getEmployeeBirthday = async (req, res) => {
  try {
    const { email } = req.params;
    const birthdayData = await fetchEmployeeBirthday(email);
    if (!birthdayData) {
      return res.status(404).json({ message: "Employee not found or no birthday today." });
    }
    res.status(200).json(birthdayData);
  } catch (error) {
    console.error("Error fetching birthday:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getEmployeeBirthday };
