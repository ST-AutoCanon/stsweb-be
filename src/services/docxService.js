
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = require("docx");
const fs = require("fs");
const path = require("path");
const numberToWords = require("number-to-words");

exports.generateDocx = async (claim, employee) => {
    console.log("Generating DOCX for Claim:", claim);

    if (!claim || !claim.id) {
        console.error("Invalid Claim ID:", claim);
        throw new Error("Claim ID is undefined, cannot generate document.");
    }

    // ✅ Company Header
    const companyHeader = new Paragraph({
        children: [new TextRun({ text: "Sukalpa Tech Solutions Pvt Ltd.", bold: true, size: 36 })],
        alignment: "center",
        spacing: { after: 300 },
    });

    // ✅ Form Title with Claim Type Next to it
    const formTitle = new Paragraph({
        children: [
            new TextRun({ text: "Reimbursement Form", bold: true, size: 30 }),
            new TextRun({ text: " - " + claim.claim_type, bold: true, size: 30 })
        ],
        alignment: "left",
        spacing: { after: 200 },
    });

    // ✅ Employee Details in Grid Form 
    const employeeDetailsGrid = [
        new Paragraph({
            children: [
                new TextRun({ text: "Employee ID: ", bold: true }),
                new TextRun({ text: claim.employee_id + "    " }),
                new TextRun({ text: "Department: ", bold: true }),
                new TextRun({ text: employee.department_name })
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Employee Name: ", bold: true }),
                new TextRun({ text: employee.name + "    " }),
                new TextRun({ text: "Designation: ", bold: true }),
                new TextRun({ text: employee.position })
            ],
            spacing: { after: 200 },
        }),
    ];

    // ✅ Reimbursement Table Header 
    const reimbursementTableRows = [
        new TableRow({
            children: [
                new TableCell({ 
                    width: { size: 15, type: WidthType.PERCENTAGE }, 
                    children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })] 
                }),
                new TableCell({ 
                    width: { size: 50, type: WidthType.PERCENTAGE }, 
                    children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })] 
                }),
                new TableCell({ 
                    width: { size: 10, type: WidthType.PERCENTAGE }, 
                    children: [new Paragraph({ children: [new TextRun({ text: "Unit", bold: true })] })] 
                }),
                new TableCell({ 
                    width: { size: 12.5, type: WidthType.PERCENTAGE }, 
                    children: [new Paragraph({ children: [new TextRun({ text: "Price", bold: true })] })] 
                }),
                new TableCell({ 
                    width: { size: 12.5, type: WidthType.PERCENTAGE }, 
                    children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })] })] 
                }),
            ],
        }),
    ];

    const addClaimRow = (date, description, unit, price, amount) => {
        let finalUnit = unit;
        let finalPrice = price;
        let finalAmount = amount;
        // Check if description is empty or a placeholder dash.
        if (!description || description.trim() === "" || description === "-") {
            finalUnit = "";
            finalPrice = "";
            finalAmount = "";
        }
        reimbursementTableRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(date)] }),
                    new TableCell({ children: [new Paragraph(description)] }),
                    new TableCell({ children: [new Paragraph(finalUnit ? finalUnit.toString() : "")] }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun(
                                        finalPrice && !isNaN(parseFloat(finalPrice))
                                            ? `₹${parseFloat(finalPrice).toFixed(2)}`
                                            : ""
                                    )
                                ]
                            })
                        ]
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun(
                                        finalAmount && !isNaN(parseFloat(finalAmount))
                                            ? `₹${parseFloat(finalAmount).toFixed(2)}`
                                            : ""
                                    )
                                ]
                            })
                        ]
                    }),
                ],
            })
        );
    };

    // ✅ Handling Date Column for Different Claims
    let formattedDate = "-";
    if (claim.from_date && claim.to_date) {
        formattedDate = `${new Date(claim.from_date).toLocaleDateString()} - ${new Date(claim.to_date).toLocaleDateString()}`;
    } else if (claim.date) {
        formattedDate = new Date(claim.date).toLocaleDateString();
    }

    const getClaimDetails = (claim) => {
        let claimDetails = [];
    
        switch (claim.claim_type) {
            case "Transportation":
                claimDetails.push(
                    { description: "Transport Amount", value: claim.transport_amount },
                    { description: "Accomodation Fees", value: claim.accommodation_fees },
                    { description: "DA", value: claim.da }
                );
                break;
    
            case "Telecommunication":
                claimDetails.push(
                    { description: claim.service_provider, value: claim.total_amount }
                );
                break;
    
            case "Meals":
                claimDetails.push(
                    { description: claim.meal_type, value: claim.total_amount }
                );
                break;
    
            case "Stationary":
                claimDetails.push(
                    { description: claim.purpose, value: claim.stationary },
                    { description: claim.purchasing_item, value: claim.total_amount }
                );
                break;
    
            case "Miscellaneous":
                claimDetails.push(
                    { description: claim.purpose, value: claim.total_amount }
                );
                break;
    
            default:
                claimDetails.push({ description: claim.purpose, value: claim.total_amount });
                break;
        }
    
        return claimDetails;
    };
    
    // ✅ Now integrate this function in the main document generation logic
    const claimDetails = getClaimDetails(claim);
    claimDetails.forEach(({ description, value }) => {
        addClaimRow(formattedDate, description, "1", value, value);
    });
    

    // Ensure at least 8 rows for uniformity
    while (reimbursementTableRows.length < 9) {
        addClaimRow("-", "-", "1", claim.total_amount || "0", claim.total_amount || "0");
    }

    // ✅ Add Total Amount Row (adjusted column span for 5 columns)
    reimbursementTableRows.push(
        new TableRow({
            children: [
                new TableCell({ children: [], columnSpan: 3 }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Amount", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₹${claim.total_amount}`, bold: true })] })] }),
            ],
        })
    );

    // ✅ Reimbursement Table
    const reimbursementTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: reimbursementTableRows,
    });

    // Convert total amount to words
    const amountWords = numberToWords.toWords(claim.total_amount);
    const formattedAmountWords = amountWords.charAt(0).toUpperCase() + amountWords.slice(1) + " only.";

    console.log("Amount in Words:", formattedAmountWords);

    // ✅ Amount in Words in the Document
    const amountInWords = new Paragraph({
        children: [
            new TextRun({ text: `Amount In Words: ${formattedAmountWords}`, bold: true }),
        ],
        spacing: { before: 200, after: 200 },
    });

    const approvedByGrid = claim.status === "approved" ? [
        new Paragraph({
            children: [
                new TextRun({ text: "Approved By", bold: true })
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Name & Designation: ", bold: true }),
                new TextRun({ text: `${claim.approver_name} - ${claim.approver_designation}` })
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Approved Date: ", bold: true }),
                new TextRun({ text: new Date(claim.approved_date).toLocaleDateString() })
            ],
            spacing: { after: 200 },
        }),
    ] : [];  // If not approved, return an empty array
    

    // ✅ Footer Note
    const footerNote = new Paragraph({
        children: [new TextRun({ text: 'Note: "This statement affirms that all provided documents are true and correct."', italics: true })],
        alignment: "center",
        spacing: { before: 400 },
    });

    // ✅ Outer Table for Page Border
    const outerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            companyHeader,
                            formTitle,
                            ...employeeDetailsGrid,
                            reimbursementTable,
                            amountInWords,
                            ...approvedByGrid,
                            footerNote,
                        ],
                        margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }),
        ],
        borders: {
            top: { style: "single", size: 6, color: "000000" },
            bottom: { style: "single", size: 6, color: "000000" },
            left: { style: "single", size: 6, color: "000000" },
            right: { style: "single", size: 6, color: "000000" },
        },
    });

    // ✅ Document setup with adjusted margins
    const doc = new Document({
        sections: [
            {
                properties: {
                    pageSize: { width: 11906, height: 16838 },
                    pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                },
                children: [outerTable],
            },
        ],
    });

    // ✅ Save DOCX File
    const docxPath = path.join(__dirname, `../temp/Reimbursement_${claim.id}.docx`);
    console.log("Saving DOCX file to:", docxPath);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
    console.log("✅ DOCX file generated successfully!");

    return docxPath;
};
