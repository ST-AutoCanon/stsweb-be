

// const cron = require("node-cron");
// const axios = require("axios");
// const ExcelJS = require("exceljs");

// const nodemailer = require("nodemailer");
// const fs = require("fs");
// const path = require("path");
// require("dotenv").config();

// const API_KEY = process.env.X_API_KEY;
// const EMAIL_USER = process.env.EMAIL_USER;
// const EMAIL_PASS = process.env.EMAIL_PASS;

// // Helper function to normalize a date to midnight
// const normalizeDateToMidnight = (date) => {
//   const newDate = new Date(date);
//   newDate.setHours(0, 0, 0, 0);
//   return newDate;
// };

// // Function to normalize a date string into YYYY-MM-DD
// function normalizeDate(dateString) {
//   return new Date(dateString).toISOString().slice(0, 10);
// }

// // Function to send attendance report
// async function sendAttendanceReport(startDate, endDate, label = "") {
//   try {
//     console.log(`📩 Sending attendance report for ${label} (${startDate} to ${endDate})...`);

//     const headers = { "Content-Type": "application/json", "x-api-key": API_KEY };

//     const [missingPunchInRes, punchInOnlyRes, workedLessRes, worked8to10Res,approvedLeavesRes,] = await Promise.all([
//       axios.get(`http://localhost:5000/admin/attendance/missing-punch-in?start=${startDate}&end=${endDate}`, { headers }),
//       axios.get(`http://localhost:5000/admin/attendance/punch-in-not-punched-out?start=${startDate}&end=${endDate}`, { headers }),
//       axios.get(`http://localhost:5000/admin/attendance/worked-less-than-8-hours?start=${startDate}&end=${endDate}`, { headers }),
//       axios.get(`http://localhost:5000/admin/attendance/worked-8-to-10-hours?start=${startDate}&end=${endDate}`, { headers }),
//       axios.get(`http://localhost:5000/admin-attendance/approved-leaves-current-month`, { headers }),  // 🆕 added this

//     ]);

//     const missingPunchIn = missingPunchInRes?.data?.data || [];
//     const punchInOnly = punchInOnlyRes?.data?.data || [];
//     const workedLess = workedLessRes?.data?.data || [];
//     const worked8to10 = worked8to10Res?.data?.data || [];
//     const approvedLeaves = approvedLeavesRes?.data?.data || [];

//     const workbook = new ExcelJS.Workbook();

//     // Sheet 1: Missing Punch-in
//     const sheet1 = workbook.addWorksheet("Missing Punch-in", {
//       properties: { tabColor: { argb: 'FFFFFF00' } } // Yellow
//     });
//     sheet1.addRow(["Employee ID", "Name", "Attendance Date"]);

//     // ✅ Style the header row (row 1)
//     const headerRow1 = sheet1.getRow(1);
//     headerRow1.eachCell(cell => {
//       cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black text
//       cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFD9D9D9' } // Light gray background
//       };
//     });
    
//     // ✅ Add column widths after header styling
//     sheet1.columns = [
//       { key: "employee_id", width: 15 },
//       { key: "name", width: 25 },
//       { key: "attendance_date", width: 20, style: { numFmt: "yyyy-mm-dd" } }
//     ];
    
    

//     const rows = [];
// missingPunchIn
//   .filter(emp => {
//     const date = new Date(emp.attendance_date);
//     return date >= new Date(startDate) && date <= new Date(endDate);
//   })
//   .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date))
//   .forEach(emp => {
//     rows.push({
//       employee_id: emp.employee_id,
//       name: `${emp.first_name} ${emp.last_name}`,
//       attendance_date: new Date(emp.attendance_date),
//     });
//   });

// // Add rows first
// rows.forEach((row) => {
//   sheet1.addRow(row);
// });

// // Merge cells for same attendance_date
// let currentDate = null;
// let startRow = null;
// rows.forEach((row, index) => {
//   const rowNumber = index + 2; // +2 because Excel rows are 1-based, and row 1 is the header

//   if (currentDate === row.attendance_date.toISOString().slice(0,10)) {
//     // Continue merging
//   } else {
//     if (startRow !== null && startRow !== rowNumber - 1) {
//       sheet1.mergeCells(`C${startRow}:C${rowNumber - 1}`);
//     }
//     currentDate = row.attendance_date.toISOString().slice(0,10);
//     startRow = rowNumber;
//   }
// });

// // Merge the last group
// if (startRow !== null && startRow !== rows.length + 1) {
//   sheet1.mergeCells(`C${startRow}:C${rows.length + 1}`);
// }


