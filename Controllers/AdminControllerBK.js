const express = require("express");
const AdminModel = require("../Models/AdminModel");
const tlmModel = require("../Models/TlmModel");
const slmModel = require("../Models/SlmModel");
const flmModel = require("../Models/FlmModel");
const mrModel = require("../Models/MrModel");
const RoomModel = require("../Models/RoomModel");
const Mr = require("../Models/MrModel");
const jwt = require("jsonwebtoken");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const xlsx = require("xlsx");
const path = require("path");
const BrandScehma = require("../Models/BrandScehma");
const schedule = require("node-schedule");
const moment = require("moment");
const { getIo } = require("../WebSocket");
const { getRooms } = require("../WebSocket");
const rooms = getRooms();
const socket = require("../WebSocket");
const { DateTime } = require("luxon");
const MatchDetails = require("../Models/MatchesSchema");
const MatchesSchema = require("../Models/MatchesSchema");
const mongoose = require("mongoose");
const TlmModel = require("../Models/TlmModel");
const SlmModel = require("../Models/SlmModel");
const FlmModel = require("../Models/FlmModel");
const popupSchema = require("../Models/PopUpModel");
const cron = require("node-cron");
const colors = require("colors");
const { MatchScheduleData } = require("../Models/MatchSchedule");
const uuid = require("uuid");
const Notification = require("../Models/Notification");
const admin = require("firebase-admin");
const SupportModel = require("../Models/SupportModel");
const CompanyModel = require("../Models/CompanyModel");
const CompanyWiseMonthly = require("../Models/CompanyWiseMonthly");
const CompanyMonthProvide = require("../Models/CompanyMonthProvide");
const firestore = admin.firestore();
const fs = require("fs");
const UserTrackageModel = require("../Models/UserTrackageModel");
const SPOTLIGHT_FILE = path.join(__dirname, "../uploads/spotlight.json")
// const cron = require('node-cron');
const getLeaderboardSettings = require("../utils/leaderboardSettings");
const BASE_URL = "https://dev.admin.rxpl.digilateral.com";

const readSpotlight = () => {
  if (!fs.existsSync(SPOTLIGHT_FILE)) return [];
  return JSON.parse(fs.readFileSync(SPOTLIGHT_FILE, "utf-8"));
};
 
const writeSpotlight = (data) => {
  const dir = path.dirname(SPOTLIGHT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SPOTLIGHT_FILE, JSON.stringify(data, null, 2));
};
 
 

const handleAdminCreation = async (req, res) => {
  try {
    const { Name, AdminId, Password, Gender, MobileNumber } = req.body;

    const admin = await AdminModel.findOne({ AdminId: AdminId });

    if (admin) {
      return res.status(400).json({
        msg: "AdminId Already Exitsts",
        success: false,
      });
    }

    const newAdmin = await new AdminModel({
      Name,
      AdminId,
      Password,
      Gender,
      MobileNumber,
    });

    await newAdmin.save();

    return res.status(200).json({
      success: true,
      newAdmin,
    });
  } catch (error) {
    console.log("Error in handleTopMrByDoctor");
    let err = error.message;
    return res.status(500).json({
      msg: "Internal Server Error",
      err,
    });
  }
};

const handleAdminLogin = async (req, res) => {
  try {
    const { ID, PASSWORD } = req.body;
    let user, userType;

    // Check each model and set the usertype based on where the user is found
    user = await AdminModel.findOne({ AdminId: ID });
    if (user) {
      userType = "Admin";
    } else {
      user = await tlmModel.findOne({ TLMEmpID: ID });
      if (user) {
        userType = "TLM";
      } else {
        user = await slmModel.findOne({ SLMEmpID: ID });
        if (user) {
          userType = "SLM";
        } else {
          user = await flmModel.findOne({ FLMEmpID: ID });
          if (user) {
            userType = "FLM";
          }
        }
      }
    }

    // If user is found, proceed with password check
    if (user) {
      if (user.Password === PASSWORD) {
        const name = user.Name;

        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.SECRETKEY
        );

        return res.status(200).json({
          msg: "Login successful",
          success: true,
          user,
          token,
          name,
          userType, // Pass usertype in response
        });
      } else {
        return res.status(400).json({
          msg: "Password is Incorrect",
          success: false,
        });
      }
    } else {
      return res.status(400).json({
        msg: "User Not Found",
        success: false,
      });
    }
  } catch (error) {
    const errMsg = error.message;
    console.log({ errMsg });
    return res.status(500).json({
      msg: "Internal Server Error",
      errMsg,
    });
  }
};

// const handleExcelsheetUpload = async (req, res) => {
//   try {
//     // Admin Exist or not checking......
//     const AdminId = req.params.id;
//     const admin = await AdminModel.findById(AdminId);
//     if (!admin) {
//       return res.status(400).json({
//         msg: "Admin Not Found",
//       });
//     }

//     if (!req.file.path) {
//       return res.status(400).json({
//         error: "Excel sheet missing",
//       });
//     }

//     // EXCEL SHEET Upload file....
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     // Check if the Excel sheet is empty
//     if (!sheetData || sheetData.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: "Data Missing",
//       });
//     }

//     const errorMessages = [];

//     // For loop the sheet data to store in various collections
//     for (let i = 0; i < sheetData.length; i++) {
//       const row = sheetData[i];
//       const rowNumber = i + 2; // Assuming headers are on row 1
//       console.log("SheetDataExcel :", row);

//       const requiredFields = [
//         "TLMID",
//         "TLMNAME",
//         "TLMPASSWORD",
//         "TLMHQ",
//         "TLMZONE",
//         "TLMTeamName",
//         "SLMID",
//         "SLMNAME",
//         "SLMPASSWORD",
//         "SLMHQ",
//         "SLMREGION",
//         "SLMZONE",
//         "SLMTeamName",
//         "FLMID",
//         "FLMNAME",
//         "FLMPASSWORD",
//         "FLMHQ",
//         "FLMREGION",
//         "FLMZONE",
//         "FLMTeamName",
//         "MRID",
//         "MRNAME",
//         "MREMAIL",
//         "MRPASSWORD",
//         "MRROLE",
//         "MRHQ",
//         "MRREGION",
//         "MRZONE",
//         "MRBUSSINESSUNIT",
//         "TEAMNAME",
//       ];
//       const missingFields = requiredFields.filter(
//         (field) => !row[field] || String(row[field]).trim() === ""
//       );

//       if (missingFields.length > 0) {
//         errorMessages.push(
//           `Row ${rowNumber}: Missing fields - ${missingFields.join(", ")}`
//         );
//         continue; // Skip rest of the row
//       }

//       // Check the TLM exists or not
//       let existTlm = await tlmModel.findOne({ TLMEmpID: row.TLMID });
//       if (existTlm) {
//         // Update existing TLM data if it already exists
//         existTlm.TLMName = row.TLMNAME;
//         existTlm.Password = row.TLMPASSWORD;
//         existTlm.HQ = row.TLMHQ;
//         existTlm.ZONE = row.TLMZONE;
//         existTlm.TeamName = row.TLMTeamName;
//         await existTlm.save();
//       } else {
//         // TLM doesn't exist, create new TLM
//         existTlm = new tlmModel({
//           TLMEmpID: row.TLMID,
//           TLMName: row.TLMNAME,
//           Password: row.TLMPASSWORD,
//           HQ: row.TLMHQ,
//           ZONE: row.TLMZONE,
//           TeamName: row.TLMTeamName,
//         });
//         await existTlm.save();
//         admin.Tlm.push(existTlm._id);
//         await admin.save();
//       }

//       // Check the SLM exists or not
//       let existSlm = await slmModel.findOne({ SLMEmpID: row.SLMID });
//       if (existSlm) {
//         // Update existing SLM data if it already exists
//         existSlm.SLMName = row.SLMNAME;
//         existSlm.Password = row.SLMPASSWORD;
//         existSlm.HQ = row.SLMHQ;
//         existSlm.REGION = row.SLMREGION;
//         existSlm.ZONE = row.SLMZONE;
//         existSlm.TeamName = row.SLMTeamName;
//         await existSlm.save();
//       } else {
//         // SLM doesn't exist, create new SLM
//         existSlm = new slmModel({
//           SLMEmpID: row.SLMID,
//           SLMName: row.SLMNAME,
//           Password: row.SLMPASSWORD,
//           HQ: row.SLMHQ,
//           REGION: row.SLMREGION,
//           ZONE: row.SLMZONE,
//           TeamName: row.SLMTeamName,
//         });
//         await existSlm.save();
//         existTlm.Slm.push(existSlm._id);
//         await existTlm.save();
//       }

//       // Check the FLM exists or not
//       let existFlm = await flmModel.findOne({ FLMEmpID: row.FLMID });
//       if (existFlm) {
//         // Update existing FLM data if it already exists
//         existFlm.BDMName = row.FLMNAME;
//         existFlm.Password = row.FLMPASSWORD;
//         existFlm.HQ = row.FLMHQ;
//         existFlm.REGION = row.FLMREGION;
//         existFlm.ZONE = row.FLMZONE;
//         existFlm.TeamName = row.FLMTeamName;
//         await existFlm.save();
//       } else {
//         // FLM doesn't exist, create new FLM
//         existFlm = new flmModel({
//           FLMEmpID: row.FLMID,
//           BDMName: row.FLMNAME,
//           Password: row.FLMPASSWORD,
//           HQ: row.FLMHQ,
//           REGION: row.FLMREGION,
//           ZONE: row.FLMZONE,
//           TeamName: row.FLMTeamName,
//         });
//         await existFlm.save();
//         existSlm.Flm.push(existFlm._id);
//         await existSlm.save();
//       }

//       // Check the MR exists or not
//       let existingMr = await Mr.findOne({ MRID: row.MRID });
//       // const cleanDOJ = row.MRDOJ.replace("`", "");
//       const cleanDOJ =
//         typeof row.MRDOJ === "string" ? row.MRDOJ.replace("`", "") : row.MRDOJ;
//       if (existingMr) {
//         // Update existing MR data if it already exists
//         existingMr.USERNAME = row.MRNAME;
//         existingMr.EMAIL = row.MREMAIL;
//         existingMr.PASSWORD = row.MRPASSWORD;
//         existingMr.ROLE = row.MRROLE;
//         existingMr.HQ = row.MRHQ;
//         existingMr.REGION = row.MRREGION;
//         existingMr.ZONE = row.MRZONE;
//         existingMr.BUSINESSUNIT = row.MRBUSSINESSUNIT;
//         existingMr.DOJ = cleanDOJ;
//         existingMr.TEAMNAME = row.TEAMNAME;
//         await existingMr.save();
//       } else {
//         // MR doesn't exist, create new MR
//         existingMr = new Mr({
//           MRID: row.MRID,
//           USERNAME: row.MRNAME,
//           EMAIL: row.MREMAIL,
//           PASSWORD: row.MRPASSWORD,
//           ROLE: row.MRROLE,
//           HQ: row.MRHQ,
//           REGION: row.MRREGION,
//           ZONE: row.MRZONE,
//           BUSINESSUNIT: row.MRBUSSINESSUNIT,
//           TEAMNAME: row.TEAMNAME,
//           DOJ: cleanDOJ,
//         });
//         await existingMr.save();
//         existFlm.Mrs.push(existingMr._id);
//         await existFlm.save();
//       }
//     }
//     if (errorMessages.length > 0) {
//       return res.status(400).json({
//         success: false,
//         errorType: "validation",
//         error: errorMessages,
//       });
//     }
//     res
//       .status(200)
//       .json({ message: "Data uploaded successfully", success: true });
//   } catch (error) {
//     console.error(error);
//     const err = error.message;
//     res.status(500).json({
//       error: err,
//       err,
//     });
//   }
// };


const handleExcelsheetUpload = async (req, res) => {
  try {
    const AdminId = req.params.id;
    const admin = await AdminModel.findById(AdminId);
    if (!admin) {
      return res.status(400).json({
        msg: "Admin Not Found",
      });
    }

    if (!req.file.path) {
      return res.status(400).json({
        error: "Excel sheet missing",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Data Missing",
      });
    }

    const successCount = { slm: 0, flm: 0, mr: 0 };
    const errorMessages = [];

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const rowNumber = i + 2;

      console.log(`📋 Processing Row ${rowNumber}:`, row);

      let teamName = (row.TeamName || row.TEAMNAME)?.toString().trim();

      if (!teamName) {
        console.log(`⏭️ Row ${rowNumber}: Skipping - No TeamName`);
        continue;
      }

      console.log(`✅ TeamName Found: "${teamName}"`);

      try {
        // ✅ SLM
        const slmId = row.SLMID?.toString().trim();

        if (slmId) {
          let existSlm = await slmModel.findOne({ SLMEmpID: slmId });

          if (existSlm) {
            if (row.SLMNAME?.toString().trim()) existSlm.SLMName = row.SLMNAME.toString().trim();
            if (row.SLMPASSWORD?.toString().trim()) {
              existSlm.Password = row.SLMPASSWORD.toString().trim();
            } else {
              existSlm.Password = slmId;  // ✅ PASSWORD = ID
            }
            if (row.SLMHQ?.toString().trim()) existSlm.HQ = row.SLMHQ.toString().trim();
            if (row.SLMREGION?.toString().trim()) existSlm.REGION = row.SLMREGION.toString().trim();
            if (row.SLMZONE?.toString().trim()) existSlm.ZONE = row.SLMZONE.toString().trim();
            existSlm.TeamName = teamName;
            await existSlm.save();
            console.log(`✅ SLM Updated: ${slmId}`);
          } else {
            const slmData = {
              SLMEmpID: slmId,
              Password: row.SLMPASSWORD?.toString().trim() || slmId,  // ✅ PASSWORD = ID
              TeamName: teamName,
            };
            if (row.SLMNAME?.toString().trim()) slmData.SLMName = row.SLMNAME.toString().trim();
            if (row.SLMHQ?.toString().trim()) slmData.HQ = row.SLMHQ.toString().trim();
            if (row.SLMREGION?.toString().trim()) slmData.REGION = row.SLMREGION.toString().trim();
            if (row.SLMZONE?.toString().trim()) slmData.ZONE = row.SLMZONE.toString().trim();

            existSlm = new slmModel(slmData);
            await existSlm.save();

            if (!admin.Slm) admin.Slm = [];
            if (!admin.Slm.includes(existSlm._id)) {
              admin.Slm.push(existSlm._id);
              await admin.save();
            }
            successCount.slm++;
            console.log(`✅ SLM Created: ${slmId}`);
          }
        }

        // ✅ FLM
        const flmId = row.FLMID?.toString().trim();

        if (flmId) {
          let existFlm = await flmModel.findOne({ FLMEmpID: flmId });

          if (existFlm) {
            if (row.FLMNAME?.toString().trim()) existFlm.BDMName = row.FLMNAME.toString().trim();
            if (row.FLMPASSWORD?.toString().trim()) {
              existFlm.Password = row.FLMPASSWORD.toString().trim();
            } else {
              existFlm.Password = flmId;  // ✅ PASSWORD = ID
            }
            if (row.FLMHQ?.toString().trim()) existFlm.HQ = row.FLMHQ.toString().trim();
            if (row.FLMREGION?.toString().trim()) existFlm.REGION = row.FLMREGION.toString().trim();
            if (row.FLMZONE?.toString().trim()) existFlm.ZONE = row.FLMZONE.toString().trim();
            existFlm.TeamName = teamName;
            await existFlm.save();
            console.log(`✅ FLM Updated: ${flmId}`);
          } else {
            const flmData = {
              FLMEmpID: flmId,
              Password: row.FLMPASSWORD?.toString().trim() || flmId,  // ✅ PASSWORD = ID
              TeamName: teamName,
            };
            if (row.FLMNAME?.toString().trim()) flmData.BDMName = row.FLMNAME.toString().trim();
            if (row.FLMHQ?.toString().trim()) flmData.HQ = row.FLMHQ.toString().trim();
            if (row.FLMREGION?.toString().trim()) flmData.REGION = row.FLMREGION.toString().trim();
            if (row.FLMZONE?.toString().trim()) flmData.ZONE = row.FLMZONE.toString().trim();

            existFlm = new flmModel(flmData);
            await existFlm.save();

            const existSlm = await slmModel.findOne({ SLMEmpID: slmId });
            if (existSlm) {
              if (!existSlm.Flm) existSlm.Flm = [];
              if (!existSlm.Flm.includes(existFlm._id)) {
                existSlm.Flm.push(existFlm._id);
                await existSlm.save();
              }
            }
            successCount.flm++;
            console.log(`✅ FLM Created: ${flmId}`);
          }
        }

        // ✅ MR
        const mrId = row.MRID?.toString().trim();

        if (mrId) {
          let existingMr = await Mr.findOne({ MRID: mrId });

          if (existingMr) {
            if (row.MRNAME?.toString().trim()) existingMr.USERNAME = row.MRNAME.toString().trim();
            if (row.MREMAIL?.toString().trim()) existingMr.EMAIL = row.MREMAIL.toString().trim();
            if (row.MRPASSWORD?.toString().trim()) {
              existingMr.PASSWORD = row.MRPASSWORD.toString().trim();
            } else {
              existingMr.PASSWORD = mrId;  // ✅ PASSWORD = ID
            }
            if (row.MRROLE?.toString().trim()) existingMr.ROLE = row.MRROLE.toString().trim();
            if (row.MRHQ?.toString().trim()) existingMr.HQ = row.MRHQ.toString().trim();
            if (row.MRREGION?.toString().trim()) existingMr.REGION = row.MRREGION.toString().trim();
            if (row.MRZONE?.toString().trim()) existingMr.ZONE = row.MRZONE.toString().trim();
            if (row.MRBUSSINESSUNIT?.toString().trim()) existingMr.BUSINESSUNIT = row.MRBUSSINESSUNIT.toString().trim();
            existingMr.TEAMNAME = teamName;
            if (row.MRDOJ) existingMr.DOJ = row.MRDOJ;
            await existingMr.save();
            console.log(`✅ MR Updated: ${mrId}`);
          } else {
            const mrData = {
              MRID: mrId,
              PASSWORD: row.MRPASSWORD?.toString().trim() || mrId,  // ✅ PASSWORD = ID
              TEAMNAME: teamName,
            };
            if (row.MRNAME?.toString().trim()) mrData.USERNAME = row.MRNAME.toString().trim();
            if (row.MREMAIL?.toString().trim()) mrData.EMAIL = row.MREMAIL.toString().trim();
            if (row.MRROLE?.toString().trim()) mrData.ROLE = row.MRROLE.toString().trim();
            if (row.MRHQ?.toString().trim()) mrData.HQ = row.MRHQ.toString().trim();
            if (row.MRREGION?.toString().trim()) mrData.REGION = row.MRREGION.toString().trim();
            if (row.MRZONE?.toString().trim()) mrData.ZONE = row.MRZONE.toString().trim();
            if (row.MRBUSSINESSUNIT?.toString().trim()) mrData.BUSINESSUNIT = row.MRBUSSINESSUNIT.toString().trim();
            if (row.MRDOJ) mrData.DOJ = row.MRDOJ;

            existingMr = new Mr(mrData);
            await existingMr.save();

            const existFlm = await flmModel.findOne({ FLMEmpID: flmId });
            if (existFlm) {
              if (!existFlm.Mrs) existFlm.Mrs = [];
              if (!existFlm.Mrs.includes(existingMr._id)) {
                existFlm.Mrs.push(existingMr._id);
                await existFlm.save();
              }
            }
            successCount.mr++;
            console.log(`✅ MR Created: ${mrId}`);
          }
        }

      } catch (rowError) {
        console.error(`❌ Row ${rowNumber} Error:`, rowError.message);
        errorMessages.push(`Row ${rowNumber}: ${rowError.message}`);
      }
    }

    console.log(`📊 Final Summary - SLM: ${successCount.slm}, FLM: ${successCount.flm}, MR: ${successCount.mr}`);

    res.status(200).json({
      message: "Data uploaded successfully",
      success: true,
      summary: successCount,
      errors: errorMessages.length > 0 ? errorMessages : null,
    });

  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};











const addNewBrandNames = async (req, res) => {
  const Id = req.params.id;

  const AdminExist = await AdminModel.findById(Id);

  if (!AdminExist) {
    return res
      .status(404)
      .json({ success: false, message: "AdminId not found" });
  }

  const { BrandName, Points } = req.body;

  const addBrand = new BrandScehma({
    BrandName,
    Points,
  });
  await addBrand.save();

  return res.status(200).json({
    success: true,
    message: "BrandName added successfully",
  });
};

const uploadLiveMatches = async (req, res) => {
  try {
    const AdminId = req.params.id;
    const admin = await AdminModel.findById(AdminId);

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "AdminId not found" });
    }
    const { teamA, teamB, startDate, endDate } = req.body;

    const match = { teamA, teamB, startDate, endDate };

    // Parse dates correctly
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate.split("-").reverse().join("-"));
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate.split("-").reverse().join("-"));
    end.setHours(0, 0, 0, 0);

    if (start.getTime() === today.getTime()) {
      admin.LiveMatches.push(match);
      // io.emit("liveMatch", match);
    } else if (start.getTime() > today.getTime()) {
      admin.UpcomingMatches.push(match);
    } else {
      admin.PastMatches.push(match);
    }
    await admin.save();

    res
      .status(200)
      .json({ success: true, message: "Data Uploaded Successfully", match });
  } catch (error) {
    console.error(error);
    const err = error.message;
    res.status(500).json({
      error: "Internal server error",
      err,
    });
  }
};

