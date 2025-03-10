const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");
const sharp = require("sharp");

exports.convertDocxToPdf = async (docxPath, claim, attachments = []) => {
    console.log("Converting DOCX to PDF:", docxPath);
    const pdfPath = docxPath.replace(".docx", ".pdf");

    try {
        const docxBuffer = fs.readFileSync(docxPath);

        const pdfBuffer = await new Promise((resolve, reject) => {
            libre.convert(docxBuffer, ".pdf", undefined, (err, done) => {
                if (err) return reject(err);
                resolve(done);
            });
        });

        fs.writeFileSync(pdfPath, pdfBuffer);
        console.log("PDF conversion successful:", pdfPath);
    } catch (error) {
        console.error("Error during DOCX to PDF conversion:", error);
        throw error;
    }

    if (attachments.length > 0) {
        return await mergeAttachments(pdfPath, attachments);
    }

    return pdfPath;
};

// ✅ Optimize image size
async function optimizeImage(imagePath) {
    return await sharp(imagePath)
        .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
}

// ✅ Merge attachments into the final PDF
async function mergeAttachments(pdfPath, attachments) {
    try {
        const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));

        for (const att of attachments) {
            if (!fs.existsSync(att.file_path)) continue;

            const optimizedImage = await optimizeImage(att.file_path);
            let image = att.file_path.endsWith(".png")
                ? await pdfDoc.embedPng(optimizedImage)
                : await pdfDoc.embedJpg(optimizedImage);

            const page = pdfDoc.addPage([595, 842]); // A4 size in points
            page.drawImage(image, { x: 50, y: 50, width: 500, height: 700 });
        }

        const finalPdfPath = pdfPath.replace(".pdf", "_final.pdf");
        fs.writeFileSync(finalPdfPath, await pdfDoc.save());
        console.log("Final PDF with attachments saved:", finalPdfPath);

        return finalPdfPath;
    } catch (error) {
        console.error("Error merging attachments:", error);
        throw error;
    }
};
