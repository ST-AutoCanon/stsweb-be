const letterService = require("../services/letterServices");

const validLetterTypes = ['Offer Letter', 'Relieving Letter', 'Bank Details Request Letter', 'Letter'];

const addLetterHandler = async (req, res) => {
  try {
    const {
      letter_type,
      recipient_name,
      address,
      date,
      subject,
      employee_name,
      position,
      effective_date,
      signature,
      content,
    } = req.body;

    const pdf_path = req.file ? req.file.path : null;

    if (!letter_type || !validLetterTypes.includes(letter_type)) {
      return res.status(400).json({ error: "Invalid or missing letter type" });
    }

    const latestLetterId = await letterService.getLatestLetterId();
    let letter_id = "STSLHT001";
    if (latestLetterId) {
      const number = parseInt(latestLetterId.replace("STSLHT", ""), 10) + 1;
      letter_id = `STSLHT${String(number).padStart(3, '0')}`;
    }

    const letterData = [
      letter_id,
      letter_type,
      recipient_name || null,
      address || null,
      date || null,
      subject || null,
      employee_name || null,
      position || null,
      effective_date || null,
      signature || null,
      content || null,
      pdf_path,
    ];

    const result = await letterService.insertLetter(letterData);
    res.status(201).json({ message: "Letter added successfully", letter_id, result });
  } catch (error) {
    console.error("Error in addLetterHandler:", error.message, error.stack);
    res.status(500).json({ error: "Failed to add letter", details: error.message });
  }
};

const updateLetterHandler = async (req, res) => {
  try {
    const letterId = req.params.id;
    if (!letterId || !letterId.startsWith("STSLHT")) {
      return res.status(400).json({ error: "Invalid letter ID" });
    }

    const {
      letter_type,
      recipient_name,
      address,
      date,
      subject,
      employee_name,
      position,
      effective_date,
      signature,
      content,
    } = req.body;

    const pdf_path = req.file ? req.file.path : null;

    if (!letter_type || !validLetterTypes.includes(letter_type)) {
      return res.status(400).json({ error: "Invalid or missing letter type" });
    }

    const letterData = [
      letter_type,
      recipient_name || null,
      address || null,
      date || null,
      subject || null,
      employee_name || null,
      position || null,
      effective_date || null,
      signature || null,
      content || null,
      pdf_path,
    ];

    const result = await letterService.updateLetterById(letterData, letterId);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Letter not found" });
    }

    res.status(200).json({ message: "Letter updated successfully", result });
  } catch (error) {
    console.error("Error in updateLetterHandler:", error.message, error.stack);
    res.status(500).json({ error: "Failed to update letter", details: error.message });
  }
};

const getAllLettersHandler = async (req, res) => {
  try {
    const letters = await letterService.getAllLetters();
    res.status(200).json({ success: true, data: letters });
  } catch (error) {
    console.error("Error in getAllLettersHandler:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Error fetching letters", details: error.message });
  }
};

const getLetterByIdHandler = async (req, res) => {
  try {
    const letterId = req.params.id;
    const letter = await letterService.getLetterById(letterId);
    if (!letter) {
      return res.status(404).json({ error: "Letter not found" });
    }
    res.status(200).json({ success: true, data: letter });
  } catch (error) {
    console.error("Error in getLetterByIdHandler:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Error fetching letter", details: error.message });
  }
};

const getLatestLetterIdHandler = async (req, res) => {
  try {
    const latestLetterId = await letterService.getLatestLetterId();
    res.status(200).json({ success: true, data: { letter_id: latestLetterId || null } });
  } catch (error) {
    console.error("Error in getLatestLetterIdHandler:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Error fetching latest letter ID", details: error.message });
  }
};

module.exports = {
  addLetterHandler,
  updateLetterHandler,
  getAllLettersHandler,
  getLetterByIdHandler,
  getLatestLetterIdHandler,
};