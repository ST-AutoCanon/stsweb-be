

const db = require("../config"); 
const { SEARCH_EMPLOYEES_BY_NAME,INSERT_ASSET, GET_ASSETS, GET_LAST_ASSET_ID, GET_ALL_ASSETS,UPDATE_ASSIGNED_TO ,GET_ASSIGN_DATA,UPDATE_RETURN_DATE,GET_ASSET_COUNTS} = require("../constants/assetsQueries");

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

const addAsset = async (assetData) => {
    try {
        const { asset_name, configuration, valuation_date, assigned_to, category, sub_category, status, document_path } = assetData;

        const categoryPrefixes = {
            "Laptop": "SYS-LPT",
            "Desktop": "SYS-DEC",
            "Server": "SYS-SER",
            "Table": "FUR-TBL",
            "Chair": "FUR-CHR",
            "Drawers": "FUR-DWR",
            "Electrical": "EQP-ELE",
            "Non-Electrical": "EQP-NONELE",
            "Others": "OTHR",
            "cupboard":"FUR-CUPB"
        };

        const prefix = categoryPrefixes[sub_category] || "OTHR";
        const asset_id = await getLastAssetId(prefix);
        const formattedAssetId = `${prefix}-${String(parseInt(asset_id.replace(prefix, ""), 10)).padStart(3, "0")}`;
        console.log("🆔 Final Asset ID:", formattedAssetId);

        // Convert assigned_to to JSON string
        const assignedToString = assigned_to ? JSON.stringify(assigned_to) : null;

        const values = [
            asset_id,
            asset_name || null,
            configuration || null,
            valuation_date || null,
            assigned_to || null,

            category || null,
            sub_category || null,
            status || "Available",
            document_path || null
        ];

        console.log("📝 Inserting Asset:", values);

        const [result] = await db.execute(INSERT_ASSET, values);

        return { asset_id, insertId: result.insertId };
    } catch (error) {
        console.error("❌ Error inserting asset:", error);
        throw new Error("Failed to add asset");
    }
};

const getAssets = async () => {
    try {
        console.log("📌 Fetching assets from database...");
        const [rows] = await db.execute(GET_ALL_ASSETS);
        console.log("✅ Assets fetched successfully:", rows);
        return rows;
    } catch (error) {
        console.error("❌ Database Error:", error);
        throw new Error("Failed to retrieve assets");
    }
};
const updateAssignedTo = async (assetId, assignedTo) => {
    try {
      console.log("🔄 Updating Asset in DB with values:", { assetId, assignedTo });
  
      // Step 1: Get current assigned_to data
      const [rows] = await db.execute("SELECT assigned_to FROM assets WHERE asset_id = ?", [assetId]);
      if (rows.length === 0) return "not_found";
  
      let assignedArray = [];
      if (rows[0].assigned_to) {
        assignedArray = JSON.parse(rows[0].assigned_to);
      }
  
      // Step 2: Check if same person already assigned
      const existingIndex = assignedArray.findIndex(
        (entry) => entry.name === assignedTo.name
      );
  
      if (existingIndex !== -1) {
        // Step 3a: Update returnDate and other fields if needed
        assignedArray[existingIndex] = {
          ...assignedArray[existingIndex],
          returnDate: assignedTo.returnDate || assignedArray[existingIndex].returnDate,
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
        // Step 3b: New assignment
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
      return rows; // Returning the result from the query
    } catch (error) {
      console.error('Error fetching assignment data:', error);
      throw error; // Rethrow or handle error as needed
    }
  };
  
  const updateReturnDate = async (assetId, employeeName, returnDate) => {
    try {
        // 1️⃣ Fetch the current `assigned_to` JSON from the database
        const getAssignedToQuery = `SELECT assigned_to FROM assets WHERE asset_id = ?`;
        const [rows] = await db.execute(getAssignedToQuery, [assetId]);

        if (!rows.length) {
            throw new Error("Asset not found");
        }

        let assignedToArray = JSON.parse(rows[0].assigned_to || "[]");

        console.log("🔍 Current assigned_to:", assignedToArray);

        // 2️⃣ Find the employee record and update `returnDate`
        let updated = false;
        assignedToArray = assignedToArray.map(entry => {
            if (entry.name === employeeName && entry.returnDate === null) { 
                entry.returnDate = returnDate;
                updated = true;
            }
            return entry;
        });

        if (!updated) {
            throw new Error("Employee record not found or already returned");
        }

        console.log("✅ Updated assigned_to:", assignedToArray);

        // 3️⃣ Update `assigned_to` JSON and set `status = "Returned"`
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


// ✅ Ensure functions are properly exported
module.exports = {searchEmployeesByName, addAsset, getAssets, updateAssignedTo ,getAssignmentData ,updateReturnDate,    getAssetCounts
};