//Function to chekck and post matches according to the Todays Date
const parseDate = (dateString) => {
  const [day, month, year] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Function to categorize matches
const categorizeMatches = async () => {
  const admins = await AdminModel.find(); // Fetch all admin entries

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of the day for comparison

  for (const admin of admins) {
    const liveMatches = [];
    const upcomingMatches = [];
    const pastMatches = [];

    // Combine all matches into a single array for categorization
    const allMatches = [
      ...admin.LiveMatches,
      ...admin.UpcomingMatches,
      ...admin.PastMatches,
    ];

    allMatches.forEach((match) => {
      const matchStartDate = parseDate(match.startDate);

      if (matchStartDate.toDateString() === today.toDateString()) {
        liveMatches.push(match); // Live if start date is today
      } else if (matchStartDate < today) {
        pastMatches.push(match); // Past if start date is before today
      } else {
        upcomingMatches.push(match); // Upcoming if start date is after today
      }
    });

    // Update the arrays in the database
    admin.LiveMatches = liveMatches;
    admin.UpcomingMatches = upcomingMatches;
    admin.PastMatches = pastMatches;

    // Save the updated admin entry
    await admin.save();
  }
};

categorizeMatches(); // run all the time for testing

//--The Below Code is for AWS Server
// Optionally, schedule this function to run daily at 12 AM (midnight) every day
const job = schedule.scheduleJob("0 0 * * *", function () {
  console.log(
    `categorizeMatches job started at: ${new Date().toLocaleString()}`.bgYellow
  );
  categorizeMatches(); // Runs every day at midnight
});

// const sendChallengeByManager = async (req, res) => {
//   const { id } = req.params;
//   const { challengeDate, maxAccepts } = req.body;
//   const io = getIo();

//   try {
//     // Check if challengeDate is in "DD-MM-YYYY" format
//     const datePattern = /^\d{2}-\d{2}-\d{4}$/;
//     if (!datePattern.test(challengeDate)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid date format. Use DD-MM-YYYY." });
//     }

//     // Get MatchDuration value
//     const MatchDuration = await MatchScheduleData.find({});
//     if (
//       !MatchDuration.length ||
//       MatchDuration[0].SetMatchDurationBefore == null
//     ) {
//       return res.status(500).json({
//         message:
//           "SetMatchDurationBefore value is missing in MatchDuration data.",
//       });
//     }
//     const setMatchDurationBefore = MatchDuration[0].SetMatchDurationBefore;

//     // Parse today's date
//     const today = new Date();

//     // Calculate the earliest valid challenge date based on SetMatchDurationBefore
//     const minChallengeDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate() + parseInt(setMatchDurationBefore)
//     );

//     // Parse the challengeDate from the request
//     const [day, month, year] = challengeDate.split("-").map(Number);
//     const challengeDateObj = new Date(year, month - 1, day);

//     // Check if the challengeDate is valid
//     if (challengeDateObj < minChallengeDate) {
//       return res.status(404).json({
//         success: false,
//         message: `Challenge date should be at least ${setMatchDurationBefore} day(s) greater than today.`,
//       });
//     }

//     // Logic to handle challenge creation
//     let creatorRole,
//       roomId,
//       allowedMembers = [],
//       notifyUsers = [],
//       players = [],
//       TeamName = "";

//     const tlm = await tlmModel.findById(id).populate({
//       path: "Slm",
//       populate: { path: "Flm", populate: { path: "Mrs" } },
//     });

//     if (tlm) {
//       creatorRole = "Tlm";
//       roomId = uuid.v4();
//       notifyUsers = await tlmModel.find({ _id: { $ne: id } });
//       allowedMembers = notifyUsers;
//       TeamName = tlm.TeamName;

//       tlm.Slm.forEach((slm) => {
//         slm.Flm.forEach((flm) => {
//           flm.Mrs.forEach((mr) => {
//             players.push(mr._id.toString());
//           });
//         });
//       });
//     } else {
//       const slm = await slmModel.findById(id).populate({
//         path: "Flm",
//         populate: { path: "Mrs" },
//       });

//       if (slm) {
//         creatorRole = "Slm";
//         roomId = uuid.v4();
//         notifyUsers = await slmModel.find({ _id: { $ne: id } });
//         allowedMembers = notifyUsers;
//         TeamName = slm.TeamName;

//         slm.Flm.forEach((flm) => {
//           flm.Mrs.forEach((mr) => {
//             players.push(mr._id.toString());
//           });
//         });
//       } else {
//         const flm = await flmModel.findById(id).populate("Mrs");

//         if (flm) {
//           creatorRole = "Flm";
//           roomId = uuid.v4();
//           notifyUsers = await flmModel.find({ _id: { $ne: id } });
//           allowedMembers = notifyUsers;
//           TeamName = flm.TeamName;

//           flm.Mrs.forEach((mr) => {
//             players.push(mr._id.toString());
//           });
//         } else {
//           return res
//             .status(403)
//             .json({ message: "Only TLM, SLM, or FLM can create a challenge." });
//         }
//       }
//     }

//     // Update isMatchOn for all players in MR model
//     await Promise.all(
//       players.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           mrExist.TEAMNAME = TeamName;
//           await mrExist.save();
//         }
//       })
//     );

//     notifyUsers.forEach((user) => {
//       io.to(user._id.toString()).emit("challengeRequest", {
//         roomId,
//         creatorRole,
//         teamName: TeamName,
//         creatorId: id,
//         message: `${creatorRole} has created a new challenge.`,
//         challengeDate,
//         membersAccepted: [],
//         maxAccepts,
//       });
//     });

//     const RoomCreate = await new RoomModel({
//       roomId: roomId,
//       creatorRole: creatorRole,
//       teamName: TeamName,
//       creatorId: id,
//       challengeDate: challengeDate,
//       maxAccepts: maxAccepts,
//       allowedMembers: allowedMembers,
//       players: players,
//     });
//     const data = await RoomCreate.save();

//     if (data) {
//       io.emit("roomDetail_Updated", data);
//     }

//     rooms[roomId] = {
//       creatorRole,
//       creatorId: id,
//       teamName: TeamName,
//       allowedMembers,
//       players,
//       membersAccepted: [],
//       challengeDate,
//       maxAccepts,
//     };

//     io.to(roomId).emit("roomCreated", {
//       roomId,
//       creatorRole,
//       teamName: TeamName,
//       creatorId: id,
//       challengeDate,
//       maxAccepts,
//     });

//     res.status(200).json({ message: "Challenge request sent.", roomId });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

//Test Match Changes

const sendChallengeByManager = async (req, res) => {
  const { id } = req.params;
  const { challengeDate, maxAccepts, challengeEndDate } = req.body;
  const io = getIo();

  try {
    // Check if challengeDate is in "DD-MM-YYYY" format
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    if (
      !datePattern.test(challengeDate) ||
      !datePattern.test(challengeEndDate)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use DD-MM-YYYY." });
    }

    // Get MatchDuration value
    const MatchDuration = await MatchScheduleData.find({});
    if (
      !MatchDuration.length ||
      MatchDuration[0].SetMatchDurationBefore == null
    ) {
      return res.status(500).json({
        message:
          "SetMatchDurationBefore value is missing in MatchDuration data.",
      });
    }
    const setMatchDurationBefore = MatchDuration[0].SetMatchDurationBefore;

    // Parse today's date
    const today = new Date();

    // Calculate the earliest valid challenge date based on SetMatchDurationBefore
    const minChallengeDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + parseInt(setMatchDurationBefore)
    );

    // Parse the challengeDate from the request
    const [day, month, year] = challengeDate.split("-").map(Number);
    const challengeDateObj = new Date(year, month - 1, day);
    const [day1, month1, year1] = challengeEndDate.split("-").map(Number);
    const challengeEndDateObj = new Date(year1, month1 - 1, day1);

    // Check if the challengeDate is valid
    if (challengeDateObj < minChallengeDate) {
      return res.status(404).json({
        success: false,
        message: `Challenge start date should be at least ${setMatchDurationBefore} day(s) greater than today.`,
      });
    }
    // if (challengeEndDateObj < minChallengeDate) {
    //   return res.status(404).json({
    //     success: false,
    //     message: `Challenge End date should be at least ${setMatchDurationBefore} day(s) greater than today.`,
    //   });
    // }
    // if (challengeEndDateObj < challengeDateObj) {
    //   return res.status(404).json({
    //     success: false,
    //     message: `Challenge End date should not less than Challenge Start Date`,
    //   });
    // }

    // Logic to handle challenge creation
    let creatorRole,
      roomId,
      allowedMembers = [],
      notifyUsers = [],
      players = [],
      TeamName = "";

    const tlm = await tlmModel.findById(id).populate({
      path: "Slm",
      populate: { path: "Flm", populate: { path: "Mrs" } },
    });

    if (tlm) {
      creatorRole = "Tlm";
      roomId = uuid.v4();
      notifyUsers = await tlmModel.find({ _id: { $ne: id } });
      allowedMembers = notifyUsers;
      TeamName = tlm.TeamName;

      tlm.Slm.forEach((slm) => {
        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        });
      });
    } else {
      const slm = await slmModel.findById(id).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      });

      if (slm) {
        creatorRole = "Slm";
        roomId = uuid.v4();
        notifyUsers = await slmModel.find({ _id: { $ne: id } });
        allowedMembers = notifyUsers;
        TeamName = slm.TeamName;

        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        });
      } else {
        const flm = await flmModel.findById(id).populate("Mrs");

        if (flm) {
          creatorRole = "Flm";
          roomId = uuid.v4();
          notifyUsers = await flmModel.find({ _id: { $ne: id } });
          allowedMembers = notifyUsers;
          TeamName = flm.TeamName;

          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        } else {
          return res
            .status(403)
            .json({ message: "Only TLM, SLM, or FLM can create a challenge." });
        }
      }
    }

    // Update isMatchOn for all players in MR model
    await Promise.all(
      players.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
          mrExist.TEAMNAME = TeamName;
          mrExist.isMatchOn = true;
          await mrExist.save();
        }
      })
    );

    notifyUsers.forEach((user) => {
      io.to(user._id.toString()).emit("challengeRequest", {
        roomId,
        creatorRole,
        teamName: TeamName,
        creatorId: id,
        message: `${creatorRole} has created a new challenge.`,
        challengeDate,
        membersAccepted: [],
        maxAccepts,
      });
    });

    const RoomCreate = await new RoomModel({
      roomId: roomId,
      creatorRole: creatorRole,
      teamName: TeamName,
      creatorId: id,
      challengeDate: challengeDate,
      challengeEndDate: challengeEndDate,
      maxAccepts: maxAccepts,
      allowedMembers: allowedMembers,
      players: players,
    });
    const data = await RoomCreate.save();

    if (data) {
      io.emit("roomDetail_Updated", data);
    }

    rooms[roomId] = {
      creatorRole,
      creatorId: id,
      teamName: TeamName,
      allowedMembers,
      players,
      membersAccepted: [],
      challengeDate,
      maxAccepts,
    };

    io.to(roomId).emit("roomCreated", {
      roomId,
      creatorRole,
      teamName: TeamName,
      creatorId: id,
      challengeDate,
      maxAccepts,
    });

    res.status(200).json({ message: "Challenge request sent.", roomId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const canJoinRoom = (roomId, playerId) => {
  const room = rooms[roomId];
  const today = moment().format("DD-MM-YYYY"); // Adjusted to match the two-digit year format

  if (!room) {
    return { status: false, message: `Room with ID ${roomId} not found.` };
  }

  // Check if the challenge is for today
  if (room.challengeDate !== today) {
    return { status: false, message: "Challenge is not scheduled for today." };
  }

  const currentAcceptedCount = room.membersAccepted.length;
  const isAllowedMember = room.allowedMembers.some(
    (member) => member._id.toString() === playerId
  );
  const hasNotJoined = !room.membersAccepted.includes(playerId);
  const hasSpace = currentAcceptedCount < room.maxAccepts;

  if (!hasSpace) {
    return { status: false, message: "The room is already full." };
  }

  if (!isAllowedMember) {
    return { status: false, message: "You are not allowed to join this room." };
  }

  if (!hasNotJoined) {
    return { status: false, message: "You have already joined this room." };
  }

  return { status: true, message: "User can join the room." };
};

// const joinChallengeRoom = async (req, res) => {
//   const { id } = req.params; // User ID from request parameters
//   const { roomId } = req.body; // Room ID from request body
//   const io = getIo();

//   try {
//     const room = await RoomModel.findOne({ roomId: roomId });

//     if (!room) {
//       return res.status(404).json({ message: "Room not found." });
//     }

//     // Check if the user is the creator of the room
//     if (room.creatorId === id) {
//       return res.status(403).json({
//         message: "You are the creator of the room; you can't join as a member.",
//       });
//     }

//     // Format today's date as "DD-MM-YYYY"
//     const today = new Date();
//     const formattedToday = `${String(today.getDate()).padStart(
//       2,
//       "0"
//     )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

//     // Check if challengeDate matches today
//     // if (room.challengeDate !== formattedToday) {
//     //   return res
//     //     .status(403)
//     //     .json({ message: "Challenge is expired or not for today" });
//     // }

//     let userRole;
//     let creatorId;
//     let userTeam;
//     let opponentTeam;

//     // Fetch user data based on hierarchy
//     let user =
//       (await tlmModel.findById(id).populate({
//         path: "Slm",
//         populate: { path: "Flm", populate: { path: "Mrs" } },
//       })) ||
//       (await slmModel.findById(id).populate({
//         path: "Flm",
//         populate: { path: "Mrs" },
//       })) ||
//       (await flmModel.findById(id).populate("Mrs"));

//     userRole = user ? user.constructor.modelName : null;
//     creatorId = room.creatorId || "";
//     userTeam = user.TeamName || "";
//     opponentTeam = room.teamName;

//     if (!userRole || userRole !== room.creatorRole) {
//       return res
//         .status(403)
//         .json({ message: `Only ${room.creatorRole}s can join this room.` });
//     }

//     if (room.membersAccepted.includes(id)) {
//       return res
//         .status(403)
//         .json({ message: "User has already joined the room." });
//     }

//     let mrIds = [];
//     if (userRole === "Tlm") {
//       user.Slm.forEach((slm) => {
//         slm.Flm.forEach((flm) => {
//           flm.Mrs.forEach((mr) => {
//             mr.TEAMNAME = userTeam;
//             mrIds.push(mr._id.toString());
//           });
//         });
//       });
//     } else if (userRole === "Slm") {
//       user.Flm.forEach((flm) => {
//         flm.Mrs.forEach((mr) => {
//           mr.TEAMNAME = userTeam;
//           mrIds.push(mr._id.toString());
//         });
//       });
//     } else if (userRole === "Flm") {
//       user.Mrs.forEach((mr) => {
//         mr.TEAMNAME = userTeam;
//         mrIds.push(mr._id.toString());
//       });
//     }

//     const playerBarray = [];
//     // room.players.push(...mrIds);

//     playerBarray.push(...mrIds);
//     room.membersAccepted.push(id);
//     room.allowedMembers = room.allowedMembers.filter(
//       (member) => member._id.toString() !== id
//     );

//     // Save match data to MatchesSchema
//     const Data = new MatchesSchema({
//       creatorId: creatorId,
//       creatorRole: userRole,
//       teamA: opponentTeam,
//       teamB: userTeam,
//       startDate: room.challengeDate,
//       endDate: room.challengeDate,
//       roomId: roomId,
//       roomPlayers: room.players.concat(playerBarray),
//       roomPlayersA: room.players,
//       roomPlayersB: playerBarray,
//       membersAccepted: room.membersAccepted,
//     });

//     const MatchData = await Data.save();

//     if (MatchData) {
//       io.emit("Match_Updated", MatchData);
//     }

//     // Set isMatchOn for each MR in the players array and save
//     const isAllUserMatchOn = await Promise.all(
//       room.players.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           // mrExist.isMatchOn = true;
//           mrExist.MatchId = MatchData._id;
//           mrExist.lastMatchRecord.push(MatchData._id);
//           return mrExist.save();
//         }
//         return null;
//       })
//     );
//     io.emit("Join_Status_Updated", isAllUserMatchOn);

//     // Update each MR's TEAMNAME in the current user's team and save it
//     const JoinChallenge = await Promise.all(
//       mrIds.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           // mrExist.isMatchOn = true;
//           mrExist.MatchId = MatchData._id;
//           mrExist.lastMatchRecord.push(MatchData._id);
//           mrExist.TEAMNAME = userTeam; // Ensure TEAMNAME is updated in the database
//           return mrExist.save();
//         }
//         return null;
//       })
//     );

//     io.emit("Join_Status_Updated", JoinChallenge);

//     io.to(id).emit("joinChallenge", { roomId });

//     res.status(200).json({ message: "Successfully joined the room.", roomId });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

const joinChallengeRoom = async (req, res) => {
  const { id } = req.params; // User ID from request parameters
  const { roomId } = req.body; // Room ID from request body
  const io = getIo();

  try {
    const room = await RoomModel.findOne({ roomId: roomId });

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    // Check if the user is the creator of the room
    if (room.creatorId === id) {
      return res.status(403).json({
        message: "You are the creator of the room; you can't join as a member.",
      });
    }

    // Format today's date as "DD-MM-YYYY"
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(
      2,
      "0"
    )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

    // Check if challengeDate matches today
    // if (room.challengeDate !== formattedToday) {
    //   return res
    //     .status(403)
    //     .json({ message: "Challenge is expired or not for today" });
    // }

    let userRole;
    let creatorId;
    let userTeam;
    let opponentTeam;

    // Fetch user data based on hierarchy
    let user =
      (await tlmModel.findById(id).populate({
        path: "Slm",
        populate: { path: "Flm", populate: { path: "Mrs" } },
      })) ||
      (await slmModel.findById(id).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      })) ||
      (await flmModel.findById(id).populate("Mrs"));

    userRole = user ? user.constructor.modelName : null;
    creatorId = room.creatorId || "";
    userTeam = user.TeamName || "";
    opponentTeam = room.teamName;

    if (!userRole || userRole !== room.creatorRole) {
      return res
        .status(403)
        .json({ message: `Only ${room.creatorRole}s can join this room.` });
    }

    if (room.membersAccepted.includes(id)) {
      return res
        .status(403)
        .json({ message: "User has already joined the room." });
    }

    let mrIds = [];
    if (userRole === "Tlm") {
      user.Slm.forEach((slm) => {
        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            mr.TEAMNAME = userTeam;
            mrIds.push(mr._id.toString());
          });
        });
      });
    } else if (userRole === "Slm") {
      user.Flm.forEach((flm) => {
        flm.Mrs.forEach((mr) => {
          mr.TEAMNAME = userTeam;
          mrIds.push(mr._id.toString());
        });
      });
    } else if (userRole === "Flm") {
      user.Mrs.forEach((mr) => {
        mr.TEAMNAME = userTeam;
        mrIds.push(mr._id.toString());
      });
    }

    const playerBarray = [];
    // room.players.push(...mrIds);

    playerBarray.push(...mrIds);
    room.membersAccepted.push(id);
    room.allowedMembers = room.allowedMembers.filter(
      (member) => member._id.toString() !== id
    );

    // Save match data to MatchesSchema
    const Data = new MatchesSchema({
      creatorId: creatorId,
      creatorRole: userRole,
      teamA: opponentTeam,
      teamB: userTeam,
      startDate: room.challengeDate,
      endDate: room.challengeEndDate,
      roomId: roomId,
      roomPlayers: room.players.concat(playerBarray),
      roomPlayersA: room.players,
      roomPlayersB: playerBarray,
      membersAccepted: room.membersAccepted,
    });

    const MatchData = await Data.save();

    if (MatchData) {
      io.emit("Match_Updated", MatchData);
    }

    // Set isMatchOn for each MR in the players array and save
    const isAllUserMatchOn = await Promise.all(
      room.players.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
          mrExist.isMatchOn = true;
          mrExist.MatchId = MatchData._id;
          mrExist.lastMatchRecord.push(MatchData._id);
          return mrExist.save();
        }
        return null;
      })
    );
    io.emit("Join_Status_Updated", isAllUserMatchOn);

    // Update each MR's TEAMNAME in the current user's team and save it
    const JoinChallenge = await Promise.all(
      mrIds.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
          mrExist.isMatchOn = true;
          mrExist.MatchId = MatchData._id;
          mrExist.lastMatchRecord.push(MatchData._id);
          mrExist.TEAMNAME = userTeam; // Ensure TEAMNAME is updated in the database
          return mrExist.save();
        }
        return null;
      })
    );

    io.emit("Join_Status_Updated", JoinChallenge);

    io.to(id).emit("joinChallenge", { roomId });

    res.status(200).json({ message: "Successfully joined the room.", roomId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const deleteChallengeRoom = async (req, res) => {
  try {
    const { roomId, creatorId } = req.params;
    const rooms = getRooms();

    const room = rooms[roomId]; // Access the room by roomId

    // Check if the room exists and if the creatorId matches
    if (room && room.creatorId === creatorId) {
      delete rooms[roomId]; // Delete the room from the rooms object

      return res.status(200).json({
        success: true,
        message: `Room with ID ${roomId} has been deleted successfully.`,
      });
    }

    // If the room doesn't exist or the creatorId doesn't match
    return res.status(404).json({
      success: false,
      message: `Room with ID ${roomId} not found or unauthorized action.`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the room.",
    });
  }
};

// Retrieve all created room details
// const getAllCreatedRoomDetails = async (req, res) => {
//   try {
//     const rooms = await RoomModel.find({});

//     const today = new Date();
//     const minChallengeDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate()
//     );

//     // Map through rooms to include only the necessary details
//     const roomDetails = Object.keys(rooms).map((roomId) => ({
//       roomId: rooms[roomId].roomId,
//       creatorRole: rooms[roomId].creatorRole,
//       TeamName: rooms[roomId].teamName,
//       creatorId: rooms[roomId].creatorId,
//       allowedMembers: rooms[roomId].allowedMembers,
//       players: rooms[roomId].players,
//       membersAccepted: rooms[roomId].membersAccepted, // Include membersAccepted in the response
//       challengeDate: rooms[roomId].challengeDate,
//       maxAccepts: rooms[roomId].maxAccepts,
//       RejectedManager: rooms[roomId].RejectedManager,
//       AcceptedManager: rooms[roomId].AcceptedManager,
//     }));

//     // Send response back to the client
//     res.status(200).json({
//       success: true,
//       rooms: roomDetails, // Returning the detailed room information
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching room details.",
//     });
//   }
// };

// const getAllCreatedRoomDetails = async (req, res) => {
//   try {
//     const rooms = await RoomModel.find({});

//     const today = new Date();
//     const minChallengeDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate()
//     );

//     // Filter and map the rooms to include only the necessary details
//     const roomDetails = rooms
//       // .filter((room) => {
//       //   const [day, month, year] = room.challengeDate.split("-").map(Number);
//       //   const challengeDateObj = new Date(year, month - 1, day);
//       //   return challengeDateObj > minChallengeDate; // Include only rooms with a valid challenge date
//       // })
//       .filter((room) => {
//         const [day, month, year] = room.challengeDate.split("-").map(Number);
//         const challengeDateObj = new Date(year, month - 1, day);
//         console.log(`Room Date: ${challengeDateObj}, Min Date: ${minChallengeDate}`);
//         return challengeDateObj > minChallengeDate;
//       })
//       .map((room) => ({
//         roomId: room.roomId,
//         creatorRole: room.creatorRole,
//         TeamName: room.teamName,
//         creatorId: room.creatorId,
//         allowedMembers: room.allowedMembers,
//         players: room.players,
//         membersAccepted: room.membersAccepted, // Include membersAccepted in the response
//         challengeDate: room.challengeDate,
//         challengeEndDate: room.challengeEndDate,
//         maxAccepts: room.maxAccepts,
//         RejectedManager: room.RejectedManager,
//         AcceptedManager: room.AcceptedManager,
//       }));

//     // // Check if no valid rooms were found
//     // if (roomDetails.length === 0) {
//     //   return res.status(404).json({
//     //     success: false,
//     //     message: "No challenge room found for today.",
//     //   });
//     // }

//     // Send response back to the client
//     res.status(200).json({
//       success: true,
//       rooms: roomDetails,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching room details.",
//     });
//   }
// };

const getAllCreatedRoomDetails = async (req, res) => {
  try {
    const rooms = await RoomModel.find({});

    const today = new Date();
    const minChallengeDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Filter and map the rooms to include only those with today's date
    const roomDetails = rooms
      .filter((room) => {
        const [day, month, year] = room.challengeDate.split("-").map(Number);
        const challengeDateObj = new Date(year, month - 1, day);

        // Check if the dates are equal
        return challengeDateObj.getTime() === minChallengeDate.getTime();
      })
      .map((room) => ({
        roomId: room.roomId,
        creatorRole: room.creatorRole,
        TeamName: room.teamName,
        creatorId: room.creatorId,
        allowedMembers: room.allowedMembers,
        players: room.players,
        membersAccepted: room.membersAccepted, // Include membersAccepted in the response
        challengeDate: room.challengeDate,
        challengeEndDate: room.challengeEndDate,
        maxAccepts: room.maxAccepts,
        RejectedManager: room.RejectedManager,
        AcceptedManager: room.AcceptedManager,
      }));

    // Send response back to the client
    res.status(200).json({
      success: true,
      rooms: roomDetails,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching room details.",
    });
  }
};

const getRoomByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = getRooms()[roomId];

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Match Fetch Success",
      room,
    });
  } catch (error) {
    console.log(error);
  }
};

// const expireRoom = async () => {
//   try {
//     // Set 'today' to the current date at 12 am
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const todayDate = DateTime.fromJSDate(today).startOf("day").toISODate();

//     for (const roomId in rooms) {
//       const room = rooms[roomId];
//       const challengeDate = DateTime.fromISO(room.challengeDate)
//         .setZone("your-time-zone")
//         .startOf("day")
//         .toISODate();

//       // If today's date does not match the room's challenge date
//       if (todayDate !== challengeDate) {
//         // Update isMatchOn to false for all players in the room
//         const Data = await Promise.all(
//           room.players.map(async (playerId) => {
//             const mrExist = await mrModel.findById(playerId);
//             if (mrExist) {
//               mrExist.isMatchOn = false;
//               return mrExist.save();
//             }
//             return null;
//           })
//         );
//         const io = socket.getIo(); // Get the Socket.IO instance
//         io.emit("Join_Status_Updated", Data);

//         // Remove the room from active rooms or mark it as expired
//         delete rooms[roomId];
//       }
//     }

//     console.log("Room expiration check completed.".bgYellow);
//   } catch (error) {
//     console.error("Error expiring rooms:", error);
//   }
// };

const expireRoom = async () => {
  try {
    const io = getIo();
    const nowIST = DateTime.now().setZone("Asia/Kolkata");
    const todayDate = nowIST.startOf('day').toISODate();
    
    console.log("=== EXPIRE ROOM CHECK ===");
    console.log("Current DateTime (IST):", nowIST.toString());
    console.log("Today Date (IST midnight):", todayDate);
    
    const matches = await MatchDetails.find();
    const Data = [];
    
    const expiredMatchIds = [];
    const activeMatchIds = [];
    
    for (const match of matches) {
      // Parse END date
      const [endDay, endMonth, endYear] = match.endDate.split("-");
      const matchEndDate = DateTime.fromObject(
        { year: parseInt(endYear), month: parseInt(endMonth), day: parseInt(endDay), hour: 23, minute: 59, second: 59 },
        { zone: "Asia/Kolkata" }
      );
      
      // ✅ Parse START date
      const [startDay, startMonth, startYear] = match.startDate.split("-");
      const matchStartDate = DateTime.fromObject(
        { year: parseInt(startYear), month: parseInt(startMonth), day: parseInt(startDay), hour: 0, minute: 0, second: 0 },
        { zone: "Asia/Kolkata" }
      );
      
      console.log(`\n--- Match: ${match.roomId} ---`);
      console.log(`  Start: ${match.startDate}, End: ${match.endDate}`);
      console.log(`  Match started? ${nowIST >= matchStartDate}`);
      console.log(`  Match ended? ${nowIST > matchEndDate}`);
      
      // ✅ Check if match has ENDED
      if (nowIST > matchEndDate) {
        console.log(`  ❌ Match has ENDED`);
        expiredMatchIds.push(match._id.toString());
      } 
      // ✅ Check if match is CURRENTLY ACTIVE (started AND not ended)
      else if (nowIST >= matchStartDate && nowIST <= matchEndDate) {
        console.log(`  ✅ Match is CURRENTLY ACTIVE`);
        activeMatchIds.push(match._id.toString());
      } 
      // ✅ Match hasn't started yet
      else {
        console.log(`  ⏳ Match NOT STARTED YET (future)`);
      }
    }
    
    console.log("\n=== Expired Matches:", expiredMatchIds.length);
    console.log("=== Active Matches:", activeMatchIds.length);
    
    // Process all MRs
    const allMRs = await mrModel.find({ isMatchOn: true });
    
    for (const mr of allMRs) {
      const isInActiveMatch = await MatchDetails.findOne({
        _id: { $in: activeMatchIds },
        roomPlayers: mr._id
      });
      
      if (!isInActiveMatch) {
        console.log(`  📴 Setting isMatchOn = false for ${mr.USERNAME} (no active match)`);
        mr.isMatchOn = false;
        await mr.save();
        Data.push(mr);
      } else {
        console.log(`  ✅ Keeping isMatchOn = true for ${mr.USERNAME} (in active match: ${isInActiveMatch.startDate} to ${isInActiveMatch.endDate})`);
      }
    }
    
    console.log("\n=== Room status update completed ===");
    console.log(`Total players updated: ${Data.length}`);
    
    if (Data.length > 0) {
      io.emit("Join_Status_Updated", Data);
    }
    
    updateMatchStatus();
  } catch (error) {
    console.error("Error in expireRoom:", error);
    console.error(error.stack);
  }
};

schedule.scheduleJob("0 0 * * *", () => {
  console.log("Running scheduled expireRoom job at midnight IST...");
  console.log("Current server time:", new Date().toString());
  expireRoom();
});

// For testing: Run once manually to see logs (comment out after testing)
// expireRoom().then(() => console.log("Manual test run complete"));

async function getTokensFromFirestore() {
  try {
    const tokens = new Set(); // Use a Set to avoid duplicate tokens

    const usersCollection = admin.firestore().collection("users");

    const usersSnapshot = await usersCollection.get();

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (
        userData &&
        userData.deviceTokens &&
        Array.isArray(userData.deviceTokens)
      ) {
        userData.deviceTokens.forEach((token) => tokens.add(token)); // Add tokens to the Set
      }
    });

    return Array.from(tokens); // Convert Set back to Array
  } catch (error) {
    console.error("Error getting tokens from Firestore:", error);
    return []; // Return an empty array in case of error
  }
}

const getRandomString = (array) =>
  array[Math.floor(Math.random() * array.length)];

const tomorrowMatchAlert = [
  "Stay focused and ready to shine in the upcoming match!",
  "Tomorrow’s match will test your skills. Be ready to give your best performance!",
  "Exciting Match Ahead Tomorrow! All the Best",
  "Get ready for tomorrow's match! The field awaits your skills. Make sure your'e all set!",
  "The field is calling! Tomorrow, you’ll take your marketing skills to the next level. Get ready!",
  "Tomorrow's match is fast approaching, and it's your time to shine on the field.",
];

