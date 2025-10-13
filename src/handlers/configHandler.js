const { fetchConfig } = require("../services/configService");

const getConfig = async (req, res) => {
  try {
    const data = await fetchConfig();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching config:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

module.exports = { getConfig };
