
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
const updateVendorById = async (vendorData, vendor_id) => {
  try {
    const [result] = await db.query(queries.UPDATE_VENDOR_BY_ID, [...vendorData, vendor_id]);
    return result;
  } catch (error) {
    console.error("Error updating vendor:", error);
    throw new Error("Error updating vendor");
  }
};

module.exports = {
  insertVendor,
  getAllVendors,
  updateVendorById,
};