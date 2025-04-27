const db = require("../config");
const invoiceQueries = require("../constants/invoiceQueries");
const projectService = require("./projectService");

const getFinancialYear = (invoiceDate) => {
  const dateObj = new Date(invoiceDate);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  const fy = `${String(startYear).slice(2)}-${String(endYear).slice(2)}`;

  console.log("Financial Year (Raw):", fy);

  return fy
    .normalize("NFKD")
    .replace(/[^\d-]/g, "")
    .trim(); // ensures clean ASCII
};

const getInvoicesByProject = async (projectId) => {
  try {
    const [results] = await db.execute(invoiceQueries.GET_INVOICES_BY_PROJECT, [
      projectId,
    ]);

    const parsedResults = results.map((invoice) => {
      if (invoice.lineItems && typeof invoice.lineItems === "string") {
        try {
          invoice.lineItems = JSON.parse(invoice.lineItems);
        } catch (err) {
          console.warn(
            `Error parsing lineItems for invoice ${invoice.id}:`,
            err
          );
          invoice.lineItems = [];
        }
      }
      return invoice;
    });

    return parsedResults;
  } catch (err) {
    throw err;
  }
};

const getInvoiceById = async (id) => {
  try {
    const [results] = await db.execute(invoiceQueries.GET_INVOICE_BY_ID, [id]);
    if (!results || results.length === 0) {
      throw new Error(`Invoice with ID ${id} not found`);
    }
    const invoice = results[0];

    if (invoice.invoiceDate) {
      invoice.invoiceDate = new Date(invoice.invoiceDate)
        .toISOString()
        .split("T")[0];
    }

    if (invoice.lineItems && typeof invoice.lineItems === "string") {
      try {
        invoice.lineItems = JSON.parse(invoice.lineItems);
      } catch (error) {
        console.warn("Error parsing lineItems JSON:", error);
        invoice.lineItems = [];
      }
    }

    return invoice;
  } catch (err) {
    throw err;
  }
};

const generateTemplateInvoiceNo = async (invoiceType) => {
  const today = new Date();
  const financialYear = getFinancialYear(today);

  const connection = await db.getConnection();
  try {
    const [existing] = await connection.execute(
      invoiceQueries.GET_NEXT_SEQUENCE,
      [invoiceType, financialYear]
    );

    const sequence = existing[0]?.next_sequence || 1;
    const paddedSeq = String(sequence).padStart(4, "0");

    if (invoiceType === "tax") {
      return `STS/${financialYear}/${paddedSeq}`;
    } else if (invoiceType === "proforma") {
      return `STS/${financialYear}/PI/${paddedSeq}`;
    } else if (invoiceType === "quotation") {
      return `STS-Q-${paddedSeq}`;
    } else {
      throw new Error("Unknown invoice type");
    }
  } finally {
    connection.release();
  }
};

const generateInvoiceNo = async (invoiceDate, invoiceType) => {
  const financialYear = getFinancialYear(invoiceDate);
  const connection = await db.getConnection();

  try {
    const [existing] = await connection.execute(
      invoiceQueries.GET_NEXT_SEQUENCE,
      [invoiceType, financialYear]
    );

    let sequence = existing[0]?.next_sequence || 1;

    if (existing.length > 0) {
      await connection.execute(invoiceQueries.UPDATE_SEQUENCE, [
        sequence + 1,
        invoiceType,
        financialYear,
      ]);
    } else {
      await connection.execute(invoiceQueries.INSERT_INITIAL_SEQUENCE, [
        invoiceType,
        financialYear,
      ]);
    }

    const paddedSeq = String(sequence).padStart(4, "0");

    if (invoiceType === "tax") {
      return `STS/${financialYear}/${paddedSeq}`;
    } else if (invoiceType === "proforma") {
      return `STS/${financialYear}/PI/${paddedSeq}`;
    } else if (invoiceType === "quotation") {
      return `STS-Q-${paddedSeq}`;
    } else {
      throw new Error("Unknown invoice type");
    }
  } finally {
    connection.release();
  }
};