//     // Sheet 2: Punch-in without Punch-out
//     const sheet2 = workbook.addWorksheet("Punch-in without Punch-out", {
//       properties: { tabColor: { argb: 'FFFFC000' } } // Orange tab
//     });
    
//     // Define columns with desired widths
//     sheet2.columns = [
//       { header: "Employee ID", key: "employee_id", width: 15 },
//       { header: "Punch-in Time", key: "punchin_time", width: 25 },
//       { header: "Punch-out Time", key: "punchout_time", width: 25 },
//       { header: "Hours Worked", key: "hours_worked", width: 18 },
//       { header: "Punch Mode", key: "punchmode", width: 15 },
//     ];
    
//     // Add and style header row
//     const headerRow2 = sheet2.getRow(1);
//     headerRow2.eachCell(cell => {
//       cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black text
//       cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFD9D9D9' } // Light gray background
//       };
//     });
    

//     punchInOnly.forEach(emp => {
//       const punchInTime = emp.punchin_time ? new Date(emp.punchin_time) : null;
//       const punchOutTime = emp.punchout_time ? new Date(emp.punchout_time) : null;

//       if (punchInTime && (punchInTime < new Date(startDate) || punchInTime > new Date(endDate))) return;

//       let hoursWorked = "";
//       if (punchInTime && punchOutTime) {
//         const diffMs = punchOutTime - punchInTime;
//         hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(2); // in hours
//       }

//       sheet2.addRow({
//         employee_id: emp.employee_id,
//         punchin_time: punchInTime ? punchInTime.toLocaleString() : "",
//         punchout_time: punchOutTime ? punchOutTime.toLocaleString() : "",
//         hours_worked: hoursWorked,
//         punchmode: emp.punchmode || "",
//         punchin_device: emp.punchin_device || "",
//         punchin_location: emp.punchin_location || "",
//       });
//     });

//     // Sheet 3: Worked Less than 8 Hours
//     // Sheet 3: Worked Less than 8 Hours
//     const sheet3 = workbook.addWorksheet("Worked < 8 Hours", {
//       properties: { tabColor: { argb: 'FF00B0F0' } } // Light Blue
//     });
// // Define columns
// // Define columns
// sheet3.columns = [
//   { header: "Employee ID", key: "employee_id", width: 15 },
//   { header: "First Name", key: "first_name", width: 25 },
//   { header: "Attendance Date", key: "attendance_date", width: 20 },
//   { header: "Hours Worked", key: "hours_worked", width: 15 },
// ];

// // Style header row
// const headerRow3 = sheet3.getRow(1);
// headerRow3.eachCell(cell => {
//   cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black bold text
//   cell.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FFD9D9D9' } // Gray background
//   };
// });

// // Normalize start and end dates
// const normalizedStartDate = normalizeDateToMidnight(startDate);
// const normalizedEndDate = normalizeDateToMidnight(endDate);

// // Add filtered and sorted rows
// const filteredData = workedLess
//   .filter(emp => {
//     const empDate = new Date(emp.attendance_date);
//     const normalizedEmpDate = normalizeDateToMidnight(empDate);
//     return normalizedEmpDate >= normalizedStartDate && normalizedEmpDate <= normalizedEndDate;
//   })
//   .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date));

// filteredData.forEach(emp => {
//   sheet3.addRow({
//     employee_id: emp.employee_id,
//     first_name: emp.first_name,
//     attendance_date: normalizeDate(emp.attendance_date),
//     hours_worked: emp.hours_worked,
//   });
// });

// // Merge same Attendance Date cells
// let lastDate = null;
// let mergeStartRow = null;

// // Only loop through data rows (skip header)
// for (let rowNum = 2; rowNum <= sheet3.rowCount; rowNum++) {
//   const row = sheet3.getRow(rowNum);
//   const currentDate = row.getCell('attendance_date').value;

//   if (currentDate === lastDate) {
//     // Same as previous, do nothing here (wait to merge)
//   } else {
//     // Date changed
//     if (mergeStartRow !== null && mergeStartRow !== rowNum - 1) {
//       // If previous group had more than one row, merge it
//       sheet3.mergeCells(`C${mergeStartRow}:C${rowNum - 1}`);
//     }
//     mergeStartRow = rowNum; // Reset merge start
//     lastDate = currentDate;
//   }
// }

// // Final merge for last group
// if (mergeStartRow !== null && mergeStartRow !== sheet3.rowCount) {
//   sheet3.mergeCells(`C${mergeStartRow}:C${sheet3.rowCount}`);
// }

