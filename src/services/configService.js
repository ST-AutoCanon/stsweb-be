const db = require("../config");
const { GET_CONFIG_QUERY } = require("../constants/configQueries");

const fetchConfig = async () => {
  const [rows] = await db.query(GET_CONFIG_QUERY);
  return rows;
};

module.exports = { fetchConfig };
