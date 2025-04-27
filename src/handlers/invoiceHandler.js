const invoiceService = require("../services/invoiceService");

// GET /invoices?projectId=...
const getInvoices = async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }
  try {
    const invoices = await invoiceService.getInvoicesByProject(projectId);
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /invoices
const createInvoice = async (req, res) => {
  console.log("Reached createInvoice handler");
  const invoiceData = req.body;
  console.log("invoice data", invoiceData);

  if (!invoiceData.projectId || !invoiceData.invoiceDate) {
    return res
      .status(400)
      .json({ error: "projectId and invoiceDate are required" });
  }

  try {
    const invoice = await invoiceService.createInvoice(invoiceData);
    console.log("Invoice created:", invoice);
    res.status(201).json(invoice);
  } catch (error) {
    console.error("createInvoice error", error);
    res.status(500).json({ error: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const updatedInvoice = await invoiceService.updateInvoice(
      req.params.id,
      req.body
    );
    res.json(updatedInvoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateInvoiceExtra = async (req, res) => {
  try {
    const invoiceData = req.body;
    console.log("Received invoice update body:", invoiceData);

    const updatedInvoice = await invoiceService.updateInvoiceExtra(
      req.params.id,
      invoiceData
    );

    res.json(updatedInvoice);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const generateTemplateInvoice = async (req, res) => {
  const { invoiceType } = req.query;
  console.log(req.query);
  if (!invoiceType) {
    return res.status(400).json({ error: "invoiceType is required" });
  }
  try {
    const invoiceNo = await invoiceService.generateTemplateInvoiceNo(
      invoiceType
    );
    res.json({ invoiceNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateInvoiceSequence = async (req, res) => {
  // invoiceType comes from the route parameter. Example: "tax", "proforma", "quotation"
  const { invoiceType } = req.params;
  if (!invoiceType) {
    return res.status(400).json({ error: "invoiceType is required" });
  }

  try {
    // Call the service to update the sequence for today's financial year
    const result = await invoiceService.updateSequence(invoiceType);
    res.json({ message: "Sequence updated successfully", ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const recordDownloadDetails = async (req, res, next) => {
  try {
    const { invoiceType, invoiceNumber, downloadDetails } = req.body;
    if (!invoiceType || !invoiceNumber || !downloadDetails) {
      return res.status(400).json({
        error: "invoiceType, invoiceNumber and downloadDetails are required",
      });
    }

    const record = await invoiceService.recordDownloadDetails(
      invoiceType,
      invoiceNumber,
      downloadDetails
    );

    res.status(201).json({ success: true, id: record.id });
  } catch (err) {
    next(err);
  }
};

const getDownloadDetails = async (req, res, next) => {
  try {
    const downloadDetails = await invoiceService.getAllDownloadDetails();
    res.json({ downloadDetails });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  updateInvoice,
  generateTemplateInvoice,
  updateInvoiceSequence,
  updateInvoiceExtra,
  recordDownloadDetails,
  getDownloadDetails,
};
