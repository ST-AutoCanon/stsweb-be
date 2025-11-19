const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const libre = require("libreoffice-convert");
const sharp = require("sharp");
const { spawn, spawnSync } = require("child_process");

// ----------------- Helpers -----------------

async function fileExistsNonEmpty(fp) {
  try {
    const st = await fsp.stat(fp);
    return st && st.size && st.size > 0;
  } catch (e) {
    return false;
  }
}

function isSofficeAvailable() {
  try {
    const res = spawnSync("soffice", ["--version"], { encoding: "utf8" });
    return res && (res.status === 0 || (res.stdout && res.stdout.length > 0));
  } catch (e) {
    return false;
  }
}

function convertWithSoffice(docxPath, outDir) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      docxPath,
    ];
    const child = spawn("soffice", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      const pdfPath = path.join(
        outDir,
        path.basename(docxPath).replace(/\.docx$/i, ".pdf")
      );
      if (code === 0 && fs.existsSync(pdfPath)) return resolve(pdfPath);
      return reject(
        new Error(`soffice conversion failed (code=${code}) ${stderr}`)
      );
    });
  });
}

// ── Helper: extract images from a PDF attachment (best-effort) ──────────────
async function extractImagesFromPdf(pdfPath) {
  const images = [];
  try {
    const bytes = fs.readFileSync(pdfPath);
    const srcPdf = await PDFDocument.load(bytes);
    const context = srcPdf.context;

    for (const [ref, obj] of context.enumerateIndirectObjects()) {
      try {
        if (!obj || !obj.dict) continue;
        const subtype = obj.dict.get("Subtype");
        if (subtype && subtype.name === "Image") {
          const imageBytes = obj.contents;
          const filter = obj.dict.get("Filter");

          if (filter && filter.name === "DCTDecode") {
            images.push({ data: imageBytes, type: "jpg" });
          } else {
            const pngBuffer = await sharp(imageBytes).png().toBuffer();
            images.push({ data: pngBuffer, type: "png" });
          }
        }
      } catch (e) {
        // continue — some objects may not be readable
        continue;
      }
    }
  } catch (err) {
    console.warn("extractImagesFromPdf warning:", err.message);
  }
  return images; // [{ data: Buffer, type: 'png'|'jpg' }, ...]
}

// ── Helper: normalize standalone images ────────────────────────────────────
async function optimizeImageBuffer(buf) {
  return sharp(buf)
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
}

async function optimizeImageFromPath(imagePath) {
  return sharp(imagePath)
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
}

// ── Merge attachments into the PDF ─────────────────────────────────────────
async function mergeAttachments(pdfPath, attachments) {
  // Load the base PDF (converted from your DOCX)
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  for (const att of attachments) {
    try {
      if (!att.file_path || !fs.existsSync(att.file_path)) {
        console.warn("Skipping invalid attachment:", att.file_path);
        continue;
      }

      const ext = (att.file_path || "").toLowerCase().split(".").pop();

      if (ext === "pdf") {
        // Import all pages of the attached PDF
        try {
          const otherPdfBytes = fs.readFileSync(att.file_path);
          const otherPdf = await PDFDocument.load(otherPdfBytes);
          const total = otherPdf.getPageCount();
          const pages = await pdfDoc.copyPages(
            otherPdf,
            Array.from({ length: total }, (_, i) => i)
          );
          pages.forEach((page) => pdfDoc.addPage(page));
          console.log(`Imported ${total} pages from PDF: ${att.file_path}`);

          // also try to extract embedded images (best-effort) and add them as extra pages
          const imgs = await extractImagesFromPdf(att.file_path);
          for (const im of imgs) {
            try {
              const buf = await optimizeImageBuffer(im.data);
              let embedded =
                im.type === "png"
                  ? await pdfDoc.embedPng(buf)
                  : await pdfDoc.embedJpg(buf);
              const page = pdfDoc.addPage();
              const { width: pw, height: ph } = page.getSize();
              const { width: iw, height: ih } = embedded.scale(1);
              // scale to fit page with margins
              const maxW = pw - 100;
              const maxH = ph - 100;
              let drawW = iw;
              let drawH = ih;
              const ratio = Math.min(maxW / iw, maxH / ih, 1);
              drawW = iw * ratio;
              drawH = ih * ratio;
              page.drawImage(embedded, {
                x: (pw - drawW) / 2,
                y: (ph - drawH) / 2,
                width: drawW,
                height: drawH,
              });
            } catch (e) {
              // ignore image embedding failures
              continue;
            }
          }
        } catch (err) {
          console.error(
            "Failed to import PDF pages:",
            att.file_path,
            err.message || err
          );
        }
      } else if (["png", "jpg", "jpeg"].includes(ext)) {
        // Normalize and embed a standalone image
        try {
          const buf = await optimizeImageFromPath(att.file_path);
          let embedded;
          if (ext === "png") embedded = await pdfDoc.embedPng(buf);
          else embedded = await pdfDoc.embedJpg(buf);

          const page = pdfDoc.addPage();
          const { width: pw, height: ph } = page.getSize();

          // get intrinsic image size
          const { width: iw, height: ih } = embedded.scale(1);

          const maxW = pw - 100; // margins
          const maxH = ph - 100;
          const ratio = Math.min(maxW / iw, maxH / ih, 1);
          const drawW = iw * ratio;
          const drawH = ih * ratio;

          page.drawImage(embedded, {
            x: (pw - drawW) / 2,
            y: (ph - drawH) / 2,
            width: drawW,
            height: drawH,
          });

          console.log(`Embedded image: ${att.file_path}`);
        } catch (err) {
          console.error(
            "Failed to optimize/embed image:",
            att.file_path,
            err.message || err
          );
          continue;
        }
      } else {
        console.warn("Unsupported attachment type, skipping:", att.file_path);
      }
    } catch (outerErr) {
      console.warn(
        "Error processing attachment (skipping):",
        att.file_path,
        outerErr.message || outerErr
      );
      continue;
    }
  }

  // Save out the merged PDF
  const finalPdfPath = pdfPath.replace(/\.pdf$/i, "_final.pdf");
  const finalBytes = await pdfDoc.save();
  await fsp.writeFile(finalPdfPath, finalBytes);
  console.log("Final PDF with attachments saved:", finalPdfPath);
  return finalPdfPath;
}