// // Center align merged column
// sheet3.getColumn('attendance_date').alignment = { vertical: 'middle', horizontal: 'center' };

//     // Sheet 4: Worked between 8–10 Hours
//     const sheet4 = workbook.addWorksheet("Worked 8–10 Hours", {
//       properties: { tabColor: { argb: 'FF92D050' } } // Green
//     });
//        // Define columns
// sheet4.columns = [
//   { header: "Employee ID", key: "employee_id", width: 15 },
//   { header: "First Name", key: "first_name", width: 25 },
//   { header: "Attendance Date", key: "attendance_date", width: 20 },
//   { header: "Hours Worked", key: "hours_worked", width: 15 },
// ];

// // Style header row
// const headerRow4 = sheet4.getRow(1);
// headerRow4.eachCell(cell => {
//   cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black bold text
//   cell.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FFD9D9D9' } // Gray background
//   };
// });
    
//     let lastDateSheet4 = null; // Renamed to avoid conflict
//     let mergeStartRowSheet4 = null; // Renamed to avoid conflict
    
//     worked8to10
//       .filter(emp => {
//         const date = new Date(emp.attendance_date);
//         return date >= new Date(startDate) && date <= new Date(endDate);
//       })
//       .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date))
//       .forEach((emp, index) => {
//         const currentDate = new Date(emp.attendance_date).toISOString().split('T')[0]; // Date in YYYY-MM-DD format
        
//         // Add row to the sheet
//         sheet4.addRow({
//           employee_id: emp.employee_id,
//           first_name: emp.first_name,
//           attendance_date: currentDate,
//           hours_worked: emp.hours_worked,
//         });
        
//         // Logic for merging cells
//         if (currentDate === lastDateSheet4) {
//           // Same date as the previous row, no action needed
//         } else {
//           // If the previous group had more than one row, merge it
//           if (mergeStartRowSheet4 !== null && mergeStartRowSheet4 !== index) {
//             sheet4.mergeCells(`C${mergeStartRowSheet4 + 2}:C${index + 2}`); // Merge previous group of dates
//           }
//           // Reset for the new date
//           mergeStartRowSheet4 = index; // Mark the new start row
//           lastDateSheet4 = currentDate; // Update the last date to the current one
//         }
//       });
    
//     // Final merge for the last group (if applicable)
//     if (mergeStartRowSheet4 !== null && mergeStartRowSheet4 !== worked8to10.length - 1) {
//       sheet4.mergeCells(`C${mergeStartRowSheet4 + 2}:C${worked8to10.length + 1}`); // Merge the last group
//     }



//     // const sheet5 = workbook.addWorksheet("Approved Leaves");

//     // // Define header
//     // sheet5.addRow([
//     //   "Employee ID",
//     //   "Employee Name",
//     //   "Leave Type",
//     //   "Start Date",
//     //   "End Date",
//     //   "Leave Date",
//     //   "Status"
//     // ]);
    
//     // // Filter approved leaves within the reporting period
//     // const filteredLeaves = approvedLeaves.filter(leave => {
//     //   const leaveDate = new Date(leave.leave_date);
//     //   const from = new Date(startDate);
//     //   const to = new Date(endDate);
//     //   return leaveDate >= from && leaveDate <= to;
//     // });
    
//     // // Sort by leave_date
//     // filteredLeaves.sort((a, b) => new Date(a.leave_date) - new Date(b.leave_date));
    
//     // // Add rows to the sheet
//     // filteredLeaves.forEach(leave => {
//     //   sheet5.addRow([
//     //     leave.employee_id,
//     //     leave.employee_name || "",
//     //     leave.leave_type,
//     //     formatDate(leave.original_start_date),
//     //     formatDate(leave.original_end_date),
//     //     formatDate(leave.leave_date),
//     //     leave.leave_status
//     //   ]);
//     // });
    
//     // // Utility to format date as YYYY-MM-DD
//     // function formatDate(dateStr) {
//     //   const d = new Date(dateStr);
//     //   return d.toISOString().split("T")[0];
//     // }
    

//     const sheet5 = workbook.addWorksheet("Approved Leaves", {
//       properties: { tabColor: { argb: 'FFFF0000' } } // Red
//     });
    
//     // Add header row
//     // Define columns
// sheet5.columns = [
//   { header: "Employee ID", key: "employee_id", width: 15 },
//   { header: "Employee Name", key: "employee_name", width: 25 },
//   { header: "Leave Type", key: "leave_type", width: 15 },
//   { header: "Start Date", key: "start_date", width: 15 },
//   { header: "End Date", key: "end_date", width: 15 },
//   { header: "Leave Date", key: "leave_date", width: 15 },
//   { header: "Status", key: "status", width: 15 }
// ];

