const db = require("../config");
const queries = require("../constants/leavePolicyQueries");
const dayjs = require("dayjs");

/**
 * Safely parse the `leave_settings` column.
 */
function safeParseSettings(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/**
 * Fetch per-employee carry-forward rows for a given year and return a
 * normalized map where keys are lowercased & trimmed leave_type values.
 *
 * Returns: { <leave_type_lower>: <amount>, ... }
 */
async function getEmployeeCarryForwards(employeeId, year) {
  if (!employeeId) return {};
  try {
    const [rows] = await db.execute(queries.GET_EMPLOYEE_CARRY_FORWARD, [
      employeeId,
      year,
    ]);
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach((r) => {
        if (!r || r.leave_type == null) return;
        const key = String(r.leave_type).trim().toLowerCase();
        map[key] = Number(r.amount || 0);
      });
    }
    return map;
  } catch (err) {
    console.error("getEmployeeCarryForwards error:", err);
    return {};
  }
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

const deletePolicy = async (id) => {
  await db.execute(queries.remove, [id]);
};

/**
 * Get worked days for employee between two dates (inclusive).
 */
async function getWorkedDays(employeeId, periodStart, periodEnd) {
  const [rows] = await db.execute(queries.GET_WORKED_DAYS, [
    employeeId,
    periodStart,
    periodEnd,
  ]);
  return Number(rows[0]?.worked_days || 0);
}
const getUsedLeavesInPeriod = async (employeeId, periodStart, periodEnd) => {
  // params ordering matches the query: employeeId, start, end, start, end, start, end
  const params = [
    employeeId,
    periodStart,
    periodEnd,
    periodStart,
    periodEnd,
    periodStart,
    periodEnd,
  ];

  try {
    const [rows] = await db.execute(queries.GET_USED_LEAVES_IN_PERIOD, params);
    // rows: [{ leave_type: 'casual', used: 2 }, ...]
    const map = {};
    (rows || []).forEach((r) => {
      const key = String(r.leave_type || "")
        .trim()
        .toLowerCase();
      // ensure numeric (could be decimal)
      map[key] = Number(r.used || 0);
    });
    return map;
  } catch (err) {
    console.error(
      "getUsedLeavesInPeriod failed:",
      err && err.message ? err.message : err
    );
    // return empty map so higher-level logic treats used as 0
    return {};
  }
};

function computeEarnedLeavesFromWorked(
  workedDays,
  workingDaysRequired,
  earnedLeavesGrant
) {
  if (!workingDaysRequired || Number(workingDaysRequired) <= 0) return 0;
  if (!earnedLeavesGrant || Number(earnedLeavesGrant) <= 0) return 0;
  console.log("worked days", workedDays);
  console.log("working days required", workingDaysRequired);
  const ratio = Number(workedDays) / Number(workingDaysRequired);
  if (!isFinite(ratio) || ratio <= 0) return 0;
  console.log("ratio", ratio);
  const value = ratio * Number(earnedLeavesGrant);
  return Number(value.toFixed(1)); // change decimal places as needed
}
async function computeAndStoreMonthlyLOP(employeeId, month, year) {
  console.log(
    `[computeAndStoreMonthlyLOP] START employee=${employeeId} month=${month} year=${year}`
  );

  if (!employeeId) throw new Error("employeeId required");
  const m = Number(month);
  const y = Number(year);

  if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(y)) {
    throw new Error("Invalid month/year passed to computeAndStoreMonthlyLOP");
  }

  const periodStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const periodEnd = `${y}-${String(m).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;

  console.log(
    `[computeAndStoreMonthlyLOP] periodStart=${periodStart} periodEnd=${periodEnd}`
  );

  // 1. First, try to get explicit LOP days from approved leave queries for this period
  const [lopRows] = await db.execute(
    `SELECT SUM(loss_of_pay_days) AS total_lop_days
     FROM leavequeries
     WHERE employee_id = ?
       AND status = 'Approved'
       AND start_date <= ?
       AND end_date >= ?`,
    [employeeId, periodEnd, periodStart]
  );

  const explicitLOP = Number(lopRows[0]?.total_lop_days || 0);

  if (explicitLOP > 0) {
    console.log(
      `[computeAndStoreMonthlyLOP] Found explicit LOP=${explicitLOP}, overriding computed logic.`
    );

    try {
      await db.execute(queries.UPSERT_EMPLOYEE_MONTHLY_LOP, [
        employeeId,
        m,
        y,
        explicitLOP,
      ]);
      console.log(
        `[computeAndStoreMonthlyLOP] persisted LOP for ${employeeId} ${m}-${y} => ${explicitLOP}`
      );
    } catch (persistErr) {
      console.error(
        "[computeAndStoreMonthlyLOP] Failed to persist monthly LOP:",
        persistErr
      );
      throw persistErr;
    }

    return { month: m, year: y, total_lop: explicitLOP };
  }

  // 2. If no explicit LOP found, fall back to computed logic (allowance-based)
  const policies = await getAllPolicies().catch((e) => {
    console.warn("getAllPolicies failed:", e);
    return [];
  });

  let active = null;
  if (Array.isArray(policies) && policies.length > 0) {
    active = policies.find(
      (p) =>
        new Date(p.year_start) <= new Date(periodEnd) &&
        new Date(p.year_end) >= new Date(periodStart)
    );
    if (!active) {
      active = policies
        .slice()
        .sort((a, b) => new Date(b.year_start) - new Date(a.year_start))[0];
    }
  }

  if (!active) {
    console.log(
      "[computeAndStoreMonthlyLOP] No active policy found. Persisting lop=0"
    );
    await db.execute(queries.UPSERT_EMPLOYEE_MONTHLY_LOP, [
      employeeId,
      m,
      y,
      0,
    ]);
    return { month: m, year: y, total_lop: 0 };
  }

  // used leaves overlapping this month (approved only)
  const usedByType = await getUsedLeavesInPeriod(
    employeeId,
    periodStart,
    periodEnd
  ).catch((e) => {
    console.warn("getUsedLeavesInPeriod failed:", e);
    return {};
  });
  console.log("[computeAndStoreMonthlyLOP] usedByType:", usedByType);

  const policyPeriodStart = active.year_start;
  const workedUntilMonthEnd = await getWorkedDays(
    employeeId,
    policyPeriodStart,
    periodEnd
  ).catch((e) => {
    console.warn("getWorkedDays failed:", e);
    return 0;
  });
  console.log(
    "[computeAndStoreMonthlyLOP] workedUntilMonthEnd:",
    workedUntilMonthEnd
  );

  const policyYear = new Date(active.year_start).getFullYear();
  const employeeCFMap = await getEmployeeCarryForwards(
    employeeId,
    policyYear
  ).catch((e) => {
    console.warn("getEmployeeCarryForwards failed:", e);
    return {};
  });
  console.log("[computeAndStoreMonthlyLOP] employeeCFMap:", employeeCFMap);

  const settings = Array.isArray(active.leave_settings)
    ? active.leave_settings
    : safeParseSettings(active.leave_settings);

  let total_lop = 0;

  for (const setting of settings) {
    try {
      const typeKey = String(setting.type || "")
        .trim()
        .toLowerCase();
      const used = Number((usedByType && usedByType[typeKey]) || 0);
      const annualStatic = Number(setting.value || 0);
      const policyCarryForwardAllowed = Number(setting.carry_forward || 0);
      const employeeCarry = employeeCFMap[typeKey];
      const carryForward =
        employeeCarry !== undefined
          ? Math.min(Number(employeeCarry || 0), policyCarryForwardAllowed)
          : 0;
      const isEarned = typeKey === "earned";
      const monthlyStaticAllowance = isEarned
        ? 0
        : Math.floor(annualStatic / 12);

      let earnedUntilMonthEnd = 0;
      if (isEarned) {
        const workingDaysRequired = Number(setting.working_days || 0);
        const earnedLeavesGrant = Number(setting.earned_leaves || 0);
        earnedUntilMonthEnd = computeEarnedLeavesFromWorked(
          workedUntilMonthEnd,
          workingDaysRequired,
          earnedLeavesGrant
        );
      }

      const allowance =
        monthlyStaticAllowance + earnedUntilMonthEnd + carryForward;
      const lopForType = Math.max(Number(used) - allowance, 0);

      console.log(
        `[computeAndStoreMonthlyLOP] type=${typeKey} used=${used} allowance=${allowance} lopForType=${lopForType}`
      );

      total_lop += lopForType;
    } catch (innerErr) {
      console.warn("[computeAndStoreMonthlyLOP] error in loop:", innerErr);
    }
  }

  total_lop = Number(total_lop.toFixed(2));
  console.log(
    "[computeAndStoreMonthlyLOP] total_lop (computed fallback) =",
    total_lop
  );

  try {
    await db.execute(queries.UPSERT_EMPLOYEE_MONTHLY_LOP, [
      employeeId,
      m,
      y,
      total_lop,
    ]);
    console.log(
      `[computeAndStoreMonthlyLOP] persisted LOP for ${employeeId} ${m}-${y} => ${total_lop}`
    );
  } catch (persistErr) {
    console.error(
      "[computeAndStoreMonthlyLOP] Failed to persist monthly LOP:",
      persistErr
    );
    throw persistErr;
  }

  return { month: m, year: y, total_lop };
}

/**
 * Return monthly LOP — first tries stored value, otherwise computes & stores it.
 */
const getMonthlyLOP = async (employeeId, month, year) => {
  if (!employeeId) throw new Error("employeeId required");
  const m = Number(month);
  const y = Number(year);

  // try fetch stored
  const [rows] = await db.execute(queries.GET_EMPLOYEE_MONTHLY_LOP, [
    employeeId,
    m,
    y,
  ]);
  if (rows && rows[0]) {
    return {
      month: m,
      year: y,
      total_lop: Number(rows[0].lop || 0),
      computed_at: rows[0].computed_at,
    };
  }

  // compute & persist
  const result = await computeAndStoreMonthlyLOP(employeeId, m, y);
  return result;
};

const getLeaveBalance = async (employeeId) => {
  if (!employeeId) throw new Error("employeeId required");

  const policies = await getAllPolicies();
  if (!policies || policies.length === 0) return [];

  // Use most recent policy as before
  const active = policies
    .slice()
    .sort((a, b) => new Date(b.year_start) - new Date(a.year_start))[0];
  if (!active) return [];

  // compute workedDays from policy start up to now (for earned)
  const now = new Date();
  const upToDate =
    now > new Date(active.year_end)
      ? active.year_end
      : now.toISOString().split("T")[0];
  const workedDaysForPolicyTillNow = await getWorkedDays(
    employeeId,
    active.year_start,
    upToDate
  );

  // used leaves within policy period aggregated by type (normalized)
  const usedMap = await getUsedLeavesInPeriod(
    employeeId,
    active.year_start,
    active.year_end
  );

  // fetch per-employee carry forwards for the policy year (normalized keys)
  const policyYear = new Date(active.year_start).getFullYear();
  const employeeCFMap = await getEmployeeCarryForwards(employeeId, policyYear);

  const settings = Array.isArray(active.leave_settings)
    ? active.leave_settings
    : safeParseSettings(active.leave_settings);

  const result = settings.map((setting) => {
    const type = setting.type;
    const typeKey = String(type || "")
      .trim()
      .toLowerCase();

    // normalized used lookup
    const used = Number(usedMap[typeKey] || 0);

    // policy allowed carry_forward (maximum allowed to carry)
    const policyCarryAllowed = Number(setting.carry_forward || 0);

    // actual carry-forward must come from employee_leave_carry_forward table.
    const employeeCarry = employeeCFMap[typeKey];
    const carryForward =
      employeeCarry !== undefined
        ? Math.min(Number(employeeCarry || 0), policyCarryAllowed)
        : 0;

    const annual = Number(setting.value || 0);

    let earnedFromAttendance = 0;
    if (typeKey === "earned") {
      earnedFromAttendance = computeEarnedLeavesFromWorked(
        workedDaysForPolicyTillNow,
        Number(setting.working_days || 0),
        Number(setting.earned_leaves || 0)
      );
    }

    const allowance =
      (typeKey === "earned" ? earnedFromAttendance : annual) + carryForward;

    const remaining = Math.max(allowance - used, 0);
    const loss_of_pay = Math.max(used - allowance, 0);

    return {
      type,
      enabled: !!setting.enabled,
      annual_allowance: annual,
      earned: earnedFromAttendance,
      carry_forward: carryForward,
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
  computeAndStoreMonthlyLOP,
  // exported helpers (for tests or elsewhere)
  getWorkedDays,
  getUsedLeavesInPeriod,
  computeEarnedLeavesFromWorked,
  getEmployeeCarryForwards,
};