// ── Main export: convert DOCX → PDF and merge attachments ────────────────────
exports.convertDocxToPdf = async (docxPath, claim = {}, attachments = []) => {
  console.log("Converting DOCX to PDF:", docxPath);

  if (!docxPath) throw new Error("docxPath required");
  const absDocx = path.resolve(docxPath);
  const outDir = path.dirname(absDocx);

  // 0) ensure docx exists and is non-empty
  if (!(await fileExistsNonEmpty(absDocx))) {
    throw new Error(`DOCX file missing or empty: ${absDocx}`);
  }

  const pdfPath = absDocx.replace(/\.docx$/i, ".pdf");

  // 1) Attempt conversion via libreoffice-convert
  let convertedPdfPath = null;
  try {
    const docxBuffer = await fsp.readFile(absDocx);
    if (!docxBuffer || docxBuffer.length === 0)
      throw new Error("DOCX buffer empty");

    const pdfBuffer = await new Promise((resolve, reject) => {
      // set a timeout guard in case libre stalls
      let timeout = setTimeout(
        () => reject(new Error("libre.convert timeout")),
        2 * 60 * 1000
      );
      try {
        libre.convert(docxBuffer, ".pdf", undefined, (err, done) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          resolve(done);
        });
      } catch (err) {
        clearTimeout(timeout);
        return reject(err);
      }
    });

    await fsp.writeFile(pdfPath, pdfBuffer);
    console.log("PDF conversion successful (libreoffice-convert):", pdfPath);
    convertedPdfPath = pdfPath;
  } catch (err) {
    console.warn(
      "libreoffice-convert failed:",
      err && err.message ? err.message : err
    );

    // 2) fallback to calling soffice directly if available
    if (isSofficeAvailable()) {
      try {
        const sofficePdf = await convertWithSoffice(absDocx, outDir);
        if (await fileExistsNonEmpty(sofficePdf)) {
          console.log("PDF conversion successful (soffice):", sofficePdf);
          convertedPdfPath = sofficePdf;
        }
      } catch (sErr) {
        console.error(
          "soffice fallback failed:",
          sErr && sErr.message ? sErr.message : sErr
        );
      }
    } else {
      console.error(
        "soffice is not available on PATH; please install LibreOffice."
      );
    }

    if (!convertedPdfPath) {
      throw new Error(
        `DOCX to PDF conversion failed: ${
          err && err.message ? err.message : err
        }`
      );
    }
  }

  // 3) Filter attachments to those with valid file_path
  const valid =
    attachments && Array.isArray(attachments)
      ? attachments.filter((att) => att && att.file_path)
      : [];
  if (valid.length !== (attachments || []).length) {
    console.warn(
      `Filtered out ${
        (attachments || []).length - valid.length
      } attachments without file_path`
    );
  }

  // 4) Merge if any valid attachments remain
  if (valid.length > 0) {
    try {
      return await mergeAttachments(convertedPdfPath, valid);
    } catch (mergeErr) {
      console.error(
        "mergeAttachments failed:",
        mergeErr && mergeErr.message ? mergeErr.message : mergeErr
      );
      // if merge fails, return the converted PDF (best-effort)
      return convertedPdfPath;
    }
  }

  // 5) Otherwise just return the plain PDF path
  return convertedPdfPath;
};