// // Style header row
// const headerRow5 = sheet5.getRow(1);
// headerRow5.eachCell(cell => {
//   cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black bold text
//   cell.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FFD9D9D9' } // Gray background
//   };
// });
    
//     // Filter leaves within date range
//     const filteredLeaves = approvedLeaves
//       .filter(leave => {
//         const leaveDate = new Date(leave.leave_date);
//         const from = new Date(startDate);
//         from.setDate(15);
//         const to = new Date(endDate);
//         return leaveDate >= from && leaveDate <= to;
//       })
//       .sort((a, b) => new Date(a.leave_date) - new Date(b.leave_date)); // Sort by leave date
    
//     let currentRow = 2; // Data starts after header (row 1)
//     let previousDate = null;
    
//     filteredLeaves.forEach((leave, index) => {
//       const formattedLeaveDate = formatDate(leave.leave_date);
    
//       // Add data row
//       sheet5.addRow([
//         leave.employee_id,
//         leave.employee_name,
//         leave.leave_type,
//         formatDate(leave.original_start_date),
//         formatDate(leave.original_end_date),
//         formattedLeaveDate,
//         leave.leave_status
//       ]);
    
//       // Check for merging leave_date
//       if (formattedLeaveDate === previousDate) {
//         // Continue merge block
//       } else {
//         // Merge previous group if length > 1
//         if (previousDate && currentRow - mergeStartRow > 1) {
//           sheet5.mergeCells(`F${mergeStartRow}:F${currentRow - 1}`);
//         }
//         // Start new merge block
//         mergeStartRow = currentRow;
//         previousDate = formattedLeaveDate;
//       }
    
//       currentRow++;
//     });
    
//     // Final merge after loop
//     if (filteredLeaves.length && currentRow - mergeStartRow > 1) {
//       sheet5.mergeCells(`F${mergeStartRow}:F${currentRow - 1}`);
//     }
    
//     // Utility
//     function formatDate(dateStr) {
//       const d = new Date(dateStr);
//       return d.toISOString().split("T")[0];
//     }
    

// // Utility function to format date as "YYYY-MM-DD"
// function formatDate(dateString) {
//   if (!dateString) return '';
//   const date = new Date(dateString);
//   return date.toISOString().split('T')[0];
// }

  
//     const fileName = `Attendance_Report_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
//     const filePath = path.join(__dirname, "..", "reports", fileName);

//     console.log("📄 Writing Excel file...");
//     await workbook.xlsx.writeFile(filePath);

//     // Send Email
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: EMAIL_USER, pass: EMAIL_PASS },
//     });

//     const mailOptions = {
//       from: EMAIL_USER,
//       to: process.env.REPORT_EMAIL, // Change or make it array for multiple
//       subject: `Attendance Report: ${label}`,
//       text: "Please find attached the attendance report.",
//       attachments: [{ filename: fileName, path: filePath }],
//     };

//     console.log("📧 Sending email...");
//     await transporter.sendMail(mailOptions);
//     console.log("✅ Email sent successfully with report:", fileName);

//     // Delete the file after sending
//     fs.unlink(filePath, (err) => {
//       if (err) console.error("❌ Failed to delete file:", err);
//       else console.log("🧹 Excel file deleted after email.");
//     });

//   } catch (error) {
//     console.error("❌ Error sending attendance report:", error.message);
//   }
// }

// // Schedule Cron Jobs
// console.log("📆 Scheduling attendance report cron jobs...");

// // 6 PM on 14th of every month: 1st to 14th report
// cron.schedule("03 11 28 * *", () => {
//   console.log("📄 Running 1st to 14th report...");
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = now.getMonth();
//   const start = new Date(year, month, 1).toISOString().slice(0, 10);
//   const end = new Date(year, month, 14).toISOString().slice(0, 10);
//   sendAttendanceReport(start, end, "1st_to_14th");
// });

// // 6 PM on last day of every month: 15th to end report
// // cron.schedule("24 11 * * *", () => {
// //   const now = new Date();
// //   const day = now.getDate();
// //   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
// //   if (day === lastDay) {
// //     console.log("📄 Running 15th to End of Month report...");
// //     const year = now.getFullYear();
// //     const month = now.getMonth();
// //     const start = new Date(year, month, 15).toISOString().slice(0, 10);
// //     const end = new Date(year, month, lastDay).toISOString().slice(0, 10);
// //     sendAttendanceReport(start, end, "15th_to_End");
// //   }
// // });



