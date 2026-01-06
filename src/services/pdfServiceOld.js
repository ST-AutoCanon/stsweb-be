// src/services/pdfService.js

const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const libre = require("libreoffice-convert");
const sharp = require("sharp");

/**
 * Helpers
 */
const existsAndNotEmpty = (p) => {
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
};

const promisifiedExecFile = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        const e = new Error(
          `execFile error: ${err.message}. stdout:${String(stdout).slice(
            0,
            400
          )} stderr:${String(stderr).slice(0, 400)}`
        );
        e.stdout = stdout;
        e.stderr = stderr;
        return reject(e);
      }
      resolve({ stdout, stderr });
    });
  });

// ── Helper: extract images from a PDF attachment ─────────────────────────────
async function extractImagesFromPdf(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const srcPdf = await PDFDocument.load(bytes);
  const context = srcPdf.context;
  const images = [];

  // pdf-lib internals: iterate indirect objects to find image streams
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!obj || !obj.dict) continue;
    const subtype = obj.dict.get("Subtype");
    if (subtype && subtype.name === "Image") {
      const imageBytes = obj.contents;
      const filter = obj.dict.get("Filter");

      if (filter && filter.name === "DCTDecode") {
        // JPEG image stream
        images.push({ data: imageBytes, type: "jpg" });
      } else {
        // Other (likely PNG or raw); normalize to PNG via Sharp
        const pngBuffer = await sharp(imageBytes).png().toBuffer();
        images.push({ data: pngBuffer, type: "png" });
      }
    }
  }

  return images; // [{ data: Buffer, type: "png"|"jpg" }, ...]
}

// ── Helper: normalize standalone images ───────────────────────────────────────
async function optimizeImage(imagePath) {
  return sharp(imagePath)
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
}

// ── Merge attachments into the PDF (your existing logic, preserved) ──────────
async function mergeAttachments(pdfPath, attachments) {
  // Load the base PDF (converted from your DOCX)
  const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));

  for (const att of attachments) {
    if (!att.file_path || !fs.existsSync(att.file_path)) {
      console.warn("Skipping invalid attachment:", att.file_path);
      continue;
    }

    const ext = att.file_path.toLowerCase().split(".").pop();

    if (ext === "pdf") {
      // Import all pages of the attached PDF
      try {
        const otherPdfBytes = fs.readFileSync(att.file_path);
        const otherPdf = await PDFDocument.load(otherPdfBytes);
        const total = otherPdf.getPageCount();
        const pages = await pdfDoc.copyPages(otherPdf, [
          ...Array(total).keys(),
        ]);
        pages.forEach((page) => pdfDoc.addPage(page));
        console.log(`Imported ${total} pages from PDF: ${att.file_path}`);
      } catch (err) {
        console.error("Failed to import PDF pages:", att.file_path, err);
      }
    } else if (["png", "jpg", "jpeg"].includes(ext)) {
      // Normalize and embed a standalone image
      let buffer;
      try {
        buffer = await optimizeImage(att.file_path);
      } catch (err) {
        console.error("Failed to optimize image:", att.file_path, err);
        continue;
      }

      let embedded;
      try {
        if (ext === "png") embedded = await pdfDoc.embedPng(buffer);
        else embedded = await pdfDoc.embedJpg(buffer);
      } catch (embedErr) {
        console.error("Failed to embed image:", att.file_path, embedErr);
        continue;
      }

      // Add a page sized to A4-ish (you can tweak)
      const page = pdfDoc.addPage([595, 842]);
      // Fit the image inside the page with margins
      const maxW = 500;
      const maxH = 700;
      page.drawImage(embedded, { x: 50, y: 50, width: maxW, height: maxH });
      console.log(`Embedded image: ${att.file_path}`);
    } else {
      console.warn("Unsupported attachment type, skipping:", att.file_path);
    }
  }

  // Save out the merged PDF
  const finalPdfPath = pdfPath.replace(/\.pdf$/i, "_final.pdf");
  fs.writeFileSync(finalPdfPath, await pdfDoc.save());
  console.log("Final PDF with attachments saved:", finalPdfPath);
  return finalPdfPath;
}

