
const db = require("../config");
const queries = require("../constants/vendorQueries");

const insertVendor = async (vendorData) => {
  try {
    const [result] = await db.query(queries.INSERT_VENDOR, vendorData);
    return result;
  } catch (error) {
    console.error("Error inserting vendor:", error);
    throw new Error("Error inserting vendor");
  }
};

const getAllVendors = async () => {
  try {
    const [rows] = await db.query(queries.GET_ALL_VENDORS);
    return rows;
  } catch (error) {
    console.error("Error fetching vendors:", error);
    throw new Error("Error fetching vendors");
  }
};

module.exports = {
  insertVendor,
  getAllVendors,
};