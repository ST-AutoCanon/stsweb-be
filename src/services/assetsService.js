const db = require("../config");
const {
  GET_ASSIGNED_ASSETS_BY_EMPLOYEE,
  SEARCH_EMPLOYEES_BY_NAME,
  INSERT_ASSET,
  GET_ASSETS,
  GET_LAST_ASSET_ID,
  GET_ALL_ASSETS,
  UPDATE_ASSIGNED_TO,
  GET_ASSIGN_DATA,
  UPDATE_RETURN_DATE,
  GET_ASSET_COUNTS,
} = require("../constants/assetsQueries");

const getLastAssetId = async (prefix) => {
  try {
    const [rows] = await db.execute(GET_LAST_ASSET_ID, [`${prefix}-%`]);

    if (rows.length === 0) return `${prefix}-001`;

    const lastNumber = parseInt(rows[0].asset_id.split("-").pop(), 10);
    return `${prefix}-${String(lastNumber + 1).padStart(3, "0")}`;
  } catch (error) {
    console.error("❌ Error fetching last asset ID:", error);
    throw new Error("Failed to generate asset ID");
  }
};
const getLastAssetCode = async () => {
  const [rows] = await db.execute(`
    SELECT asset_code FROM assets 
    WHERE asset_code LIKE 'STS-AST-%' 
    ORDER BY CAST(SUBSTRING(asset_code, 9) AS UNSIGNED) DESC 
    LIMIT 1
  `);

  if (rows.length === 0) return "STS-AST-0001";

  const lastCode = rows[0].asset_code;
  const lastNum = parseInt(lastCode.split("-")[2], 10);
  const nextNum = lastNum + 1;
  return `STS-AST-${String(nextNum).padStart(4, "0")}`;
};

const addAsset = async (assetData) => {
  try {
    const {
      asset_name,
      configuration,
      valuation_date,
      assigned_to,
      category,
      sub_category,
      status,
      document_path,
    } = assetData;
    const asset_code = await getLastAssetCode();

    const categoryPrefixes = {
      Laptop: "SYS-LPT",
      Desktop: "SYS-DEC",
      Server: "SYS-SER",
      Table: "FUR-TBL",
      Chair: "FUR-CHR",
      Drawers: "FUR-DWR",
      Electrical: "EQP-ELE",
      "Non-Electrical": "EQP-NONELE",
      Others: "OTHR",
      cupboard: "FUR-CUPB",
    };

    const prefix = categoryPrefixes[sub_category] || "OTHR";
    const asset_id = await getLastAssetId(prefix);
    const formattedAssetId = `${prefix}-${String(
      parseInt(asset_id.replace(prefix, ""), 10)
    ).padStart(3, "0")}`;

    const assignedToString = assigned_to ? JSON.stringify(assigned_to) : null;

    const values = [
      asset_id,
      asset_code,
      asset_name || null,
      configuration || null,
      valuation_date || null,
      assigned_to || null,

      category || null,
      sub_category || null,
      status || "Available",
      document_path || null,
    ];

    const [result] = await db.execute(INSERT_ASSET, values);

    return { asset_id, insertId: result.insertId };
  } catch (error) {
    console.error("❌ Error inserting asset:", error);
    throw new Error("Failed to add asset");
  }
};

const getAssets = async () => {
  try {
    const [rows] = await db.execute(GET_ALL_ASSETS);
    return rows;
  } catch (error) {
    console.error("❌ Database Error:", error);
    throw new Error("Failed to retrieve assets");
  }
};
const updateAssignedTo = async (assetId, assignedTo) => {
  try {
    const [rows] = await db.execute(
      "SELECT assigned_to FROM assets WHERE asset_id = ?",
      [assetId]
    );
    if (rows.length === 0) return "not_found";

    let assignedArray = [];
    if (rows[0].assigned_to) {
      assignedArray = JSON.parse(rows[0].assigned_to);
    }

    const existingIndex = assignedArray.findIndex(
      (entry) =>
        entry.name === assignedTo.name &&
        entry.employeeId === assignedTo.employeeId
    );

    if (existingIndex !== -1) {
      assignedArray[existingIndex] = {
        ...assignedArray[existingIndex],
        returnDate:
          assignedTo.returnDate || assignedArray[existingIndex].returnDate,
        comments: assignedTo.comments || assignedArray[existingIndex].comments,
        status: assignedTo.status || assignedArray[existingIndex].status,
      };

      const updatedJson = JSON.stringify(assignedArray);

      await db.execute("UPDATE assets SET assigned_to = ? WHERE asset_id = ?", [
        updatedJson,
        assetId,
      ]);

      return "updated";
    } else {
      assignedArray.push(assignedTo);
      const updatedJson = JSON.stringify(assignedArray);

      await db.execute("UPDATE assets SET assigned_to = ? WHERE asset_id = ?", [
        updatedJson,
        assetId,
      ]);

      return "inserted";
    }
  } catch (error) {
    console.error("❌ Database Error:", error);
    throw new Error("Failed to update asset assignment");
  }
};
const getAssignmentData = async (assetId) => {
  try {
    const [rows] = await db.execute(GET_ASSIGN_DATA, [assetId]);
    return rows;
  } catch (error) {
    console.error("Error fetching assignment data:", error);
    throw error;
  }
};

const updateReturnDate = async (assetId, employeeName, returnDate) => {
  try {
    const getAssignedToQuery = `SELECT assigned_to FROM assets WHERE asset_id = ?`;
    const [rows] = await db.execute(getAssignedToQuery, [assetId]);

    if (!rows.length) {
      throw new Error("Asset not found");
    }

    let assignedToArray = JSON.parse(rows[0].assigned_to || "[]");

    let updated = false;
    assignedToArray = assignedToArray.map((entry) => {
      if (entry.name === employeeName && entry.returnDate === null) {
        entry.returnDate = returnDate;
        updated = true;
      }
      return entry;
    });

    if (!updated) {
      throw new Error("Employee record not found or already returned");
    }

    const updateQuery = `UPDATE assets SET assigned_to = ?, status = "Returned" WHERE asset_id = ?`;
    await db.execute(updateQuery, [JSON.stringify(assignedToArray), assetId]);
  } catch (error) {
    console.error("❌ Database update failed:", error);
    throw new Error("Database update failed");
  }
};

const getAssetCounts = async () => {
  try {
    const [rows] = await db.execute(GET_ASSET_COUNTS);
    return rows;
  } catch (error) {
    console.error("Error fetching asset counts:", error);
    throw error;
  }
};

const searchEmployeesByName = async (searchTerm) => {
  try {
    const [rows] = await db.execute(SEARCH_EMPLOYEES_BY_NAME, [searchTerm]);
    return rows;
  } catch (error) {
    console.error("❌ Error searching employees:", error);
    throw new Error("Failed to search employees");
  }
};

const fetchAssignedAssetsByEmployee = async (employeeId) => {
  const [result] = await db.execute(GET_ASSIGNED_ASSETS_BY_EMPLOYEE, [
    employeeId,
  ]);
  return result;
};

module.exports = {
  searchEmployeesByName,
  addAsset,
  getAssets,
  updateAssignedTo,
  getAssignmentData,
  updateReturnDate,
  getAssetCounts,
  fetchAssignedAssetsByEmployee,
};