const updateMatchStatus = async () => {
  try {
    const io = getIo();
    // Set 'today' to the current date at 12 am
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight local time
    const todayDate = DateTime.fromJSDate(today)
      .setZone("Asia/Kolkata") // Convert to IST timezone
      .toISODate(); // Get only the date in yyyy-mm-dd format
    // Fetch all match details
    const matches = await MatchDetails.find();

    const Data = [];
    let userIdSendTo = [];
    let userIdSendTomorrowMatch = [];

    async function sendMatchAlerts(userIdsToSendTo, notificationPayload) {
      try {
        if (!userIdsToSendTo || userIdsToSendTo.length === 0) {
          console.log("No users to send notifications to.");
          return;
        }

        const messages = [];

        // Use a batched read to retrieve multiple user documents efficiently
        const userDocs = await Promise.all(
          userIdsToSendTo.map((userId) =>
            admin.firestore().collection("users").doc(userId).get()
          )
        );

        for (const userDoc of userDocs) {
          if (!userDoc.exists) {
            // console.log(`User with ID ${userDoc.id} not found.`);
            continue; // Skip to the next user
          }

          const userData = userDoc.data();
          const deviceToken = userData.deviceTokens; // Access the token directly

          if (!deviceToken || !Array.isArray(deviceToken)) {
            console.log(`No valid device tokens found for user ${userDoc.id}.`);
            continue;
          }

          for (const token of deviceToken) {
            messages.push({
              token,
              notification: notificationPayload.notification,
              data: notificationPayload.data,
            });
          }
          if (messages.length > 0) {
            const responses = await Promise.all(
              messages.map((message) => admin.messaging().send(message))
            );

            let successfulSends = 0;
            let failedSends = 0;

            responses.forEach((response) => {
              if (response.successCount === 1) {
                successfulSends++;
              } else if (response.failureCount === 1) {
                failedSends++;
              }
            });
          } else {
            console.log("No messages to send (no valid tokens found).");
          }
        }
      } catch (error) {
        console.error("Error sending messages:", error);
      }
    }

    for (const match of matches) {
      const [day, month, year] = match.startDate.split("-"); // Assuming match.startDate is in dd-mm-yyyy format
      const [day1, month1, year1] = match.endDate.split("-"); // Assuming match.startDate is in dd-mm-yyyy format
      const challengeDate = DateTime.fromISO(`${year}-${month}-${day}`)
        .setZone("Asia/Kolkata") // Convert to IST timezone
        .toISODate();

      const challengeEndDate = DateTime.fromISO(`${year1}-${month1}-${day1}`)
        .setZone("Asia/Kolkata") // Convert to IST timezone
        .toISODate();

      // If today's date does not match the room's challenge date
      // if (todayDate === challengeDate) {
      //   const updatedPlayers = await Promise.all(
      //     match.roomPlayers.map(async (playerId) => {
      //       const mrExist = await mrModel.findById(playerId);
      //       if (mrExist) {
      //         mrExist.isMatchOn = true;
      //         await mrExist.save(); // Save the updated document
      //         return mrExist; // Return the updated document
      //       }
      //       return null;
      //     })
      //   );

      //   Data.push(...updatedPlayers.filter((player) => player !== null));
      //   // Emit the updated players after all processing is done
      //   io.emit(
      //     "Join_Status_Updated",
      //     updatedPlayers.filter((player) => player !== null)
      //   );
      // }
      const today1 = new Date();
      const todayDate1 = DateTime.fromJSDate(today1)
        .setZone("Asia/Kolkata") // Convert to IST timezone
        .toISODate(); // Get only the date in yyyy-mm-dd format
      if (
        todayDate1 === challengeDate ||
        (todayDate1 >= challengeEndDate && todayDate1 <= challengeEndDate)
      ) {
        const updatedPlayers = await Promise.all(
          match.roomPlayers.map(async (playerId) => {
            const mrExist = await mrModel.findById(playerId);
            if (mrExist) {
              // Check if the player is in team A or team B
              if (match.roomPlayersA.includes(playerId)) {
                mrExist.TEAMNAME = match.teamA; // Assign teamA
                // console.log('TeamA',match.roomPlayersA.includes(playerId))
              } else if (match.roomPlayersB.includes(playerId)) {
                mrExist.TEAMNAME = match.teamB; // Assign teamB
                // console.log('TeamB',match.roomPlayersB.includes(playerId))
              }
              userIdSendTo.push(mrExist.MRID);
              mrExist.isMatchOn = true; // Set isMatchOn to true
              await mrExist.save(); // Save the updated document
              return mrExist; // Return the updated document
            }
            return null; // Return null if no document was found
          })
        );

        Data.push(...updatedPlayers.filter((player) => player !== null));
        // Emit the updated players after all processing is done
        io.emit(
          "Join_Status_Updated",
          updatedPlayers.filter((player) => player !== null)
        );
      }

      const today = new Date();
      // Format today's date as DD-MM-YYYY
      const formattedToday = today
        .toLocaleDateString("en-GB") // Generates DD/MM/YYYY
        .replace(/\//g, "-"); // Replace '/' with '-'
      const todayDate = parseDate(formattedToday);

      const startDate = parseDate(match.startDate);

      // Check if startDate is exactly one day after todayDate
      const isOneDayAfter =
        startDate.getTime() === todayDate.getTime() + 24 * 60 * 60 * 1000;

      if (isOneDayAfter) {
        await Promise.all(
          match.roomPlayers.map(async (playerId) => {
            const mrExist = await mrModel.findById(playerId);
            if (mrExist) {
              userIdSendTomorrowMatch.push(mrExist.MRID);
            }
            return null; // Return null if no document was found
          })
        );
        // (async function sendMessage() {
        //   // Fetch the tokens from an external datastore (e.g. database)
        //   const tokens = await getTokensFromFirestore();
        //   const msgAlert = getRandomString(tomorrowMatchAlert);
        //   const message = {
        //     //Define message object
        //     tokens: tokens,
        //     notification: {
        //       title: "Match Alert",
        //       body: msgAlert,
        //     },
        //     data: {
        //       title: "Match Alert",
        //       body: msgAlert,
        //     },
        //   };
        //   const response = await admin
        //     .messaging()
        //     .sendEachForMulticast(message); //Correct usage
        //   console.log(
        //     response.successCount + " messages were sent successfully"
        //   );
        //   console.log(response.failureCount + " messages failed to send");
        // })();
      }
    }

    if (userIdSendTomorrowMatch.length > 0) {
      const msgAlert = getRandomString(tomorrowMatchAlert);
      const notification = {
        notification: {
          title: "Match Alert",
          body: msgAlert,
        },
        data: {
          title: "Match Alert",
          body: msgAlert,
          type: "TomorrowsMatchAlert",
          messageId: uuid.v4(),
        },
      };
      sendMatchAlerts(userIdSendTomorrowMatch, notification);
    }
    setTimeout(() => {
      if (userIdSendTo.length > 0) {
        const notification = {
          notification: {
            title: "Match Alert",
            body: "You have a Match Scheduled Today. Please Check.",
          },
          data: {
            title: "Match Alert",
            body: "You have a Match Scheduled Today. Please Check.",
            type: "MatchAlertToday",
            messageId: uuid.v4(),
          },
        };
        sendMatchAlerts(userIdSendTo, notification);
      }
    }, 100);

    console.log("Match Status Updated Success.".bgGreen.black);
  } catch (error) {
    console.error("Error expiring rooms:", error);
  }
};

// const tomorrowsMatch = async () => {
//   try {
//     const matches = await MatchDetails.find();
//     for (const match of matches) {
//       const today = new Date();
//       const formattedToday = today
//         .toLocaleDateString("en-GB")
//         .replace(/\//g, "-");
//       const todayDate = parseDate(formattedToday);
//       const startDate = parseDate(match.startDate);

//       const matches = await MatchDetails.find();

//       for (const match of matches) {
//         await Promise.all(
//           match.roomPlayers.map(async (playerId) => {
//             const mrExist = await mrModel.findById(playerId);
//             const userDocRef = firestore.collection("users").doc(mrExist.MRID);
//             const userDocSnapshot = await userDocRef.get();

//             // Check if startDate is exactly one day after todayDate
//             const isOneDayAfter =
//               startDate.getTime() === todayDate.getTime() + 24 * 60 * 60 * 1000;
//             if (isOneDayAfter && userDocSnapshot.exists) {
//               console.log('matchtomr')
//               (async function sendMessage() {
//                 // Fetch the tokens from an external datastore (e.g. database)
//                 const tokens = await getTokensFromFirestore();
//                 const msgAlert = getRandomString(tomorrowMatchAlert);
//                 const message = {
//                   //Define message object
//                   tokens: tokens,
//                   notification: {
//                     title: "Match Alert",
//                     body: msgAlert,
//                   },
//                   data: {
//                     title: "Match Alert",
//                     body: msgAlert,
//                   },
//                 };
//                 const response = await admin
//                   .messaging()
//                   .sendEachForMulticast(message); //Correct usage
//                 console.log(
//                   response.successCount + " messages were sent successfully"
//                 );
//                 console.log(response.failureCount + " messages failed to send");
//               })();
//             }
//           })
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error Tomorrows match:", error);
//   }
// };
// tomorrowsMatch();

// schedule.scheduleJob("0 0 * * *", () => {
//   tomorrowsMatch();
// });

// updateMatchStatus(); // run all the time for testing
//--The Below Code is for AWS Server
// Optionally, schedule this function to run daily at 12 AM (midnight) every day
// schedule.scheduleJob("0 0 * * *", () => {
//   updateMatchStatus();
// });

// const scheduleChallengeRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { challengeDate, playerAId, playerBId } = req.body;

//     const adminExist = await AdminModel.findById(id);
//     if (!adminExist) {
//       return res.status(404).json({
//         success: true,
//         message: "Admin not exist",
//       });
//     }

//     // Validate the date format and check if it's in the past
//     const datePattern = /^\d{2}-\d{2}-\d{4}$/;
//     if (!datePattern.test(challengeDate)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid date format. Use DD-MM-YYYY." });
//     }

//     const [day, month, year] = challengeDate.split("-").map(Number);
//     const challengeDateObj = new Date(year, month - 1, day);
//     const today = new Date();
//     const formattedToday = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate()
//     );

//     if (challengeDateObj < formattedToday) {
//       return res
//         .status(403)
//         .json({ message: "Challenge date cannot be in the past." });
//     }

//     let roomId = `room_${id}`;
//     let creatorRole = "";
//     let players = new Set();
//     let TeamA;
//     let TeamB;
//     let allowedMembers = [];
//     let notifyUsers = [];
//     let maxAccepts = 1

//     const fetchPlayerADetails = async (playerId) => {
//       let user = await TlmModel.findOne({ TLMEmpID: playerId }).populate({
//         path: "Slm",
//         populate: { path: "Flm", populate: { path: "Mrs" } },
//       });

//       if (user) {
//         notifyUsers = await TlmModel.find({ TLMEmpID: { $ne: playerId } });
//         allowedMembers = notifyUsers;
//         creatorRole = "Tlm";

//         user.Slm.forEach((slm) => {
//           slm.Flm.forEach((flm) => {
//             flm.Mrs.forEach(async (mr) => {
//               players.add(mr._id.toString());
//               const mrExist = await mrModel.findById(mr._id);
//               if (mrExist) {
//                 mrExist.TEAMNAME = user.TeamName;
//                 // mrExist.isMatchOn = true;
//                 return mrExist.save();
//               }
//             });
//           });
//         });
//         notifyUsers.forEach((user) => {
//           io.to(user._id.toString()).emit("challengeRequest", {
//             roomId,
//             creatorRole,
//             teamName: user.TeamName,
//             creatorId: id,
//             message: `${creatorRole} has created a new challenge.`,
//             challengeDate,
//             membersAccepted: [],
//             maxAccepts,
//           });
//         });

//         rooms[roomId] = {
//           creatorRole,
//           creatorId: id,
//           teamName: user.TeamName,
//           allowedMembers,
//           players,
//           membersAccepted: [],
//           challengeDate,
//           maxAccepts,
//         };

//         io.to(roomId).emit("roomCreated", {
//           roomId,
//           creatorRole,
//           teamName: user.TeamName,
//           creatorId: id,
//           challengeDate,
//           maxAccepts,
//         });
//         return (TeamA = user.TeamName);
//       }

//       user = await SlmModel.findOne({ SLMEmpID: playerId }).populate({
//         path: "Flm",
//         populate: { path: "Mrs" },
//       });

//       if (user) {
//         user.Flm.forEach((flm) => {
//           flm.Mrs.forEach(async (mr) => {
//             players.add(mr._id.toString());
//             const mrExist = await mrModel.findById(mr._id);
//             if (mrExist) {
//               mrExist.TEAMNAME = user.TeamName;
//               // mrExist.isMatchOn = true;
//               return mrExist.save();
//             }
//           });
//         });
//         return (TeamA = user.TeamName);
//       }

//       user = await FlmModel.findOne({ FLMEmpID: playerId }).populate("Mrs");

//       if (user) {
//         user.Mrs.forEach(async (mr) => {
//           players.add(mr._id.toString());
//           const mrExist = await mrModel.findById(mr._id);
//           if (mrExist) {
//             mrExist.TEAMNAME = user.TeamName;
//             // mrExist.isMatchOn = true;
//             return mrExist.save();
//           }
//         });
//         return (TeamA = user.TeamName);
//       }
//       return null;
//     };

//     const fetchPlayerBDetails = async (playerId) => {
//       const room = rooms[roomId];

//       if (!room) {
//         return res.status(404).json({ message: "Room not found." });
//       }

//       let user = await TlmModel.findOne({ TLMEmpID: playerId }).populate({
//         path: "Slm",
//         populate: { path: "Flm", populate: { path: "Mrs" } },
//       });

//       if (user) {
//         user.Slm.forEach((slm) => {
//           slm.Flm.forEach((flm) => {
//             flm.Mrs.forEach(async (mr) => {
//               players.add(mr._id.toString());
//               const mrExist = await mrModel.findById(mr._id);
//               if (mrExist) {
//                 mrExist.TEAMNAME = user.TeamName;
//                 // mrExist.isMatchOn = true;
//                 return mrExist.save();
//               }
//             });
//           });
//         });
//         return (TeamB = user.TeamName);
//       }

//       user = await SlmModel.findOne({ SLMEmpID: playerId }).populate({
//         path: "Flm",
//         populate: { path: "Mrs" },
//       });

//       if (user) {
//         user.Flm.forEach((flm) => {
//           flm.Mrs.forEach(async (mr) => {
//             players.add(mr._id.toString());
//             const mrExist = await mrModel.findById(mr._id);
//             if (mrExist) {
//               mrExist.TEAMNAME = user.TeamName;
//               // mrExist.isMatchOn = true;
//               return mrExist.save();
//             }
//           });
//         });
//         return (TeamB = user.TeamName);
//       }

//       user = await FlmModel.findOne({ FLMEmpID: playerId }).populate("Mrs");

//       if (user) {
//         user.Mrs.forEach(async (mr) => {
//           players.add(mr._id.toString());
//           const mrExist = await mrModel.findById(mr._id);
//           if (mrExist) {
//             mrExist.TEAMNAME = user.TeamName;
//             // mrExist.isMatchOn = true;
//             return mrExist.save();
//           }
//         });
//         return (TeamB = user.TeamName);
//       }
//       return null;
//     };

//     // Fetch details for both players
//     const teamNameA = await fetchPlayerADetails(playerAId);
//     const teamNameB = await fetchPlayerBDetails(playerBId);

//     // Set the TeamName to the first valid one found
//     TeamA = teamNameA;
//     TeamB = teamNameB;

//     if (!teamNameA && !teamNameB) {
//       return res.status(404).json({
//         success: false,
//         message: "Neither Player A nor Player B found in any role model.",
//       });
//     }

//     // Convert players Set to an array
//     players = Array.from(players);

//     const isAllUserMatchOn = await Promise.all(
//       players.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           mrExist.isMatchOn = true;
//           return mrExist.save();
//         }
//         return null;
//       })
//     );
//     io.emit("Join_Status_Updated", isAllUserMatchOn);

//     // Save room data in Matches collection
//     const matchData = new MatchesSchema({
//       creatorId: id,
//       creatorRole: creatorRole,
//       teamA: teamNameA,
//       teamB: teamNameB,
//       startDate: challengeDate,
//       endDate: challengeDate,
//       roomId: roomId,
//       roomPlayers: players,
//     });

//     const MatchData = await matchData.save();
//     if (MatchData) {
//       io.emit("Match_Updated", MatchData);
//     }

//     io.to(id).emit("joinChallenge", { roomId });

//     return res.status(200).json({
//       success: true,
//       message: "Room scheduled successfully.",
//       MatchData,
//     });
//   } catch (error) {
//     console.error("Error scheduling the challenge room:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while scheduling the room.",
//     });
//   }
// };

// const scheduleChallengeRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { challengeDate, playerAId, playerBId } = req.body;
//     const io = getIo();

//     const adminExist = await AdminModel.findById(id);
//     if (!adminExist) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not exist",
//       });
//     }

//     // Validate the date format
//     const datePattern = /^\d{2}-\d{2}-\d{4}$/;
//     if (!datePattern.test(challengeDate)) {
//       return res.status(400).json({
//         message: "Invalid date format. Use DD-MM-YYYY.",
//       });
//     }

//     // Get MatchDuration value
//     const MatchDuration = await MatchScheduleData.find({});
//     if (
//       !MatchDuration.length ||
//       MatchDuration[0].SetMatchDurationBefore == null
//     ) {
//       return res.status(500).json({
//         message:
//           "SetMatchDurationBefore value is missing in MatchDuration data.",
//       });
//     }
//     const setMatchDurationBefore = MatchDuration[0].SetMatchDurationBefore;

//     // Parse today's date
//     const today = new Date();

//     // Calculate the earliest valid challenge date based on SetMatchDurationBefore
//     const minChallengeDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate() + parseInt(setMatchDurationBefore)
//     );

//     // Parse the challengeDate from the request
//     const [day, month, year] = challengeDate.split("-").map(Number);
//     const challengeDateObj = new Date(year, month - 1, day);

//     // Check if the challengeDate is valid
//     if (challengeDateObj < minChallengeDate) {
//       return res.status(404).json({
//         success: false,
//         message: `Challenge date should be at least ${setMatchDurationBefore} day(s) greater than today.`,
//       });
//     }

//     let players = new Set();
//     let roomPlayersA = new Set();
//     let roomPlayersB = new Set();
//     let TeamA, TeamB;
//     let creatorId;
//     let membersAccepted = new Set();
//     let membersAcceptedId = new Set();
//     let allowedMembers = [];
//     let notifyUsers = []

//     // Fetch team details and assign players to the appropriate team set
//     const fetchTeamDetails = async (playerId, teamSet, playerTitle) => {
//       if (playerTitle === "PlayerB") {
//         let user = await TlmModel.findOne({ TLMEmpID: playerId }).populate({
//           path: "Slm",
//           populate: { path: "Flm", populate: { path: "Mrs" } },
//         });

//         if (user) {
//           notifyUsers = await TlmModel.find({ _id: { $ne: user._id } });
//           allowedMembers = notifyUsers;
//           creatorId = user._id;
//           user.Slm?.forEach((slm) =>
//             slm.Flm?.forEach((flm) =>
//               flm.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()))
//             )
//           );
//           return user.TeamName;
//         }

//         user = await SlmModel.findOne({ SLMEmpID: playerId }).populate({
//           path: "Flm",
//           populate: { path: "Mrs" },
//         });

//         if (user) {
//           notifyUsers = await SlmModel.find({ _id: { $ne: user._id } });
//           allowedMembers = notifyUsers;
//           creatorId = user._id;
//           user.Flm?.forEach((flm) =>
//             flm.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()))
//           );
//           return user.TeamName;
//         }

//         user = await FlmModel.findOne({ FLMEmpID: playerId }).populate("Mrs");

//         if (user) {
//           notifyUsers = await FlmModel.find({ _id: { $ne: user._id } });
//           allowedMembers = notifyUsers;
//           creatorId = user._id;
//           user.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()));
//           return user.TeamName;
//         }
//       } else {
//         let user = await TlmModel.findOne({ TLMEmpID: playerId }).populate({
//           path: "Slm",
//           populate: { path: "Flm", populate: { path: "Mrs" } },
//         });

//         if (user) {
//          membersAcceptedId.add(user._id.toString());

//           user.Slm?.forEach((slm) =>
//             slm.Flm?.forEach((flm) =>
//               flm.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()))
//             )
//           );
//           return user.TeamName;
//         }

//         user = await SlmModel.findOne({ SLMEmpID: playerId }).populate({
//           path: "Flm",
//           populate: { path: "Mrs" },
//         });

//         if (user) {
//          membersAcceptedId.add(user._id.toString());

//           user.Flm?.forEach((flm) =>
//             flm.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()))
//           );
//           return user.TeamName;
//         }

//         user = await FlmModel.findOne({ FLMEmpID: playerId }).populate("Mrs");

//         if (user) {
//          membersAcceptedId.add(user._id.toString());

//           user.Mrs?.forEach((mr) => teamSet.add(mr._id.toString()));
//           return user.TeamName;
//         }
//       }
//       return null;
//     };

//     // Fetch details for Player A and Player B
//     TeamA = await fetchTeamDetails(playerAId, roomPlayersA, "PlayerA");
//     TeamB = await fetchTeamDetails(playerBId, roomPlayersB, "PlayerB");

//     if (!TeamA && !TeamB) {
//       return res.status(404).json({
//         success: false,
//         message: "Neither Player A nor Player B found in any role model.",
//       });
//     }

//     // Combine all players for the room
//     players = new Set([...roomPlayersA, ...roomPlayersB]);
//     membersAccepted = new Set([...membersAcceptedId]);
//     let roomId = uuid.v4();

//     const RoomCreate = await new RoomModel({
//       roomId: roomId,
//       creatorRole: "Admin",
//       teamName: TeamA,
//       creatorId: creatorId,
//       challengeDate: challengeDate,
//       players: Array.from(roomPlayersA),
//       allowedMembers: allowedMembers,
//       maxAccepts: "1"
//     });
//     const data = await RoomCreate.save();

//     if (data) {
//       io.emit("roomDetail_Updated", data);
//     }

//     // Save room data in Matches collection
//     const matchData = new MatchesSchema({
//       creatorId: creatorId,
//       creatorRole: "Admin",
//       teamA: TeamA,
//       teamB: TeamB,
//       startDate: challengeDate,
//       endDate: challengeDate,
//       roomId: roomId,
//       roomPlayers: Array.from(players),
//       roomPlayersA: Array.from(roomPlayersA),
//       roomPlayersB: Array.from(roomPlayersB),
//       membersAccepted: Array.from(membersAccepted),
//     });

//     const MatchData = await matchData.save();

//     const isAllUserMatchOn = await Promise.all(
//       matchData.roomPlayers.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           // mrExist.isMatchOn = true;
//           mrExist.MatchId = MatchData._id;
//           mrExist.lastMatchRecord.push(MatchData._id);
//           return mrExist.save();
//         }
//         return null;
//       })
//     );
//     io.emit("Join_Status_Updated", isAllUserMatchOn);

//     const JoinChallenge = await Promise.all(
//       matchData.roomPlayers.map(async (playerId) => {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           mrExist.MatchId = MatchData._id;
//           mrExist.lastMatchRecord.push(MatchData._id);
//           return mrExist.save();
//         }
//         return null;
//       })
//     );
//     io.emit("Join_Status_Updated", JoinChallenge);

//     io.emit("Match_Updated", MatchData);

//     return res.status(200).json({
//       success: true,
//       message: "Room scheduled successfully.",
//       MatchData,
//     });
//   } catch (error) {
//     console.error("Error scheduling the challenge room:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while scheduling the room.",
//     });
//   }
// };

const scheduleChallengeRoom = async (req, res) => {
  const { id } = req.params;
  const { challengeDate, maxAccepts, playerAId, playerBId } = req.body;
  const io = getIo();

  try {
    const adminExists = await AdminModel.findById(id);
    if (!adminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found",
      });
    }
    // Check if challengeDate is in "DD-MM-YYYY" format
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    if (!datePattern.test(challengeDate)) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use DD-MM-YYYY." });
    }

    // Get MatchDuration value
    const MatchDuration = await MatchScheduleData.find({});
    if (
      !MatchDuration.length ||
      MatchDuration[0].SetMatchDurationBefore == null
    ) {
      return res.status(500).json({
        message:
          "SetMatchDurationBefore value is missing in MatchDuration data.",
      });
    }
    const setMatchDurationBefore = MatchDuration[0].SetMatchDurationBefore;

    // Parse today's date
    const today = new Date();

    // Calculate the earliest valid challenge date based on SetMatchDurationBefore
    const minChallengeDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + parseInt(setMatchDurationBefore)
    );

    // Parse the challengeDate from the request
    const [day, month, year] = challengeDate.split("-").map(Number);
    const challengeDateObj = new Date(year, month - 1, day);

    // Check if the challengeDate is valid
    if (challengeDateObj < minChallengeDate) {
      return res.status(404).json({
        success: false,
        message: `Challenge date should be at least ${setMatchDurationBefore} day(s) greater than today.`,
      });
    }

    // Logic to handle challenge creation
    let creatorRole,
      roomId,
      allowedMembers = [],
      notifyUsers = [],
      players = [],
      TeamName = "";
    creatorId = "";

    const tlm = await tlmModel.findOne({ TLMEmpID: playerAId }).populate({
      path: "Slm",
      populate: { path: "Flm", populate: { path: "Mrs" } },
    });

    if (tlm) {
      creatorRole = "Tlm";
      roomId = uuid.v4();
      notifyUsers = await tlmModel.find({ TLMEmpID: { $ne: playerAId } });
      allowedMembers = notifyUsers;
      TeamName = tlm.TeamName;
      creatorId = tlm._id;

      tlm.Slm.forEach((slm) => {
        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        });
      });
    } else {
      const slm = await slmModel.findOne({ SLMEmpID: playerAId }).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      });

      if (slm) {
        creatorRole = "Slm";
        roomId = uuid.v4();
        notifyUsers = await slmModel.find({ SLMEmpID: { $ne: playerAId } });
        allowedMembers = notifyUsers;
        TeamName = slm.TeamName;
        creatorId = slm._id;

        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        });
      } else {
        const flm = await flmModel
          .findOne({ FLMEmpID: playerAId })
          .populate("Mrs");

        if (flm) {
          creatorRole = "Flm";
          roomId = uuid.v4();
          notifyUsers = await flmModel.find({ FLMEmpID: { $ne: playerAId } });
          allowedMembers = notifyUsers;
          TeamName = flm.TeamName;
          creatorId = flm._id;

          flm.Mrs.forEach((mr) => {
            players.push(mr._id.toString());
          });
        } else {
          return res
            .status(403)
            .json({ message: "Only TLM, SLM, or FLM can create a challenge." });
        }
      }
    }

    // Update isMatchOn for all players in MR model
    await Promise.all(
      players.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
          mrExist.TEAMNAME = TeamName;
          await mrExist.save();
        }
      })
    );

    notifyUsers.forEach((user) => {
      io.to(user._id.toString()).emit("challengeRequest", {
        roomId,
        creatorRole,
        teamName: TeamName,
        creatorId: user._id,
        message: `${creatorRole} has created a new challenge.`,
        challengeDate,
        membersAccepted: [],
        maxAccepts,
      });
    });

    const RoomCreate = new RoomModel({
      roomId: roomId,
      creatorRole: creatorRole,
      teamName: TeamName,
      creatorId: creatorId,
      challengeDate: challengeDate,
      maxAccepts: maxAccepts,
      allowedMembers: allowedMembers,
      players: players,
      isTournament: true,
    });
    const data = await RoomCreate.save();

    if (data) {
      io.emit("roomDetail_Updated", data);
    }

    rooms[roomId] = {
      creatorRole,
      creatorId: creatorId,
      teamName: TeamName,
      allowedMembers,
      players,
      membersAccepted: [],
      challengeDate,
      maxAccepts,
    };

    io.to(roomId).emit("roomCreated", {
      roomId,
      creatorRole,
      teamName: TeamName,
      creatorId: creatorId,
      challengeDate,
      maxAccepts,
    });

    await JoinTournaMent(roomId, playerBId);

    res.status(200).json({ message: "Tournament Schedule Success.", roomId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const JoinTournaMent = async (roomId, id) => {
  // const { id } = req.params; // User ID from request parameters
  // const { roomId } = req.body; // Room ID from request body
  const io = getIo();

  try {
    const room = await RoomModel.findOne({ roomId: roomId });

    if (!room) {
      console.log("Room not found.");
    }

    // Check if the user is the creator of the room
    // if (room.creatorId === id) {
    //  console.log("You are the creator of the room; you can't join as a member.",
    //   );
    // }

    // Format today's date as "DD-MM-YYYY"
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(
      2,
      "0"
    )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

    // Check if challengeDate matches today
    // if (room.challengeDate !== formattedToday) {
    //   return res
    //     .status(403)
    //     .json({ message: "Challenge is expired or not for today" });
    // }

    let userRole;
    let creatorId;
    let userTeam;
    let opponentTeam;

    // Fetch user data based on hierarchy
    let user =
      (await tlmModel.findOne({ TLMEmpID: id }).populate({
        path: "Slm",
        populate: { path: "Flm", populate: { path: "Mrs" } },
      })) ||
      (await slmModel.findOne({ SLMEmpID: id }).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      })) ||
      (await flmModel.findOne({ FLMEmpID: id }).populate("Mrs"));

    userRole = user ? user.constructor.modelName : null;
    creatorId = room.creatorId || "";
    userTeam = user.TeamName || "";
    opponentTeam = room.teamName;

    if (!userRole || userRole !== room.creatorRole) {
      console.log(`Only ${room.creatorRole}s can join this room.`);
    }

    if (room.membersAccepted.includes(id)) {
      console.log("User has already joined the room.");
    }

    let mrIds = [];
    if (userRole === "Tlm") {
      user.Slm.forEach((slm) => {
        slm.Flm.forEach((flm) => {
          flm.Mrs.forEach((mr) => {
            mr.TEAMNAME = userTeam;
            mrIds.push(mr._id.toString());
          });
        });
      });
    } else if (userRole === "Slm") {
      user.Flm.forEach((flm) => {
        flm.Mrs.forEach((mr) => {
          mr.TEAMNAME = userTeam;
          mrIds.push(mr._id.toString());
        });
      });
    } else if (userRole === "Flm") {
      user.Mrs.forEach((mr) => {
        mr.TEAMNAME = userTeam;
        mrIds.push(mr._id.toString());
      });
    }

    const playerBarray = [];
    // room.players.push(...mrIds);

    playerBarray.push(...mrIds);
    room.membersAccepted.push(user._id);
    room.allowedMembers = room.allowedMembers.filter(
      (member) => member._id.toString() !== user._id
    );

    // Save match data to MatchesSchema
    const Data = new MatchesSchema({
      creatorId: creatorId,
      creatorRole: userRole,
      teamA: opponentTeam,
      teamB: userTeam,
      startDate: room.challengeDate,
      endDate: room.challengeEndDate,
      roomId: roomId,
      roomPlayers: room.players.concat(playerBarray),
      roomPlayersA: room.players,
      roomPlayersB: playerBarray,
      membersAccepted: room.membersAccepted,
      isTournament: true,
    });

    const MatchData = await Data.save();

    if (MatchData) {
      io.emit("Match_Updated", MatchData);
    }

    // Set isMatchOn for each MR in the players array and save
    const isAllUserMatchOn = await Promise.all(
      room.players.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
          mrExist.isMatchOn = true;
          mrExist.MatchId = MatchData._id;
          mrExist.lastMatchRecord.push(MatchData._id);
          return mrExist.save();
        }
        return null;
      })
    );
    io.emit("Join_Status_Updated", isAllUserMatchOn);

    // Update each MR's TEAMNAME in the current user's team and save it
    const JoinChallenge = await Promise.all(
      mrIds.map(async (playerId) => {
        const mrExist = await mrModel.findById(playerId);
        if (mrExist) {
           mrExist.isMatchOn = true;
          mrExist.MatchId = MatchData._id;
          mrExist.lastMatchRecord.push(MatchData._id);
          mrExist.TEAMNAME = userTeam; // Ensure TEAMNAME is updated in the database
          return mrExist.save();
        }
        return null;
      })
    );

    io.emit("Join_Status_Updated", JoinChallenge);

    io.to(id).emit("joinChallenge", { roomId });

    console.log("Successfully joined the room.", roomId);
  } catch (error) {
    console.error(error);
  }
};

// const checkAndUpdateMatches = async () => {
//   try {
//     const today = new Date();
//     // Format today's date as DD-MM-YYYY
//     const formattedToday = today
//       .toLocaleDateString("en-GB") // Generates DD/MM/YYYY
//       .replace(/\//g, "-"); // Replace '/' with '-'

//     // Fetch matches scheduled for today
//     const matches = await MatchDetails.find({
//       startDate: formattedToday, // Match with the DD-MM-YYYY format
//     });

//     for (const match of matches) {
//       // Update all players in roomPlayersA with teamA
//       for (const playerId of match.roomPlayersA) {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           await mrModel.findByIdAndUpdate(
//             playerId,
//             {
//               $set: {
//                 TEAMNAME: match.teamA,
//                 isMatchOn: true,
//                 matchDate: formattedToday,
//               },
//             },
//             { new: true }
//           );
//         }
//       }

//       // Update all players in roomPlayersB with teamB
//       for (const playerId of match.roomPlayersB) {
//         const mrExist = await mrModel.findById(playerId);
//         if (mrExist) {
//           await mrModel.findByIdAndUpdate(
//             playerId,
//             {
//               $set: {
//                 TEAMNAME: match.teamB,
//                 isMatchOn: true,
//                 matchDate: formattedToday,
//               },
//             },
//             { new: true }
//           );
//         }
//       }
//     }

//     console.log("Scheduler ran successfully at midnight.");
//   } catch (error) {
//     console.error("Error in scheduler:", error);
//   }
// };

// // Schedule the function to run daily at 12:00 AM
// cron.schedule("0 0 * * *", checkAndUpdateMatches);

