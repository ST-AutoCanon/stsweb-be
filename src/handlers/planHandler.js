
const planService = require("../services/planService");

const savePlan = async (req, res) => {
  try {
    const planData = req.body;
    console.log("Received planData:", JSON.stringify(planData, null, 2));

    if (!planData.emp_id) {
      console.log("Missing emp_id");
      return res.status(400).json({
        success: false,
        message: "emp_id is required",
      });
    }

    const dbData = {
      emp_id: String(planData.emp_id || ""),
      week: String(planData.week || ""),
      start_date: planData.start_date || "",
      end_date: planData.end_date || "",
      project_id: String(planData.project_id || ""),
      task_name: planData.task_name || "",
      task_desc: planData.task_desc || "",
      task_days: Array.isArray(planData.task_days) ? planData.task_days.join(",") : planData.task_days || "",
      messages: Array.isArray(planData.messages) ? planData.messages.join("; ") : planData.messages || "",
    };

    console.log("DB data:", JSON.stringify(dbData, null, 2));
    const insertId = await planService.saveWeeklyPlan(dbData);
    res.json({ success: true, message: "Plan saved successfully", plan_id: insertId });
  } catch (error) {
    console.error("Error saving plan:", error.message, error.stack);
    res.status(400).json({ success: false, message: "Failed to save plan", error: error.message });
  }
};

const getPlansByEmployee = async (req, res) => {
  try {
    const empId = req.params.empId;
    if (!empId) {
      return res.status(400).json({ success: false, message: "Invalid empId" });
    }

    const plans = await planService.getWeeklyPlans(empId);

    const formattedPlans = plans.map((plan) => ({
      plan_id: plan.plan_id,
      emp_id: plan.emp_id,
      week: plan.week,
      start_date: plan.start_date,
      end_date: plan.end_date,
      project_id: plan.project_id,
      task_name: plan.task_name,
      task_desc: plan.task_desc,
      task_days: plan.task_days ? plan.task_days.split(",") : [],
      messages: plan.messages ? plan.messages.split("; ") : [],
      created_at: plan.created_at,
    }));

    res.json({ success: true, plans: formattedPlans });
  } catch (error) {
    console.error("Error fetching plans:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to fetch plans", error: error.message });
  }
};

const updateMessages = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { messages } = req.body;

    if (!plan_id || !messages || typeof messages !== "string") {
      return res.status(400).json({ success: false, message: "Invalid plan_id or messages" });
    }

    const updatedPlan = await planService.updatePlanMessages(plan_id, messages);
    res.json({ success: true, message: "Messages updated successfully", plan: updatedPlan });
  } catch (error) {
    console.error("Error updating messages:", error.message, error.stack);
    res.status(400).json({ success: false, message: "Failed to update messages", error: error.message });
  }
};

const approvePlan = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { message } = req.body;

    if (!plan_id || !message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "Invalid plan_id or approval message" });
    }

    const updatedPlan = await planService.updatePlanMessages(plan_id, message);
    res.json({ success: true, message: "Plan approved successfully", plan: updatedPlan });
  } catch (error) {
    console.error("Error approving plan:", error.message, error.stack);
    res.status(400).json({ success: false, message: "Failed to approve plan", error: error.message });
  }
};

module.exports = { savePlan, getPlansByEmployee, updateMessages, approvePlan };