const createInvoice = async (invoiceData) => {
  const connection = await db.getConnection();

  try {
    console.log("Generating Invoice Number...");
    const invoiceNo = await generateInvoiceNo(
      invoiceData.invoiceDate,
      invoiceData.invoiceType
    );
    console.log("Generated Invoice No:", invoiceNo);

    const [results] = await connection.execute(invoiceQueries.INSERT_INVOICE, [
      invoiceData.projectId,
      invoiceData.invoiceType,
      invoiceData.invoiceDate,
      invoiceNo,
      invoiceData.referenceId,
      invoiceData.referenceDate,
      invoiceData.terms,
      JSON.stringify(invoiceData.lineItems),
      invoiceData.workDescription,
      invoiceData.subTotal,
      invoiceData.advance,
      invoiceData.totalExcludingTax,
      invoiceData.gst,
      invoiceData.gstAmount,
      invoiceData.totalAmount,
      invoiceData.totalIncludingTax,
    ]);

    if (!results.insertId) {
      throw new Error("No insertId returned! Possible issue with the query.");
    }

    const invoice = await getInvoiceById(results.insertId);
    return invoice;
  } catch (err) {
    console.error("createInvoice error:", err);
    throw err;
  } finally {
    connection.release();
  }
};

const updateInvoice = async (id, invoiceData) => {
  const formattedInvoiceDate = invoiceData.invoiceDate
    ? new Date(invoiceData.invoiceDate).toISOString().split("T")[0]
    : null;
  const formattedReferenceDate = invoiceData.referenceDate
    ? new Date(invoiceData.referenceDate).toISOString().split("T")[0]
    : null;

  const basicValues = [
    invoiceData.invoiceType,
    formattedInvoiceDate,
    invoiceData.invoiceNo,
    invoiceData.referenceId,
    formattedReferenceDate,
    invoiceData.terms,
    JSON.stringify(invoiceData.lineItems),
    invoiceData.workDescription,
    invoiceData.subTotal,
    invoiceData.advance,
    invoiceData.totalExcludingTax,
    invoiceData.gst,
    invoiceData.gstAmount,
    invoiceData.totalAmount,
    invoiceData.totalIncludingTax,
    id,
  ];

  const [basicResults] = await db.execute(
    invoiceQueries.UPDATE_INVOICE_BASIC,
    basicValues
  );
  console.log("Basic invoice update executed. Results:", basicResults);

  return await getInvoiceById(id);
};

const updateInvoiceExtra = async (id, invoiceData) => {
  const formattedInvoiceDate = invoiceData.invoiceDate
    ? new Date(invoiceData.invoiceDate).toISOString().split("T")[0]
    : null;
  const formattedReferenceDate = invoiceData.referenceDate
    ? new Date(invoiceData.referenceDate).toISOString().split("T")[0]
    : null;
  const basicValues = [
    invoiceData.invoiceType,
    formattedInvoiceDate,
    invoiceData.invoiceNo,
    invoiceData.referenceId,
    formattedReferenceDate,
    invoiceData.terms,
    JSON.stringify(invoiceData.lineItems),
    invoiceData.workDescription,
    invoiceData.subTotal,
    invoiceData.advance,
    invoiceData.totalExcludingTax,
    invoiceData.gst,
    invoiceData.gstAmount,
    invoiceData.totalAmount,
    invoiceData.totalIncludingTax,
    id,
  ];
  await db.execute(invoiceQueries.UPDATE_INVOICE_BASIC, basicValues);

  const extraValues = [
    invoiceData.gstPayment,
    invoiceData.milestoneId,
    invoiceData.status,
    id,
  ];
  const [extraResults] = await db.execute(
    invoiceQueries.UPDATE_INVOICE_EXTRA,
    extraValues
  );
  console.log("Extra invoice fields updated. Results:", extraResults);

  if (
    invoiceData.gstPayment === "Completed" &&
    invoiceData.milestoneId &&
    invoiceData.projectId
  ) {
    const financialUpdateData = {
      project_id: Number(invoiceData.projectId),
      milestone_id: Number(invoiceData.milestoneId),
      m_actual_amount: invoiceData.totalExcludingTax,
      m_tds_percentage: null,
      m_tds_amount: invoiceData.tdsAmount || 0,
      m_gst_percentage: invoiceData.gst,
      m_gst_amount: invoiceData.gstAmount,
      m_total_amount: invoiceData.totalIncludingTax,
    };
    console.log("Mapping financial details update data:", financialUpdateData);
    await projectService.updateFinancialDetailsForInvoice(financialUpdateData);
    console.log("Financial details update executed successfully.");
  } else {
    console.log(
      "Skipping financial details update due to missing required fields."
    );
  }

  return await getInvoiceById(id);
};

