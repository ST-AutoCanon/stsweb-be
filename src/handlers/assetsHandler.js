
const { searchEmployeesByName,addAsset, getAssets ,getAssignmentData} = require("../services/assetsService"); // Ensure this import exists
const { saveAssignedAsset } = require("../services/assetsService");
const { updateAssignedTo } = require("../services/assetsService");
const { updateReturnDate,getAssetCounts,fetchAssignedAssetsByEmployee} = require("../services/assetsService");
const assetService = require('../services/assetsService'); // ✅ This is necessary


const addAssetHandler = async (req, res) => {
  const { status = "In Use" } = req.body;
  let { assigned_to } = req.body;

  try {
    assigned_to = JSON.parse(assigned_to);
  } catch (err) {
    console.warn("Could not parse assigned_to, using as string:", assigned_to);
  }

  const validStatuses = ["In Use", "Not Using", "Decommissioned"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    console.log("📥 Incoming Asset Data:", req.body);
    const { asset_name, configuration, valuation_date, assigned_to, category, sub_category } = req.body;
    let { status } = req.body;
    const document_path = req.file ? req.file.filename : null; // Store only the filename

    const validStatuses = ["In Use", "Not Using", "Decommissioned"];
    if (!status || !validStatuses.includes(status)) {
      status = "In Use";
    }

    if (!asset_name || !category || (category !== "Others" && !sub_category)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const assetData = { asset_name, configuration, valuation_date, assigned_to, category, sub_category, status, document_path };
    console.log("📤 Processed Asset Data:", assetData);

    const result = await addAsset(assetData);
    res.status(201).json({ message: "Asset added successfully", asset_id: result.asset_id, asset_code: result.asset_code });
  } catch (error) {
    console.error("❌ Database Error:", error);
    res.status(500).json({ error: "Failed to add asset", details: error.message });
  }
};
const getAssetsHandler = async (req, res) => {
    try {
        console.log("Fetching assets...");
        const assets = await getAssets();
        console.log("Assets retrieved:", assets);

        res.status(200).json(assets);
    } catch (error) {
        console.error("Error fetching assets:", error.message);
        res.status(500).json({ error: "Failed to retrieve assets", details: error.message });
    }
};
const assignAsset = async (req, res) => {
    try {
      const { assetId, assignedTo,employeeId, startDate, returnDate, comments, status } = req.body;
  
      if (!assetId || !assignedTo || !startDate || !status) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const assignedData = {
        name: assignedTo,
        employeeId,
        startDate,
        
        returnDate: returnDate || null, // Accept null if not provided
        comments: comments || "",
        status,
      };
  
      console.log("📌 Assigning Asset:", assignedData);
  
      const result = await updateAssignedTo(assetId, assignedData);
  
      if (result === "not_found") {
        return res.status(404).json({ error: `Asset not found for ID: ${assetId}` });
      }
  
      if (result === "updated") {
        return res.status(200).json({ success: true, message: "Return date updated successfully" });
      }
  
      if (result === "inserted") {
        return res.status(200).json({ success: true, message: "New assignment added successfully" });
      }
  
      res.status(500).json({ error: "Unknown operation result" });
  
    } catch (error) {
      console.error("❌ Error assigning asset:", error);
      res.status(500).json({ error: "Failed to assign asset" });
    }
  };
    
  
  const getAssetAssignmentHandler = async (req, res) => {
    const { assetId } = req.params; // Getting the assetId from the URL parameter
  
    try {
        // Call the service to get the assignment data
        const assignments = await getAssignmentData(assetId);
  
        if (assignments.length === 0) {
            return res.status(404).json({ message: 'No assignments found for this asset.' });
        }
  
        // Return the assignments as a JSON response
        return res.status(200).json(assignments);
    } catch (error) {
        console.error('Error in getAssetAssignmentHandler:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
const updateReturnDateHandler = async (req, res) => {
    try {
        console.log("Received request for updating return date");

        const { assetId, employeeName, returnDate } = req.body;

        if (!assetId || !employeeName || !returnDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log("🔍 Received Data:", { assetId, employeeName, returnDate });

        // Call the service function to update the JSON object
        await updateReturnDate(assetId, employeeName, returnDate);

        res.status(200).json({ 
            message: "Return date updated successfully", 
            updatedStatus: "Returned" 
        });

    } catch (error) {
        console.error("❌ Error updating return date:", error);
        res.status(500).json({ error: "Failed to update return date" });
    }
};

const getAssetCountsHandler = async (req, res) => {
    try {
        const assetCounts = await getAssetCounts();
        res.status(200).json({ success: true, data: assetCounts });
    } catch (error) {
        console.error("Error handling asset counts request:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const searchEmployeesHandler = async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
        return res.status(400).json({ error: "Search query is required" });
    }

    try {
        const employees = await searchEmployeesByName(q.trim());
        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        console.error("❌ Error searching employees:", error);
        res.status(500).json({ success: false, message: "Failed to search employees" });
    }
};



const getAssignedAssetsByEmployee = async (req, res) => {
    const { employeeId } = req.params;
  
    try {
      const assignedAssets = await assetService.fetchAssignedAssetsByEmployee(employeeId);
      res.status(200).json({ success: true, data: assignedAssets });
    } catch (error) {
      console.error("Error fetching assigned assets:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

module.exports = {searchEmployeesHandler, addAssetHandler, getAssetsHandler,assignAsset,getAssetAssignmentHandler,updateReturnDateHandler, getAssetCountsHandler,getAssignedAssetsByEmployee  };