const setMatchDurationRoom = async (req, res) => {
  try {
    const { SetMatchDurationBefore } = req.body;
    
    console.log("📥 Received:", SetMatchDurationBefore);

    if (SetMatchDurationBefore === undefined || SetMatchDurationBefore === null) {
      return res.status(400).json({
        success: false,
        message: "Duration is required",
      });
    }

    // ✅ UPDATE existing or create new
    const MatchDuration = await MatchScheduleData.findOneAndUpdate(
      {}, // Find first document
      { SetMatchDurationBefore: parseInt(SetMatchDurationBefore) },
      { upsert: true, new: true } // ✅ Update if exists, create if not
    );

    console.log("✅ Updated:", MatchDuration);

    return res.status(200).json({
      success: true,
      message: "Match duration set successfully",
      data: MatchDuration,
    });
  } catch (error) {
    console.error("❌ Backend Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateMatchDurationRoom = async (req, res) => {
  try {
    const id = req.params.id;
    const AdminExist = await AdminModel.findById(id);
    if (!AdminExist) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    let ScheduleId;
    const MatchDuration = await MatchScheduleData.find({});
    ScheduleId = MatchDuration[0]._id.toString();

    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();

    const updateMatchDuration = await MatchScheduleData.findByIdAndUpdate(
      { _id: ScheduleId },
      {
        $set: {
          SetMatchDurationBefore: req.body.SetMatchDurationBefore,
        },
      }
    );
    updateMatchDuration.ModifiedDate = `${day}-${month}-${year}`;
    await updateMatchDuration.save();
    return res.status(200).json({
      success: true,
      message: "Match duration updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

// const handleMrUploadData = async (req, res) => {
//   try {
//     const response = await mrModel
//       .find()
//       .select("MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch")
//       .populate("MRUploadedData MrScoreEachMatch");
//     const getMatchData = await fetch(`http://192.168.1.10:7500/api/getMatchData/${date}`)
//     res.status(200).json(response);
//   } catch (error) {
//     console.error(error);
//     const err = error.message;
//     res.status(500).json({
//       error: "Internal server error",
//       err,
//     });
//   }
// };

/*const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;
    let userExists, type, enrichedData;
    console.log("Fetching upload data for user ID:", Id);

    // ✅ CHECK IF IT'S AN MR FIRST (by MRID field)
    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) {
      type = "MR";
      console.log("✅ User is MR");
    }

    // ✅ ONLY CHECK OTHER MODELS IF IT'S A VALID OBJECTID
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);
    

    // Try to find user in different models (only if valid ObjectId)
    if (!userExists && isValidObjectId) {
      userExists = await AdminModel.findById(Id);
      if (userExists) type = "Admin";
    }
    if (!userExists && isValidObjectId) {
      userExists = await TlmModel.findById(Id).populate({
        path: "Slm",
        populate: { path: "Flm", populate: { path: "Mrs" } },
      });
      if (userExists) type = "TLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await SlmModel.findById(Id).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      });
      if (userExists) type = "SLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await FlmModel.findById(Id).populate("Mrs");
      if (userExists) type = "FLM";
    }

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize enrichedData
    enrichedData = [];

    // ✅ HANDLE MR TYPE - SHOW ALL PRESCRIPTIONS (APPROVED, REJECTED, PENDING)
    if (type === "MR") {
      console.log("📋 Processing MR - fetching all prescriptions");
      
      const response = await mrModel
        .findOne({ MRID: Id })
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      // ✅ GET ALL UPLOADS (NO FILTER) - FRONTEND WILL FILTER BY STATUS
      const allUploads = response.MRUploadedData;

      console.log(`✅ Found ${allUploads.length} total prescriptions`);

      const enrichedUploads = await Promise.all(
        allUploads.map(async (upload) => {
          const date = upload.DateOfUpload;

          try {
            const apiResponse = await fetch(
              `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
            );
            const apiData = await apiResponse.json();
            const matchData = apiData || [];

            const filteredMatchData = matchData.filter(
              (match) => match.matchDate === date
            );

            const enrichedUploads =
              filteredMatchData.length > 0
                ? filteredMatchData.map((match) => ({
                    ...upload._doc,
                    ...match,
                  }))
                : [
                    {
                      ...upload._doc,
                      matchData: [],
                    },
                  ];

            return enrichedUploads;
          } catch (err) {
            return {
              ...upload._doc,
              matchData: [],
            };
          }
        })
      );

      // ✅ ADD ALL PRESCRIPTIONS FOR MR
      if (enrichedUploads.length > 0) {
        enrichedData.push({
          ...response._doc,
          MRUploadedData: enrichedUploads.flat(),
        });
      }
    }
    // Handle different user types (SLM, FLM, TLM, Admin)
    else if (type === "SLM") {
      console.log("📋 Processing SLM - fetching pending prescriptions");
      for (const flm of userExists.Flm) {
        for (const mr of flm.Mrs) {
          const response = await mrModel
            .findById(mr._id)
            .select(
              "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
            )
            .populate("MRUploadedData MrScoreEachMatch");

          // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
          const pendingUploads = response.MRUploadedData.filter(
            (upload) => upload.Status === "Pending"
          );

          const enrichedUploads = await Promise.all(
            pendingUploads.map(async (upload) => {
              const date = upload.DateOfUpload;

              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return {
                  ...upload._doc,
                  matchData: [],
                };
              }
            })
          );

          if (enrichedUploads.length > 0) {
            enrichedData.push({
              ...response._doc,
              MRUploadedData: enrichedUploads.flat(),
            });
          }
        }
      }
    } else if (type === "FLM") {
      console.log("📋 Processing FLM - fetching pending prescriptions");
      for (const mr of userExists.Mrs) {
        const response = await mrModel
          .findById(mr._id)
          .select(
            "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
          )
          .populate("MRUploadedData MrScoreEachMatch");

        // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
        const pendingUploads = response.MRUploadedData.filter(
          (upload) => upload.Status === "Pending"
        );

        const enrichedUploads = await Promise.all(
          pendingUploads.map(async (upload) => {
            const date = upload.DateOfUpload;

            try {
              const apiResponse = await fetch(
                `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
              );
              const apiData = await apiResponse.json();
              const matchData = apiData || [];

              const filteredMatchData = matchData.filter(
                (match) => match.matchDate === date
              );

              const enrichedUploads =
                filteredMatchData.length > 0
                  ? filteredMatchData.map((match) => ({
                      ...upload._doc,
                      ...match,
                    }))
                  : [
                      {
                        ...upload._doc,
                        matchData: [],
                      },
                    ];

              return enrichedUploads;
            } catch (err) {
              return {
                ...upload._doc,
                matchData: [],
              };
            }
          })
        );

        if (enrichedUploads.length > 0) {
          enrichedData.push({
            ...response._doc,
            MRUploadedData: enrichedUploads.flat(),
          });
        }
      }
    } else if (type === "TLM") {
      console.log("📋 Processing TLM - fetching pending prescriptions");
      for (const slm of userExists.Slm) {
        for (const flm of slm.Flm) {
          for (const mr of flm.Mrs) {
            const response = await mrModel
              .findById(mr._id)
              .select(
                "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
              )
              .populate("MRUploadedData MrScoreEachMatch");

            // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
            const pendingUploads = response.MRUploadedData.filter(
              (upload) => upload.Status === "Pending"
            );

            const enrichedUploads = await Promise.all(
              pendingUploads.map(async (upload) => {
                const date = upload.DateOfUpload;

                try {
                  const apiResponse = await fetch(
                    `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                  );
                  const apiData = await apiResponse.json();
                  const matchData = apiData || [];

                  const filteredMatchData = matchData.filter(
                    (match) => match.matchDate === date
                  );

                  const enrichedUploads =
                    filteredMatchData.length > 0
                      ? filteredMatchData.map((match) => ({
                          ...upload._doc,
                          ...match,
                        }))
                      : [
                          {
                            ...upload._doc,
                            matchData: [],
                          },
                        ];

                  return enrichedUploads;
                } catch (err) {
                  return {
                    ...upload._doc,
                    matchData: [],
                  };
                }
              })
            );

            if (enrichedUploads.length > 0) {
              enrichedData.push({
                ...response._doc,
                MRUploadedData: enrichedUploads.flat(),
              });
            }
          }
        }
      }
    } else if (type === "Admin") {
      console.log("📋 Processing Admin - fetching all prescriptions");
      const response = await mrModel
        .find()
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      enrichedData = await Promise.all(
        response.map(async (item) => {
          const enrichedUploads = await Promise.all(
            item.MRUploadedData.map(async (upload) => {
              const date = upload.DateOfUpload;
              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${item._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return [
                  {
                    ...upload._doc,
                    matchData: [],
                  },
                ];
              }
            })
          );

          return {
            ...item._doc,
            MRUploadedData: enrichedUploads.flat(),
          };
        })
      );
    }

    console.log(`✅ Returning ${enrichedData.length} records`);
    enrichedData.forEach(mr => {
      if (mr.MRUploadedData && mr.MRUploadedData.length > 0) {
        mr.MRUploadedData.sort((a, b) => {
          const parseDateTime = (dateStr, timeStr) => {
            const [day, month, year] = dateStr.split('-');
            const [hours, minutes] = timeStr.split(':');
            return new Date(year, month - 1, day, hours, minutes);
          };
          
          const dateTimeA = parseDateTime(a.DateOfUpload, a.TimeOfUpload);
          const dateTimeB = parseDateTime(b.DateOfUpload, b.TimeOfUpload);
          
          return dateTimeB - dateTimeA;
        });
      }
    });  
    res.status(200).json(enrichedData);
  } catch (error) {
    console.error("❌ Error in handleGetUploadData:", error);
    res.status(500).json({
      error: "Internal server error",
      err: error.message,
    });
  }
};

*/



// ═══════════════════════════════════════════════════════════════════════════════
//  LAYER 1 — FULL RESPONSE CACHE  (the biggest win)
//
//  The entire built+enriched response for a user is cached by their ID.
//  Second request for the same user: ~0ms — just serialise and send.
//
//  TTL: 30 seconds by default. Tune per role:
//    MR    → lower (they upload frequently, want to see their own data fresh)
//    Admin → higher (large payload, less time-sensitive)
//
//  INVALIDATION: call  invalidateResponseCache(id)  anywhere you approve /
//  reject / create an upload so the next request rebuilds fresh.
// ═══════════════════════════════════════════════════════════════════════════════
const responseCache = new Map(); // key: Id → { data, expiresAt }

const RESPONSE_TTL = {
  MR:    5 * 60 * 60 * 1000,   // 3 hours
  FLM:   10 * 1000,   // 3 hours
  SLM:   10 * 1000,   // 3 hours
  TLM:   10 * 1000,   // 3 hours
  Admin: 10 * 1000,   // 3 hours
};

function getCachedResponse(id) {
  const entry = responseCache.get(id);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  responseCache.delete(id);
  return null;
}

function setCachedResponse(id, data, type) {
  responseCache.set(id, {
    data,
    expiresAt: Date.now() + (RESPONSE_TTL[type] ?? 30_000),
  });
}

// ── Call this from your approve/reject/upload routes ──────────────────────────
function invalidateResponseCache(id) {
  responseCache.delete(id);
  console.log(`🗑️  Response cache invalidated for: ${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LAYER 2 — MATCH DATA CACHE  (external API results per MR)
//
//  Prevents hammering getMatchData on every request.
//  Warm-populated once, reused across all concurrent requests.
// ═══════════════════════════════════════════════════════════════════════════════
const matchDataCache = new Map();
const MATCH_CACHE_TTL = 60_000; // 60 s

// In-flight deduplication — if two requests ask for the same MR at the same
// moment, only ONE fetch goes out; both await the same Promise.
const matchDataInflight = new Map();

async function getMatchDataCached(mrObjectId) {
  const key = mrObjectId.toString();
  const now = Date.now();

  const cached = matchDataCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  // Already fetching this MR? Return the same promise instead of a new request
  if (matchDataInflight.has(key)) return matchDataInflight.get(key);

  const promise = fetch(
    `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${key}`
  )
    .then((r) => r.json())
    .then((data) => {
      const result = data || [];
      matchDataCache.set(key, { data: result, expiresAt: Date.now() + MATCH_CACHE_TTL });
      matchDataInflight.delete(key);
      return result;
    })
    .catch(() => {
      matchDataCache.set(key, { data: [], expiresAt: Date.now() + MATCH_CACHE_TTL });
      matchDataInflight.delete(key);
      return [];
    });

  matchDataInflight.set(key, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LAYER 3 — BACKGROUND WARM-UP
//
//  Pre-fetches and caches match data for a list of MR IDs in the background
//  so by the time enrichMrData runs, everything is already in cache.
// ═══════════════════════════════════════════════════════════════════════════════
function warmMatchDataCache(mrIds) {
  // Fire-and-forget — don't await, just prime the cache silently
  for (const id of mrIds) getMatchDataCached(id).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS - Agar App Fata toh
// ═══════════════════════════════════════════════════════════════════════════════
function sortUploads(uploads) {
  return uploads.sort((a, b) => {
    const parse = (d, t) => {
      const [day, mon, yr] = d.split('-');
      const [h, m] = t.split(':');
      return new Date(yr, mon - 1, day, h, m);
    };
    return parse(b.DateOfUpload, b.TimeOfUpload) - parse(a.DateOfUpload, a.TimeOfUpload);
  });
}

// mrDoc          → real Mongoose document
// uploadsOverride → pre-filtered Mongoose subdocs (FLM/SLM/TLM pending-only)
async function enrichMrData(mrDoc, uploadsOverride) {
  const allMatchData = await getMatchDataCached(mrDoc._id);

  // O(1) date lookup map
  const matchByDate = new Map();
  for (const match of allMatchData) {
    if (!matchByDate.has(match.matchDate)) matchByDate.set(match.matchDate, []);
    matchByDate.get(match.matchDate).push(match);
  }

  const uploads = uploadsOverride !== undefined ? uploadsOverride : mrDoc.MRUploadedData;

  const enrichedUploads = uploads.map((upload) => {
    const matches = matchByDate.get(upload.DateOfUpload) || [];
    return matches.length > 0
      ? matches.map((match) => ({ ...upload._doc, ...match }))
      : [{ ...upload._doc, matchData: [] }];
  });

  return {
    ...mrDoc._doc,
    MRUploadedData: sortUploads(enrichedUploads.flat()),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED QUERY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const MR_SELECT   = '_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch';
const MR_POPULATE = 'MRUploadedData MrScoreEachMatch';

// ═══════════════════════════════════════════════════════════════════════════════
//  HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
/*const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;

    // ── LAYER 1 HIT: return instantly if we have a warm full-response cache ──
    const cachedResponse = getCachedResponse(Id);
    if (cachedResponse) {
      console.log(`⚡ Cache hit for ${Id} — responding instantly`);
      return res.status(200).json(cachedResponse);
    }

    console.log(`🔍 Cache miss for ${Id} — building response`);

    // ── Identify user type ───────────────────────────────────────────────────
    let userExists, type;

    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) type = 'MR';

    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);

    if (!userExists && isValidObjectId) {
      const [admin, tlm, slm, flm] = await Promise.all([
        AdminModel.findById(Id),
        TlmModel.findById(Id).populate({ path: 'Slm', populate: { path: 'Flm', populate: { path: 'Mrs' } } }),
        SlmModel.findById(Id).populate({ path: 'Flm', populate: { path: 'Mrs' } }),
        FlmModel.findById(Id).populate('Mrs'),
      ]);

      if      (admin) { userExists = admin; type = 'Admin'; }
      else if (tlm)   { userExists = tlm;   type = 'TLM';   }
      else if (slm)   { userExists = slm;   type = 'SLM';   }
      else if (flm)   { userExists = flm;   type = 'FLM';   }
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let enrichedData = [];

    // ── MR ───────────────────────────────────────────────────────────────────
    if (type === 'MR') {
      const mrDoc = await mrModel
        .findOne({ MRID: Id })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      // Warm match cache before enriching (non-blocking pre-fetch)
      warmMatchDataCache([mrDoc._id]);

      enrichedData = [await enrichMrData(mrDoc)];
    }

    // ── FLM ──────────────────────────────────────────────────────────────────
    else if (type === 'FLM') {
      const mrIds = userExists.Mrs.map((mr) => mr._id);

      // ✅ Kick off ALL external API fetches BEFORE the DB query returns
      //    so by the time mrDocs are ready, match data is already cached
      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── SLM ──────────────────────────────────────────────────────────────────
    else if (type === 'SLM') {
      const mrIds = userExists.Flm.flatMap((flm) => flm.Mrs.map((mr) => mr._id));

      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── TLM ──────────────────────────────────────────────────────────────────
    else if (type === 'TLM') {
      const mrIds = userExists.Slm
        .flatMap((slm) => slm.Flm)
        .flatMap((flm) => flm.Mrs)
        .map((mr) => mr._id);

      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    else if (type === 'Admin') {
      const mrDocs = await mrModel
        .find()
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      warmMatchDataCache(mrDocs.map((d) => d._id));

      enrichedData = await Promise.all(mrDocs.map((doc) => enrichMrData(doc)));
    }

    // ── Store in Layer 1 cache before responding ──────────────────────────────
    setCachedResponse(Id, enrichedData, type);

    console.log(`✅ Built and cached ${enrichedData.length} records for ${Id}`);
    res.status(200).json(enrichedData);

  } catch (error) {
    console.error('❌ Error in handleGetUploadData:', error);
    res.status(500).json({ error: 'Internal server error', err: error.message });
  }
};
*/


const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;

    // ── LAYER 1 HIT: return instantly if we have a warm full-response cache ──
    const cachedResponse = getCachedResponse(Id);
    if (cachedResponse) {
      console.log(`⚡ Cache hit for ${Id} — responding instantly`);
      return res.status(200).json(cachedResponse);
    }

    console.log(`🔍 Cache miss for ${Id} — building response`);

    // ── Identify user type ───────────────────────────────────────────────────
    let userExists, type;

    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) type = 'MR';

    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);

    if (!userExists && isValidObjectId) {
      const [admin, tlm, slm, flm] = await Promise.all([
        AdminModel.findById(Id),
        TlmModel.findById(Id).populate({ path: 'Slm', populate: { path: 'Flm', populate: { path: 'Mrs' } } }),
        SlmModel.findById(Id).populate({ path: 'Flm', populate: { path: 'Mrs' } }),
        FlmModel.findById(Id).populate('Mrs'),
      ]);

      if      (admin) { userExists = admin; type = 'Admin'; }
      else if (tlm)   { userExists = tlm;   type = 'TLM';   }
      else if (slm)   { userExists = slm;   type = 'SLM';   }
      else if (flm)   { userExists = flm;   type = 'FLM';   }
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let enrichedData = [];

    // ── MR ───────────────────────────────────────────────────────────────────
    if (type === 'MR') {
      const mrDoc = await mrModel
        .findOne({ MRID: Id })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      // Warm match cache before enriching (non-blocking pre-fetch)
      warmMatchDataCache([mrDoc._id]);

      enrichedData = [await enrichMrData(mrDoc)];
    }

    // ── FLM ──────────────────────────────────────────────────────────────────
    else if (type === 'FLM') {
      const mrIds = userExists.Mrs.map((mr) => mr._id);

      // ✅ Kick off ALL external API fetches BEFORE the DB query returns
      //    so by the time mrDocs are ready, match data is already cached
      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── SLM ──────────────────────────────────────────────────────────────────
    else if (type === 'SLM') {
      const mrIds = userExists.Flm.flatMap((flm) => flm.Mrs.map((mr) => mr._id));

      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── TLM ──────────────────────────────────────────────────────────────────
    else if (type === 'TLM') {
      const mrIds = userExists.Slm
        .flatMap((slm) => slm.Flm)
        .flatMap((flm) => flm.Mrs)
        .map((mr) => mr._id);

      warmMatchDataCache(mrIds);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    else if (type === 'Admin') {
      const mrDocs = await mrModel
        .find()
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      warmMatchDataCache(mrDocs.map((d) => d._id));

      enrichedData = await Promise.all(mrDocs.map((doc) => enrichMrData(doc)));
    }

    // ── Store in Layer 1 cache before responding ──────────────────────────────
    setCachedResponse(Id, enrichedData, type);

    console.log(`✅ Built and cached ${enrichedData.length} records for ${Id}`);


    const countStatuses = (data) => {
      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          total++;

          if (upload.Status === "Pending") pending++;
          else if (upload.Status === "Approved") approved++;
          else if (upload.Status === "Rejected") rejected++;
        });
      });

      return {
        totalCount: total,
        pendingCount: pending,
        approvedCount: approved,
        rejectedCount: rejected,
      };
    };

    // ✅ COUNT BRAND-WISE STATUSES
    const countBrandWiseStatuses = (data) => {
      const brandCounts = {};

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Extract brand names from SelectedBrands array or BrandName string
          let brands = [];

          if (
            upload.SelectedBrands &&
            Array.isArray(upload.SelectedBrands) &&
            upload.SelectedBrands.length > 0
          ) {
            // Use SelectedBrands array if available
            brands = upload.SelectedBrands.map((b) => b.brandName || b).filter(
              Boolean,
            );
          } else if (upload.BrandName) {
            // Parse BrandName string (comma-separated)
            brands = upload.BrandName.split(",")
              .map((b) => b.trim())
              .filter(Boolean);
          }

          // If no brands found, use "Unknown" or skip
          if (brands.length === 0) {
            brands = ["Unknown"];
          }

          // Count status for each brand
          brands.forEach((brandName) => {
            if (!brandCounts[brandName]) {
              brandCounts[brandName] = {
                totalCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
              };
            }

            brandCounts[brandName].totalCount++;

            if (upload.Status === "Pending") {
              brandCounts[brandName].pendingCount++;
            } else if (upload.Status === "Approved") {
              brandCounts[brandName].approvedCount++;
            } else if (upload.Status === "Rejected") {
              brandCounts[brandName].rejectedCount++;
            }
          });
        });
      });

      return brandCounts;
    };

    // ✅ COUNT BY BRAND COUNT CATEGORIES (1B, 2B, 3B)
    const countByBrandCountCategories = (data) => {
      const categoryCounts = {
        "1B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "2B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "3B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        Total: {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
      };

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Determine number of brands from NumberOfBrands field or count from SelectedBrands/BrandName
          let numberOfBrands = upload.NumberOfBrands;

          // If NumberOfBrands is not available, calculate from SelectedBrands or BrandName
          if (!numberOfBrands || numberOfBrands === 0) {
            if (
              upload.SelectedBrands &&
              Array.isArray(upload.SelectedBrands) &&
              upload.SelectedBrands.length > 0
            ) {
              numberOfBrands = upload.SelectedBrands.length;
            } else if (upload.BrandName) {
              const brands = upload.BrandName.split(",")
                .map((b) => b.trim())
                .filter(Boolean);
              numberOfBrands = brands.length || 1;
            } else {
              numberOfBrands = 1; // Default to 1 if no brand info
            }
          }

          // Determine category (1B, 2B, or 3B)
          let category = "1B";
          if (numberOfBrands === 2) {
            category = "2B";
          } else if (numberOfBrands >= 3) {
            category = "3B";
          }

          // Count for specific category
          categoryCounts[category].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts[category].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts[category].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts[category].rejectedCount++;
          }

          // Count for Total
          categoryCounts["Total"].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts["Total"].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts["Total"].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts["Total"].rejectedCount++;
          }
        });
      });

      return categoryCounts;
    };

    // ================= COUNTS =================
    const counts = countStatuses(enrichedData);
    const brandWiseCounts = countBrandWiseStatuses(enrichedData);
    const brandCountCategoryCounts = countByBrandCountCategories(enrichedData);

if (enrichedData.length > 0) {
      enrichedData[0]._meta = {
        counts,
        brandWiseCounts,
        brandCountCategoryCounts,
      };
    }
    console.log("META COUNTS:", enrichedData[0]._meta);

    res.status(200).json(enrichedData);

    // res.status(200).json(enrichedData);

  } catch (error) {
    console.error('❌ Error in handleGetUploadData:', error);
    res.status(500).json({ error: 'Internal server error', err: error.message });
  }
};



/*
const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;

    // ── LAYER 1 HIT ──────────────────────────────────────────────────────────
    const cachedResponse = getCachedResponse(Id);
    if (cachedResponse) {
      console.log(`⚡ Cache hit for ${Id}`);
      return res.status(200).json(cachedResponse);
    }

    console.log(`🔍 Cache miss for ${Id} — building response`);

    // ── Identify user type ────────────────────────────────────────────────────
    // FIX 1: Run MR check and ObjectId checks concurrently where possible.
    // FIX 2: lean() on all user-detection queries — we only need identity, not hydrated docs.
    let userExists, type;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);

    // Run MR lookup and role lookups IN PARALLEL when Id is a valid ObjectId
    const [mrUser, roleUser] = await Promise.all([
      mrModel.findOne({ MRID: Id }).lean(),
      isValidObjectId
        ? Promise.all([
            AdminModel.findById(Id).lean(),
            TlmModel.findById(Id)
              .lean()
              .populate({
                path: 'Slm',
                populate: { path: 'Flm', populate: { path: 'Mrs', select: '_id' } },
                // FIX 3: Only pull _id for nested Mrs — we only need IDs for mrIds extraction
              }),
            SlmModel.findById(Id)
              .lean()
              .populate({ path: 'Flm', populate: { path: 'Mrs', select: '_id' } }),
            FlmModel.findById(Id).lean().populate({ path: 'Mrs', select: '_id' }),
          ])
        : Promise.resolve([null, null, null, null]),
    ]);

    if (mrUser) {
      userExists = mrUser;
      type = 'MR';
    } else if (isValidObjectId) {
      const [admin, tlm, slm, flm] = roleUser;
      if      (admin) { userExists = admin; type = 'Admin'; }
      else if (tlm)   { userExists = tlm;   type = 'TLM';   }
      else if (slm)   { userExists = slm;   type = 'SLM';   }
      else if (flm)   { userExists = flm;   type = 'FLM';   }
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let enrichedData = [];

    // ── MR ───────────────────────────────────────────────────────────────────
    if (type === 'MR') {
      // FIX 4: Reuse the doc we already have from identity check — add lean + populate
      // We already have the lean MR, but we need MR_SELECT + MR_POPULATE fields.
      // So fetch once with full select/populate instead of twice.
      const mrDoc = await mrModel
        .findOne({ MRID: Id })
        .select(MR_SELECT)
        .populate(MR_POPULATE)
        .lean(); // FIX 5: lean() — no need for Mongoose Document overhead

      warmMatchDataCache([mrDoc._id]); // non-blocking, fire-and-forget
      enrichedData = [await enrichMrData(mrDoc)];
    }

    // ── FLM / SLM / TLM shared logic ─────────────────────────────────────────
    else if (type === 'FLM' || type === 'SLM' || type === 'TLM') {
      // Extract mrIds based on hierarchy depth
      let mrIds;
      if (type === 'FLM') {
        mrIds = userExists.Mrs.map((mr) => mr._id);
      } else if (type === 'SLM') {
        mrIds = userExists.Flm.flatMap((flm) => flm.Mrs.map((mr) => mr._id));
      } else {
        mrIds = userExists.Slm
          .flatMap((slm) => slm.Flm)
          .flatMap((flm) => flm.Mrs)
          .map((mr) => mr._id);
      }

      // FIX 6: Kick off cache warm AND DB query simultaneously
      warmMatchDataCache(mrIds); // non-blocking

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE)
        .lean(); // FIX 7: lean() — huge win on large sets

      // FIX 8: Filter pending uploads ONCE during map, avoid double iteration
      const enrichPromises = [];
      for (const doc of mrDocs) {
        const pendingUploads = doc.MRUploadedData?.filter((u) => u.Status === 'Pending');
        if (pendingUploads?.length > 0) {
          enrichPromises.push(enrichMrData(doc, pendingUploads));
        }
      }

      enrichedData = await Promise.all(enrichPromises);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    else if (type === 'Admin') {
      const mrDocs = await mrModel
        .find()
        .select(MR_SELECT)
        .populate(MR_POPULATE)
        .lean(); // FIX 9: lean() is critical here — Admin loads ALL MRs

      // FIX 10: Warm cache + enrich concurrently — don't wait for warmMatchDataCache
      warmMatchDataCache(mrDocs.map((d) => d._id)); // fire-and-forget

      enrichedData = await Promise.all(mrDocs.map((doc) => enrichMrData(doc)));
    }

    // ── FIX 11: Single-pass stats computation (replaces 3 separate full loops) ─
    const computeAllStats = (data) => {
      const counts = { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 };
      const brandWiseCounts = {};
      const categoryCounts = {
        '1B': { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
        '2B': { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
        '3B': { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
        Total: { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
      };

      for (const mr of data) {
        if (!mr.MRUploadedData) continue;

        for (const upload of mr.MRUploadedData) {
          const status = upload.Status;
          const isPending  = status === 'Pending';
          const isApproved = status === 'Approved';
          const isRejected = status === 'Rejected';

          // ── Overall counts ──
          counts.totalCount++;
          if (isPending)  counts.pendingCount++;
          if (isApproved) counts.approvedCount++;
          if (isRejected) counts.rejectedCount++;

          // ── Brand-wise counts ──
          let brands = [];
          if (upload.SelectedBrands?.length > 0) {
            brands = upload.SelectedBrands.map((b) => b.brandName || b).filter(Boolean);
          } else if (upload.BrandName) {
            brands = upload.BrandName.split(',').map((b) => b.trim()).filter(Boolean);
          }
          if (brands.length === 0) brands = ['Unknown'];

          for (const brandName of brands) {
            if (!brandWiseCounts[brandName]) {
              brandWiseCounts[brandName] = { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 };
            }
            const b = brandWiseCounts[brandName];
            b.totalCount++;
            if (isPending)  b.pendingCount++;
            if (isApproved) b.approvedCount++;
            if (isRejected) b.rejectedCount++;
          }

          // ── Brand-count category ──
          let numberOfBrands = upload.NumberOfBrands;
          if (!numberOfBrands || numberOfBrands === 0) {
            if (upload.SelectedBrands?.length > 0) {
              numberOfBrands = upload.SelectedBrands.length;
            } else if (upload.BrandName) {
              numberOfBrands = upload.BrandName.split(',').map((b) => b.trim()).filter(Boolean).length || 1;
            } else {
              numberOfBrands = 1;
            }
          }

          const cat = numberOfBrands === 2 ? '2B' : numberOfBrands >= 3 ? '3B' : '1B';
          const c = categoryCounts[cat];
          const t = categoryCounts['Total'];

          c.totalCount++;  t.totalCount++;
          if (isPending)  { c.pendingCount++;  t.pendingCount++;  }
          if (isApproved) { c.approvedCount++; t.approvedCount++; }
          if (isRejected) { c.rejectedCount++; t.rejectedCount++; }
        }
      }

      return { counts, brandWiseCounts, brandCountCategoryCounts: categoryCounts };
    };

    // ── Compute stats + attach _meta ─────────────────────────────────────────
    const { counts, brandWiseCounts, brandCountCategoryCounts } = computeAllStats(enrichedData);

    // ── FIX 12: Cache the full final response (with _meta already attached) ──
    if (enrichedData.length > 0) {
      enrichedData[0]._meta = { counts, brandWiseCounts, brandCountCategoryCounts };
    }

    // Store in cache AFTER _meta is attached so cache hit also has _meta
    setCachedResponse(Id, enrichedData, type);

    console.log(`✅ Built and cached ${enrichedData.length} records for ${Id}`);
    console.log('META COUNTS:', enrichedData[0]?._meta);

    return res.status(200).json(enrichedData);

  } catch (error) {
    console.error('❌ Error in handleGetUploadData:', error);
    res.status(500).json({ error: 'Internal server error', err: error.message });
  }
};

*/
// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORTS — add invalidateResponseCache to your upload/approve/reject routes
//
//  Example usage in your approve route:
//    const { invalidateResponseCache } = require('./thisFile');
//    invalidateResponseCache(mrId);      // so MR sees fresh data
//    invalidateResponseCache(flmId);     // so their FLM sees fresh pending count
// ═══════════════════════════════════════════════════════════════════════════════


/*
// ********************************************************************************** Emergency revert *************************************************
// ─────────────────────────────────────────────────────────────────────────────
// MATCH DATA CACHE  (in-memory, per process)
// TTL: 60 seconds — tune to your data freshness needs
// ─────────────────────────────────────────────────────────────────────────────
const matchDataCache = new Map(); // key: mrObjectId string → { data, expiresAt }
const CACHE_TTL_MS = 60_000;     // 60 seconds

async function getMatchDataCached(mrObjectId) {
  const key = mrObjectId.toString();
  const now = Date.now();

  const cached = matchDataCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data; // ✅ Cache hit — zero network cost

  try {
    const apiResponse = await fetch(
      `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${key}`
    );
    const data = (await apiResponse.json()) || [];
    matchDataCache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch {
    matchDataCache.set(key, { data: [], expiresAt: now + CACHE_TTL_MS });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT HELPER
// ─────────────────────────────────────────────────────────────────────────────
function sortUploads(uploads) {
  return uploads.sort((a, b) => {
    const parse = (dateStr, timeStr) => {
      const [day, month, year] = dateStr.split('-');
      const [hours, minutes] = timeStr.split(':');
      return new Date(year, month - 1, day, hours, minutes);
    };
    return parse(b.DateOfUpload, b.TimeOfUpload) - parse(a.DateOfUpload, a.TimeOfUpload);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENRICHMENT
//
// mrDoc          → real Mongoose document  (MUST stay as-is so mrDoc._doc gives
//                  all MR fields: MRID, USERNAME, HQ, REGION, ZONE, TEAMNAME…)
//
// uploadsOverride → optional array of Mongoose upload docs to use instead of
//                   mrDoc.MRUploadedData  (used by FLM/SLM/TLM to pass only
//                   Pending uploads while still spreading the full mrDoc._doc)
// ─────────────────────────────────────────────────────────────────────────────
async function enrichMrData(mrDoc, uploadsOverride) {
  // One API call per MR — result reused for ALL uploads of this MR
  const allMatchData = await getMatchDataCached(mrDoc._id);

  // Build O(1) date → matches lookup instead of .filter() per upload
  const matchByDate = new Map();
  for (const match of allMatchData) {
    if (!matchByDate.has(match.matchDate)) matchByDate.set(match.matchDate, []);
    matchByDate.get(match.matchDate).push(match);
  }

  // Use the override list if provided (Pending-only), otherwise all uploads
  const uploads = uploadsOverride !== undefined ? uploadsOverride : mrDoc.MRUploadedData;

  const enrichedUploads = uploads.map((upload) => {
    const matches = matchByDate.get(upload.DateOfUpload) || [];
    if (matches.length > 0) {
      return matches.map((match) => ({ ...upload._doc, ...match }));
    }
    return [{ ...upload._doc, matchData: [] }];
  });

  // ✅ mrDoc._doc is the real Mongoose internal doc — all MR fields are preserved here
  return {
    ...mrDoc._doc,
    MRUploadedData: sortUploads(enrichedUploads.flat()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED QUERY CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MR_SELECT   = '_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch';
const MR_POPULATE = 'MRUploadedData MrScoreEachMatch';

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;
    console.log('Fetching upload data for user ID:', Id);

    let userExists, type;

    // 1️⃣ Check MR first (MRID is a string field, not ObjectId)
    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) type = 'MR';

    // 2️⃣ Only run ObjectId queries if MR check failed
    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);

    if (!userExists && isValidObjectId) {
      // ✅ All four model checks run in PARALLEL instead of sequentially
      const [admin, tlm, slm, flm] = await Promise.all([
        AdminModel.findById(Id),
        TlmModel.findById(Id).populate({ path: 'Slm', populate: { path: 'Flm', populate: { path: 'Mrs' } } }),
        SlmModel.findById(Id).populate({ path: 'Flm', populate: { path: 'Mrs' } }),
        FlmModel.findById(Id).populate('Mrs'),
      ]);

      if      (admin) { userExists = admin; type = 'Admin'; }
      else if (tlm)   { userExists = tlm;   type = 'TLM';   }
      else if (slm)   { userExists = slm;   type = 'SLM';   }
      else if (flm)   { userExists = flm;   type = 'FLM';   }
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let enrichedData = [];

    // ── MR ───────────────────────────────────────────────────────────────────
    if (type === 'MR') {
      console.log('📋 Processing MR');

      const mrDoc = await mrModel
        .findOne({ MRID: Id })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      // No uploadsOverride → enrichMrData uses all uploads (approved + rejected + pending)
      enrichedData = [await enrichMrData(mrDoc)];
    }

    // ── FLM ──────────────────────────────────────────────────────────────────
    else if (type === 'FLM') {
      console.log('📋 Processing FLM');

      // ✅ Single bulk query for all MRs under this FLM
      const mrIds = userExists.Mrs.map((mr) => mr._id);
      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      // ✅ Keep raw Mongoose docs — pass Pending uploads as 2nd arg so that
      //    mrDoc._doc (MR fields) AND upload._doc (upload fields) are both real
      //    Mongoose internals and spread correctly
      const toEnrich = mrDocs
        .map((doc) => ({
          doc,
          pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending'),
        }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── SLM ──────────────────────────────────────────────────────────────────
    else if (type === 'SLM') {
      console.log('📋 Processing SLM');

      const mrIds = userExists.Flm.flatMap((flm) => flm.Mrs.map((mr) => mr._id));
      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({
          doc,
          pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending'),
        }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── TLM ──────────────────────────────────────────────────────────────────
    else if (type === 'TLM') {
      console.log('📋 Processing TLM');

      const mrIds = userExists.Slm
        .flatMap((slm) => slm.Flm)
        .flatMap((flm) => flm.Mrs)
        .map((mr) => mr._id);

      const mrDocs = await mrModel
        .find({ _id: { $in: mrIds } })
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      const toEnrich = mrDocs
        .map((doc) => ({
          doc,
          pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending'),
        }))
        .filter(({ pendingUploads }) => pendingUploads.length > 0);

      enrichedData = await Promise.all(
        toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads))
      );
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    else if (type === 'Admin') {
      console.log('📋 Processing Admin');

      const mrDocs = await mrModel
        .find()
        .select(MR_SELECT)
        .populate(MR_POPULATE);

      // No filter — admin sees all uploads
      enrichedData = await Promise.all(mrDocs.map((doc) => enrichMrData(doc)));
    }

    console.log(`✅ Returning ${enrichedData.length} records`);


    const countStatuses = (data) => {
      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          total++;

          if (upload.Status === "Pending") pending++;
          else if (upload.Status === "Approved") approved++;
          else if (upload.Status === "Rejected") rejected++;
        });
      });

      return {
        totalCount: total,
        pendingCount: pending,
        approvedCount: approved,
        rejectedCount: rejected,
      };
    };

    // ✅ COUNT BRAND-WISE STATUSES
    const countBrandWiseStatuses = (data) => {
      const brandCounts = {};

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Extract brand names from SelectedBrands array or BrandName string
          let brands = [];

          if (
            upload.SelectedBrands &&
            Array.isArray(upload.SelectedBrands) &&
            upload.SelectedBrands.length > 0
          ) {
            // Use SelectedBrands array if available
            brands = upload.SelectedBrands.map((b) => b.brandName || b).filter(
              Boolean,
            );
          } else if (upload.BrandName) {
            // Parse BrandName string (comma-separated)
            brands = upload.BrandName.split(",")
              .map((b) => b.trim())
              .filter(Boolean);
          }

          // If no brands found, use "Unknown" or skip
          if (brands.length === 0) {
            brands = ["Unknown"];
          }

          // Count status for each brand
          brands.forEach((brandName) => {
            if (!brandCounts[brandName]) {
              brandCounts[brandName] = {
                totalCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
              };
            }

            brandCounts[brandName].totalCount++;

            if (upload.Status === "Pending") {
              brandCounts[brandName].pendingCount++;
            } else if (upload.Status === "Approved") {
              brandCounts[brandName].approvedCount++;
            } else if (upload.Status === "Rejected") {
              brandCounts[brandName].rejectedCount++;
            }
          });
        });
      });

      return brandCounts;
    };

    // ✅ COUNT BY BRAND COUNT CATEGORIES (1B, 2B, 3B)
    const countByBrandCountCategories = (data) => {
      const categoryCounts = {
        "1B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "2B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "3B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        Total: {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
      };

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Determine number of brands from NumberOfBrands field or count from SelectedBrands/BrandName
          let numberOfBrands = upload.NumberOfBrands;

          // If NumberOfBrands is not available, calculate from SelectedBrands or BrandName
          if (!numberOfBrands || numberOfBrands === 0) {
            if (
              upload.SelectedBrands &&
              Array.isArray(upload.SelectedBrands) &&
              upload.SelectedBrands.length > 0
            ) {
              numberOfBrands = upload.SelectedBrands.length;
            } else if (upload.BrandName) {
              const brands = upload.BrandName.split(",")
                .map((b) => b.trim())
                .filter(Boolean);
              numberOfBrands = brands.length || 1;
            } else {
              numberOfBrands = 1; // Default to 1 if no brand info
            }
          }

          // Determine category (1B, 2B, or 3B)
          let category = "1B";
          if (numberOfBrands === 2) {
            category = "2B";
          } else if (numberOfBrands >= 3) {
            category = "3B";
          }

          // Count for specific category
          categoryCounts[category].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts[category].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts[category].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts[category].rejectedCount++;
          }

          // Count for Total
          categoryCounts["Total"].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts["Total"].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts["Total"].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts["Total"].rejectedCount++;
          }
        });
      });

      return categoryCounts;
    };

    // ================= COUNTS =================
    const counts = countStatuses(enrichedData);
    const brandWiseCounts = countBrandWiseStatuses(enrichedData);
    const brandCountCategoryCounts = countByBrandCountCategories(enrichedData);

if (enrichedData.length > 0) {
      enrichedData[0]._meta = {
        counts,
        brandWiseCounts,
        brandCountCategoryCounts,
      };
    }
    console.log("META COUNTS:", enrichedData[0]._meta);

    // res.status(200).json(enrichedData);


    res.status(200).json(enrichedData);

  } catch (error) {
    console.error('❌ Error in handleGetUploadData:', error);
    res.status(500).json({ error: 'Internal server error', err: error.message });
  }
};
*/

/*const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;
    let userExists, type, enrichedData;
    console.log("Fetching upload data for user ID:", Id);

    // ✅ CHECK IF IT'S AN MR FIRST (by MRID field)
    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) {
      type = "MR";
      console.log("✅ User is MR");
    }

    // ✅ ONLY CHECK OTHER MODELS IF IT'S A VALID OBJECTID
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);


    // Try to find user in different models (only if valid ObjectId)
    if (!userExists && isValidObjectId) {
      userExists = await AdminModel.findById(Id);
      if (userExists) type = "Admin";
    }
    if (!userExists && isValidObjectId) {
      userExists = await TlmModel.findById(Id).populate({
        path: "Slm",
        populate: { path: "Flm", populate: { path: "Mrs" } },
      });
      if (userExists) type = "TLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await SlmModel.findById(Id).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      });
      if (userExists) type = "SLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await FlmModel.findById(Id).populate("Mrs");
      if (userExists) type = "FLM";
    }

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize enrichedData
    enrichedData = [];

    // ✅ HANDLE MR TYPE - SHOW ALL PRESCRIPTIONS (APPROVED, REJECTED, PENDING)
    if (type === "MR") {
      console.log("📋 Processing MR - fetching all prescriptions");

      const response = await mrModel
        .findOne({ MRID: Id })
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      // ✅ GET ALL UPLOADS (NO FILTER) - FRONTEND WILL FILTER BY STATUS
      const allUploads = response.MRUploadedData;

      console.log(`✅ Found ${allUploads.length} total prescriptions`);

      const enrichedUploads = await Promise.all(
        allUploads.map(async (upload) => {
          const date = upload.DateOfUpload;

          try {
            const apiResponse = await fetch(
              `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
            );
            const apiData = await apiResponse.json();
            const matchData = apiData || [];

            const filteredMatchData = matchData.filter(
              (match) => match.matchDate === date
            );

            const enrichedUploads =
              filteredMatchData.length > 0
                ? filteredMatchData.map((match) => ({
                    ...upload._doc,
                    ...match,
                  }))
                : [
                    {
                      ...upload._doc,
                      matchData: [],
                    },
                  ];

            return enrichedUploads;
          } catch (err) {
            return {
              ...upload._doc,
              matchData: [],
            };
          }
        })
      );

      // ✅ ADD ALL PRESCRIPTIONS FOR MR
      if (enrichedUploads.length > 0) {
        enrichedData.push({
          ...response._doc,
          MRUploadedData: enrichedUploads.flat(),
        });
      }
    }
    // Handle different user types (SLM, FLM, TLM, Admin)
    else if (type === "SLM") {
      console.log("📋 Processing SLM - fetching pending prescriptions");
      for (const flm of userExists.Flm) {
        for (const mr of flm.Mrs) {
          const response = await mrModel
            .findById(mr._id)
            .select(
              "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
            )
            .populate("MRUploadedData MrScoreEachMatch");

          // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
          const pendingUploads = response.MRUploadedData.filter(
            (upload) => upload.Status === "Pending"
          );

          const enrichedUploads = await Promise.all(
            pendingUploads.map(async (upload) => {
              const date = upload.DateOfUpload;

              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return {
                  ...upload._doc,
                  matchData: [],
                };
              }
            })
          );

          if (enrichedUploads.length > 0) {
            enrichedData.push({
              ...response._doc,
              MRUploadedData: enrichedUploads.flat(),
            });
          }
        }
      }
    } else if (type === "FLM") {
      console.log("📋 Processing FLM - fetching pending prescriptions");
      for (const mr of userExists.Mrs) {
        const response = await mrModel
          .findById(mr._id)
          .select(
            "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
          )
          .populate("MRUploadedData MrScoreEachMatch");

        // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
        const pendingUploads = response.MRUploadedData.filter(
          (upload) => upload.Status === "Pending"
        );

        const enrichedUploads = await Promise.all(
          pendingUploads.map(async (upload) => {
            const date = upload.DateOfUpload;

            try {
              const apiResponse = await fetch(
                `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
              );
              const apiData = await apiResponse.json();
              const matchData = apiData || [];

              const filteredMatchData = matchData.filter(
                (match) => match.matchDate === date
              );

              const enrichedUploads =
                filteredMatchData.length > 0
                  ? filteredMatchData.map((match) => ({
                      ...upload._doc,
                      ...match,
                    }))
                  : [
                      {
                        ...upload._doc,
                        matchData: [],
                      },
                    ];

              return enrichedUploads;
            } catch (err) {
              return {
                ...upload._doc,
                matchData: [],
              };
            }
          })
        );

        if (enrichedUploads.length > 0) {
          enrichedData.push({
            ...response._doc,
            MRUploadedData: enrichedUploads.flat(),
          });
        }
      }
    } else if (type === "TLM") {
      console.log("📋 Processing TLM - fetching pending prescriptions");
      for (const slm of userExists.Slm) {
        for (const flm of slm.Flm) {
          for (const mr of flm.Mrs) {
            const response = await mrModel
              .findById(mr._id)
              .select(
                "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
              )
              .populate("MRUploadedData MrScoreEachMatch");

            // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
            const pendingUploads = response.MRUploadedData.filter(
              (upload) => upload.Status === "Pending"
            );

            const enrichedUploads = await Promise.all(
              pendingUploads.map(async (upload) => {
                const date = upload.DateOfUpload;

                try {
                  const apiResponse = await fetch(
                    `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                  );
                  const apiData = await apiResponse.json();
                  const matchData = apiData || [];

                  const filteredMatchData = matchData.filter(
                    (match) => match.matchDate === date
                  );

                  const enrichedUploads =
                    filteredMatchData.length > 0
                      ? filteredMatchData.map((match) => ({
                          ...upload._doc,
                          ...match,
                        }))
                      : [
                          {
                            ...upload._doc,
                            matchData: [],
                          },
                        ];

                  return enrichedUploads;
                } catch (err) {
                  return {
                    ...upload._doc,
                    matchData: [],
                  };
                }
              })
            );

            if (enrichedUploads.length > 0) {
              enrichedData.push({
                ...response._doc,
                MRUploadedData: enrichedUploads.flat(),
              });
            }
          }
        }
      }
    } else if (type === "Admin") {
      console.log("📋 Processing Admin - fetching all prescriptions");
      const response = await mrModel
        .find()
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      enrichedData = await Promise.all(
        response.map(async (item) => {
          const enrichedUploads = await Promise.all(
            item.MRUploadedData.map(async (upload) => {
              const date = upload.DateOfUpload;
              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${item._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return [
                  {
                    ...upload._doc,
                    matchData: [],
                  },
                ];
              }
            })
          );

          return {
            ...item._doc,
            MRUploadedData: enrichedUploads.flat(),
          };
        })
      );
    }

    console.log(`✅ Returning ${enrichedData.length} records`);
    enrichedData.forEach(mr => {
      if (mr.MRUploadedData && mr.MRUploadedData.length > 0) {
        mr.MRUploadedData.sort((a, b) => {
          const parseDateTime = (dateStr, timeStr) => {
            const [day, month, year] = dateStr.split('-');
            const [hours, minutes] = timeStr.split(':');
            return new Date(year, month - 1, day, hours, minutes);
          };

          const dateTimeA = parseDateTime(a.DateOfUpload, a.TimeOfUpload);
          const dateTimeB = parseDateTime(b.DateOfUpload, b.TimeOfUpload);

          return dateTimeB - dateTimeA;
        });
      }
    });
    res.status(200).json(enrichedData);
  } catch (error) {
    console.error("❌ Error in handleGetUploadData:", error);
    res.status(500).json({
      error: "Internal server error",
      err: error.message,
    });
  }
}; */


