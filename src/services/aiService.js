// backend/services/aiService.js
const axios = require("axios");

const AI_BASE = process.env.AI_SERVICE_URL;

async function rewriteText(rawText) {
  const resp = await axios.post(`${AI_BASE}/rewrite`, { text: rawText });
  return resp.data.text;
}

async function summarizeMeeting({
  client_company,
  contact_person,
  purpose_key_points,
  follow_up_date,
}) {
  const isoDate = new Date(follow_up_date).toISOString();
  const resp = await axios.post(`${AI_BASE}/summarize`, {
    client_company,
    contact_person,
    purpose_key_points,
    follow_up_date: isoDate,
  });
  return resp.data.summary;
}

async function extractMeetingFields(rawText) {
  // 1) Try LLM JSON extraction
  try {
    const resp = await axios.post(`${AI_BASE}/scan-extract`, { text: rawText });
    if (resp.data.success && resp.data.fields) {
      return resp.data.fields;
    }
    throw new Error("AI JSON parse failed");
  } catch (e) {
    console.warn(
      "[extractMeetingFields] LLM extract failed, falling back:",
      e.message
    );
  }

  // 2) Fallback: regexes on the raw OCR text
  const text = rawText.replace(/\r\n/g, "\n"); // normalize newlines

  // client company = first non-empty line
  const [client_company] = text.split("\n").filter((l) => l.trim());

  // contact person = line after the company name
  const contact_person = (
    text.split("\n").filter((l) => l.trim())[1] || ""
  ).trim();

  // purpose = between "Meeting Purpose" and "Action Points"
  const purposeMatch = text.match(
    /Meeting Purpose(?: & Key Points)?:\s*([\s\S]*?)(?=Action Points:)/i
  );
  const purpose = (purposeMatch?.[1] || "").trim().replace(/^[\*\-\s]+/gm, "");

  // action points = between "Action Points" and "Assigned To"
  const apMatch = text.match(/Action Points:\s*([\s\S]*?)(?=Assigned To:)/i);
  const key_points = (apMatch?.[1] || "")
    .trim()
    .replace(/^\d+\.\s*/gm, "") // drop leading numbers
    .replace(/\n+/g, " "); // collapse newlines

  // assigned_to
  const atMatch = text.match(/Assigned To:\s*([^\n]+)/i);
  const assigned_to = (atMatch?.[1] || "").trim();

  // follow_up_date
  const fudMatch = text.match(/Follow[- ]?Up Date:\s*([^\n]+)/i);
  const follow_up_date = (fudMatch?.[1] || "").trim();

  return {
    client_company,
    contact_person,
    purpose,
    description: "", // leave blank
    key_points,
    assigned_to,
    follow_up_date,
  };
}

module.exports = {
  rewriteText,
  summarizeMeeting,
  extractMeetingFields,
};
