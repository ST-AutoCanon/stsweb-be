module.exports = {
  GET_INVOICES_BY_PROJECT: `
SELECT 
  i.*,
  -- also pull the project’s payment_type for convenience
  p.payment_type,

  COALESCE((
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'id',               entry_id,
        'milestone_details',entry_label,
        'month_year',       entry_month,
        'source',           entry_source   -- NEW FLAG
      )
    )
    FROM (
      -- real milestones
      SELECT 
        m.id                 AS entry_id,
        m.milestone_details  AS entry_label,
        NULL                 AS entry_month,
        'milestone'          AS entry_source
      FROM milestones m
      JOIN add_project p2 ON p2.id = m.project_id
      WHERE m.project_id = i.projectId
        AND p2.payment_type <> 'Monthly Scheduled'

      UNION ALL

      -- financial schedule entries
      SELECT
        fd.id                AS entry_id,
        COALESCE(m2.milestone_details, 'Scheduled') AS entry_label,
        fd.month_year        AS entry_month,
        'financial'          AS entry_source
      FROM financial_details fd
      LEFT JOIN milestones m2 ON m2.id = fd.milestone_id
      JOIN add_project p2 ON p2.id = fd.project_id
      WHERE fd.project_id = i.projectId
        AND p2.payment_type = 'Monthly Scheduled'
        AND fd.month_year IS NOT NULL
    ) AS t
  ), JSON_ARRAY()) AS milestones

FROM invoices i
JOIN add_project p ON p.id = i.projectId     -- bring in payment_type
WHERE i.projectId = ?
ORDER BY i.createdAt DESC;
`,

  GET_INVOICE_BY_ID: `
SELECT 
  i.*,
  p.payment_type,

  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'id',               entry_id,
        'milestone_details',entry_label,
        'month_year',       entry_month,
        'source',           entry_source
      )
    )
    FROM (
      SELECT 
        m.id                 AS entry_id,
        m.milestone_details  AS entry_label,
        NULL                 AS entry_month,
        'milestone'          AS entry_source
      FROM milestones m
      JOIN add_project p2 ON p2.id = m.project_id
      WHERE m.project_id = i.projectId
        AND p2.payment_type <> 'Monthly Scheduled'

      UNION ALL

      SELECT
        fd.id                AS entry_id,
        COALESCE(m2.milestone_details, 'Scheduled') AS entry_label,
        fd.month_year        AS entry_month,
        'financial'          AS entry_source
      FROM financial_details fd
      LEFT JOIN milestones m2 ON m2.id = fd.milestone_id
      JOIN add_project p2 ON p2.id = fd.project_id
      WHERE fd.project_id = i.projectId
        AND p2.payment_type = 'Monthly Scheduled'
        AND fd.month_year IS NOT NULL
    ) AS t
  ) AS milestones

FROM invoices i
JOIN add_project p ON p.id = i.projectId
WHERE i.id = ?;
`,

  GET_INVOICE_COUNT_BY_DATE: `
    SELECT COUNT(*) AS count 
    FROM invoices 
    WHERE invoiceDate BETWEEN ? AND ?;
  `,
  INSERT_INVOICE: `
    INSERT INTO invoices 
      (projectId, invoiceType, invoiceDate, invoiceNo, referenceId, referenceDate, terms, lineItems, workDescription, subTotal, advance, totalExcludingTax, gst, gstAmount, totalAmount, totalIncludingTax)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `,
  UPDATE_INVOICE_BASIC: `
    UPDATE invoices SET 
      invoiceType = ?,
      invoiceDate = ?,
      invoiceNo = ?,
      referenceId = ?,
      referenceDate = ?,
      terms = ?,
      lineItems = ?,
      workDescription = ?,
      subTotal = ?,
      advance = ?,
      totalExcludingTax = ?,
      gst = ?,
      gstAmount = ?,
      totalAmount = ?,
      totalIncludingTax = ?
    WHERE id = ?;
  `,
  UPDATE_INVOICE_EXTRA: `
    UPDATE invoices SET 
      gstPayment = ?,
      milestoneId = ?,
      status = ?
    WHERE id = ?;
  `,

  GET_NEXT_SEQUENCE: `
  SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence
  FROM invoice_numbers
  WHERE invoice_type = ? AND financial_year = ?
`,
  INSERT_INITIAL_SEQUENCE: `
    INSERT INTO invoice_numbers (invoice_type, financial_year, sequence)
    VALUES (?, ?, 2)
  `,
  UPDATE_SEQUENCE: `
    UPDATE invoice_numbers 
    SET sequence = ? 
    WHERE invoice_type = ? AND financial_year = ?
  `,

  INSERT_DOWNLOAD_DETAILS: `
    INSERT INTO download_details (
      invoice_type,
      invoice_number,
      to_name,
      address,
      contact,
      company_gst,
      state,
      invoice_date,
      reference_date,
      reference_id,
      place_of_supply,
      with_seal,
      line_items,
      sub_total,
      gst,
      gst_amount,
      advance,
      total_excluding_tax,
      total_including_tax,
      terms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  GET_ALL_DOWNLOAD_DETAILS: `
    SELECT
      id,
      invoice_type         AS invoiceType,
      invoice_number       AS invoiceNumber,
      to_name              AS toName,
      address,
      contact,
      company_gst          AS companyGst,
      state,
      invoice_date         AS invoiceDate,
      reference_date       AS referenceDate,
      reference_id         AS referenceId,
      place_of_supply      AS placeOfSupply,
      with_seal            AS withSeal,
      line_items           AS lineItems,
      sub_total            AS subTotal,
      gst,
      gst_amount           AS gstAmount,
      advance,
      total_excluding_tax  AS totalExcludingTax,
      total_including_tax  AS totalIncludingTax,
      terms,
      created_at           AS createdAt
    FROM download_details
    ORDER BY created_at DESC
  `,
};