// cron.schedule("27 22 * * *", () => {
//   const now = new Date();
//   const day = now.getDate();
//   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

//   if (day === lastDay) {
//     console.log("📄 Running 15th to End of Month report...");
//     const year = now.getFullYear();
//     const month = now.getMonth(); // 0-based
//     const start = new Date(year, month, 15).toISOString().slice(0, 10);
//     const end = new Date(year, month, lastDay).toISOString().slice(0, 10);

//     sendAttendanceReport(start, end, "15th_to_End");
//   }
// });




// // Sheet 5: Approved Leaves

// // For testing: run after 5 minutes
// // const now = new Date();
// // now.setMinutes(now.getMinutes() + 1);
// // const testMinute = now.getMinutes();
// // const testHour = now.getHours();

// // console.log(`🧪 Test scheduled for today at ${testHour}:${testMinute} ...`);

// // cron.schedule(`${testMinute} ${testHour} * * *`, () => {
// //   console.log("🧪 Running TEST: 15th to End of Month report...");

// //   const today = new Date();
// //   const year = today.getFullYear();
// //   const month = today.getMonth();
// //   const lastDay = new Date(year, month + 1, 0).getDate();

// //   const start = new Date(year, month, 15).toISOString().slice(0, 10);
// //   const end = new Date(year, month, lastDay).toISOString().slice(0, 10);

// //   sendAttendanceReport(start, end, "15th_to_End_TEST");
// // });


// // For testing: schedule "1st to 15th" job after 5 minutes
// const now = new Date();
// now.setMinutes(now.getMinutes() + 1);
// const testMinute = now.getMinutes();
// const testHour = now.getHours();

// console.log(`🧪 TEST: Scheduled for today at ${testHour}:${testMinute}...`);

// cron.schedule(`${testMinute} ${testHour} * * *`, () => {
//   console.log("🧪 Running TEST: 1st to 15th report...");

//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth(); // 0 = Jan

//   const start = new Date(year, month, 1).toISOString().slice(0, 10);
//   const end = new Date(year, month, 15).toISOString().slice(0, 10);

//   sendAttendanceReport(start, end, "1st_to_14th_TEST");
// });

const cron = require("node-cron");
const axios = require("axios");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_KEY = process.env.X_API_KEY;

