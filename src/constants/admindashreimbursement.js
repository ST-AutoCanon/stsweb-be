module.exports = {
  GET_APPROVED_REIMBURSEMENT_LAST_MONTH: `
    SELECT 
      COALESCE(SUM(aggregated_total), 0) 
        AS total_approved_reimbursement_last_month
    FROM reimbursement
    WHERE approved_date IS NOT NULL
      AND YEAR(approved_date) = YEAR(CURRENT_DATE - INTERVAL 2 MONTH)
      AND MONTH(approved_date) = MONTH(CURRENT_DATE - INTERVAL 2 MONTH)
      AND LOWER(status) = 'approved'
  `,
};
