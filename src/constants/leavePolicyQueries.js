module.exports = {
  // 1) Fetch all policies
  getAll: `
    SELECT
      id,
      period,
      DATE_FORMAT(year_start, '%Y-%m-%d') AS year_start,
      DATE_FORMAT(year_end,   '%Y-%m-%d') AS year_end,
      leave_settings
    FROM leave_policy
    ORDER BY year_start DESC, period
  `,

  // 2) Fetch a single policy by ID
  getById: `
    SELECT
      id,
      period,
      DATE_FORMAT(year_start, '%Y-%m-%d') AS year_start,
      DATE_FORMAT(year_end,   '%Y-%m-%d') AS year_end,
      leave_settings
    FROM leave_policy
    WHERE id = ?
  `,

  // 3) Insert a new policy (JSON string)
  create: `
    INSERT INTO leave_policy
      (period, year_start, year_end, leave_settings)
    VALUES (?, ?, ?, ?)
  `,

  // 4) Update an existing policy
  update: `
    UPDATE leave_policy
    SET
      period         = ?,
      year_start     = ?,
      year_end       = ?,
      leave_settings = ?
    WHERE id = ?
  `,

  // 5) Delete a policy
  remove: `
    DELETE FROM leave_policy
    WHERE id = ?
  `,

  /**
   * 6) Compute leave balance for an employee:
   *    - Explode JSON array
   *    - Sum approved days in the policy period
   *    - Calculate remaining & loss_of_pay
   */
  LEAVE_BALANCE: `
    SELECT
      js.type              AS type,
      js.enabled           AS enabled,
      COALESCE(js.value,0)           AS annual_allowance,
      COALESCE(js.working_days,0)     AS working_days_required,
      COALESCE(js.earned_leaves,0)    AS earned_leaves_granted,
      COALESCE(js.carry_forward,0)    AS carry_forward,

      IFNULL(SUM(DATEDIFF(lq.end_date, lq.start_date) + 1), 0) AS used,

      /* remaining = allowance + earned_leaves + carry_forward - used */
      (
        COALESCE(js.value,0)
        + COALESCE(js.earned_leaves,0)
        + COALESCE(js.carry_forward,0)
        - IFNULL(SUM(DATEDIFF(lq.end_date, lq.start_date) + 1),0)
      ) AS remaining,

      /* loss_of_pay = max(used - (allowance+earned+carry),0) */
      GREATEST(
        IFNULL(SUM(DATEDIFF(lq.end_date, lq.start_date) + 1),0)
        - (
            COALESCE(js.value,0)
            + COALESCE(js.earned_leaves,0)
            + COALESCE(js.carry_forward,0)
          ),
        0
      ) AS loss_of_pay

    FROM leave_policy lp

    /* Unpack JSON array into table rows */
    JOIN JSON_TABLE(
      lp.leave_settings,
      '$[*]' COLUMNS (
        type            VARCHAR(50) PATH '$.type',
        enabled         BOOLEAN      PATH '$.enabled',
        value           INT          PATH '$.value'           DEFAULT 0,
        working_days    INT          PATH '$.working_days'    DEFAULT 0,
        earned_leaves   INT          PATH '$.earned_leaves'   DEFAULT 0,
        carry_forward   INT          PATH '$.carry_forward'   DEFAULT 0
      )
    ) AS js

    LEFT JOIN leavequeries lq
      ON lq.leave_type = js.type
      AND lq.employee_id = ?
      AND lq.status = 'Approved'
      AND lq.start_date BETWEEN lp.year_start AND lp.year_end

    WHERE lp.period = 'yearly'  /* or parameterize if you wish */

    GROUP BY
      js.type, js.value, js.working_days, js.earned_leaves, js.carry_forward;
  `,

  MONTHLY_LOP: `
    SELECT 
    COALESCE(SUM(GREATEST(t.used - t.allowance, 0)), 0) AS total_lop
FROM (
    SELECT
        lq.leave_type,
        SUM(DATEDIFF(lq.end_date, lq.start_date) + 1) AS used,
        (
            COALESCE(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(
                    ls.leave_settings_json, '$.value'
                )) AS UNSIGNED),
                CAST(JSON_UNQUOTE(JSON_EXTRACT(
                    ls.leave_settings_json, '$.earned_leaves'
                )) AS UNSIGNED),
                0
            )
            +
            COALESCE(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(
                    ls.leave_settings_json, '$.carry_forward'
                )) AS UNSIGNED),
                0
            )
        ) AS allowance
    FROM leavequeries lq
    JOIN (
        SELECT 
            JSON_EXTRACT(lp.leave_settings, CONCAT(
                '$[', idx.idx, ']'
            )) AS leave_settings_json,
            JSON_UNQUOTE(JSON_EXTRACT(lp.leave_settings, CONCAT(
                '$[', idx.idx, '].type'
            ))) AS type,
            lp.year_start,
            lp.year_end
        FROM leave_policy lp
        JOIN (
            SELECT 0 AS idx UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        ) idx
    ) ls 
        ON lq.leave_type = ls.type
        AND lq.start_date BETWEEN ls.year_start AND ls.year_end
    WHERE lq.employee_id = ?
      AND lq.status = 'Approved'
      AND MONTH(lq.start_date) = ?
      AND YEAR(lq.start_date) = ?
    GROUP BY lq.leave_type, ls.leave_settings_json
) AS t;

  `,
};
