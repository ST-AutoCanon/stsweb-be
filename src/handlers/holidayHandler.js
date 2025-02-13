const holidayService = require("../services/holidayService");

const getHolidays = async (req, res) => {
    try {
        const holidays = await holidayService.getHolidays();
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: "Error fetching holidays", error });
    }
};

module.exports = { getHolidays };