const updateSequence = async (invoiceType) => {
  const connection = await db.getConnection();
  try {
    console.log(
      "[updateSequence] Starting updateSequence for invoiceType:",
      invoiceType
    );

    const today = new Date();
    const financialYear = getFinancialYear(today);
    console.log("[updateSequence] Financial Year (Raw):", financialYear);

    const cleanedFinancialYear = financialYear.trim();
    console.log(
      "[updateSequence] Cleaned Financial Year:",
      cleanedFinancialYear
    );

    console.log(
      "[updateSequence] Cleaned Financial Year Length:",
      cleanedFinancialYear.length
    );

    const cleanInvoiceType = invoiceType.toString().trim().toLowerCase();
    console.log("[updateSequence] Cleaned Invoice Type:", cleanInvoiceType);

    console.log("[updateSequence] Fetching next available sequence...");
    const [existing] = await connection.execute(
      invoiceQueries.GET_NEXT_SEQUENCE,
      [cleanInvoiceType, cleanedFinancialYear]
    );

    if (existing.length === 0) {
      console.log(
        "[updateSequence] No existing sequence found, inserting initial sequence."
      );
    } else {
      console.log(
        "[updateSequence] Existing sequence found:",
        existing[0]?.next_sequence || 1
      );
    }

    const nextSequence = existing[0]?.next_sequence || 1;
    console.log("[updateSequence] Next Sequence: ", nextSequence);

    console.log("[updateSequence] Updating sequence in the database...");
    const [updateResult] = await connection.execute(
      invoiceQueries.UPDATE_SEQUENCE,
      [nextSequence, cleanInvoiceType, cleanedFinancialYear]
    );

    console.log("[updateSequence] Sequence update result:", updateResult);

    if (updateResult.affectedRows === 0) {
      console.log(
        "[updateSequence] Affected rows is 0, inserting initial sequence..."
      );
      await connection.execute(invoiceQueries.INSERT_INITIAL_SEQUENCE, [
        cleanInvoiceType,
        cleanedFinancialYear,
        nextSequence,
      ]);
      console.log("[updateSequence] Initial sequence inserted.");

      console.log(
        "[updateSequence] Now updating the sequence after initial insertion..."
      );
      await connection.execute(invoiceQueries.UPDATE_SEQUENCE, [
        nextSequence,
        cleanInvoiceType,
        cleanedFinancialYear,
      ]);
      console.log("[updateSequence] Sequence updated after insertion.");
    }

    return { updatedSequence: nextSequence };
  } catch (err) {
    console.error("[updateSequence] Error:", err);
    throw new Error("Failed to update sequence: " + err.message);
  } finally {
    console.log("[updateSequence] Releasing connection.");
    connection.release();
  }
};

async function recordDownloadDetails(invoiceType, invoiceNumber, details) {
  const {
    to,
    address,
    contact,
    companyGst,
    state,
    invoiceDate,
    referenceDate,
    referenceId,
    placeOfSupply,
    withSeal,
    lineItems,
    subTotal,
    gst,
    gstAmount,
    advance,
    totalExcludingTax,
    totalIncludingTax,
    terms,
  } = details;

  const params = [
    invoiceType,
    invoiceNumber,
    to,
    address,
    contact,
    companyGst,
    state,
    invoiceDate,
    referenceDate,
    referenceId,
    placeOfSupply,
    withSeal ? 1 : 0,
    JSON.stringify(lineItems),
    subTotal,
    gst,
    gstAmount,
    advance,
    totalExcludingTax,
    totalIncludingTax,
    terms,
  ];

  const [res] = await db.execute(
    invoiceQueries.INSERT_DOWNLOAD_DETAILS,
    params
  );
  return { id: res.insertId };
}

async function getAllDownloadDetails() {
  const [rows] = await db.execute(invoiceQueries.GET_ALL_DOWNLOAD_DETAILS);
  return rows.map((r) => {
    if (r.lineItems && typeof r.lineItems === "string") {
      try {
        r.lineItems = JSON.parse(r.lineItems);
      } catch {
        r.lineItems = [];
      }
    }
    return r;
  });
}

module.exports = {
  getInvoicesByProject,
  createInvoice,
  updateInvoice,
  getInvoiceById,
  generateTemplateInvoiceNo,
  updateSequence,
  updateInvoiceExtra,
  recordDownloadDetails,
  getAllDownloadDetails,
};
