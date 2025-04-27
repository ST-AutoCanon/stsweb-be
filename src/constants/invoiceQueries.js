module.exports = {
  GET_INVOICES_BY_PROJECT: `
    SELECT 
      i.id,
      i.projectId,
      i.invoiceType,
      DATE_FORMAT(i.invoiceDate, '%Y-%m-%d') AS invoiceDate,
      i.invoiceNo,
      i.referenceId,
      DATE_FORMAT(i.referenceDate, '%Y-%m-%d') AS referenceDate,
      i.workDescription,
      i.subTotal,
      i.advance,
      i.totalExcludingTax,
      i.totalIncludingTax,
      i.terms,
      i.lineItems,
      i.gst,
      i.gstAmount,
      i.totalAmount,
      i.createdAt,
      i.updatedAt,
      i.gstPayment,
      i.milestoneId,
      i.status,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', m.id, 
            'milestone_details', m.milestone_details,
            'month_year', fd.month_year
          )
        )
        FROM milestones m 
        LEFT JOIN financial_details fd ON fd.milestone_id = m.id
        WHERE m.project_id = i.projectId
      ) AS milestones
    FROM invoices i
    WHERE i.projectId = ?
    ORDER BY i.createdAt DESC;
  `,

  GET_INVOICE_BY_ID: `
    SELECT 
      i.id,
      i.projectId,
      i.invoiceType,
      DATE_FORMAT(i.invoiceDate, '%Y-%m-%d') AS invoiceDate,
      i.invoiceNo,
      i.referenceId,
      DATE_FORMAT(i.referenceDate, '%Y-%m-%d') AS referenceDate,
      i.workDescription,
      i.subTotal,
      i.advance,
      i.totalExcludingTax,
      i.totalIncludingTax,
      i.terms,
      i.lineItems,
      i.gst,
      i.gstAmount,
      i.totalAmount,
      i.createdAt,
      i.updatedAt,
      i.gstPayment,
      i.milestoneId,
      i.status,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', m.id, 
            'milestone_details', m.milestone_details,
            'month_year', fd.month_year
          )
        )
        FROM milestones m 
        LEFT JOIN financial_details fd ON fd.milestone_id = m.id
        WHERE m.project_id = i.projectId
      ) AS milestones
    FROM invoices i
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
