// src/services/leavePolicyService.js

const db = require("../config");
const queries = require("../constants/leavePolicyQueries");

/**
 * Safely parse the `leave_settings` column.
 * If it's already an object/array, or null/undefined, we just return it (or an empty array).
 */
function safeParseSettings(raw) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  // Already an object/array, or null
  return raw || [];
}

/**
 * Return all leave policies, with `leave_settings` parsed.
 */
const getAllPolicies = async () => {
  const [rows] = await db.execute(queries.getAll);
  return rows.map((r) => ({
    ...r,
    leave_settings: safeParseSettings(r.leave_settings),
  }));
};

/**
 * Insert a new policy and return the inserted row,
 * parsing its `leave_settings` safely.
 */
const createPolicy = async ({
  period,
  year_start,
  year_end,
  leave_settings,
}) => {
  const [result] = await db.execute(queries.create, [
    period,
    year_start,
    year_end,
    JSON.stringify(leave_settings),
  ]);

  const [newRows] = await db.execute(queries.getById, [result.insertId]);
  const policy = newRows[0];
  policy.leave_settings = safeParseSettings(policy.leave_settings);
  return policy;
};

const getMonthlyLOP = async (employeeId, month, year) => {
  if (!employeeId) throw new Error("employeeId required");

  // The MONTHLY_LOP query expects parameters [employeeId, month, year]
  const [rows] = await db.execute(queries.MONTHLY_LOP, [
    employeeId,
    month,
    year,
  ]);

  const total_lop = rows && rows[0] ? Number(rows[0].total_lop || 0) : 0;

  // Return month/year from the function args (since the query returns only total_lop)
  return {
    month: Number(month),
    year: Number(year),
    total_lop,
  };
};

/**
 * Update an existing policy by ID.
 */
const updatePolicy = async (
  id,
  { period, year_start, year_end, leave_settings }
) => {
  await db.execute(queries.update, [
    period,
    year_start,
    year_end,
    JSON.stringify(leave_settings),
    id,
  ]);
};

/**
 * Delete a policy by ID.
 */
const deletePolicy = async (id) => {
  await db.execute(queries.remove, [id]);
};

/**
 * Compute leave balance for an employee.
 *
 * Steps:
 * 1) Load all policies
 * 2) For each policy, query approved usage by leave_type
 * 3) Pick the most recent policy period
 * 4) For each leave_setting in that policy, calculate:
 *      allowance = (value or earned_leaves) + carry_forward
 *      used      = sum from leavequeries
 *      remaining = allowance - used
 *      loss_of_pay = max(used - allowance, 0)
 */
const getLeaveBalance = async (employeeId) => {
  // 1) Load all policies
  const policies = await getAllPolicies();

  // 2) Gather usage per type across the active period(s)
  const usageByType = {};
  await Promise.all(
    policies.map(async (p) => {
      const [rows] = await db.execute(
        `
        SELECT
          leave_type,
          SUM(DATEDIFF(end_date, start_date) + 1) AS used
        FROM leavequeries
        WHERE
          employee_id = ?
          AND status = 'Approved'
          AND start_date BETWEEN ? AND ?
        GROUP BY leave_type
        `,
        [employeeId, p.year_start, p.year_end]
      );
      rows.forEach((r) => {
        usageByType[r.leave_type] = Number(r.used);
      });
    })
  );

  // 3) Choose the most recent policy by start date
  const active = policies.sort(
    (a, b) => new Date(b.year_start) - new Date(a.year_start)
  )[0];

  // 4) Build balance array
  const result = (active.leave_settings || []).map((setting) => {
    const type = setting.type;
    const used = usageByType[type] || 0;

    // Determine allowance
    let allowance = 0;
    if (type === "earned") {
      allowance = Number(setting.earned_leaves || 0);
    } else {
      allowance = Number(setting.value || 0);
    }
    allowance += Number(setting.carry_forward || 0);

    const remaining = allowance - used;
    const loss_of_pay = Math.max(used - allowance, 0);

    return {
      type,
      enabled: !!setting.enabled,
      allowance,
      used,
      remaining,
      loss_of_pay,
    };
  });

  return result;
};

module.exports = {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getLeaveBalance,
  getMonthlyLOP,
};
