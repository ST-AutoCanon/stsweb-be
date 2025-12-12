
const { getFullHierarchyService } = require("../services/supervisorEmployeesService");

const getFullHierarchyHandler = async (req, res) => {
    try {
        const supervisorId = req.headers["x-employee-id"];

        if (!supervisorId) {
            return res.status(400).json({ error: "Supervisor ID is required in headers" });
        }

        const hierarchy = await getFullHierarchyService(supervisorId);
        res.json({ supervisorId, hierarchy });
    } catch (err) {
        console.error("Handler error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getFullHierarchyHandler };
