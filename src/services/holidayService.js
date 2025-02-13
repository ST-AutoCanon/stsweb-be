const db = require("../config");
const queries = require("../constants/queries");

const getHolidays = async () => {
    try {
        const [rows] = await db.execute(queries.GET_HOLIDAYS);
        return rows;
    } catch (error) {
        throw error;
    }
};

module.exports = { getHolidays };