// ── Convert DOCX -> PDF using soffice first, then fallback to libre.convert ──
async function convertDocxToPdfWithSoffice(docxPath) {
  if (!docxPath || !fs.existsSync(docxPath)) {
    throw new Error("DOCX not found: " + docxPath);
  }

  const outDir = path.dirname(docxPath);
  const baseName = path.basename(docxPath, path.extname(docxPath));
  const pdfPath = path.join(outDir, `${baseName}.pdf`);

  // Try soffice CLI first
  const sofficePath = process.env.SOFFICE_PATH || "soffice";
  const args = [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    docxPath,
  ];

  try {
    console.info("Attempting soffice conversion:", sofficePath, args.join(" "));
    await promisifiedExecFile(sofficePath, args, {
      maxBuffer: 1024 * 1024 * 50,
    });
    // verify result
    if (existsAndNotEmpty(pdfPath)) {
      console.info("soffice conversion produced PDF:", pdfPath);
      return pdfPath;
    }
    throw new Error(
      `soffice did not produce output or produced empty PDF at ${pdfPath}`
    );
  } catch (soErr) {
    console.warn(
      "soffice conversion failed, falling back to buffer conversion. Reason:",
      soErr.message
    );
    // fall through to buffer fallback
  }

  // Fallback using libreoffice-convert (buffer method)
  try {
    const docxBuffer = fs.readFileSync(docxPath);
    const converted = await new Promise((resolve, reject) => {
      libre.convert(docxBuffer, ".pdf", undefined, (err, done) => {
        if (err) return reject(err);
        resolve(done);
      });
    });
    fs.writeFileSync(pdfPath, converted);
    if (!existsAndNotEmpty(pdfPath)) {
      throw new Error("Fallback conversion produced empty PDF at " + pdfPath);
    }
    console.info("Fallback buffer conversion successful:", pdfPath);
    return pdfPath;
  } catch (fallbackErr) {
    const message = `Both soffice and fallback conversion failed: ${
      fallbackErr.message || fallbackErr
    }`;
    console.error(message);
    throw new Error(message);
  }
}

// ── Main export: convert DOCX → PDF and merge attachments ────────────────────
exports.convertDocxToPdf = async (docxPath, claim, attachments = []) => {
  console.log("Converting DOCX to PDF:", docxPath);

  // 1) DOCX → PDF (soffice preferred)
  let pdfPath;
  try {
    pdfPath = await convertDocxToPdfWithSoffice(docxPath);
  } catch (err) {
    console.error("Error during DOCX to PDF conversion:", err);
    // rethrow so caller/handler returns a 500 and you don't send a DOCX as .pdf
    throw err;
  }

  // 2) Filter attachments to those with valid file_path
  const valid = (attachments || []).filter(
    (att) => att && att.file_path && fs.existsSync(att.file_path)
  );
  if (valid.length !== (attachments || []).length) {
    console.warn(
      `Filtered out ${
        (attachments || []).length - valid.length
      } attachments without file_path or missing files`
    );
  }

  // 3) Merge if any valid attachments remain
  if (valid.length > 0) {
    try {
      const merged = await mergeAttachments(pdfPath, valid);
      // if merge returns final file, ensure exists & non-empty
      if (merged && existsAndNotEmpty(merged)) {
        return merged;
      } else {
        console.warn(
          "mergeAttachments did not produce a non-empty file; returning original PDF"
        );
        return pdfPath;
      }
    } catch (merr) {
      console.error("Error merging attachments, returning base PDF:", merr);
      // Return base PDF (it is valid at this stage) — but you can choose to throw instead
      return pdfPath;
    }
  }

  // 4) Otherwise just return the plain PDF
  return pdfPath;
};