/*
const handleGetUploadData = async (req, res) => {
  try {
    const Id = req.params.id;
    let userExists, type, enrichedData;
    console.log("Fetching upload data for user ID:", Id);

    // ✅ CHECK IF IT'S AN MR FIRST (by MRID field)
    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) {
      type = "MR";
      console.log("✅ User is MR");
    }

    // ✅ ONLY CHECK OTHER MODELS IF IT'S A VALID OBJECTID
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);


    // Try to find user in different models (only if valid ObjectId)
    if (!userExists && isValidObjectId) {
      userExists = await AdminModel.findById(Id);
      if (userExists) type = "Admin";
    }
    if (!userExists && isValidObjectId) {
      userExists = await TlmModel.findById(Id).populate({
        path: "Slm",
        populate: { path: "Flm", populate: { path: "Mrs" } },
      });
      if (userExists) type = "TLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await SlmModel.findById(Id).populate({
        path: "Flm",
        populate: { path: "Mrs" },
      });
      if (userExists) type = "SLM";
    }
    if (!userExists && isValidObjectId) {
      userExists = await FlmModel.findById(Id).populate("Mrs");
      if (userExists) type = "FLM";
    }

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize enrichedData
    enrichedData = [];

    // ✅ HANDLE MR TYPE - SHOW ALL PRESCRIPTIONS (APPROVED, REJECTED, PENDING)
    if (type === "MR") {
      console.log("📋 Processing MR - fetching all prescriptions");

      const response = await mrModel
        .findOne({ MRID: Id })
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      // ✅ GET ALL UPLOADS (NO FILTER) - FRONTEND WILL FILTER BY STATUS
      const allUploads = response.MRUploadedData;

      console.log(`✅ Found ${allUploads.length} total prescriptions`);

      const enrichedUploads = await Promise.all(
        allUploads.map(async (upload) => {
          const date = upload.DateOfUpload;

          try {
            const apiResponse = await fetch(
              `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
            );
            const apiData = await apiResponse.json();
            const matchData = apiData || [];

            const filteredMatchData = matchData.filter(
              (match) => match.matchDate === date
            );

            const enrichedUploads =
              filteredMatchData.length > 0
                ? filteredMatchData.map((match) => ({
                    ...upload._doc,
                    ...match,
                  }))
                : [
                    {
                      ...upload._doc,
                      matchData: [],
                    },
                  ];

            return enrichedUploads;
          } catch (err) {
            return {
              ...upload._doc,
              matchData: [],
            };
          }
        })
      );

      // ✅ ADD ALL PRESCRIPTIONS FOR MR
      if (enrichedUploads.length > 0) {
        enrichedData.push({
          ...response._doc,
          MRUploadedData: enrichedUploads.flat(),
        });
      }
    }
    // Handle different user types (SLM, FLM, TLM, Admin)
    else if (type === "SLM") {
      console.log("📋 Processing SLM - fetching pending prescriptions");
      for (const flm of userExists.Flm) {
        for (const mr of flm.Mrs) {
          const response = await mrModel
            .findById(mr._id)
            .select(
              "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
            )
            .populate("MRUploadedData MrScoreEachMatch");

          // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
          const pendingUploads = response.MRUploadedData.filter(
            (upload) => upload.Status === "Pending"
          );

          const enrichedUploads = await Promise.all(
            pendingUploads.map(async (upload) => {
              const date = upload.DateOfUpload;

              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return {
                  ...upload._doc,
                  matchData: [],
                };
              }
            })
          );

          if (enrichedUploads.length > 0) {
            enrichedData.push({
              ...response._doc,
              MRUploadedData: enrichedUploads.flat(),
            });
          }
        }
      }
    } else if (type === "FLM") {
      console.log("📋 Processing FLM - fetching pending prescriptions");
      for (const mr of userExists.Mrs) {
        const response = await mrModel
          .findById(mr._id)
          .select(
            "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
          )
          .populate("MRUploadedData MrScoreEachMatch");

        // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
        const pendingUploads = response.MRUploadedData.filter(
          (upload) => upload.Status === "Pending"
        );

        const enrichedUploads = await Promise.all(
          pendingUploads.map(async (upload) => {
            const date = upload.DateOfUpload;

            try {
              const apiResponse = await fetch(
                `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
              );
              const apiData = await apiResponse.json();
              const matchData = apiData || [];

              const filteredMatchData = matchData.filter(
                (match) => match.matchDate === date
              );

              const enrichedUploads =
                filteredMatchData.length > 0
                  ? filteredMatchData.map((match) => ({
                      ...upload._doc,
                      ...match,
                    }))
                  : [
                      {
                        ...upload._doc,
                        matchData: [],
                      },
                    ];

              return enrichedUploads;
            } catch (err) {
              return {
                ...upload._doc,
                matchData: [],
              };
            }
          })
        );

        if (enrichedUploads.length > 0) {
          enrichedData.push({
            ...response._doc,
            MRUploadedData: enrichedUploads.flat(),
          });
        }
      }
    } else if (type === "TLM") {
      console.log("📋 Processing TLM - fetching pending prescriptions");
      for (const slm of userExists.Slm) {
        for (const flm of slm.Flm) {
          for (const mr of flm.Mrs) {
            const response = await mrModel
              .findById(mr._id)
              .select(
                "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
              )
              .populate("MRUploadedData MrScoreEachMatch");

            // ✅ FILTER ONLY PENDING UPLOADS FOR BOSS
            const pendingUploads = response.MRUploadedData.filter(
              (upload) => upload.Status === "Pending"
            );

            const enrichedUploads = await Promise.all(
              pendingUploads.map(async (upload) => {
                const date = upload.DateOfUpload;

                try {
                  const apiResponse = await fetch(
                    `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${response._id}`
                  );
                  const apiData = await apiResponse.json();
                  const matchData = apiData || [];

                  const filteredMatchData = matchData.filter(
                    (match) => match.matchDate === date
                  );

                  const enrichedUploads =
                    filteredMatchData.length > 0
                      ? filteredMatchData.map((match) => ({
                          ...upload._doc,
                          ...match,
                        }))
                      : [
                          {
                            ...upload._doc,
                            matchData: [],
                          },
                        ];

                  return enrichedUploads;
                } catch (err) {
                  return {
                    ...upload._doc,
                    matchData: [],
                  };
                }
              })
            );

            if (enrichedUploads.length > 0) {
              enrichedData.push({
                ...response._doc,
                MRUploadedData: enrichedUploads.flat(),
              });
            }
          }
        }
      }
    } else if (type === "Admin") {
      console.log("📋 Processing Admin - fetching all prescriptions");
      const response = await mrModel
        .find()
        .select(
          "_id MRID USERNAME HQ REGION ZONE TEAMNAME MRUploadedData MrScoreEachMatch"
        )
        .populate("MRUploadedData MrScoreEachMatch");

      enrichedData = await Promise.all(
        response.map(async (item) => {
          const enrichedUploads = await Promise.all(
            item.MRUploadedData.map(async (upload) => {
              const date = upload.DateOfUpload;
              try {
                const apiResponse = await fetch(
                  `https://dev.admin.rxpl.digilateral.com/api/getMatchData/${item._id}`
                );
                const apiData = await apiResponse.json();
                const matchData = apiData || [];

                const filteredMatchData = matchData.filter(
                  (match) => match.matchDate === date
                );

                const enrichedUploads =
                  filteredMatchData.length > 0
                    ? filteredMatchData.map((match) => ({
                        ...upload._doc,
                        ...match,
                      }))
                    : [
                        {
                          ...upload._doc,
                          matchData: [],
                        },
                      ];

                return enrichedUploads;
              } catch (err) {
                return [
                  {
                    ...upload._doc,
                    matchData: [],
                  },
                ];
              }
            })
          );

          return {
            ...item._doc,
            MRUploadedData: enrichedUploads.flat(),
          };
        })
      );
    }

    console.log(`✅ Returning ${enrichedData.length} records`);
    enrichedData.forEach(mr => {
      if (mr.MRUploadedData && mr.MRUploadedData.length > 0) {
        mr.MRUploadedData.sort((a, b) => {
          const parseDateTime = (dateStr, timeStr) => {
            const [day, month, year] = dateStr.split('-');
            const [hours, minutes] = timeStr.split(':');
            return new Date(year, month - 1, day, hours, minutes);
          };

          const dateTimeA = parseDateTime(a.DateOfUpload, a.TimeOfUpload);
          const dateTimeB = parseDateTime(b.DateOfUpload, b.TimeOfUpload);

          return dateTimeB - dateTimeA;
        });
      }
    });

    const countStatuses = (data) => {
  let total = 0;
  let pending = 0;
  let approved = 0;
  let rejected = 0;

  data.forEach((mr) => {
    if (!mr.MRUploadedData) return;

    mr.MRUploadedData.forEach((upload) => {
      total++;

      if (upload.Status === "Pending") pending++;
      else if (upload.Status === "Approved") approved++;
      else if (upload.Status === "Rejected") rejected++;
    });
  });

  return {
    totalCount: total,
    pendingCount: pending,
    approvedCount: approved,
    rejectedCount: rejected,
  };
};

    // ✅ COUNT BRAND-WISE STATUSES
    const countBrandWiseStatuses = (data) => {
      const brandCounts = {};

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Extract brand names from SelectedBrands array or BrandName string
          let brands = [];

          if (upload.SelectedBrands && Array.isArray(upload.SelectedBrands) && upload.SelectedBrands.length > 0) {
            // Use SelectedBrands array if available
            brands = upload.SelectedBrands.map(b => b.brandName || b).filter(Boolean);
          } else if (upload.BrandName) {
            // Parse BrandName string (comma-separated)
            brands = upload.BrandName.split(',').map(b => b.trim()).filter(Boolean);
          }

          // If no brands found, use "Unknown" or skip
          if (brands.length === 0) {
            brands = ["Unknown"];
          }

          // Count status for each brand
          brands.forEach((brandName) => {
            if (!brandCounts[brandName]) {
              brandCounts[brandName] = {
                totalCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
              };
            }

            brandCounts[brandName].totalCount++;

            if (upload.Status === "Pending") {
              brandCounts[brandName].pendingCount++;
            } else if (upload.Status === "Approved") {
              brandCounts[brandName].approvedCount++;
            } else if (upload.Status === "Rejected") {
              brandCounts[brandName].rejectedCount++;
            }
          });
        });
      });

      return brandCounts;
    };

    // ✅ COUNT BY BRAND COUNT CATEGORIES (1B, 2B, 3B)
    const countByBrandCountCategories = (data) => {
      const categoryCounts = {
        "1B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "2B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "3B": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
        "Total": {
          totalCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        },
      };

      data.forEach((mr) => {
        if (!mr.MRUploadedData) return;

        mr.MRUploadedData.forEach((upload) => {
          // Determine number of brands from NumberOfBrands field or count from SelectedBrands/BrandName
          let numberOfBrands = upload.NumberOfBrands;

          // If NumberOfBrands is not available, calculate from SelectedBrands or BrandName
          if (!numberOfBrands || numberOfBrands === 0) {
            if (upload.SelectedBrands && Array.isArray(upload.SelectedBrands) && upload.SelectedBrands.length > 0) {
              numberOfBrands = upload.SelectedBrands.length;
            } else if (upload.BrandName) {
              const brands = upload.BrandName.split(',').map(b => b.trim()).filter(Boolean);
              numberOfBrands = brands.length || 1;
            } else {
              numberOfBrands = 1; // Default to 1 if no brand info
            }
          }

          // Determine category (1B, 2B, or 3B)
          let category = "1B";
          if (numberOfBrands === 2) {
            category = "2B";
          } else if (numberOfBrands >= 3) {
            category = "3B";
          }

          // Count for specific category
          categoryCounts[category].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts[category].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts[category].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts[category].rejectedCount++;
          }

          // Count for Total
          categoryCounts["Total"].totalCount++;
          if (upload.Status === "Pending") {
            categoryCounts["Total"].pendingCount++;
          } else if (upload.Status === "Approved") {
            categoryCounts["Total"].approvedCount++;
          } else if (upload.Status === "Rejected") {
            categoryCounts["Total"].rejectedCount++;
          }
        });
      });

      return categoryCounts;
    };

    // res.status(200).json(enrichedData);
    const counts = countStatuses(enrichedData);
    const brandWiseCounts = countBrandWiseStatuses(enrichedData);
    const brandCountCategoryCounts = countByBrandCountCategories(enrichedData);

res.status(200).json({
  success: true,
  counts,
  brandWiseCounts,
  brandCountCategoryCounts,
  data: enrichedData,
});

  } catch (error) {
    console.error("❌ Error in handleGetUploadData:", error);
    res.status(500).json({
      error: "Internal server error",
      err: error.message,
    });
  }
};
*/


// const handleGetMatchDataByMatchDate = async (req, res) => {
//   try {
//     const mrId = req.params.mrId;
//     const dateOfUpload = req.params.dateOfUpload
//     const matchExists = await MatchDetails.find({});

//     if (!matchExists || matchExists.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Match not found",
//       });
//     }

//     // Process match data
//     const matchData = matchExists.map((match) => {
//       let role = "-"; // Default role

//       if (Array.isArray(match.roomPlayersA) && match.roomPlayersA.includes(mrId)) {
//         role = "Initiator";
//       } else if (Array.isArray(match.roomPlayersB) && match.roomPlayersB.includes(mrId)) {
//         role = "Acceptor";
//       }
//       let matchDate = match.startDate
//       return {
//         matchDate,
//         role
//       };
//     });

//     return res.status(200).json(matchData);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

