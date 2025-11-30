const {
  addCompensation,
  getAllCompensations,
  getCompensationByEmployeeId,
  getCompensationWorkingDaysByPlanId,
  updateCompensation,
  deleteCompensation,
  getAllEmployeeNames,
  getAllDepartmentNames,
  getEmployeesByDepartmentId,
  addTdsSlab,
  getAllTdsSlabs,
  getPreviousTdsSlabs,
} = require("../services/compensationService");

const addCompensationHandler = async (req, res) => {
  try {
    const { compensationPlanName, formData } = req.body;

    if (!compensationPlanName || typeof formData !== "object") {
      return res
        .status(400)
        .json({ error: "Missing compensationPlanName or invalid formData" });
    }

    const result = await addCompensation({ compensationPlanName, formData });

    res.status(201).json({
      success: true,
      message: "Compensation plan added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error adding compensation plan:", error);
    res
      .status(500)
      .json({
        error: "Failed to add compensation plan",
        details: error.message,
      });
  }
};

const getAllCompensationsHandler = async (req, res) => {
  try {
    const compensations = await getAllCompensations();
    res.status(200).json({ success: true, data: compensations });
  } catch (error) {
    console.error("Error fetching compensations:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch compensations", details: error.message });
  }
};

const getCompensationByEmployeeIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }
    const result = await getCompensationByEmployeeId(id);
    if (!result.length) {
      return res.status(404).json({ message: "Compensation not found" });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching compensation by ID:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch compensation", details: error.message });
  }
};

const getCompensationWorkingDaysByPlanIdHandler = async (req, res) => {
  try {
    const { planId } = req.params;
    if (!planId) {
      return res.status(400).json({ error: "Missing plan ID" });
    }
    const result = await getCompensationWorkingDaysByPlanId(planId);
    if (!result.length) {
      return res
        .status(404)
        .json({ message: "Working days not found for this plan" });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching compensation working days:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch compensation working days",
        details: error.message,
      });
  }
};

const updateCompensationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { compensationPlanName, formData } = req.body;

    if (!id || !compensationPlanName || typeof formData !== "object") {
      return res
        .status(400)
        .json({
          error: "Missing id, compensationPlanName, or invalid formData",
        });
    }

    const result = await updateCompensation(id, {
      compensationPlanName,
      formData,
    });

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Compensation not found for update" });
    }

    res
      .status(200)
      .json({ success: true, message: "Compensation updated successfully" });
  } catch (error) {
    console.error("Error updating compensation:", error);
    res
      .status(500)
      .json({ error: "Failed to update compensation", details: error.message });
  }
};

const deleteCompensationHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await deleteCompensation(employeeId);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Compensation not found for deletion" });
    }

    res
      .status(200)
      .json({ success: true, message: "Compensation deleted successfully" });
  } catch (error) {
    console.error("Error deleting compensation:", error);
    res
      .status(500)
      .json({ error: "Failed to delete compensation", details: error.message });
  }
};

const getAllEmployeeNamesHandler = async (req, res) => {
  try {
    const employeeNames = await getAllEmployeeNames();
    res.status(200).json({ success: true, data: employeeNames });
  } catch (error) {
    console.error("Error fetching employee names:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch employee names",
        details: error.message,
      });
  }
};

const getAllDepartmentNamesHandler = async (req, res) => {
  try {
    const departmentNames = await getAllDepartmentNames();
    res.status(200).json({ success: true, data: departmentNames });
  } catch (error) {
    console.error("Error fetching department names:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch department names",
        details: error.message,
      });
  }
};

const handleGetEmployeesByDepartmentId = async (req, res) => {
  const { departmentId } = req.params;
  try {
    const employees = await getEmployeesByDepartmentId(departmentId);
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error("Error fetching employees by department ID:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch employees by department",
        details: error.message,
      });
  }
};
const addTdsSlabHandler = async (req, res) => {
  try {
    const { slab_from, slab_to, percentage, month, year } = req.body;

    if (
      slab_from == null ||
      slab_to == null ||
      percentage == null ||
      !month ||
      !year
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await addTdsSlab({
      slab_from: parseFloat(slab_from),
      slab_to: parseFloat(slab_to),
      percentage: parseFloat(percentage),
      month: parseInt(month),
      year: parseInt(year),
    });

    res.status(201).json({
      success: true,
      message: "TDS slab added successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error adding TDS slab:", error);
    res.status(500).json({
      error: "Failed to add TDS slab",
      details: error.message,
    });
  }
};

const getAllTdsSlabsHandler = async (req, res) => {
  try {
    const slabs = await getAllTdsSlabs();
    res.status(200).json({ success: true, data: slabs });
  } catch (error) {
    console.error("❌ Error fetching TDS slabs:", error);
    res.status(500).json({
      error: "Failed to fetch TDS slabs",
      details: error.message,
    });
  }
};

const getPreviousTdsSlabsHandler = async (req, res) => {
  try {
    const { month, year, limit } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Missing month or year" });
    }

    const slabs = await getPreviousTdsSlabs({
      month: parseInt(month),
      year: parseInt(year),
      limit: parseInt(limit) || 10,
    });

    res.status(200).json({ success: true, data: slabs });
  } catch (error) {
    console.error("❌ Error fetching previous TDS slabs:", error);
    res.status(500).json({
      error: "Failed to fetch previous TDS slabs",
      details: error.message,
    });
  }
};

module.exports = {
  addCompensationHandler,
  getAllCompensationsHandler,
  getCompensationByEmployeeIdHandler,
  getCompensationWorkingDaysByPlanIdHandler,
  updateCompensationHandler,
  deleteCompensationHandler,
  getAllEmployeeNamesHandler,
  getAllDepartmentNamesHandler,
  handleGetEmployeesByDepartmentId,
  addTdsSlabHandler,
  getAllTdsSlabsHandler,
  getPreviousTdsSlabsHandler,
};