// Helper function to normalize a date to midnight
const normalizeDateToMidnight = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Function to normalize a date string into YYYY-MM-DD
function normalizeDate(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

// Function to send attendance report
async function sendAttendanceReport(startDate, endDate, label = "") {
  try {
    console.log(`📩 Sending attendance report for ${label} (${startDate} to ${endDate})...`);

    const headers = { "Content-Type": "application/json", "x-api-key": API_KEY };

    const [missingPunchInRes, punchInOnlyRes, workedLessRes, worked8to10Res, approvedLeavesRes] = await Promise.all([
      axios.get(`http://localhost:5000/admin/attendance/missing-punch-in?start=${startDate}&end=${endDate}`, { headers }),
      axios.get(`http://localhost:5000/admin/attendance/punch-in-not-punched-out?start=${startDate}&end=${endDate}`, { headers }),
      axios.get(`http://localhost:5000/admin/attendance/worked-less-than-8-hours?start=${startDate}&end=${endDate}`, { headers }),
      axios.get(`http://localhost:5000/admin/attendance/worked-8-to-10-hours?start=${startDate}&end=${endDate}`, { headers }),
      axios.get(`http://localhost:5000/admin-attendance/approved-leaves-current-month`, { headers }), // 🆕 added this
    ]);

    const missingPunchIn = missingPunchInRes?.data?.data || [];
    const punchInOnly = punchInOnlyRes?.data?.data || [];
    const workedLess = workedLessRes?.data?.data || [];
    const worked8to10 = worked8to10Res?.data?.data || [];
    const approvedLeaves = approvedLeavesRes?.data?.data || [];

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Missing Punch-in
    const sheet1 = workbook.addWorksheet("Missing Punch-in", {
      properties: { tabColor: { argb: "FFFFFF00" } }, // Yellow
    });
    sheet1.addRow(["Employee ID", "Name", "Attendance Date"]);

    // ✅ Style the header row (row 1)
    const headerRow1 = sheet1.getRow(1);
    headerRow1.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Black text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" }, // Light gray background
      };
    });

    // ✅ Add column widths after header styling
    sheet1.columns = [
      { key: "employee_id", width: 15 },
      { key: "name", width: 25 },
      { key: "attendance_date", width: 20, style: { numFmt: "yyyy-mm-dd" } },
    ];

    const rows = [];
    missingPunchIn
      .filter(emp => {
        const date = new Date(emp.attendance_date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      })
      .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date))
      .forEach(emp => {
        rows.push({
          employee_id: emp.employee_id,
          name: `${emp.first_name} ${emp.last_name}`,
          attendance_date: new Date(emp.attendance_date),
        });
      });

    // Add rows first
    rows.forEach((row) => {
      sheet1.addRow(row);
    });

    // Merge cells for same attendance_date
    let currentDate = null;
    let startRow = null;
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because Excel rows are 1-based, and row 1 is the header
      if (currentDate === row.attendance_date.toISOString().slice(0, 10)) {
        // Continue merging
      } else {
        if (startRow !== null && startRow !== rowNumber - 1) {
          sheet1.mergeCells(`C${startRow}:C${rowNumber - 1}`);
        }
        currentDate = row.attendance_date.toISOString().slice(0, 10);
        startRow = rowNumber;
      }
    });

    // Merge the last group
    if (startRow !== null && startRow !== rows.length + 1) {
      sheet1.mergeCells(`C${startRow}:C${rows.length + 1}`);
    }

    // Sheet 2: Punch-in without Punch-out
    const sheet2 = workbook.addWorksheet("Punch-in without Punch-out", {
      properties: { tabColor: { argb: "FFFFC000" } }, // Orange tab
    });

    // Define columns with desired widths
    sheet2.columns = [
      { header: "Employee ID", key: "employee_id", width: 15 },
      { header: "Punch-in Time", key: "punchin_time", width: 25 },
      { header: "Punch-out Time", key: "punchout_time", width: 25 },
      { header: "Hours Worked", key: "hours_worked", width: 18 },
      { header: "Punch Mode", key: "punchmode", width: 15 },
    ];

    // Add and style header row
    const headerRow2 = sheet2.getRow(1);
    headerRow2.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Black text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" }, // Light gray background
      };
    });

    punchInOnly.forEach(emp => {
      const punchInTime = emp.punchin_time ? new Date(emp.punchin_time) : null;
      const punchOutTime = emp.punchout_time ? new Date(emp.punchout_time) : null;

      if (punchInTime && (punchInTime < new Date(startDate) || punchInTime > new Date(endDate))) return;

      let hoursWorked = "";
      if (punchInTime && punchOutTime) {
        const diffMs = punchOutTime - punchInTime;
        hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(2); // in hours
      }

      sheet2.addRow({
        employee_id: emp.employee_id,
        punchin_time: punchInTime ? punchInTime.toLocaleString() : "",
        punchout_time: punchOutTime ? punchOutTime.toLocaleString() : "",
        hours_worked: hoursWorked,
        punchmode: emp.punchmode || "",
        punchin_device: emp.punchin_device || "",
        punchin_location: emp.punchin_location || "",
      });
    });

    // Sheet 3: Worked Less than 8 Hours
    const sheet3 = workbook.addWorksheet("Worked < 8 Hours", {
      properties: { tabColor: { argb: "FF00B0F0" } }, // Light Blue
    });

    // Define columns
    sheet3.columns = [
      { header: "Employee ID", key: "employee_id", width: 15 },
      { header: "First Name", key: "first_name", width: 25 },
      { header: "Attendance Date", key: "attendance_date", width: 20 },
      { header: "Hours Worked", key: "hours_worked", width: 15 },
    ];

    // Style header row
    const headerRow3 = sheet3.getRow(1);
    headerRow3.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Black bold text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" }, // Gray background
      };
    });

    // Normalize start and end dates
    const normalizedStartDate = normalizeDateToMidnight(startDate);
    const normalizedEndDate = normalizeDateToMidnight(endDate);

    // Add filtered and sorted rows
    const filteredData = workedLess
      .filter(emp => {
        const empDate = new Date(emp.attendance_date);
        const normalizedEmpDate = normalizeDateToMidnight(empDate);
        return normalizedEmpDate >= normalizedStartDate && normalizedEmpDate <= normalizedEndDate;
      })
      .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date));

    filteredData.forEach(emp => {
      sheet3.addRow({
        employee_id: emp.employee_id,
        first_name: emp.first_name,
        attendance_date: normalizeDate(emp.attendance_date),
        hours_worked: emp.hours_worked,
      });
    });

    // Merge same Attendance Date cells
    let lastDate = null;
    let mergeStartRow = null;

    // Only loop through data rows (skip header)
    for (let rowNum = 2; rowNum <= sheet3.rowCount; rowNum++) {
      const row = sheet3.getRow(rowNum);
      const currentDate = row.getCell("attendance_date").value;

      if (currentDate === lastDate) {
        // Same as previous, do nothing here (wait to merge)
      } else {
        // Date changed
        if (mergeStartRow !== null && mergeStartRow !== rowNum - 1) {
          // If previous group had more than one row, merge it
          sheet3.mergeCells(`C${mergeStartRow}:C${rowNum - 1}`);
        }
        mergeStartRow = rowNum; // Reset merge start
        lastDate = currentDate;
      }
    }

    // Final merge for last group
    if (mergeStartRow !== null && mergeStartRow !== sheet3.rowCount) {
      sheet3.mergeCells(`C${mergeStartRow}:C${sheet3.rowCount}`);
    }

    // Center align merged column
    sheet3.getColumn("attendance_date").alignment = { vertical: "middle", horizontal: "center" };

    // Sheet 4: Worked between 8–10 Hours
    const sheet4 = workbook.addWorksheet("Worked 8–10 Hours", {
      properties: { tabColor: { argb: "FF92D050" } }, // Green
    });

    // Define columns
    sheet4.columns = [
      { header: "Employee ID", key: "employee_id", width: 15 },
      { header: "First Name", key: "first_name", width: 25 },
      { header: "Attendance Date", key: "attendance_date", width: 20 },
      { header: "Hours Worked", key: "hours_worked", width: 15 },
    ];

    // Style header row
    const headerRow4 = sheet4.getRow(1);
    headerRow4.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Black bold text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" }, // Gray background
      };
    });

    let lastDateSheet4 = null; // Renamed to avoid conflict
    let mergeStartRowSheet4 = null; // Renamed to avoid conflict

    worked8to10
      .filter(emp => {
        const date = new Date(emp.attendance_date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      })
      .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date))
      .forEach((emp, index) => {
        const currentDate = new Date(emp.attendance_date).toISOString().split("T")[0]; // Date in YYYY-MM-DD format

        // Add row to the sheet
        sheet4.addRow({
          employee_id: emp.employee_id,
          first_name: emp.first_name,
          attendance_date: currentDate,
          hours_worked: emp.hours_worked,
        });

        // Logic for merging cells
        if (currentDate === lastDateSheet4) {
          // Same date as the previous row, no action needed
        } else {
          // If the previous group had more than one row, merge it
          if (mergeStartRowSheet4 !== null && mergeStartRowSheet4 !== index) {
            sheet4.mergeCells(`C${mergeStartRowSheet4 + 2}:C${index + 2}`); // Merge previous group of dates
          }
          // Reset for the new date
          mergeStartRowSheet4 = index; // Mark the new start row
          lastDateSheet4 = currentDate; // Update the last date to the current one
        }
      });

    // Final merge for the last group (if applicable)
    if (mergeStartRowSheet4 !== null && mergeStartRowSheet4 !== worked8to10.length - 1) {
      sheet4.mergeCells(`C${mergeStartRowSheet4 + 2}:C${worked8to10.length + 1}`); // Merge the last group
    }

    // Sheet 5: Approved Leaves
    const sheet5 = workbook.addWorksheet("Approved Leaves", {
      properties: { tabColor: { argb: "FFFF0000" } }, // Red
    });

    // Define columns
    sheet5.columns = [
      { header: "Employee ID", key: "employee_id", width: 15 },
      { header: "Employee Name", key: "employee_name", width: 25 },
      { header: "Leave Type", key: "leave_type", width: 15 },
      { header: "Start Date", key: "start_date", width: 15 },
      { header: "End Date", key: "end_date", width: 15 },
      { header: "Leave Date", key: "leave_date", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Style header row
    const headerRow5 = sheet5.getRow(1);
    headerRow5.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Black bold text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" }, // Gray background
      };
    });

    // Filter leaves within date range
    const filteredLeaves = approvedLeaves
      .filter(leave => {
        const leaveDate = new Date(leave.leave_date);
        const from = new Date(startDate);
        from.setDate(15);
        const to = new Date(endDate);
        return leaveDate >= from && leaveDate <= to;
      })
      .sort((a, b) => new Date(a.leave_date) - new Date(b.leave_date)); // Sort by leave date

    let currentRow = 2; // Data starts after header (row 1)
    let previousDate = null;

    filteredLeaves.forEach((leave, index) => {
      const formattedLeaveDate = formatDate(leave.leave_date);

      // Add data row
      sheet5.addRow([
        leave.employee_id,
        leave.employee_name,
        leave.leave_type,
        formatDate(leave.original_start_date),
        formatDate(leave.original_end_date),
        formattedLeaveDate,
        leave.leave_status,
      ]);

      // Check for merging leave_date
      if (formattedLeaveDate === previousDate) {
        // Continue merge block
      } else {
        // Merge previous group if length > 1
        if (previousDate && currentRow - mergeStartRow > 1) {
          sheet5.mergeCells(`F${mergeStartRow}:F${currentRow - 1}`);
        }
        // Start new merge block
        mergeStartRow = currentRow;
        previousDate = formattedLeaveDate;
      }

      currentRow++;
    });

    // Final merge after loop
    if (filteredLeaves.length && currentRow - mergeStartRow > 1) {
      sheet5.mergeCells(`F${mergeStartRow}:F${currentRow - 1}`);
    }

    // Utility function to format date as "YYYY-MM-DD"
    function formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    }

    const fileName = `Attendance_Report_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const filePath = path.join(__dirname, "..", "reports", fileName);

    console.log("📄 Writing Excel file...");
    await workbook.xlsx.writeFile(filePath);

    // Send Email using SendGrid
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: "apikey", // SendGrid requires "apikey" as the username
        pass: process.env.SENDGRID_API_KEY, // SENDGRID_API_KEY
      },
    });

    const mailOptions = {
      from: process.env.SENDGRID_SENDER_EMAIL, // SENDGRID_SENDER_EMAIL
      to: process.env.REPORT_EMAIL, // Change or make it array for multiple
      subject: `Attendance Report: ${label}`,
      text: "Please find attached the attendance report.",
      attachments: [{ filename: fileName, path: filePath }],
    };

    console.log("📧 Sending email...");
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully with report:", fileName);

    // Delete the file after sending
    fs.unlink(filePath, (err) => {
      if (err) console.error("❌ Failed to delete file:", err);
      else console.log("🧹 Excel file deleted after email.");
    });
  } catch (error) {
    console.error("❌ Error sending attendance report:", error.message);
  }
}

// Schedule Cron Jobs
console.log("📆 Scheduling attendance report cron jobs...");

// 6 PM on 14th of every month: 1st to 14th report
cron.schedule("00 09 14 * *", () => {
  console.log("📄 Running 1st to 14th report...");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 14).toISOString().slice(0, 10);
  sendAttendanceReport(start, end, "1st_to_14th");
});

// 6 PM on last day of every month: 15th to end report
cron.schedule("00 9 * * *", () => {
  const now = new Date();
  const day = now.getDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (day === lastDay) {
    console.log("📄 Running 15th to End of Month report...");
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const start = new Date(year, month, 15).toISOString().slice(0, 10);
    const end = new Date(year, month, lastDay).toISOString().slice(0, 10);

    sendAttendanceReport(start, end, "15th_to_End");
  }
});

// For testing: schedule "1st to 15th" job after 5 minutes
// const now = new Date();
// now.setMinutes(now.getMinutes() + 1);
// const testMinute = now.getMinutes();
// const testHour = now.getHours();

// console.log(`🧪 TEST: Scheduled for today at ${testHour}:${testMinute}...`);

// cron.schedule(`${testMinute} ${testHour} * * *`, () => {
//   console.log("🧪 Running TEST: 1st to 15th report...");

//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth(); // 0 = Jan

//   const start = new Date(year, month, 1).toISOString().slice(0, 10);
//   const end = new Date(year, month, 15).toISOString().slice(0, 10);

//   sendAttendanceReport(start, end, "1st_to_14th_TEST");
// });



// For testing: run after 5 minutes
// const now = new Date();
// now.setMinutes(now.getMinutes() + 1);
// const testMinute = now.getMinutes();
// const testHour = now.getHours();

// console.log(`🧪 Test scheduled for today at ${testHour}:${testMinute} ...`);

// cron.schedule(`${testMinute} ${testHour} * * *`, () => {
//   console.log("🧪 Running TEST: 15th to End of Month report...");

//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth();
//   const lastDay = new Date(year, month + 1, 0).getDate();

//   const start = new Date(year, month, 15).toISOString().slice(0, 10);
//   const end = new Date(year, month, lastDay).toISOString().slice(0, 10);

//   sendAttendanceReport(start, end, "15th_to_End_TEST");
// });