const handleGetMatchDataByMatchDate = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Fetch all match details
    const matchExists = await MatchDetails.find({});

    if (!matchExists || matchExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    // Filter and process match data
    const matchData = matchExists
      .filter((match) => {
        // Keep only matches where mrId is found in roomPlayersA or roomPlayersB
        return (
          (Array.isArray(match.roomPlayersA) &&
            match.roomPlayersA.includes(mrId)) ||
          (Array.isArray(match.roomPlayersB) &&
            match.roomPlayersB.includes(mrId))
        );
      })
      .map((match) => {
        // Determine role based on presence in roomPlayersA or roomPlayersB
        let role = "Initiator"; // Default to Initiator
        if (
          Array.isArray(match.roomPlayersB) &&
          match.roomPlayersB.includes(mrId) &&
          match.isTournament === true
        ) {
          role = "Tournament";
        } else if (
          Array.isArray(match.roomPlayersB) &&
          match.roomPlayersB.includes(mrId)
        ) {
          role = "Acceptor";
        }
        return {
          matchDate: match.startDate,
          role,
          teamA: match.teamA,
          teamB: match.teamB,
        };
      });

    // Return filtered and enriched match data
    return res.status(200).json(matchData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateRoomDetailsRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const roomDetails = await RoomModel.findOne({ roomId: roomId });
    const { Status, managerId } = req.body;

    if (Status === true && roomDetails.maxAccepts === "0") {
      return res.status(400).json({
        success: false,
        message: "No more players can join the room",
      });
    }

    if (Status === true) {
      const roomUpdate = await RoomModel.findOneAndUpdate(
        { roomId: roomId },
        {
          $push: { AcceptedManager: managerId },
          maxAccepts: roomDetails.maxAccepts - 1,
          Status: Status,
        },
        { new: true }
      );

      try {
        io.emit("roomDetail_Updated", roomUpdate);
      } catch (emitError) {
        console.error("Socket emit error:", emitError);
      }

      return res.status(200).json({
        success: true,
        message: "Request Accepted Success",
      });
    } else {
      const roomUpdate = await RoomModel.findOneAndUpdate(
        { roomId: roomId },
        {
          $push: { RejectedManager: managerId },
          Status: Status,
        },
        { new: true }
      );
      try {
        io.emit("roomDetail_Updated", roomUpdate);
      } catch (emitError) {
        console.error("Socket emit error:", emitError);
      }
      return res.status(200).json({
        success: true,
        message: "Request Rejected Success",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const handleGetAllBrandData = async (req, res) => {
  try {
    const Id = req.params.id;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    const BrandData = await BrandScehma.find({});
    return res.status(200).json(BrandData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const EditBrandNameRoom = async (req, res) => {
  try {
    const Id = req.params.id;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    const BrandData = await BrandScehma.find({});
    const { id, BrandName, Points } = req.body;

    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();

    const updatedBrandData = await BrandScehma.findByIdAndUpdate(
      { _id: id },
      {
        BrandName: BrandData.BrandName || BrandName,
        Points: BrandData.Points || Points,
        ModifiedDate: `${day}-${month}-${year}`,
      }
    );
    return res.status(200).json({
      success: true,
      message: "Updated Successfully",
      updatedBrandData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetBillCount = async (req, res) => {
  try {
    const Id = req.params.id;

    // Define models to search through
    const models = [AdminModel, TlmModel, SlmModel, FlmModel];
    let userExists = null;

    // Search across all models
    for (const model of models) {
      userExists = await model.findById(Id);
      if (userExists) break; // Exit loop if found
    }

    if (!userExists) {
      return res.status(404).json({
        message: "User not found in any model.",
        success: false,
      });
    }

    // Ensure BillClickCount is a valid number
    if (typeof userExists.BillClickCount !== "number") {
      userExists.BillClickCount = 0;
    }

    // Increment the count
    userExists.BillClickCount += 1;
    await userExists.save();

    return res.status(200).json({
      success: true,
      message: "Bill Count successfully updated",
    });
  } catch (error) {
    console.error("Error updating BillClickCount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleCalculateBillSize = async (req, res) => {
  try {
    const Id = req.params.id;

    // Define models to search through
    const models = [AdminModel, TlmModel, SlmModel, FlmModel];
    let userExists = null;

    // Search across all models
    for (const model of models) {
      userExists = await model.findById(Id);
      if (userExists) break; // Exit loop if found
    }

    if (!userExists) {
      return res.status(404).json({
        message: "User not found in any model.",
        success: false,
      });
    }

    // Ensure BillClickCount is a valid number
    if (typeof userExists.BillSizeCount !== "number") {
      userExists.BillSizeCount = 0;
    }

    // Increment the count
    userExists.BillSizeCount += req.body.count;
    await userExists.save();

    return res.status(200).json({
      success: true,
      message: "Bill Size successfully updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetTopRunScorer = async (req, res) => {
  try {
    const topScorers = await mrModel.aggregate([
      {
        $addFields: {
          TotalScore: { $toDouble: "$TotalScore" }, // Convert TotalScore to a number
        },
      },
      { $sort: { TotalScore: -1 } }, // Sort by TotalScore in descending order
      { $limit: 3 }, // Limit the results to top 3
      {
        $project: {
          MRID: 1,
          USERNAME: 1,
          HQ: 1,
          REGION: 1,
          ZONE: 1,
          TEAMNAME: 1,
          TotalScore: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: topScorers, // Return the top 3 scorers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetHighestBatchingAverage = async (req, res) => {
  try {
    const topBatchingAverages = await mrModel.aggregate([
      {
        $addFields: {
          // Check if TotalMatches is 0 and handle it
          battingAverage: {
            $cond: {
              if: { $eq: [{ $toDouble: "$TotalMatches" }, 0] }, // Check if TotalMatches is 0
              then: null, // If TotalMatches is 0, set battingAverage to null
              else: {
                $divide: [
                  { $toDouble: "$TotalScore" }, // Convert TotalScore to a number
                  { $toDouble: "$TotalMatches" }, // Convert TotalMatches to a number
                ],
              },
            },
          },
        },
      },
      { $sort: { battingAverage: -1 } }, // Sort by battingAverage in descending order
      { $limit: 3 }, // Limit the results to top 3
      {
        $project: {
          MRID: 1,
          USERNAME: 1,
          HQ: 1,
          REGION: 1,
          ZONE: 1,
          TEAMNAME: 1,
          TotalScore: 1,
          TotalMatches: 1,
          battingAverage: 1, // Include batting average in the response
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: topBatchingAverages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleTotalSixes = async (req, res) => {
  try {
    // Aggregate and calculate the total sixes
    const totalSixes = await mrModel.aggregate([
      {
        $addFields: {
          // Convert TotalSixes (string) to a number for calculation
          totalSixesNumeric: { $toInt: "$TotalSixes" },
        },
      },
      {
        $group: {
          _id: null, // Grouping by null so that we get the total for all documents
          TotalSixes: { $sum: "$totalSixesNumeric" }, // Sum the totalSixesNumeric values
        },
      },
      {
        $project: {
          _id: 0, // Don't return the _id field in the response
          TotalSixes: 1, // Return the sum of totalSixes
        },
      },
    ]);

    // If there are no results, return a message
    if (totalSixes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for total sixes.",
      });
    }

    return res.status(200).json({
      success: true,
      data: totalSixes[0], // Return the first (and only) result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleTotalFours = async (req, res) => {
  try {
    const totalFours = await mrModel.aggregate([
      {
        $addFields: {
          totalFoursNumeric: { $toInt: "$TotalFours" },
        },
      },
      {
        $group: {
          _id: null,
          TotalFours: { $sum: "$totalFoursNumeric" },
        },
      },
      {
        $project: {
          _id: 0,
          TotalFours: 1,
        },
      },
    ]);

    // If there are no results, return a message
    if (totalFours.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for total fours.",
      });
    }

    return res.status(200).json({
      success: true,
      data: totalFours[0], // Return the first (and only) result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetTotalRuns = async (req, res) => {
  try {
    const totalRuns = await mrModel.aggregate([
      {
        $addFields: {
          totalRunsNumeric: { $toInt: "$TotalScore" },
        },
      },
      {
        $group: {
          _id: null,
          TotalRuns: { $sum: "$totalRunsNumeric" },
        },
      },
      {
        $project: {
          _id: 0,
          TotalRuns: 1,
        },
      },
    ]);

    // If there are no results, return a message
    if (totalRuns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for total Runs.",
      });
    }

    return res.status(200).json({
      success: true,
      data: totalRuns[0], // Return the first (and only) result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleTotalCenturiesCount = async (req, res) => {
  try {
    const result = await mrModel.aggregate([
      {
        $project: {
          MrScoreEachMatch: 1, // Include the MrScoreEachMatch array
        },
      },
      {
        $addFields: {
          // Calculate the total centuries for each document
          centuriesCount: {
            $size: {
              $filter: {
                input: "$MrScoreEachMatch", // Iterate through the MrScoreEachMatch array
                as: "match",
                cond: {
                  $gte: [{ $toInt: "$$match.Score" }, 100], // Convert Score to number and check if >= 100
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null, // Group all documents together
          totalCenturies: { $sum: "$centuriesCount" }, // Sum all the centuriesCount values
        },
      },
    ]);

    // If no data is found, set totalCenturies to 0
    const totalCenturies = result.length > 0 ? result[0].totalCenturies : 0;

    return res.status(200).json({
      success: true,
      data: { totalCenturies },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleTotalHalfCenturiesCount = async (req, res) => {
  try {
    const result = await mrModel.aggregate([
      {
        $project: {
          MrScoreEachMatch: 1, // Include the MrScoreEachMatch array
        },
      },
      {
        $addFields: {
          // Calculate the total centuries for each document
          halfcenturiesCount: {
            $size: {
              $filter: {
                input: "$MrScoreEachMatch", // Iterate through the MrScoreEachMatch array
                as: "match",
                cond: {
                  $and: [
                    { $gt: [{ $toInt: "$$match.Score" }, 50] }, // Greater than 50
                    { $lt: [{ $toInt: "$$match.Score" }, 100] }, // Less than 100
                  ],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null, // Group all documents together
          totalHalfCenturies: { $sum: "$halfcenturiesCount" }, // Sum all the centuriesCount values
        },
      },
    ]);

    // If no data is found, set totalHalfCenturies to 0
    const totalHalfCenturies =
      result.length > 0 ? result[0].totalHalfCenturies : 0;

    return res.status(200).json({
      success: true,
      data: { totalHalfCenturies },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetHighestTeamScore = async (req, res) => {
  try {
    const matches = await MatchesSchema.find().select(
      "teamA teamB MatchResult"
    );

    let highestScoreData = {
      score: 0, // Initial highest score
      team: "",
      startDate: "",
    };

    matches.forEach((match) => {
      match.MatchResult.forEach((result) => {
        const teamAScore = parseInt(result.teamAScore, 10) || 0; // Convert teamAScore to number
        const teamBScore = parseInt(result.teamBScore, 10) || 0; // Convert teamBScore to number

        if (teamAScore > highestScoreData.score) {
          highestScoreData = {
            score: teamAScore,
            team: match.teamA,
            startDate: result.startDate,
          };
        }

        if (teamBScore > highestScoreData.score) {
          highestScoreData = {
            score: teamBScore,
            team: match.teamB,
            startDate: result.startDate,
          };
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: highestScoreData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetLowestTeamScore = async (req, res) => {
  try {
    const matches = await MatchesSchema.find().select(
      "teamA teamB MatchResult"
    );

    let lowestTeamScore = {
      score: Infinity, // Initialize with a very high value
      team: "",
      startDate: "",
    };

    matches.forEach((match) => {
      match.MatchResult.forEach((result) => {
        const teamAScore = parseInt(result.teamAScore, 10) || 0; // Convert teamAScore to number
        const teamBScore = parseInt(result.teamBScore, 10) || 0; // Convert teamBScore to number

        // Check for the lowest score
        if (teamAScore < lowestTeamScore.score) {
          lowestTeamScore = {
            score: teamAScore,
            team: match.teamA,
            startDate: result.startDate,
          };
        }

        if (teamBScore < lowestTeamScore.score) {
          lowestTeamScore = {
            score: teamBScore,
            team: match.teamB,
            startDate: result.startDate,
          };
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: lowestTeamScore,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleBestScoreByPlayer = async (req, res) => {
  try {
    const BestScoreByPlayer = await mrModel.aggregate([
      {
        $addFields: {
          BestScore: { $toDouble: "$BestScore" },
        },
      },
      { $sort: { BestScore: -1 } }, // Sort in descending order
      { $limit: 1 }, // Limit to the top result
      {
        $project: {
          TEAMNAME: 1,
          BestScore: 1,
          USERNAME: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: BestScoreByPlayer.length ? BestScoreByPlayer[0] : null, // Return the top scorer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleMostNoOfMatchesByTeam = async (req, res) => {
  try {
    // Aggregate match counts from flmModel
    const flmData = await flmModel.aggregate([
      {
        $addFields: {
          matchCount: {
            $cond: {
              if: { $isArray: "$EachMatchRecord" },
              then: { $size: "$EachMatchRecord" },
              else: 0, // Default to 0 if EachMatchRecord is not present
            },
          },
        },
      },
      {
        $project: {
          TeamName: 1,
          matchCount: 1,
        },
      },
    ]);

    // Aggregate match counts from slmModel
    const slmData = await slmModel.aggregate([
      {
        $addFields: {
          matchCount: {
            $cond: {
              if: { $isArray: "$EachMatchRecord" },
              then: { $size: "$EachMatchRecord" },
              else: 0, // Default to 0 if EachMatchRecord is not present
            },
          },
        },
      },
      {
        $project: {
          TeamName: 1,
          matchCount: 1,
        },
      },
    ]);

    // Aggregate match counts from TlmModel
    const tlmData = await TlmModel.aggregate([
      {
        $addFields: {
          matchCount: {
            $cond: {
              if: { $isArray: "$EachMatchRecord" },
              then: { $size: "$EachMatchRecord" },
              else: 0, // Default to 0 if EachMatchRecord is not present
            },
          },
        },
      },
      {
        $project: {
          TeamName: 1,
          matchCount: 1,
        },
      },
    ]);

    // Combine all results into a single array
    const allTeams = [...flmData, ...slmData, ...tlmData];

    // Create a map to accumulate match counts for teams
    const teamMap = {};

    allTeams.forEach((team) => {
      if (teamMap[team.TeamName]) {
        teamMap[team.TeamName].matchCount += team.matchCount; // Sum match counts
      } else {
        teamMap[team.TeamName] = {
          TeamName: team.TeamName,
          matchCount: team.matchCount,
        };
      }
    });

    // Convert the map to an array of teams
    const teamsWithMatchCounts = Object.values(teamMap);

    // Find the highest match count
    const highestMatchCount = Math.max(
      ...teamsWithMatchCounts.map((team) => team.matchCount)
    );

    // Filter teams with the highest match count
    const teamsWithHighestMatches = teamsWithMatchCounts.filter(
      (team) => team.matchCount === highestMatchCount
    );

    // Return only the first team if multiple teams have the highest match count
    const mostMatchesTeam = teamsWithHighestMatches[0];

    return res.status(200).json({
      success: true,
      highestMatchesCount: mostMatchesTeam.matchCount,
      TeamName: mostMatchesTeam.TeamName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetMrNames = async (req, res) => {
  try {
    const mrNames = await mrModel.find().select("USERNAME");

    return res.status(200).json({
      success: true,
      data: mrNames,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// const handleGetPlayerDetails = async (req, res) => {
//   try {
//     const MrName = req.params.mrName;
//     let userExist;

//     if (!MrName) {
//       return res.status(400).json({
//         msg: "Mr Name Not Found",
//       });
//     }

//     userExist = await mrModel
//       .findOne({ USERNAME: MrName })
//       .select("-MRUploadedData -loginLogs -lastMatchRecord");
//     const data = [];

//     if (!userExist) {
//       return res.status(400).json({
//         msg: "User Not Exist...!!!",
//       });
//     }

//     data.push(userExist);
//     return res.status(200).send({
//       success: true,
//       message: "Player Data Fetched Successfully",
//       data,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const handleGetPlayerDetails = async (req, res) => {
  try {
    const MrName = req.params.mrName;
    let userExist;

    if (!MrName) {
      return res.status(400).json({
        msg: "Mr Name Not Found",
      });
    }

    userExist = await mrModel
      .findOne({ USERNAME: MrName })
      .select("-MRUploadedData -loginLogs -lastMatchRecord");
    const data = [];

    if (!userExist) {
      return res.status(400).json({
        msg: "User Not Exist...!!!",
      });
    }

    // Calculate TournamentScore and TotalTournamentMatch
    let TournamentScore = 0;
    let TotalTournamentMatch = 0;
    let TotalODIMatch = 0;
    let TotalFoursTournament = 0;
    let TotalSixesTournament = 0;
    let TotalFoursODI = 0;
    let TotalSixesODI = 0;

    userExist.MrScoreEachMatch?.forEach((match) => {
      if (match.isTournament) {
        TournamentScore += parseInt(match.Score) || 0; // Sum up the scores
        TotalTournamentMatch += 1; // Increment match count
        TotalFoursTournament += parseInt(match.TotalFours) || 0; // Increment match count
        TotalSixesTournament += parseInt(match.TotalSixes) || 0; // Increment match count
      } else {
        TotalFoursODI += parseInt(match.TotalFours) || 0; // Increment match count
        TotalSixesODI += parseInt(match.TotalSixes) || 0; // Increment match count
        TotalODIMatch += 1;
      }
    });

    const OdiScore = userExist.MrScoreEachMatch?.filter(
      (match) => !match.isTournament
    ) // Filter matches where isTournament is true
      .reduce((total, match) => total + (parseInt(match.Score) || 0), 0);

    const userObject = userExist.toObject();
    delete userObject.MrScoreEachMatch; // Remove MrScoreEachMatch field

    // Add user data and TournamentScore to the response
    data.push({
      ...userObject, // Convert Mongoose document to plain object
      TournamentScore, // Add TournamentScore to the response
      OdiScore,
      TotalTournamentMatch,
      TotalODIMatch,
      TotalFoursTournament,
      TotalSixesTournament,
      TotalFoursODI,
      TotalSixesODI,
    });

    return res.status(200).send({
      success: true,
      message: "Player Data Fetched Successfully",
      data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetAllNotification = async (req, res) => {
  try {
    const CompanyName = req.params.companyName;
    const data = await Notification.find({ CompanyName });
    return res.status(200).json({
      success: true,
      message: "Notification Fetched Successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/*const handleGetTeamDetailsByTeamName = async (req, res) => {
  try {
    const TeamName = req.params.TeamName;

    const models = [slmModel, flmModel, tlmModel];
    const matchDetailsModel = MatchDetails;
    const MrData = mrModel;

    let TeamScore = 0;
    let TeamHighestScore = 0;
    let TeamLowestScore = 0;
    let topPlayerScore = 0;
    let Fours = 0;
    let Sixes = 0;
    let TotalPlayerScore = 0;
    let processedDates = new Set();
    let mostWinsAgainstTeam = {};
    let mostLostAgainstTeam = {};

    const matchMap = new Map(); // To ensure uniqueness based on roomId
    let roomPlayersA = [];
    let roomPlayersB = [];
    let PlayerScores = {};
    let TopRunScorer = {};
    let maxWinsTeam = null;
    let maxWinsCount = 0;

    let maxLossesTeam = null;
    let maxLossesCount = 0;

    for (const model of models) {
      const teams = await model.find({ TeamName });

      for (const team of teams) {
        if (Array.isArray(team.EachMatchRecord)) {
          for (const matchRecord of team.EachMatchRecord) {
            const { score } = matchRecord || {};
            if (parseInt(score) > TeamHighestScore) {
              TeamHighestScore = parseInt(score);
            } else {
              TeamLowestScore = parseInt(score);
            }
            TeamScore += parseInt(score);
          }
        } else {
          console.warn(
            "EachMatchRecord is not an array:",
            team.EachMatchRecord
          );
        }
      }

      const matches = await matchDetailsModel.find({
        $or: [{ teamA: TeamName }, { teamB: TeamName }],
      });

      matches.forEach((match) => {
        matchMap.set(match.roomId, match); // Use roomId as the unique key

        // Extract room players based on the team name
        if (match.teamA === TeamName) {
          roomPlayersA = roomPlayersA.concat(match.roomPlayersA || []);
        } else if (match.teamB === TeamName) {
          roomPlayersB = roomPlayersB.concat(match.roomPlayersB || []);
        }
      });
    }

    const uniqueMatchesArray = Array.from(matchMap.values());
    const processRoomPlayers = async (roomPlayers) => {
      for (const playerId of roomPlayers) {
        const mr = await MrData.findById(playerId); // Find the MR by ID
        if (!mr || !Array.isArray(mr.MrScoreEachMatch)) continue;

        for (const scoreEntry of mr.MrScoreEachMatch) {
          const { MatchDate, Score, TotalFours, TotalSixes } = scoreEntry;

          // Skip processing if this MatchDate has already been processed
          if (processedDates.has(MatchDate)) {
            continue;
          }

          // Add the MatchDate to the set
          processedDates.add(MatchDate);

          for (const matchDetails of uniqueMatchesArray) {
            if (matchDetails.startDate === MatchDate) {
              const newScore = parseInt(Score) || 0;
              const totalFoursCount = parseInt(TotalFours) || 0;
              const totalSixesCount = parseInt(TotalSixes) || 0;

              Fours += totalFoursCount;
              Sixes += totalSixesCount;

              // Compare the current score with the top player score
              if (newScore > topPlayerScore) {
                topPlayerScore = newScore; // Update the highest score
                topPlayerName = mr.USERNAME; // Set the top player to the current player
                TotalPlayerScore += newScore;
              }
            }
          }

          if (topPlayerName) {
            PlayerScores[topPlayerName] = topPlayerScore;
            TopRunScorer[topPlayerName] = TotalPlayerScore;
          }
        }
      }
    };

    for (const match of uniqueMatchesArray) {
      // Loop through each match result
      for (const matchResult of match.MatchResult) {
        const { Result, teamAScore, teamBScore, winner } = matchResult;

        // Check if TeamName is teamA or teamB
        if (match.teamA === TeamName) {
          if (Result === TeamName) {
            // Team A won against Team B
            mostWinsAgainstTeam[match.teamB] =
              (mostWinsAgainstTeam[match.teamB] || 0) + 1;

            // Update max wins count
            if (mostWinsAgainstTeam[match.teamB] > maxWinsCount) {
              maxWinsTeam = match.teamB;
              maxWinsCount = mostWinsAgainstTeam[match.teamB];
            }
          } else {
            // Team A lost against Team B
            mostLostAgainstTeam[match.teamB] =
              (mostLostAgainstTeam[match.teamB] || 0) + 1;

            // Update max losses count
            if (mostLostAgainstTeam[match.teamB] > maxLossesCount) {
              maxLossesTeam = match.teamB;
              maxLossesCount = mostLostAgainstTeam[match.teamB];
            }
          }
        } else if (match.teamB === TeamName) {
          if (Result === TeamName) {
            // Team B won against Team A
            mostWinsAgainstTeam[match.teamA] =
              (mostWinsAgainstTeam[match.teamA] || 0) + 1;

            // Check if this team has the maximum wins
            if (
              mostWinsAgainstTeam[match.teamA] > maxWinsCount ||
              (mostWinsAgainstTeam[match.teamA] === maxWinsCount &&
                !maxWinsTeam)
            ) {
              maxWinsTeam = match.teamA;
              maxWinsCount = mostWinsAgainstTeam[match.teamA];
            }
          } else {
            // Team B lost against Team A
            mostLostAgainstTeam[match.teamA] =
              (mostLostAgainstTeam[match.teamA] || 0) + 1;

            // Check if this team has the maximum losses
            if (
              mostLostAgainstTeam[match.teamA] > maxLossesCount ||
              (mostLostAgainstTeam[match.teamA] === maxLossesCount &&
                !maxLossesTeam)
            ) {
              maxLossesTeam = match.teamA;
              maxLossesCount = mostLostAgainstTeam[match.teamA];
            }
          }
        }
      }
    }

    const filteredMostWinsAgainstTeam = {};
    if (maxWinsTeam) {
      filteredMostWinsAgainstTeam[maxWinsTeam] = maxWinsCount;
    }

    const filteredMostLostAgainstTeam = {};
    if (maxLossesTeam) {
      filteredMostLostAgainstTeam[maxLossesTeam] = maxLossesCount;
    }

    await processRoomPlayers(roomPlayersA);
    await processRoomPlayers(roomPlayersB);

    return res.status(200).json({
      success: true,
      TeamName,
      TotalMatchesByTeam: uniqueMatchesArray.length,
      TotalTeamScore: TeamScore,
      TeamHighestScore,
      TeamLowestScore,
      PlayerScores,
      Fours,
      Sixes,
      TopRunScorer,
      mostWinsAgainstTeam: filteredMostWinsAgainstTeam,
      mostLostAgainstTeam: filteredMostLostAgainstTeam,
    });
  } catch (error) {
    console.error("Error in handleGetTeamDetailsByTeamName:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};*/


const handleGetTeamDetailsByTeamName = async (req, res) => {
  try {
    const TeamName = req.params.TeamName;

    const models = [slmModel, flmModel, tlmModel];
    const matchDetailsModel = MatchDetails;
    const MrData = mrModel;

    let TeamScore = 0;
    let TeamHighestScore = 0;
    let TeamLowestScore = Infinity;
    let Fours = 0;
    let Sixes = 0;
    let Centuries = 0;
    let HalfCenturies = 0;
    let processedDates = new Set();
    let mostWinsAgainstTeam = {};
    let mostLostAgainstTeam = {};

    const matchMap = new Map();
    let roomPlayersA = [];
    let roomPlayersB = [];
    let PlayerScores = {};
    let TopRunScorer = {};
    let maxWinsTeam = null;
    let maxWinsCount = 0;
    let maxLossesTeam = null;
    let maxLossesCount = 0;

    // Helper function to parse DD-MM-YYYY date format
    const parseDate = (dateString) => {
      const parts = dateString.split('-');
      return new Date(parts[2], parts[1] - 1, parts[0]);
    };

    // Get current date at start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get match details
    const matches = await matchDetailsModel.find({
      $or: [{ teamA: TeamName }, { teamB: TeamName }],
    });

    // ✅ CATEGORIZE MATCHES BY STATUS
    let hasExpiredMatch = false;
    const completedMatches = [];

    matches.forEach((match) => {
      const matchStartDate = parseDate(match.startDate);
      const matchEndDate = parseDate(match.endDate);

      // Check if match is expired (endDate < today)
      if (matchEndDate < today) {
        hasExpiredMatch = true;
        completedMatches.push(match);
      }
      // Or if match has started (startDate <= today)
      else if (matchStartDate <= today) {
        completedMatches.push(match);
      }
    });

    completedMatches.forEach((match) => {
      matchMap.set(match.roomId, match);

      if (match.teamA === TeamName) {
        roomPlayersA = roomPlayersA.concat(match.roomPlayersA || []);
      } else if (match.teamB === TeamName) {
        roomPlayersB = roomPlayersB.concat(match.roomPlayersB || []);
      }
    });

    const uniqueMatchesArray = Array.from(matchMap.values());

    // ✅ CALCULATE TEAM HIGHEST & LOWEST SCORE FROM EachMatchRecord (ONLY IF EXPIRED MATCH EXISTS)
    if (hasExpiredMatch) {
      for (const model of models) {
        const teams = await model.find({ TeamName });

        for (const team of teams) {
          if (Array.isArray(team.EachMatchRecord)) {
            for (const matchRecord of team.EachMatchRecord) {
              const { score, date } = matchRecord || {};

              // Only consider scores from expired matches
              if (date) {
                const matchDate = parseDate(date);
                const scoreNum = parseInt(score) || 0;

                // Check if this match date corresponds to an expired match
                const relatedMatch = matches.find(m => {
                  const endDate = parseDate(m.endDate);
                  return endDate < today && m.startDate === date;
                });

                if (relatedMatch && scoreNum > 0) {
                  // ✅ Update HIGHEST score
                  if (scoreNum > TeamHighestScore) {
                    TeamHighestScore = scoreNum;
                  }

                  // ✅ Update LOWEST score
                  if (scoreNum < TeamLowestScore) {
                    TeamLowestScore = scoreNum;
                  }
                }
              }
            }
          }
        }
      }

      // If no valid scores found, set to 0
      if (TeamLowestScore === Infinity) {
        TeamLowestScore = 0;
      }
      if (TeamHighestScore === 0) {
        TeamHighestScore = 0;
      }
    } else {
      // No expired matches, return 0 for both
      TeamHighestScore = 0;
      TeamLowestScore = 0;
    }

    // Step 2: Calculate Total Runs, Boundaries, Centuries from MR data
    const processRoomPlayers = async (roomPlayers) => {
      for (const playerId of roomPlayers) {
        const mr = await MrData.findById(playerId);
        if (!mr || mr.TEAMNAME !== TeamName) continue;

        // Add player's total fours and sixes
        Fours += parseInt(mr.TotalFours) || 0;
        Sixes += parseInt(mr.TotalSixes) || 0;

        // Process each match score
        if (Array.isArray(mr.MrScoreEachMatch)) {
          for (const scoreEntry of mr.MrScoreEachMatch) {
            const { MatchDate, Score } = scoreEntry;

            if (processedDates.has(MatchDate)) {
              continue;
            }

            // Check if this match date is completed
            const matchDate = parseDate(MatchDate);
            if (matchDate > today) {
              continue;
            }

            processedDates.add(MatchDate);

            const score = parseInt(Score) || 0;

            // Add to total team score
            TeamScore += score;

            // Count centuries and half centuries
            if (score >= 100) {
              Centuries++;
            } else if (score >= 50) {
              HalfCenturies++;
            }

            // Track player scores
            if (!PlayerScores[mr.USERNAME] || score > PlayerScores[mr.USERNAME]) {
              PlayerScores[mr.USERNAME] = score;
            }

            // Track top run scorer (total runs)
            TopRunScorer[mr.USERNAME] = (TopRunScorer[mr.USERNAME] || 0) + score;
          }
        }
      }
    };

    // Step 3: Calculate wins and losses (only for completed matches)
    for (const match of uniqueMatchesArray) {
      if (!Array.isArray(match.MatchResult) || match.MatchResult.length === 0) {
        continue;
      }

      for (const matchResult of match.MatchResult) {
        const { Result } = matchResult;

        if (match.teamA === TeamName) {
          if (Result === TeamName) {
            mostWinsAgainstTeam[match.teamB] =
              (mostWinsAgainstTeam[match.teamB] || 0) + 1;

            if (mostWinsAgainstTeam[match.teamB] > maxWinsCount) {
              maxWinsTeam = match.teamB;
              maxWinsCount = mostWinsAgainstTeam[match.teamB];
            }
          } else {
            mostLostAgainstTeam[match.teamB] =
              (mostLostAgainstTeam[match.teamB] || 0) + 1;

            if (mostLostAgainstTeam[match.teamB] > maxLossesCount) {
              maxLossesTeam = match.teamB;
              maxLossesCount = mostLostAgainstTeam[match.teamB];
            }
          }
        } else if (match.teamB === TeamName) {
          if (Result === TeamName) {
            mostWinsAgainstTeam[match.teamA] =
              (mostWinsAgainstTeam[match.teamA] || 0) + 1;

            if (mostWinsAgainstTeam[match.teamA] > maxWinsCount) {
              maxWinsTeam = match.teamA;
              maxWinsCount = mostWinsAgainstTeam[match.teamA];
            }
          } else {
            mostLostAgainstTeam[match.teamA] =
              (mostLostAgainstTeam[match.teamA] || 0) + 1;

            if (mostLostAgainstTeam[match.teamA] > maxLossesCount) {
              maxLossesTeam = match.teamA;
              maxLossesCount = mostLostAgainstTeam[match.teamA];
            }
          }
        }
      }
    }

    const filteredMostWinsAgainstTeam = {};
    if (maxWinsTeam) {
      filteredMostWinsAgainstTeam[maxWinsTeam] = maxWinsCount;
    }

    const filteredMostLostAgainstTeam = {};
    if (maxLossesTeam) {
      filteredMostLostAgainstTeam[maxLossesTeam] = maxLossesCount;
    }

    // Process all room players
    await processRoomPlayers(roomPlayersA);
    await processRoomPlayers(roomPlayersB);

    return res.status(200).json({
      success: true,
      TeamName,
      TotalMatchesByTeam: uniqueMatchesArray.length,
      TotalTeamScore: TeamScore,
      TeamHighestScore, // ✅ From EachMatchRecord of expired matches only
      TeamLowestScore, // ✅ From EachMatchRecord of expired matches only
      PlayerScores,
      TopRunScorer,
      Fours,
      Sixes,
      Centuries,
      HalfCenturies,
      mostWinsAgainstTeam: filteredMostWinsAgainstTeam,
      mostLostAgainstTeam: filteredMostLostAgainstTeam,
    });
  } catch (error) {
    console.error("Error in handleGetTeamDetailsByTeamName:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/*const handleGetPointsTableByTeamName = async (req, res) => {
  try {
    const TeamName = req.params.TeamName;

    // Find only the MRs where TEAMNAME matches the given TeamName
    const allMrs = await mrModel
      .find(
        { TEAMNAME: TeamName },
        { USERNAME: 1, TEAMNAME: 1, TotalScore: 1, TotalMatches: 1 }
      ) // Filter by TEAMNAME and select required fields
      .sort({ TotalScore: -1 }); // Sort by TotalScore in descending order

    // Send the response
    return res.status(200).json({
      success: true,
      data: allMrs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};*/


const handleGetPointsTableByTeamName = async (req, res) => {
  try {
    const TeamName = req.params.TeamName;

    // Find only the MRs where TEAMNAME matches the given TeamName
    const allMrs = await mrModel
      .find(
        { TEAMNAME: TeamName },
        { USERNAME: 1, TEAMNAME: 1, TotalScore: 1, TotalMatches: 1 }
      ) // Filter by TEAMNAME and select required fields
      .sort({ TotalScore: -1 }); // Sort by TotalScore in descending order

    // Send the response
    return res.status(200).json({
      success: true,
      data: allMrs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//Convert Excel Date To String
const excelSerialToDate = (serial) => {
  // Excel's base date (1-Jan-1900), correcting for leap year bug
  const excelEpoch = new Date(1899, 11, 30); // 30-Dec-1899

  // Convert serial number to date
  const date = new Date(excelEpoch.getTime() + serial * 86400000);

  // Convert to IST (Asia/Kolkata)
  const todayDate = DateTime.fromJSDate(date)
    .setZone("Asia/Kolkata") // Ensure correct time zone
    .toFormat("dd-MM-yyyy");

  return todayDate;
};

const handleScheduleMatchesAdmin = async (req, res) => {
  try {
    const AdminId = req.params.id;
    const admin = await AdminModel.findById(AdminId);
    if (!admin) {
      return res.status(400).json({
        msg: "Admin Not Found",
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        error: "Excel sheet missing",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Data Missing",
      });
    }

    const errorMessages = [];
    const successfulMatches = [];

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const rowNumber = i + 2;

      try {
        console.log(`Processing Row ${rowNumber}:`, row);

        // ✅ VALIDATION
        const requiredFields = ["playerAId", "playerBId", "challengeStartDate", "challengeEndDate"];
        const missingFields = requiredFields.filter(
          (field) => !row[field] || String(row[field]).trim() === ""
        );

        if (missingFields.length > 0) {
          errorMessages.push(`Row ${rowNumber}: Missing fields - ${missingFields.join(", ")}`);
          continue;
        }

        const datePattern = /^\d{2}-\d{2}-\d{4}$/;
        let challengeStartDate = excelSerialToDate(row.challengeStartDate);
        let challengeEndDate = excelSerialToDate(row.challengeEndDate);

        if (!datePattern.test(challengeStartDate)) {
          errorMessages.push(`Row ${rowNumber}: Invalid challengeStartDate format`);
          continue;
        }

        if (!datePattern.test(challengeEndDate)) {
          errorMessages.push(`Row ${rowNumber}: Invalid challengeEndDate format`);
          continue;
        }

        // ✅ CHECK MATCH DURATION
        const MatchDuration = await MatchScheduleData.find({});
        if (!MatchDuration.length || MatchDuration[0].SetMatchDurationBefore == null) {
          errorMessages.push(`Row ${rowNumber}: SetMatchDurationBefore value is missing`);
          continue;
        }
        const setMatchDurationBefore = MatchDuration[0].SetMatchDurationBefore;

        const today = new Date();
        const minChallengeDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + parseInt(setMatchDurationBefore)
        );

        const [day, month, year] = challengeStartDate.split("-").map(Number);
        const challengeDateObj = new Date(year, month - 1, day);

        if (challengeDateObj < minChallengeDate) {
          errorMessages.push(
            `Row ${rowNumber}: Challenge start date should be at least ${setMatchDurationBefore} day(s) from today`
          );
          continue;
        }

        const [day1, month1, year1] = challengeEndDate.split("-").map(Number);
        const challengeDateObj1 = new Date(year1, month1 - 1, day1);

        if (challengeDateObj1 <= challengeDateObj) {
          errorMessages.push(`Row ${rowNumber}: Challenge end date must be after start date`);
          continue;
        }

        // ✅ FIND PLAYER A AND GET ALL MRS
        let creatorRole, roomId, allowedMembers = [], notifyUsers = [], players = [], TeamName = "", creatorId = "";

        const tlm = await tlmModel.findOne({ TLMEmpID: row.playerAId }).populate({
          path: "Slm",
          populate: { path: "Flm", populate: { path: "Mrs" } },
        });

        if (tlm) {
          creatorRole = "Tlm";
          roomId = uuid.v4();
          notifyUsers = await tlmModel.find({ TLMEmpID: { $ne: row.playerAId } });
          allowedMembers = notifyUsers.map(u => u._id);
          TeamName = tlm.TeamName;
          creatorId = tlm._id;

          tlm.Slm.forEach((slm) => {
            slm.Flm.forEach((flm) => {
              flm.Mrs.forEach((mr) => {
                players.push(mr._id.toString());
              });
            });
          });
        } else {
          const slm = await slmModel.findOne({ SLMEmpID: row.playerAId }).populate({
            path: "Flm",
            populate: { path: "Mrs" },
          });

          if (slm) {
            creatorRole = "Slm";
            roomId = uuid.v4();
            notifyUsers = await slmModel.find({ SLMEmpID: { $ne: row.playerAId } });
            allowedMembers = notifyUsers.map(u => u._id);
            TeamName = slm.TeamName;
            creatorId = slm._id;

            slm.Flm.forEach((flm) => {
              flm.Mrs.forEach((mr) => {
                players.push(mr._id.toString());
              });
            });
          } else {
            const flm = await flmModel.findOne({ FLMEmpID: row.playerAId }).populate("Mrs");

            if (flm) {
              creatorRole = "Flm";
              roomId = uuid.v4();
              notifyUsers = await flmModel.find({ FLMEmpID: { $ne: row.playerAId } });
              allowedMembers = notifyUsers.map(u => u._id);
              TeamName = flm.TeamName;
              creatorId = flm._id;

              flm.Mrs.forEach((mr) => {
                players.push(mr._id.toString());
              });
            } else {
              errorMessages.push(`Row ${rowNumber}: PlayerA not found (${row.playerAId})`);
              continue;
            }
          }
        }

        console.log(`✅ Row ${rowNumber}: Found ${players.length} players for team ${TeamName}`);

        // ✅ UPDATE MR TEAMNAMES
        await Promise.all(
          players.map(async (playerId) => {
            const mrExist = await mrModel.findById(playerId);
            if (mrExist) {
              mrExist.TEAMNAME = TeamName;
              await mrExist.save();
            }
          })
        );

        // ✅ CREATE ROOM
        const RoomCreate = new RoomModel({
          roomId: roomId,
          creatorRole: creatorRole,
          teamName: TeamName,
          creatorId: creatorId,
          challengeDate: challengeStartDate,
          challengeEndDate: challengeEndDate,
          maxAccepts: "1",
          allowedMembers: allowedMembers,
          players: players, // ✅ THIS SHOULD HAVE VALUES NOW
          isTournament: true,
        });

        const roomData = await RoomCreate.save();
        console.log(`✅ Room created: ${roomId} with ${players.length} players`);

        // ✅ EMIT SOCKET EVENTS
        if (roomData) {
          io.emit("roomDetail_Updated", roomData);
        }

        // ✅ JOIN TOURNAMENT (ADD PLAYERB)
        await JoinTournaMent(roomId, row.playerBId);
        console.log(`✅ PlayerB ${row.playerBId} joined room ${roomId}`);

        successfulMatches.push({
          row: rowNumber,
          roomId: roomId,
          teamA: TeamName,
          players: players.length,
        });

      } catch (rowError) {
        console.error(`❌ Error processing row ${rowNumber}:`, rowError);
        errorMessages.push(`Row ${rowNumber}: ${rowError.message}`);
      }
    }

    // ✅ RETURN RESULTS
    if (errorMessages.length > 0 && successfulMatches.length === 0) {
      return res.status(400).json({
        success: false,
        errorType: "validation",
        error: errorMessages,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully created ${successfulMatches.length} tournament(s)`,
      successfulMatches: successfulMatches,
      errors: errorMessages.length > 0 ? errorMessages : undefined,
    });

  } catch (error) {
    console.error("❌ Fatal Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



const handleGetAllMatches = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const matchData = await MatchDetails.aggregate([
      {
        $addFields: {
          // ✅ Handle both ISO and DD-MM-YYYY formats
          parsedStartDate: {
            $cond: [
              // Check if startDate contains "T" (ISO format)
              { $regexMatch: { input: "$startDate", regex: "T" } },
              // If ISO format, convert directly
              { $toDate: "$startDate" },
              // If DD-MM-YYYY format, parse with format string
              {
                $dateFromString: {
                  dateString: "$startDate",
                  format: "%d-%m-%Y",
                },
              },
            ],
          },
        },
      },
      {
        $addFields: {
          // Compare dates (ignoring time)
          isToday: {
            $eq: [
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$parsedStartDate",
                },
              },
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: today,
                },
              },
            ],
          },
        },
      },
      {
        $sort: {
          isToday: -1, // Today's matches first (true = 1, false = 0)
          parsedStartDate: -1, // Then sort by date descending
        },
      },
      {
        $project: {
          parsedStartDate: 0, // Remove temporary fields
          isToday: 0,
        },
      },
    ]);

    return res.status(200).json(matchData);
  } catch (error) {
    console.error("❌ Get All Matches Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};


const handleCreateNewPopup = async (req, res) => {
  try {
    const Id = req.params.Id;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    const { popupText, popupStatus } = req.body;
    const newPopup = new popupSchema({
      popupText,
      popupStatus,
    });
    await newPopup.save();

    return res.status(200).json({
      message: "Popup Created Successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handlegetAllPopup = async (req, res) => {
  try {
    const popupData = await popupSchema.find({});
    return res.status(200).json({
      message: "Popup Data",
      success: true,
      data: popupData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleUpdatePopuStatus = async (req, res) => {
  try {
    const io = getIo();
    const { Id, popupId } = req.params;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();

    const updatePopUpStatus = await popupSchema.findByIdAndUpdate(
      { _id: popupId },
      {
        $set: {
          popupStatus: req.body.popupStatus,
        },
      }
    );
    updatePopUpStatus.ModifiedDate = `${day}-${month}-${year}`;
    await updatePopUpStatus.save();
    const data = await popupSchema.find({});
    if (data) {
      io.emit("popupUpdated", data);
    }
    return res.status(200).json({
      success: true,
      message: "Popup Status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleGetAllQueryByAdmin = async (req, res) => {
  try {
    const Id = req.params.id;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    const queryData = await SupportModel.find({});
    return res.status(200).json({
      message: "Query Data",
      success: true,
      data: queryData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleGetAllQueryByCaseNo = async (req, res) => {
  try {
    const caseNO = req.params.caseNo;
    if (!caseNO) {
      return res.status(400).json({
        message: "Case Number is required",
      });
    }
    const caseDetails = await SupportModel.findOne({ caseNo: `#${caseNO}` });
    return res.status(200).json({
      message: "Case Details",
      success: true,
      data: caseDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleQueryReplyByAdmin = async (req, res) => {
  try {
    const Id = req.params.id;
    const io = getIo();
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    const { caseNo, replyText } = req.body;
    const findCase = await SupportModel.findOneAndUpdate(
      { caseNo: caseNo },
      {
        $push: { Reply: replyText },
      },
      { new: true }
    );
    const queryDetails = await SupportModel.find({});

    if (!findCase) {
      return res.status(404).json({
        message: "Case not found",
      });
    }
    if (queryDetails) {
      io.emit("queryReply_Updated", findCase);
      io.emit("queryReply_Updated_Admin", findCase);
      return res.status(200).json({
        message: "Reply added successfully",
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleUpdateReadStatus = async (req, res) => {
  try {
    const Id = req.params.id;
    const io = getIo();
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    const { caseNo } = req.body;
    const findCase = await SupportModel.findOneAndUpdate(
      { caseNo: caseNo },
      {
        $set: {
          isRead: true,
        },
      }
    );
    if (!findCase) {
      return res.status(404).json({
        message: "Case not found",
      });
    }
    if (findCase) {
      io.emit("queryReply_Updated", findCase);
    }
    const queryData = await SupportModel.find({});
    if (queryData) {
      io.emit("AllqueryData", queryData);
      return res.status(200).json({
        message: "Read status updated successfully",
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleGetMatchDuration = async (req, res) => {
  try {
    const Id = req.params.id;
    const AdminExists = await AdminModel.findById(Id);
    if (!AdminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    const MatchScheduleDuration = await MatchScheduleData.findOne({});
    if (!MatchScheduleDuration) {
      return res.status(404).json({
        success: false,
        message: "Match Schedule Duration not found",
      });
    }
    return res.status(200).json({
      data: MatchScheduleDuration,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateOldToNewUser = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const AdminExists = await AdminModel.findById(AdminId);
    if (!AdminExists) {
      return res.status(406).json({
        success: false,
        message: "Admin Not Found",
      });
    }
    const { Id, newId, UserName, HQ, REGION, ZONE, Role } = req.body;
    let user;
    if (Role === "MR") {
      user = await mrModel.findOneAndUpdate(
        { MRID: Id },
        {
          MRID: newId,
          USERNAME: UserName,
          HQ,
          REGION,
          ZONE,
        }
      );
    } else if (Role === "Flm") {
      user = await flmModel.findOneAndUpdate(
        { FLMEmpID: Id },
        {
          FLMEmpID: newId,
          BDMName: UserName,
          HQ,
          REGION,
          ZONE,
        }
      );
    } else if (Role === "Slm") {
      user = await slmModel.findOneAndUpdate(
        { SLMEmpID: Id },
        {
          SLMEmpID: newId,
          SLMName: UserName,
          HQ,
          REGION,
          ZONE,
        }
      );
    } else if (Role === "Tlm") {
      user = await tlmModel.findOneAndUpdate(
        { TLMEmpID: Id },
        {
          TLMEmpID: newId,
          TLMName: UserName,
          HQ,
          ZONE,
        }
      );
    } else {
      return res.status(404).json({
        success: false,
        message: "Role Not Match",
      });
    }
    await user.save();
    return res.status(200).json({
      success: true,
      message: "User Updated Success",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const RestrictCompanyByAdmin = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const AdminExists = await AdminModel.findById(AdminId);
    if (!AdminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found",
      });
    }
    const { companyName, matchType } = req.body;
    const checkCompanyIsPresent = await CompanyModel.find({
      CompanyName: companyName,
    });

    if (checkCompanyIsPresent.length !== 0) {
      return res.status(404).json({
        success: false,
        message: "Company Is Already Exists",
      });
    }
    let data = [];
    data.push({
      MatchType: matchType,
    });
    const registerCompany = new CompanyModel({
      CompanyName: companyName,
      UserRestrict: data,
    });
    await registerCompany.save();
    return res.status(200).json({
      success: true,
      message: "Company Restricted Success",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const RestrictCompanyUpdate = async (req, res) => {
  try {
    const io = getIo();
    const { adminId, companyName } = req.params;
    const {
      MatchType,
      DoctorName,
      Speciality,
      Phone,
      ScCode,
      UploadProof,
      SubmitProof,
      Text1,
      Text2,
    } = req.body;

    // Check if Admin exists
    const AdminExists = await AdminModel.findById(adminId);
    if (!AdminExists) {
      return res
        .status(404)
        .json({ success: false, message: "Admin Not Found" });
    }

    // Check if Company exists
    const CompanyExists = await CompanyModel.findOne({
      CompanyName: companyName,
    });
    if (!CompanyExists) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Found" });
    }

    // Update UserRestrict at index 0 by merging existing data with new data
    const UpdateDetails = await CompanyModel.findOneAndUpdate(
      { CompanyName: companyName },
      {
        $set: {
          "UserRestrict.0": {
            MatchType,
            DoctorName,
            Speciality,
            Phone,
            ScCode,
            UploadProof,
            SubmitProof,
            Text1,
            Text2,
          },
        },
      },
      { new: true } // Return updated document
    );
    try {
      io.emit("restrictCompanyDetails_Updated", UpdateDetails);
    } catch (emitError) {
      console.error("Socket emit error:", emitError);
    }

    return res.status(200).json({
      success: true,
      message: "Details Updated Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const GetAllRestrictedCompanyDetails = async (req, res) => {
  try {
    const companyName = req.params.companyName;
    const GetDetails = await CompanyModel.find({ CompanyName: companyName });
    return res.status(200).json({
      success: true,
      message: "Company Details Fetch Success",
      data: GetDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } 
};

const getMonthStartAndEnd = (monthName, year) => {
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth(); // Get month index (0-11)

  // Start date: First day of the month
  const startDate = new Date(year, monthIndex, 1);

  // End date: Last day of the month
  const endDate = new Date(year, monthIndex + 1, 0);

  // Format the date as DD-MM-YYYY
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0"); // Ensure two-digit day
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const uploadExcelPrescriptionDetails = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const admin = await AdminModel.findById(AdminId);
    if (!admin) {
      return res.status(400).json({
        msg: "Admin Not Found",
      });
    }

    // Read Excel File
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const monthName = req.body.month;
    const year = req.body.year;
    const companyName = req.body.companyName;

    const { startDate, endDate } = getMonthStartAndEnd(monthName, year);

    const companyExists = await CompanyWiseMonthly.findOne({
      CompanyName: companyName,
    });
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: "Company Not Exists",
      });
    }

    const uploadTime1 = new Date();
    const formattedTime1 = `${uploadTime1
      .getHours()
      .toString()
      .padStart(2, "0")}:${uploadTime1
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const previousValue = companyExists.MonthlyResult.get(monthName);
    if (previousValue === false) {
      // Remove Existing Data for the same month and year
      await mrModel.updateMany(
        { "MrScoreEachMatch.MatchDate": startDate },
        {
          $pull: { MrScoreEachMatch: { MatchDate: startDate } },
          $set: {
            TotalMatches: 0,
            TotalFours: 0,
            TotalSixes: 0,
            TotalScore: 0,
            BestScore: 0,
            isAdminUpload: false,
          },
        }
      );
      for (const row of sheetData) {
        console.log("SheetDataExcel :", row);

        const mrExists = await mrModel.findOne({ MRID: row.MRID });
        if (!mrExists) {
          return res.status(404).json({
            success: false,
            message: `Mr Not Found For ${row.MRID}`,
          });
        }

        function formatDateToDDMMYYYY(date) {
          const dateObj = new Date(date);
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          return `${day}-${month}-${year}`;
        }

        const MRUploadedData = {
          BrandName: row.BrandName,
          DateOfUpload: formatDateToDDMMYYYY(Date.now()),
          matchStartDate: startDate,
          matchEndDate: endDate,
          TimeOfUpload: formattedTime1,
        };

        const brandData = await BrandScehma.findOne({
          BrandName: row.BrandName,
        });
        if (brandData) {
          const { Points } = brandData;
          const pointValue = parseInt(Points);
          MRUploadedData.Points = Points;
          NotifyPoints = parseInt(Points);

          let rowScore = pointValue * parseInt(row.Sales);
          let rowFours = pointValue === 4 ? parseInt(row.Sales) : 0;
          let rowSixes = pointValue === 6 ? parseInt(row.Sales) : 0;

          // Find existing match entry for the same date
          let match = mrExists.MrScoreEachMatch.find(
            (m) => m.MatchDate === startDate
          );

          if (match) {
            // If the entry exists, update its values
            match.Score = parseInt(match.Score) + rowScore;
            match.TotalFours = parseInt(match.TotalFours) + rowFours;
            match.TotalSixes = parseInt(match.TotalSixes) + rowSixes;
            match.TimeOfUpload = formattedTime1;
            match.isAdminUpload = true;
          } else {
            // If no entry exists, create a new one
            mrExists.MrScoreEachMatch.push({
              Score: rowScore.toString(),
              TotalFours: rowFours.toString(),
              TotalSixes: rowSixes.toString(),
              MatchDate: startDate,
              TimeOfUpload: formattedTime1,
              isAdminUpload: true,
              DateOfCreation: new Date().toISOString().slice(0, 10),
            });
          }
        }

        // Push MRUploadedData to MR records
        mrExists.MRUploadedData.push(MRUploadedData);

        // Update cumulative totals
        mrExists.TotalMatches = mrExists.MrScoreEachMatch.length;
        mrExists.TotalFours = mrExists.MrScoreEachMatch.reduce(
          (total, match) => total + parseInt(match.TotalFours || 0),
          0
        );
        mrExists.TotalSixes = mrExists.MrScoreEachMatch.reduce(
          (total, match) => total + parseInt(match.TotalSixes || 0),
          0
        );
        mrExists.TotalScore = mrExists.MrScoreEachMatch.reduce(
          (total, match) => total + parseInt(match.Score || 0),
          0
        );

        const maxScoreInMatches = mrExists.MrScoreEachMatch.reduce(
          (max, match) => Math.max(max, parseInt(match.Score || 0)),
          0
        );
        mrExists.BestScore = Math.max(
          mrExists.BestScore || 0,
          maxScoreInMatches
        );
        companyExists.MonthlyResult.set(monthName, true);
        await mrExists.save();
        await companyExists.save();
      }
    } else {
      return res.status(405).json({
        success: false,
        message: "Take Admin Permission First",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Excel Upload Success, Previous Data Replaced",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const createCompany = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const admin = await AdminModel.findById(AdminId);
    if (!admin) {
      return res.status(400).json({
        msg: "Admin Not Found",
      });
    }
    const companyExists = await CompanyWiseMonthly.find({
      CompanyName: req.body.CompanyName,
    });
    if (companyExists.length > 0) {
      return res.status(404).json({
        success: false,
        message: "Company Already Exists",
      });
    }
    const data = await CompanyWiseMonthly.create({
      CompanyName: req.body.CompanyName,
    });
    await data.save();
    return res.status(200).json({
      success: true,
      message: "Company Monthly Created Success",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const CreateCompanyMonths = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const admin = await AdminModel.findById(AdminId);
    if (!admin) {
      return res.status(400).json({
        msg: "Admin Not Found",
      });
    }
    const { CompanyName, Months, isProvide } = req.body;
    const checkCompanyPresence = await CompanyMonthProvide.find({
      CompanyName,
    });
    if (checkCompanyPresence.length > 0) {
      return res.status(404).json({
        success: false,
        message: "Company Already Exists",
      });
    }
    const UploadCompanyMonths = await CompanyMonthProvide.create({
      CompanyName: CompanyName,
      Months: Months,
      isProvide: isProvide,
    });
    await UploadCompanyMonths.save();
    return res.status(200).json({
      success: true,
      message: "Company Months Created Success",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getNotificationDeviceTokenByAdmin = async (req, res) => {
  try {
    const AdminId = req.params.adminId;
    const AdminExists = await AdminModel.findById(AdminId);

    if (!AdminExists) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found",
      });
    }

    const tokens = new Set(); // Use a Set to avoid duplicate tokens
    const usersCollection = admin.firestore().collection("users");

    const usersSnapshot = await usersCollection.get();
    const usersWithTokens = []; // Array to store user IDs and their tokens

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (
        userData &&
        userData.deviceTokens &&
        Array.isArray(userData.deviceTokens)
      ) {
        const userId = userDoc.id;

        // Check in different models
        let role = null;
        let BUSINESSUNIT = null;

        const mrData = await mrModel.findOne({ MRID: userId });
        if (mrData) {
          role = "Mr";
          BUSINESSUNIT = mrData.BUSINESSUNIT;
        } else {
          const flmData = await flmModel.findOne({ FLMEmpID: userId });
          if (flmData) (BUSINESSUNIT = flmData.BUSINESSUNIT), (role = "Flm");
          else {
            const slmData = await slmModel.findOne({ SLMEmpID: userId });
            if (slmData) (BUSINESSUNIT = slmData.BUSINESSUNIT), (role = "Slm");
            else {
              const tlmData = await tlmModel.findOne({ TLMEmpID: userId });
              if (tlmData)
                (BUSINESSUNIT = tlmData.BUSINESSUNIT), (role = "Tlm");
            }
          }
        }

        // **Filter users based on Admin's BusinessUnit**
        if (BUSINESSUNIT === AdminExists.BusinessUnit) {
          usersWithTokens.push({
            id: userId, // Firestore document ID
            tokens: userData.deviceTokens, // Store deviceTokens
            role, // Assigned role
            CompanyName: BUSINESSUNIT, // Business unit
          });

          userData.deviceTokens.forEach((token) => tokens.add(token)); // Add tokens to the Set
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "User Details Fetched Successfully",
      users: usersWithTokens, // Include only filtered user IDs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

function formatDateToDDMMYYYY(date) {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

const sendNotificationToUsers = async (req, res) => {
  try {
    const { title, body, token, CompanyName } = req.body;
    let tokenAdd = [];
    tokenAdd.push(token);
    const message = {
      tokens: tokenAdd,
      notification: {
        title: title,
        body: body,
      },
      data: {
        title: title,
        body: body,
      },
    };
    const response = await admin.messaging().sendEachForMulticast(message); //Correct usage
    const sendNotification = new Notification({
      Message: `${formatDateToDDMMYYYY(
        new Date().toISOString().slice(0, 10)
      )}:  ${body}`,
      CompanyName: CompanyName,
    });
    await sendNotification.save();
    return res.status(200).json({
      success: true,
      message: "Send Notification Success",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const uploadImageFromAdminMonthWise = async (req, res) => {
  try {
    const { adminId, companyName, monthName } = req.params;

    // Check if admin exists
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(400).json({ msg: "Admin Not Found" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Get file extension
    const ext = path.extname(req.file.originalname);

    // Define file path
    const uploadDir = path.join(__dirname, "../uploads"); // Ensure this path is correct
    const newFileName = `${companyName}_${monthName}${ext}`;
    const newFilePath = path.join(uploadDir, newFileName);

    // ✅ Ensure the "uploads" folder exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); // Creates directory if not exists
    }

    // Check if file already exists
    if (fs.existsSync(newFilePath)) {
      return res.status(400).json({
        success: false,
        message: "Image already exists with this name",
      });
    }

    // Save file to disk
    fs.writeFile(newFilePath, req.file.buffer, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error saving file",
          error: err,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Image Stored successfully",
        filePath: newFilePath,
      });
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error });
  }
};

const updateImageUploadByAdminMonthWise = async (req, res) => {
  try {
    const { adminId, companyName, monthName } = req.params;

    // Check if admin exists
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin Not Found" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Define directory path
    const uploadDir = path.join(__dirname, "../uploads");

    // Ensure the "uploads" folder exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Extract file extension
    const ext = path.extname(req.file.originalname);

    // Define target file name and path
    const fileName = `${companyName}_${monthName}`; // Without extension
    const existingFile = fs
      .readdirSync(uploadDir)
      .find((file) => file.startsWith(fileName));

    if (existingFile) {
      // Remove the existing file
      fs.unlinkSync(path.join(uploadDir, existingFile));
    }

    // Save the new file
    const newFilePath = path.join(uploadDir, `${fileName}${ext}`);
    fs.writeFileSync(newFilePath, req.file.buffer);

    return res.status(200).json({
      success: true,
      message: "Image replaced successfully",
      filePath: newFilePath,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};

const getAllImagesByAdminCompany = async (req, res) => {
  try {
    const { companyName } = req.params;

    // Define the uploads directory
    const uploadDir = path.join(__dirname, "../uploads");

    // Ensure the "uploads" folder exists
    if (!fs.existsSync(uploadDir)) {
      return res
        .status(400)
        .json({ success: false, message: "Uploads folder not found" });
    }

    // Read all files in the uploads directory
    const files = fs.readdirSync(uploadDir);

    // Filter files that start with the given `companyName`
    const companyImages = files
      .filter((file) => file.startsWith(companyName))
      .map((file) => `${BASE_URL}/uploads/${file}`); // Convert to full URL

    if (companyImages.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No images found for this company" });
    }

    return res.status(200).json({
      success: true,
      message: "Images retrieved successfully",
      images: companyImages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};

const getUsersScreenTime = async (req,res) =>{
  try {
    const adminId = req.params.adminId;
    const companyName = req.params.companyName;
    const adminExists = await AdminModel.findById(adminId);
    if (!adminExists) {
      return res.status(400).json({ msg: "Admin Not Found" });
    }
    const GetUserMatches =  await UserTrackageModel.aggregate([
      { $unwind: "$UserTrackSummary" },
      {
        $match: {
          "UserTrackSummary.companyName": companyName,
          "UserTrackSummary.endTime": { $nin: [null, "", undefined] }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Get User Screen Time Fetched Success",
      data: GetUserMatches
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error:error,
    });
  }
}

const handleGetSingleBrandData = async (req, res) => {
  try {
    const { id } = req.params;  

    const brand = await BrandScehma.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const uploadNoMatchImage = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     const admin = await AdminModel.findById(adminId);
//     if (!admin) {
//       return res.status(400).json({ msg: "Admin Not Found" });
//     }

//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const ext = path.extname(req.file.originalname);
//     const uploadDir = path.join(__dirname, "../uploads");

//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     // Get existing NoMatch images and find the next number
//     const files = fs.readdirSync(uploadDir);
//     const noMatchFiles = files.filter(file => file.startsWith('NoMatch'));
    
//     let nextNumber = 1;
//     if (noMatchFiles.length > 0) {
//       const numbers = noMatchFiles.map(file => {
//         const match = file.match(/NoMatch(\d+)/);
//         return match ? parseInt(match[1]) : 0;
//       });
//       nextNumber = Math.max(...numbers) + 1;
//     }

//     const newFileName = `NoMatch${nextNumber}${ext}`;
//     const newFilePath = path.join(uploadDir, newFileName);

//     // Move uploaded file from temp location to final location
//     fs.renameSync(req.file.path, newFilePath);

//     return res.status(200).json({
//       success: true,
//       message: "Image uploaded successfully",
//       imageUrl: `http://192.168.1.14:7500/uploads/${newFileName}`,
//       fileName: newFileName
//     });

//   } catch (error) {
//     console.error('Upload error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Internal Server Error", 
//       error: error.message 
//     });
//   }
// };

// const getNoMatchImage = async (req, res) => {
//   try {
//     const uploadDir = path.join(__dirname, "../uploads");

//     if (!fs.existsSync(uploadDir)) {
//       return res.status(404).json({ success: false, message: "No images uploaded yet" });
//     }

//     const files = fs.readdirSync(uploadDir);
//     const noMatchImages = files
//       .filter(file => file.startsWith('NoMatch'))
//       .sort((a, b) => {
//         const numA = parseInt(a.match(/NoMatch(\d+)/)?.[1] || '0');
//         const numB = parseInt(b.match(/NoMatch(\d+)/)?.[1] || '0');
//         return numA - numB;
//       })
//       .map(file => {
//         const filePath = path.join(uploadDir, file);
//         const stats = fs.statSync(filePath);
//         const timestamp = stats.mtime.getTime(); // ✅ Get file modification time
        
//         // ✅ Add timestamp to URL to bust cache
//         return `http://192.168.1.14:7500/uploads/${file}?t=${timestamp}`;
//       });

//     if (noMatchImages.length === 0) {
//       return res.status(404).json({ success: false, message: "No images found" });
//     }

//     return res.status(200).json({
//       success: true,
//       images: noMatchImages,
//       count: noMatchImages.length
//     });

//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Internal Server Error", error });
//   }
// };

// const deleteAllNoMatchImages = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     const admin = await AdminModel.findById(adminId);
//     if (!admin) {
//       return res.status(400).json({ msg: "Admin Not Found" });
//     }

//     const uploadDir = path.join(__dirname, "../uploads");

//     if (!fs.existsSync(uploadDir)) {
//       return res.status(404).json({ success: false, message: "Uploads folder not found" });
//     }

//     const files = fs.readdirSync(uploadDir);
//     const noMatchFiles = files.filter(file => file.startsWith('NoMatch'));

//     if (noMatchFiles.length === 0) {
//       return res.status(404).json({ success: false, message: "No NoMatch images found" });
//     }

//     // Delete all NoMatch images
//     noMatchFiles.forEach(file => {
//       fs.unlinkSync(path.join(uploadDir, file));
//     });

//     return res.status(200).json({
//       success: true,
//       message: `Successfully deleted ${noMatchFiles.length} images`,
//       deletedCount: noMatchFiles.length
//     });

//   } catch (error) {
//     console.error('Delete error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Internal Server Error", 
//       error: error.message 
//     });
//   }
// };



const editNoMatchImage = async (req, res) => {
  try {
    const { adminId, fileName } = req.params;
 
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(400).json({ msg: "Admin Not Found" });
    }
 
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }
 
    const uploadDir = path.join(__dirname, "../uploads");
    const existingFilePath = path.join(uploadDir, fileName);
 
    // Check if file exists
    if (!fs.existsSync(existingFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }
 
    // Replace old image
    fs.unlinkSync(existingFilePath); // delete old
    fs.renameSync(req.file.path, existingFilePath); // save new
 
    return res.status(200).json({
      success: true,
      message: "Image updated successfully",
      imageUrl: `https://rxpllnx.digilateral.com/uploads/${fileName}`,
      fileName,
    });
  } catch (error) {
    console.error("Edit error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
 
const reorderNoMatchImages = async (req, res) => {
  try {
    const { images } = req.body; // ["NoMatch2.png", "NoMatch1.png"]
 
    if (!Array.isArray(images)) {
      return res.status(400).json({ success: false });
    }
 
    const spotlight = readSpotlight();
 
    // Map by filename for quick lookup
    const map = new Map(
      spotlight.map(item => [item.fileName, item])
    );
 
    // Build reordered list
    const reordered = images
      .map(fileName => map.get(fileName))
      .filter(Boolean);
 
    // Add any missing (safety)
    spotlight.forEach(item => {
      if (!images.includes(item.fileName)) {
        reordered.push(item);
      }
    });
 
    writeSpotlight(reordered);
 
    return res.json({ success: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return res.status(500).json({ success: false });
  }
};
 
const toggleNoMatchImage = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { active } = req.body;
 
    const spotlight = readSpotlight();
 
    const index = spotlight.findIndex(
      item => item.fileName === fileName
    );
 
    if (index === -1) {
      return res.status(404).json({ success: false });
    }
 
    spotlight[index].active = Boolean(active);
    writeSpotlight(spotlight);
 
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};
 
 
const getNoMatchImage = async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, "../uploads");
    const spotlight = readSpotlight();
 
    const images = spotlight
      .filter(item => item.active)
      .map(item => {
        const stats = fs.statSync(path.join(uploadDir, item.fileName));
        return `https://rxpllnx.digilateral.com/uploads/${item.fileName}?t=${stats.mtime.getTime()}`
       
      });
 
    return res.json({
      success: true,
      images,
      count: images.length
    });
  } catch {
    return res.status(500).json({ success: false });
  }
};
 
const uploadNoMatchImage = async (req, res) => {
  try {
    const { adminId } = req.params;
 
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(400).json({ msg: "Admin Not Found" });
    }
 
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
 
    const ext = path.extname(req.file.originalname);
    const uploadDir = path.join(__dirname, "../uploads");
 
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
 
    // Get existing NoMatch images and find the next number
    const files = fs.readdirSync(uploadDir);
    const noMatchFiles = files.filter(file => file.startsWith('NoMatch'));
   
    let nextNumber = 1;
    if (noMatchFiles.length > 0) {
      const numbers = noMatchFiles.map(file => {
        const match = file.match(/NoMatch(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }
 
    const newFileName = `NoMatch${nextNumber}${ext}`;
    const newFilePath = path.join(uploadDir, newFileName);
 
    // Move uploaded file from temp location to final location
    fs.renameSync(req.file.path, newFilePath);
 
   const spotlight = readSpotlight();
 
spotlight.push({
  fileName: newFileName,
  active: false
});
 
writeSpotlight(spotlight);
 
 
    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: `https://rxpllnx.digilateral.com/uploads/${newFileName}`,
      fileName: newFileName
    });
 
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
const deleteNoMatchImage = async (req, res) => {
    try {
        const { fileName } = req.params;
        // Adjust the path to your actual uploads folder location
        const filePath = path.join(__dirname, "../uploads", fileName);
 
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Physically deletes the file from disk
            const spotlight = readSpotlight()
  .filter(item => item.fileName !== fileName);
 
writeSpotlight(spotlight);
 
 
 
            return res.status(200).json({ success: true, message: "Image deleted successfully" });
        } else {
            return res.status(404).json({ success: false, message: "File not found on server" });
        }
    } catch (error) {
        console.error("Delete Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
 
const getAllNoMatchImages = async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, "../uploads");
 
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({
        success: false,
        message: "No images uploaded yet",
      });
    }
 
    const spotlight = readSpotlight();
 
    // Remove entries whose files no longer exist
    const validSpotlight = spotlight.filter(item =>
      fs.existsSync(path.join(uploadDir, item.fileName))
    );
 
    // Persist cleanup if needed
    if (validSpotlight.length !== spotlight.length) {
      writeSpotlight(validSpotlight);
    }
 
    const images = validSpotlight.map(item => {
      const stats = fs.statSync(path.join(uploadDir, item.fileName));
      return {
        fileName: item.fileName,
        active: item.active,
        url: `https://rxpllnx.digilateral.com/uploads/${item.fileName}?t=${stats.mtime.getTime()}`
      };
    });
 
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No images found",
      });
    }
 
    return res.status(200).json({
      success: true,
      images,
      count: images.length,
    });
  } catch (error) {
    console.error("Get NoMatch Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



// Add this inside AdminController.js
const handleUpdateMatchDates = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;
 
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "userId, startDate and endDate are required",
      });
    }
 
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
 
    const updatedRecord = await mrModel.findByIdAndUpdate(
      userId,
      {
        matchStartDate: sDate,
        matchEndDate: eDate,
        isMatchOn: false, // cron decides later
      },
      { new: true }
    );
 
    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
 
    return res.status(200).json({
      success: true,
      message: "Match dates updated for user",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("❌ handleUpdateMatchDates:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const setDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
 
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }
 
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
 
    // 🔥 GLOBAL UPDATE (ALL MR DOCUMENTS)
    const result = await MrModel.updateMany(
      {},
      {
        $set: {
          matchStartDate: sDate,
          matchEndDate: eDate,
          isMatchOn: false, // cron will decide later
        },
      }
    );
 
    return res.status(200).json({
      success: true,
      message: "Date range applied to ALL MRs",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ setDateRange error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
 
 
 
 const createMatchSchedule = async (req, res) => {
  try {
    const { userId, startDate, endDate, businessUnit } = req.body;
    console.log("Creating match schedule:", { userId, startDate, endDate, businessUnit });
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }
    
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    
    // Add to schedules array
    const result = await mrModel.updateMany(
      { BUSINESSUNIT: businessUnit },
      {
        $push: {
          matchSchedules: {
            startDate: sDate,
            endDate: eDate,
            isMatchOn: false,
            createdAt: new Date(),
            createdBy: userId
          }
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: "Match schedule created",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ createMatchSchedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getMatchSchedules = async (req, res) => {
  try {
    const { businessUnit } = req.params;
    
    const mrRecords = await mrModel.find(
      { BUSINESSUNIT: businessUnit },
      { matchSchedules: 1 }
    );
    
    // Flatten and deduplicate schedules
    const allSchedules = [];
    const seenSchedules = new Set();
    
    mrRecords.forEach(mr => {
      mr.matchSchedules?.forEach(schedule => {
        const key = `${schedule.startDate}-${schedule.endDate}`;
        if (!seenSchedules.has(key)) {
          seenSchedules.add(key);
          allSchedules.push(schedule);
        }
      });
    });
    
    return res.status(200).json({
      success: true,
      schedules: allSchedules.sort((a, b) => b.startDate - a.startDate)
    });
  } catch (error) {
    console.error("❌ getMatchSchedules:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const editMatchSchedule = async (req, res) => {
  try {
    const { businessUnit, scheduleId, startDate, endDate } = req.body;
    
    const result = await mrModel.updateMany(
      { BUSINESSUNIT: businessUnit, "matchSchedules._id": scheduleId },
      {
        $set: {
          "matchSchedules.$.startDate": new Date(startDate),
          "matchSchedules.$.endDate": new Date(endDate)
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: "Schedule updated"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const handleGetWeekRangeLeaderboard = async(req, res) =>{
   try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log('📊 Fetching week range leaderboard:', {
      startDay,
      endDay,
      month,
      year,
      businessUnit,
    });

    // Validate parameters
    if (!startDay || !endDay || !month || !year || !businessUnit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    // Create date strings for the range
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
      dates.push(dateStr);
    }

    console.log('📅 Date range:', dates);

    // Find all users in the business unit
    const users = await User.find({ BusinessUnit: businessUnit });

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No users found',
      });
    }

    // Calculate scores for each user
    const leaderboardData = [];

    for (const user of users) {
      let totalScore = 0;
      let matchesCount = 0;

      // Check if user has MRUploadedData
      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        // Filter uploads within the date range
        const uploadsInRange = user.MRUploadedData.filter(upload => {
          return dates.includes(upload.DateOfCreation) && 
                 upload.Status === 'Approved';
        });

        // Sum up points from approved uploads
        uploadsInRange.forEach(upload => {
          const points = parseInt(upload.Points) || 0;
          totalScore += points;
          matchesCount++;
        });
      }

      // Only add users with score > 0
      if (totalScore > 0) {
        leaderboardData.push({
          _id: user._id,
          USERNAME: user.USERNAME,
          MrName: user.USERNAME,
          TEAMNAME: user.TEAMNAME,
          TeamName: user.TEAMNAME,
          TotalScore: totalScore,
          Runs: totalScore,
          TotalMatches: matchesCount,
          Matches: matchesCount,
        });
      }
    }

    // Sort by TotalScore descending
    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(`✅ Found ${leaderboardData.length} players with scores`);

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay} ${getMonthName(month)} ${year}`,
    });

  } catch (error) {
    console.error('❌ Error in getWeekRangeLeaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Helper function to get month name
function getMonthName(month) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[parseInt(month) - 1];
}

const deleteMatchSchedule = async (req, res) => {
  try {
    const { businessUnit, scheduleId } = req.body;

    if (!businessUnit || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: "businessUnit and scheduleId are required"
      });
    }

    // Remove the schedule from the array using $pull
    const result = await mrModel.updateMany(
      { BUSINESSUNIT: businessUnit },
      {
        $pull: {
          matchSchedules: { _id: scheduleId }
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("❌ deleteMatchSchedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


cron.schedule('* * * * *', async () => {
  try {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    console.log('🔄 Running match schedule cron at:', today.toISOString());
    
    // ✅ ACTIVATE: Set isMatchOn = true for active schedules
    const activateResult = await mrModel.updateMany(
      {},
      [
        {
          $set: {
            matchSchedules: {
              $map: {
                input: "$matchSchedules",
                as: "schedule",
                in: {
                  $mergeObjects: [
                    "$$schedule",
                    {
                      isMatchOn: {
                        $and: [
                          { $lte: ["$$schedule.startDate", endOfToday] },
                          { $gte: ["$$schedule.endDate", today] }
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );
    
    console.log(`✅ Updated ${activateResult.modifiedCount} MRs' schedules`);
    
    // ✅ UPDATE TOP-LEVEL isMatchOn based on any active schedule
    const allMRs = await mrModel.find({
      matchSchedules: { $exists: true, $ne: [] }
    });
    
    for (const mr of allMRs) {
      const hasActiveSchedule = mr.matchSchedules.some(schedule => {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
      });
      
      if (mr.isMatchOn !== hasActiveSchedule) {
        mr.isMatchOn = hasActiveSchedule;
        await mr.save();
        console.log(`✅ ${mr.USERNAME} - isMatchOn: ${hasActiveSchedule}`);
      }
    }
    
    console.log('✅ Match schedules updated successfully\n');
    
  } catch (error) {
    console.error('❌ Cron error:', error.message);
  }
});



const groupConfig = {
  region: {
    group: "$REGION",
    extra: { zone: "$ZONE" },
  },
  state: {
    group: "$State",
    extra: {},
  },
  zone: {
    group: "$ZONE",
    extra: {},
  },
  hq: {
    group: "$flmHQ",
    extra: {
      region: "$flmREGION",
      zone: "$flmZONE",
    },
  },
};

const getMonthlyBrandSummary = async (req, res) => {
  try {
    const { groupBy = "region" } = req.query;

    // ✅ SAME SETTINGS AS MR RANK
    const settings = await getLeaderboardSettings();

    if (!groupConfig[groupBy]) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupBy value",
      });
    }

    const config = groupConfig[groupBy];

const groupFieldMap = {
  state: "State",
  zone: "ZONE",
  region: "REGION",
  hq: "HQ",
};

// master list of all groups
const allGroupsPipeline = [
  // Add lookup to get FLM data for hq grouping
  ...(groupBy === "hq" ? [
    {
      $lookup: {
        from: "flms",
        let: { mrId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$$mrId", "$Mrs"],
              },
            },
          },
          {
            $project: {
              HQ: 1,
              REGION: 1,
              ZONE: 1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: "flmData",
      },
    },
    {
      $addFields: {
        flmHQ: { $arrayElemAt: ["$flmData.HQ", 0] },
        flmREGION: { $arrayElemAt: ["$flmData.REGION", 0] },
        flmZONE: { $arrayElemAt: ["$flmData.ZONE", 0] },
      },
    },
  ] : []),
  // Filter out MRs without FLM data when grouping by HQ
  ...(groupBy === "hq" ? [
    {
      $match: {
        flmHQ: { $exists: true, $ne: null, $ne: "" },
      },
    },
  ] : []),
  {
    $group: {
      _id: {
        name: groupBy === "hq" 
          ? "$flmHQ" 
          : `$${groupFieldMap[groupBy]}`,
        ...(groupBy === "region" && { zone: "$ZONE" }),
        ...(groupBy === "hq" && {
          zone: "$flmZONE",
          region: "$flmREGION",
        }),
      },
    },
  },
  {
    $project: {
      _id: 0,
      name: "$_id.name",
      ...(groupBy === "region" && { zone: "$_id.zone" }),
      ...(groupBy === "hq" && {
        zone: "$_id.zone",
        region: "$_id.region",
      }),
    },
  },
  // Filter out groups with blank/null names
  {
    $match: {
      name: { $exists: true, $ne: null, $ne: "" },
    },
  },
];

const allGroups = await Mr.aggregate(allGroupsPipeline);



    const data = await Mr.aggregate([
      // 1️⃣ Unwind uploads
      { $unwind: "$MRUploadedData" },

      // 2️⃣ Only APPROVED
      {
        $match: {
          "MRUploadedData.Status": "Approved",
        },
      },

      // 2.5️⃣ Lookup FLM data for hq grouping
      ...(groupBy === "hq" ? [
        {
          $lookup: {
            from: "flms",
            let: { mrId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$mrId", "$Mrs"],
                  },
                },
              },
              {
                $project: {
                  HQ: 1,
                  REGION: 1,
                  ZONE: 1,
                },
              },
              {
                $limit: 1,
              },
            ],
            as: "flmData",
          },
        },
        {
          $addFields: {
            flmHQ: { $arrayElemAt: ["$flmData.HQ", 0] },
            flmREGION: { $arrayElemAt: ["$flmData.REGION", 0] },
            flmZONE: { $arrayElemAt: ["$flmData.ZONE", 0] },
          },
        },
        // Filter out MRs without FLM data when grouping by HQ
        {
          $match: {
            flmHQ: { $exists: true, $ne: null, $ne: "" },
          },
        },
      ] : []),

      // 3️⃣ Parse Date (DD-MM-YYYY)
      {
        $addFields: {
          uploadDateParsed: {
            $dateFromString: {
              dateString: "$MRUploadedData.DateOfUpload",
              format: "%d-%m-%Y",
            },
          },
        },
      },

      // 4️⃣ Month (Jan, Feb, ...)
      {
        $addFields: {
          month: {
            $dateToString: {
              format: "%b",
              date: "$uploadDateParsed",
            },
          },
        },
      },

      // 5️⃣ Dynamic grouping
      {
        $group: {
          _id: {
            name: config.group,
            month: "$month",
            ...Object.entries(config.extra).reduce((acc, [k, v]) => {
              acc[k] = v;
              return acc;
            }, {}),
          },

          // ===== BRAND COUNTS =====
          oneB: {
            $sum: {
              $cond: [
                { $eq: ["$MRUploadedData.NumberOfBrands", 1] },
                1,
                0,
              ],
            },
          },
          twoB: {
            $sum: {
              $cond: [
                { $eq: ["$MRUploadedData.NumberOfBrands", 2] },
                1,
                0,
              ],
            },
          },
          threeB: {
            $sum: {
              $cond: [
                { $eq: ["$MRUploadedData.NumberOfBrands", 3] },
                1,
                0,
              ],
            },
          },

          // ===== RAW SCORE (EQUIVALENT TO mr.TotalScore) =====
          rawScore: {
            $sum: {
              $multiply: [
                { $toInt: "$MRUploadedData.Points" },
                { $toInt: "$MRUploadedData.RxnDuration" },
                { $toInt: "$MRUploadedData.NoRxns" },
              ],
            },
          },
        },
      },

      // 6️⃣ Final projection (NO score decision here)
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          month: "$_id.month",
          oneB: 1,
          twoB: 1,
          threeB: 1,
          rawScore: 1,
          ...(groupBy === "region" && { zone: "$_id.zone" }),
          ...(groupBy === "state" && { zone: "$_id.zone" }),
          ...(groupBy === "hq" && {
            region: "$_id.region",
            zone: "$_id.zone",
          }),
        },
      },

      // 7️⃣ Sort
      { $sort: { name: 1, month: 1 } },
    ]);

    // 8️⃣ APPLY SAME LOGIC AS getMrRank
    const enrichedData = data.map((item) => {
      const totalBrandCount =
        item.oneB + item.twoB + item.threeB;

      const totalScore =
        settings.mrRankMetric === "BRAND_COUNT"
          ? totalBrandCount
          : item.rawScore;

      return {
        ...item,
        totalScore,
      };
    });

    const MONTHS = ["Feb", "Mar", "Apr"];

// index aggregated data
const dataMap = new Map();
enrichedData.forEach((item) => {
  const key = [
    item.name,
    item.zone,
    item.region,
    item.month,
  ].filter(Boolean).join("|");

  dataMap.set(key, item);
});

// build final output
const finalData = [];

allGroups.forEach((group) => {
  // Skip groups with blank/null names
  if (!group.name || group.name.trim() === "") {
    return;
  }
  
  MONTHS.forEach((month) => {
    const key = [
      group.name,
      group.zone,
      group.region,
      month,
    ].filter(Boolean).join("|");

    if (dataMap.has(key)) {
      finalData.push(dataMap.get(key));
    } else {
      finalData.push({
        name: group.name,
        month,
        oneB: 0,
        twoB: 0,
        threeB: 0,
        rawScore: 0,
        totalScore: 0,
        ...(group.zone && { zone: group.zone }),
        ...(group.region && { region: group.region }),
      });
    }
  });
});

finalData.sort((a, b) => b.totalScore - a.totalScore);

// Filter out any entries with blank/null names (safety check)
const filteredFinalData = finalData.filter(
  (item) => item.name && item.name.trim() !== ""
);

    // return res.status(200).json({
    //   success: true,
    //   groupBy,
    //   metric: settings.mrRankMetric,
    //   data: enrichedData,
    // });
    return res.status(200).json({
  success: true,
  groupBy,
  metric: settings.mrRankMetric,
  data: filteredFinalData,
});

  } catch (error) {
    console.error("Monthly Brand Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly brand summary",
    });
  }
};

const getBrandStats = async (req, res) => {
  try {
    // ---------- 1. Date setup (IST-safe) ----------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // ---------- 2. Aggregation (IST-safe) ----------
    const dailyStats = await Mr.aggregate([
      { $unwind: "$MRUploadedData" },

      {
        $addFields: {
          uploadDate: {
            $dateFromString: {
              dateString: "$MRUploadedData.DateOfUpload",
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata" // ✅ FIX 1
            }
          }
        }
      },
      {
  $match: {
    "MRUploadedData.Status": "Approved"
  }
},


      {
        $match: {
          uploadDate: {
            $gte: sevenDaysAgo,
            $lt: tomorrow
          }
        }
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$uploadDate",
              timezone: "Asia/Kolkata" // ✅ FIX 2
            }
          },
          count: {
            $sum: {
              $ifNull: ["$MRUploadedData.NumberOfBrands", 0]
            }
          }
        }
      },

      { $sort: { _id: -1 } }
    ]);

    // ---------- 3. Fill missing days (IST-safe) ----------
    const statsMap = {};
    dailyStats.forEach(d => {
      statsMap[d._id] = d.count;
    });

    const last7Days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      // ❌ DO NOT use toISOString()
      // ✅ IST date key
      const key = d.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
      });

      last7Days.push({
        date: d,
        count: statsMap[key] || 0
      });
    }

    // ---------- 4. Total brands (all time) ----------
    const totalAgg = await Mr.aggregate([
      { $unwind: "$MRUploadedData" },
      {
    $match: {
      "MRUploadedData.Status": "Approved"
    }
  },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: ["$MRUploadedData.NumberOfBrands", 0]
            }
          }
        }
      }
    ]);

    const total = totalAgg[0]?.total || 0;

    return res.status(200).json({
      success: true,
      metric: "brands",
      total,
      last7Days
    });

  } catch (error) {
    console.error("Brand stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch brand statistics"
    });
  }
};


const getPrescriptionStats = async (req, res) => {
  try {
    const { month, year } = req.query;

    // --------- 1. Date setup ----------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // include today

    // --------- 2. Aggregation for last 7 days (unchanged) ----------
    const dailyStats = await Mr.aggregate([
      { $unwind: "$MRUploadedData" },
      {
        $addFields: {
          uploadDate: {
            $dateFromString: {
              dateString: "$MRUploadedData.DateOfUpload",
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
            },
          },
        },
      },
      {
        $match: {
          "MRUploadedData.Status": "Approved",
        },
      },
      {
        $match: {
          uploadDate: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$uploadDate",
              timezone: "Asia/Kolkata",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // --------- 3. Fill missing days with 0 (unchanged) ----------
    const statsMap = {};
    dailyStats.forEach((d) => {
      statsMap[d._id] = d.count;
    });

    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      last7Days.push({
        date: d,
        count: statsMap[key] || 0,
      });
    }

    // --------- 4. Total prescriptions ----------
    // If month + year provided → filter total for that month only
    // Otherwise → all-time total (original behaviour)
    let total = 0;

    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum, 0); // last day of month
      monthEnd.setHours(23, 59, 59, 999);

      const monthTotalAgg = await Mr.aggregate([
        { $unwind: "$MRUploadedData" },
        {
          $addFields: {
            uploadDate: {
              $dateFromString: {
                dateString: "$MRUploadedData.DateOfUpload",
                format: "%d-%m-%Y",
                timezone: "Asia/Kolkata",
              },
            },
          },
        },
        {
          $match: {
            "MRUploadedData.Status": "Approved",
            uploadDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $count: "total" },
      ]);

      total = monthTotalAgg[0]?.total || 0;
    } else {
      // Original all-time total (unchanged)
      const totalAgg = await Mr.aggregate([
        { $unwind: "$MRUploadedData" },
        {
          $match: {
            "MRUploadedData.Status": "Approved",
          },
        },
        { $count: "total" },
      ]);

      total = totalAgg[0]?.total || 0;
    }

    // --------- 5. Response ----------
    return res.status(200).json({
      success: true,
      metric: "prescriptions",
      total,
      last7Days,
    });
  } catch (error) {
    console.error("Prescription stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prescription statistics",
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN-ONLY UPLOAD DATA HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

const handleGetUploadDataAdminOnly = async (req, res) => {
  try {
    const adminId = req.params.id;

    // ──────────────────────────────────────────────────────────────────────────
    // 1️⃣ FULL RESPONSE CACHE (Layer 1)
    // ──────────────────────────────────────────────────────────────────────────
    const cached = getCachedResponse(adminId);
    if (cached) {
      console.log(`⚡ Admin cache hit → ${adminId}`);
      return res.status(200).json(cached);
    }

    console.log(`🔍 Admin cache miss → ${adminId}`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2️⃣ VERIFY ADMIN
    // ──────────────────────────────────────────────────────────────────────────
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3️⃣ FETCH ALL MRs (Lean + Minimal Fields)
    // ──────────────────────────────────────────────────────────────────────────
    const mrDocs = await mrModel
      .find()
      .select(MR_SELECT)
      .populate(MR_POPULATE);

    if (mrDocs.length === 0) {
      return res.status(200).json([]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4️⃣ BACKGROUND WARM MATCH CACHE (Layer 3)
    // ──────────────────────────────────────────────────────────────────────────
    warmMatchDataCache(mrDocs.map((mr) => mr._id));

    // ──────────────────────────────────────────────────────────────────────────
    // 5️⃣ ENRICH ALL MR DATA (Layer 2 + merge)
    // ──────────────────────────────────────────────────────────────────────────
    const enrichedData = await Promise.all(
      mrDocs.map((mr) => enrichMrData(mr))
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 6️⃣ META COUNTS (Admin Dashboard)
    // ──────────────────────────────────────────────────────────────────────────
    const countStatuses = (data) => {
      let total = 0, pending = 0, approved = 0, rejected = 0;

      data.forEach((mr) => {
        mr.MRUploadedData?.forEach((u) => {
          total++;
          if (u.Status === 'Pending') pending++;
          else if (u.Status === 'Approved') approved++;
          else if (u.Status === 'Rejected') rejected++;
        });
      });

      return { totalCount: total, pendingCount: pending, approvedCount: approved, rejectedCount: rejected };
    };

    const countBrandWiseStatuses = (data) => {
      const result = {};

      data.forEach((mr) => {
        mr.MRUploadedData?.forEach((u) => {
          let brands = [];

          if (Array.isArray(u.SelectedBrands) && u.SelectedBrands.length) {
            brands = u.SelectedBrands.map((b) => b.brandName || b);
          } else if (u.BrandName) {
            brands = u.BrandName.split(',').map((b) => b.trim());
          }

          if (!brands.length) brands = ['Unknown'];

          brands.forEach((brand) => {
            if (!result[brand]) {
              result[brand] = {
                totalCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
              };
            }

            result[brand].totalCount++;
            if (u.Status === 'Pending') result[brand].pendingCount++;
            else if (u.Status === 'Approved') result[brand].approvedCount++;
            else if (u.Status === 'Rejected') result[brand].rejectedCount++;
          });
        });
      });

      return result;
    };

    const countByBrandCountCategories = (data) => {
      const base = {
        totalCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
      };

      const result = {
        '1B': { ...base },
        '2B': { ...base },
        '3B': { ...base },
        Total: { ...base },
      };

      data.forEach((mr) => {
        mr.MRUploadedData?.forEach((u) => {
          let count = u.NumberOfBrands;

          if (!count) {
            if (u.SelectedBrands?.length) count = u.SelectedBrands.length;
            else if (u.BrandName) count = u.BrandName.split(',').length;
            else count = 1;
          }

          let key = '1B';
          if (count === 2) key = '2B';
          else if (count >= 3) key = '3B';

          [key, 'Total'].forEach((k) => {
            result[k].totalCount++;
            if (u.Status === 'Pending') result[k].pendingCount++;
            else if (u.Status === 'Approved') result[k].approvedCount++;
            else if (u.Status === 'Rejected') result[k].rejectedCount++;
          });
        });
      });

      return result;
    };

    const meta = {
      counts: countStatuses(enrichedData),
      brandWiseCounts: countBrandWiseStatuses(enrichedData),
      brandCountCategoryCounts: countByBrandCountCategories(enrichedData),
    };

    if (enrichedData.length) {
      enrichedData[0]._meta = meta;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7️⃣ CACHE FULL RESPONSE (Admin TTL)
    // ──────────────────────────────────────────────────────────────────────────
    setCachedResponse(adminId, enrichedData, 'Admin');

    console.log(`✅ Admin data built & cached (${enrichedData.length} MRs)`);

    return res.status(200).json(enrichedData);
  } catch (err) {
    console.error('❌ Admin upload handler error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};


const CACHE_DIR = path.join(__dirname, "../analytics-cache");
const ADMIN_UPLOAD_FILE = path.join(CACHE_DIR, "adminUploadAnalytics.json");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let adminUploadRecalcInProgress = false;

// ///////v2
async function buildAdminUploadDataResponse() {
  // ── Admin ─────────────────────────────────────────────
  console.log("in buildAdminUploadDataResponse")
  const mrDocs = await mrModel
    .find()
    .select(MR_SELECT)
    .populate(MR_POPULATE);

  const enrichedData = await Promise.all(
    mrDocs.map((doc) => enrichMrData(doc))
  );

  // ───────────────── COUNTS ─────────────────
  const countStatuses = (data) => {
    let total = 0, pending = 0, approved = 0, rejected = 0;

    data.forEach((mr) => {
      mr.MRUploadedData?.forEach((upload) => {
        total++;
        if (upload.Status === "Pending") pending++;
        else if (upload.Status === "Approved") approved++;
        else if (upload.Status === "Rejected") rejected++;
      });
    });

    return {
      totalCount: total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
    };
  };

  const countBrandWiseStatuses = (data) => {
    const brandCounts = {};

    data.forEach((mr) => {
      mr.MRUploadedData?.forEach((upload) => {
        let brands = [];

        if (upload.SelectedBrands?.length) {
          brands = upload.SelectedBrands.map((b) => b.brandName || b);
        } else if (upload.BrandName) {
          brands = upload.BrandName.split(",").map((b) => b.trim());
        } else {
          brands = ["Unknown"];
        }

        brands.forEach((brand) => {
          if (!brandCounts[brand]) {
            brandCounts[brand] = {
              totalCount: 0,
              pendingCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
            };
          }

          brandCounts[brand].totalCount++;
          if (upload.Status === "Pending") brandCounts[brand].pendingCount++;
          else if (upload.Status === "Approved") brandCounts[brand].approvedCount++;
          else if (upload.Status === "Rejected") brandCounts[brand].rejectedCount++;
        });
      });
    });

    return brandCounts;
  };

  const countByBrandCountCategories = (data) => {
    const result = {
      "1B": { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
      "2B": { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
      "3B": { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
      Total: { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    };

    data.forEach((mr) => {
      mr.MRUploadedData?.forEach((upload) => {
        let count = upload.NumberOfBrands;

        if (!count) {
          if (upload.SelectedBrands?.length) count = upload.SelectedBrands.length;
          else if (upload.BrandName) count = upload.BrandName.split(",").length;
          else count = 1;
        }

        let category = count === 2 ? "2B" : count >= 3 ? "3B" : "1B";

        result[category].totalCount++;
        result.Total.totalCount++;

        if (upload.Status === "Pending") {
          result[category].pendingCount++;
          result.Total.pendingCount++;
        } else if (upload.Status === "Approved") {
          result[category].approvedCount++;
          result.Total.approvedCount++;
        } else if (upload.Status === "Rejected") {
          result[category].rejectedCount++;
          result.Total.rejectedCount++;
        }
      });
    });

    return result;
  };

  const counts = countStatuses(enrichedData);
  const brandWiseCounts = countBrandWiseStatuses(enrichedData);
  const brandCountCategoryCounts = countByBrandCountCategories(enrichedData);

  if (enrichedData.length > 0) {
    enrichedData[0]._meta = {
      counts,
      brandWiseCounts,
      brandCountCategoryCounts,
    };
  }
  console.log("done buildAdminUploadDataResponse")


  // ✅ EXACT SAME RESPONSE SHAPE
  return enrichedData;
}

async function recalculateAdminUploadAnalytics() {
  console.log("in recalculateAdminUploadAnalytics")

  if (adminUploadRecalcInProgress) return;

  adminUploadRecalcInProgress = true;
  console.log("🔄 Recalculating admin upload analytics");

  try {
    const responseData = await buildAdminUploadDataResponse();

    const payload = {
      generatedAt: new Date().toISOString(),
      data: responseData,
    };

    const tmpFile = ADMIN_UPLOAD_FILE + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), "utf-8");
    fs.renameSync(tmpFile, ADMIN_UPLOAD_FILE);

    console.log("✅ Admin upload analytics cache updated");
  } catch (err) {
    console.error("❌ Background recalculation failed:", err);
  } finally {
    adminUploadRecalcInProgress = false;
  }
}

const handleAdminUploadAnalytics = async (req, res) => {
  try {
    const adminId = req.params.id;
  console.log("in handleAdminUploadAnalytics")


    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    let cached = null;

    if (fs.existsSync(ADMIN_UPLOAD_FILE)) {
      cached = JSON.parse(fs.readFileSync(ADMIN_UPLOAD_FILE, "utf-8"));
    }

    // 🔄 background refresh
    setImmediate(recalculateAdminUploadAnalytics);

    // ✅ return EXACT SAME SHAPE as handleGetUploadDataNew
    return res.status(200).json(cached?.data || []);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


// ///////v2 end


const handleGetUploadDataPaginated = async (req, res) => {
  try {
    const Id = req.params.id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 50);

    // Reuse same cache as handleGetUploadData
    const cachedResponse = getCachedResponse(Id);
    if (cachedResponse) {
      console.log(`⚡ Cache hit for ${Id} (paginated)`);
      return res.status(200).json(buildPaginatedResponse(cachedResponse, page, limit));
    }

    console.log(`🔍 Cache miss for ${Id} (paginated) — building response`);

    let userExists, type;
    userExists = await mrModel.findOne({ MRID: Id });
    if (userExists) type = 'MR';

    const isValidObjectId = mongoose.Types.ObjectId.isValid(Id);

    if (!userExists && isValidObjectId) {
      const [admin, tlm, slm, flm] = await Promise.all([
        AdminModel.findById(Id),
        TlmModel.findById(Id).populate({ path: 'Slm', populate: { path: 'Flm', populate: { path: 'Mrs' } } }),
        SlmModel.findById(Id).populate({ path: 'Flm', populate: { path: 'Mrs' } }),
        FlmModel.findById(Id).populate('Mrs'),
      ]);

      if      (admin) { userExists = admin; type = 'Admin'; }
      else if (tlm)   { userExists = tlm;   type = 'TLM';   }
      else if (slm)   { userExists = slm;   type = 'SLM';   }
      else if (flm)   { userExists = flm;   type = 'FLM';   }
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let enrichedData = [];

    if (type === 'MR') {
      const mrDoc = await mrModel.findOne({ MRID: Id }).select(MR_SELECT).populate(MR_POPULATE);
      warmMatchDataCache([mrDoc._id]);
      enrichedData = [await enrichMrData(mrDoc)];
    }
    else if (type === 'FLM') {
      const mrIds = userExists.Mrs.map((mr) => mr._id);
      warmMatchDataCache(mrIds);
      const mrDocs = await mrModel.find({ _id: { $in: mrIds } }).select(MR_SELECT).populate(MR_POPULATE);
      const toEnrich = mrDocs.map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') })).filter(({ pendingUploads }) => pendingUploads.length > 0);
      enrichedData = await Promise.all(toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads)));
    }
    else if (type === 'SLM') {
      const mrIds = userExists.Flm.flatMap((flm) => flm.Mrs.map((mr) => mr._id));
      warmMatchDataCache(mrIds);
      const mrDocs = await mrModel.find({ _id: { $in: mrIds } }).select(MR_SELECT).populate(MR_POPULATE);
      const toEnrich = mrDocs.map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') })).filter(({ pendingUploads }) => pendingUploads.length > 0);
      enrichedData = await Promise.all(toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads)));
    }
    else if (type === 'TLM') {
      const mrIds = userExists.Slm.flatMap((slm) => slm.Flm).flatMap((flm) => flm.Mrs).map((mr) => mr._id);
      warmMatchDataCache(mrIds);
      const mrDocs = await mrModel.find({ _id: { $in: mrIds } }).select(MR_SELECT).populate(MR_POPULATE);
      const toEnrich = mrDocs.map((doc) => ({ doc, pendingUploads: doc.MRUploadedData.filter((u) => u.Status === 'Pending') })).filter(({ pendingUploads }) => pendingUploads.length > 0);
      enrichedData = await Promise.all(toEnrich.map(({ doc, pendingUploads }) => enrichMrData(doc, pendingUploads)));
    }
    else if (type === 'Admin') {
      const mrDocs = await mrModel.find().select(MR_SELECT).populate(MR_POPULATE);
      warmMatchDataCache(mrDocs.map((d) => d._id));
      enrichedData = await Promise.all(mrDocs.map((doc) => enrichMrData(doc)));
    }

    setCachedResponse(Id, enrichedData, type);
    console.log(`✅ Built and cached ${enrichedData.length} records for ${Id} (paginated)`);

    return res.status(200).json(buildPaginatedResponse(enrichedData, page, limit));

  } catch (error) {
    console.error('❌ Error in handleGetUploadDataPaginated:', error);
    res.status(500).json({ error: 'Internal server error', err: error.message });
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function buildPaginatedResponse(enrichedData, page, limit) {
  // Compute meta from ALL data
  let total = 0, pending = 0, approved = 0, rejected = 0;
  const brandCounts = {};
  const categoryCounts = {
    '1B':    { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    '2B':    { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    '3B':    { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    'Total': { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
  };

  enrichedData.forEach((mr) => {
    if (!mr.MRUploadedData) return;
    mr.MRUploadedData.forEach((upload) => {
      total++;
      if      (upload.Status === 'Pending')  pending++;
      else if (upload.Status === 'Approved') approved++;
      else if (upload.Status === 'Rejected') rejected++;

      // Brand wise
      let brands = [];
      if (upload.SelectedBrands?.length) {
        brands = upload.SelectedBrands.map((b) => b.brandName || b).filter(Boolean);
      } else if (upload.BrandName) {
        brands = upload.BrandName.split(',').map((b) => b.trim()).filter(Boolean);
      }
      if (!brands.length) brands = ['Unknown'];
      brands.forEach((brandName) => {
        if (!brandCounts[brandName]) brandCounts[brandName] = { totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 };
        brandCounts[brandName].totalCount++;
        if      (upload.Status === 'Pending')  brandCounts[brandName].pendingCount++;
        else if (upload.Status === 'Approved') brandCounts[brandName].approvedCount++;
        else if (upload.Status === 'Rejected') brandCounts[brandName].rejectedCount++;
      });

      // Category counts
      let n = upload.NumberOfBrands;
      if (!n || n === 0) {
        if (upload.SelectedBrands?.length) n = upload.SelectedBrands.length;
        else if (upload.BrandName) n = upload.BrandName.split(',').filter(Boolean).length || 1;
        else n = 1;
      }
      const cat = n >= 3 ? '3B' : n === 2 ? '2B' : '1B';
      ['Total', cat].forEach((key) => {
        categoryCounts[key].totalCount++;
        if      (upload.Status === 'Pending')  categoryCounts[key].pendingCount++;
        else if (upload.Status === 'Approved') categoryCounts[key].approvedCount++;
        else if (upload.Status === 'Rejected') categoryCounts[key].rejectedCount++;
      });
    });
  });

  const totalRecords = enrichedData.length;
  const totalPages   = Math.ceil(totalRecords / limit);
  const safePage     = Math.min(page, Math.max(1, totalPages));

  return {
    data: enrichedData.slice((safePage - 1) * limit, safePage * limit),
    pagination: {
      page: safePage,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
    _meta: {
      counts: { totalCount: total, pendingCount: pending, approvedCount: approved, rejectedCount: rejected },
      brandWiseCounts: brandCounts,
      brandCountCategoryCounts: categoryCounts,
    },
  };
}


module.exports = {
  handleGetSingleBrandData,
  handleAdminCreation,
  handleAdminLogin,
  handleExcelsheetUpload,
  uploadLiveMatches,
  addNewBrandNames,
  sendChallengeByManager,
  joinChallengeRoom,
  getAllCreatedRoomDetails,
  deleteChallengeRoom,
  getRoomByRoomId,
  scheduleChallengeRoom,
  setMatchDurationRoom,
  updateMatchDurationRoom,
  handleGetUploadData,
  updateRoomDetailsRoom,
  handleGetMatchDataByMatchDate,
  handleGetAllBrandData,
  EditBrandNameRoom,
  GetBillCount,
  handleCalculateBillSize,
  handleGetTopRunScorer,
  handleGetHighestBatchingAverage,
  handleTotalSixes,
  handleTotalFours,
  handleGetTotalRuns,
  handleTotalCenturiesCount,
  handleTotalHalfCenturiesCount,
  handleGetHighestTeamScore,
  handleGetLowestTeamScore,
  handleBestScoreByPlayer,
  handleMostNoOfMatchesByTeam,
  handleGetMrNames,
  handleGetPlayerDetails,
  handleGetAllNotification,
  handleGetTeamDetailsByTeamName,
  handleGetPointsTableByTeamName,
  handleScheduleMatchesAdmin,
  handleGetAllMatches,
  handleCreateNewPopup,
  handlegetAllPopup,
  handleUpdatePopuStatus,
  handleGetAllQueryByAdmin,
  handleGetAllQueryByCaseNo,
  handleQueryReplyByAdmin,
  handleUpdateReadStatus,
  handleGetMatchDuration,
  updateOldToNewUser,
  RestrictCompanyByAdmin,
  RestrictCompanyUpdate,
  GetAllRestrictedCompanyDetails,
  uploadExcelPrescriptionDetails,
  createCompany,
  CreateCompanyMonths,
  getNotificationDeviceTokenByAdmin,
  sendNotificationToUsers,
  uploadImageFromAdminMonthWise,
  updateImageUploadByAdminMonthWise,
  getAllImagesByAdminCompany,
  getUsersScreenTime,
  uploadNoMatchImage,
  getNoMatchImage,
  deleteNoMatchImage,
  reorderNoMatchImages,
  editNoMatchImage,
  toggleNoMatchImage,
  getAllNoMatchImages,
  createMatchSchedule,
  getMatchSchedules,
  editMatchSchedule,
  deleteMatchSchedule,
  getMonthlyBrandSummary,
  getBrandStats,
  getPrescriptionStats,
  invalidateResponseCache,
  handleGetUploadDataAdminOnly,
  handleAdminUploadAnalytics,
  handleGetUploadDataPaginated
};
