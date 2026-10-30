const mrModel = require("../Models/MrModel");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
var nodemailer = require("nodemailer");
const AdminModel = require("../Models/AdminModel");
const flmModel = require("../Models/FlmModel");
const SlmModel = require("../Models/SlmModel");
const TlmModel = require("../Models/TlmModel");
const CompanyMonthProvide = require("../Models/CompanyMonthProvide");
const BrandScehma = require("../Models/BrandScehma");
const MatchDetails = require("../Models/MatchesSchema");
const WeeklyMatchResult = require("../Models/WeeklyMatchResults");
const socket = require("../WebSocket");
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.SECRETKEY;
const { getIo } = require("../WebSocket");
const config = require("../Config/awsConfig");
const { DateTime } = require("luxon");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const MatchesSchema = require("../Models/MatchesSchema");
const FlmModel = require("../Models/FlmModel");
const SupportModel = require("../Models/SupportModel");
//const LeaderboardConfig = require('../Models/LeaderboardConfig');
const Notification = require("../Models/Notification");
const admin = require("firebase-admin");
const UserTrackageModel = require("../Models/UserTrackageModel");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const BASE_URL = "https://dev.admin.rxpl.digilateral.com";
const getLeaderboardSettings = require("../utils/leaderboardSettings");
const { invalidateResponseCache, onUploadStatusChange, onNewMrUpload } = require("./AdminController");
const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

async function invalidateAdminCacheOnly() {
  const admins = await AdminModel.find({}, { _id: 1 }).lean();
  for (const admin of admins) {
    invalidateResponseCache(admin._id.toString());
  }
  console.log("🗑️  ADMIN cache invalidated");
}

// const ExcelJS = require('exceljs');
// const path = require('path');

const createMr = async (req, res) => {
  try {
    const flmId = req.params.id;
    const flm = await flmModel.findById({ _id: flmId });

    if (!flm) {
      return res.status(400).json({
        msg: "Flm Not Found",
      });
    }

    const {
      USERNAME,
      MRID,
      PASSWORD,
      EMAIL,
      ROLE,
      HQ,
      REGION,
      ZONE,
      BUSINESSUNIT,
      TEAMNAME,
      DOJ,
    } = req.body;

    let mr;

    mr = await mrModel.findOne({ MRID: MRID });

    if (mr) return res.status(400).json({ msg: "MR is already Exists", MRID });

    const mrExistEmail = await mrModel.findOne({ EMAIL: EMAIL });
    if (mrExistEmail) {
      return res.status(501).send({
        message: "MR with same email found in database..!!",
        success: false,
      });
    }

    mr = new mrModel({
      USERNAME,
      MRID,
      PASSWORD,
      EMAIL,
      ROLE,
      HQ,
      REGION,
      ZONE,
      TEAMNAME,
      BUSINESSUNIT,
      DOJ,
    });

    mr.loginLogs.push({
      timestamp: new Date(),
      cnt: 1,
    });

    await mr.save();
    flm.Mrs.push(mr._id);

    await flm.save();
    return res.status(200).json(mr);
  } catch (error) {
    // console.log("Error in CreateMr");
    let err = error.message;
    return res.status(500).json({
      msg: "Internal Server Error",
      err,
    });
  }
};

/*
const loginMr = async (req, res) => {
  try {
    const { MRID, PASSWORD } = req.body;

    if (!PASSWORD || !MRID) {
      return res
        .status(401)
        .send({ message: "Plz fill all credentials..!!", success: false });
    }

    let userExist, userType, userPasswordField;

    userExist = await mrModel.findOne({ MRID: MRID });
    if (userExist) {
      userType = "Mr";
      userPasswordField = "PASSWORD";
    }

    if (!userExist) {
      userExist = await SlmModel.findOne({ SLMEmpID: MRID });
      
      if (userExist) {
        userType = "Slm";
        userPasswordField = "Password";
      }
    }

    if (!userExist) {
      userExist = await flmModel.findOne({ FLMEmpID: MRID });
      if (userExist) {
        userType = "Flm";
        userPasswordField = "Password";
      }
    }

    if (!userExist) {
      userExist = await TlmModel.findOne({ TLMEmpID: MRID });
      if (userExist) {
        userType = "Tlm";
        userPasswordField = "Password";
      }
    }

    if (!userExist)
      return res.status(400).json({
        msg: "User Not Exist...!!!",
      });

    const storedPassword = userExist[userPasswordField];
    if (storedPassword !== PASSWORD) {
      return res.status(401).send({
        message: "Invalid Credentials Failed to login..!!",
        success: false,
      });
    }

    userExist.loginLogs.push({
      timestamp: new Date(),
      cnt: userExist.loginLogs.length + 1,
    });

    await userExist.save();

    const token = jwt.sign({ userId: userExist._id }, jwt_secret, {
      expiresIn: "1h",
    });

    const ObjmrId = userExist._id;
    const mrName =
      userExist.USERNAME ||
      userExist.BDMName ||
      userExist.SLMName ||
      userExist.TLMName;
    const MatchId = userExist.MatchId || "";
    const TeamName = (userExist.TEAMNAME || userExist.TeamName || "").trim();
    const HQ = userExist.HQ || userExist.HQ;
    const Region = userExist.REGION || userExist.REGION;
    const Zone = userExist.ZONE || userExist.ZONE;
    const BusinessUnit = userExist.BUSINESSUNIT || userExist.BUSINESSUNIT;

    return res.status(200).json({
      success: true,
      message: "Login Success",
      token,
      userType,
      ObjmrId,
      MRID,
      mrName,
      MatchId,
      TeamName,
      HQ,
      Region,
      Zone,
      BusinessUnit,
    });
  } catch (error) {
    // console.log(error);
    let err = error.message;
    return res.status(500).json({
      msg: "Internal Server Error",
      err,
    });
  }
};

*/

const loginMr = async (req, res) => {
  try {
    const { MRID, PASSWORD } = req.body;

    if (!PASSWORD || !MRID) {
      return res.status(401).json({ message: "Plz fill all credentials..!!", success: false });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FIX 1 — Run ALL 4 model lookups in PARALLEL instead of sequentially
    //
    //  BEFORE: 4 DB round trips one after another → ~800ms+
    //  AFTER:  All 4 fire at once, resolve together → ~200ms
    // ═══════════════════════════════════════════════════════════════════════
    const [mr, slm, flm, tlm] = await Promise.all([
      mrModel.findOne({ MRID: MRID }).select('_id USERNAME TEAMNAME HQ REGION ZONE BUSINESSUNIT MatchId PASSWORD loginLogs'),
      SlmModel.findOne({ SLMEmpID: MRID }).select('_id SLMName TeamName HQ REGION ZONE BUSINESSUNIT MatchId Password loginLogs'),
      flmModel.findOne({ FLMEmpID: MRID }).select('_id BDMName TeamName HQ REGION ZONE BUSINESSUNIT MatchId Password loginLogs'),
      TlmModel.findOne({ TLMEmpID: MRID }).select('_id TLMName TeamName HQ REGION ZONE BUSINESSUNIT MatchId Password loginLogs'),
    ]);

    // Pick whichever model matched
    let userExist, userType, userPasswordField;

    if      (mr)  { userExist = mr;  userType = 'Mr';  userPasswordField = 'PASSWORD'; }
    else if (slm) { userExist = slm; userType = 'Slm'; userPasswordField = 'Password'; }
    else if (flm) { userExist = flm; userType = 'Flm'; userPasswordField = 'Password'; }
    else if (tlm) { userExist = tlm; userType = 'Tlm'; userPasswordField = 'Password'; }

    if (!userExist) {
      return res.status(400).json({ msg: "User Not Exist...!!!" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FIX 2 — Password check BEFORE the save() call
    //  No point pushing loginLog or calling save() if password is wrong
    // ═══════════════════════════════════════════════════════════════════════
    if (userExist[userPasswordField] !== PASSWORD) {
      return res.status(401).json({ message: "Invalid Credentials Failed to login..!!", success: false });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FIX 3 — Run loginLog save + JWT sign in PARALLEL
    //  These are independent — no reason to do them one after another
    // ═══════════════════════════════════════════════════════════════════════
    userExist.loginLogs.push({
      timestamp: new Date(),
      cnt: userExist.loginLogs.length + 1,
    });

    const [, token] = await Promise.all([
      userExist.save(),
      Promise.resolve(jwt.sign({ userId: userExist._id }, jwt_secret, { expiresIn: '1h' })),
    ]);

    // Build response fields
    const mrName    = userExist.USERNAME  || userExist.BDMName || userExist.SLMName || userExist.TLMName;
    const TeamName  = (userExist.TEAMNAME || userExist.TeamName || '').trim();

    return res.status(200).json({
      success:      true,
      message:      'Login Success',
      token,
      userType,
      ObjmrId:      userExist._id,
      MRID,
      mrName,
      MatchId:      userExist.MatchId      || '',
      TeamName,
      HQ:           userExist.HQ           || '',
      Region:       userExist.REGION       || '',
      Zone:         userExist.ZONE         || '',
      BusinessUnit: userExist.BUSINESSUNIT || '',
    });

  } catch (error) {
    return res.status(500).json({ msg: 'Internal Server Error', err: error.message });
  }
};



// ═══════════════════════════════════════════════════════════════════════════════
//  isMatchOn CACHE  — populated as a side effect of /profile hitting
//  UploadPrescription calls /profile → we cache isMatchOn here automatically
//  Next /profile call within 5hrs → isMatchOn served from cache instantly
//  Everything else in the response is always fresh (no caching on full profile)
// ═══════════════════════════════════════════════════════════════════════════════
const matchStatusCache = new Map(); // key: MrId → { isMatchOn, expiresAt }
const MATCH_STATUS_TTL = 5 * 60 * 60 * 1000; // 5 hours

function invalidateMatchStatusCache(id) {
  matchStatusCache.delete(id.toString());
  console.log(`🗑️ Match status cache invalidated for: ${id}`);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of matchStatusCache.entries()) {
    if (entry.expiresAt <= now) matchStatusCache.delete(key);
  }
}, 60 * 60 * 1000); // cleanup every hour


// ═══════════════════════════════════════════════════════════════════════════════
//  OPTIMIZED getProfileMr
// ═══════════════════════════════════════════════════════════════════════════════
const getProfileMr = async (req, res) => {
  try {
    const MrId = req.params.id;

    if (!MrId) {
      return res.status(400).json({ msg: 'Mr Not Found' });
    }

    // ── FIX 1: All 4 model lookups in PARALLEL ───────────────────────────────
    const [mr, flm, slm, tlm] = await Promise.all([
      mrModel.findOne({ _id: MrId }).select('-loginLogs').lean(),
      flmModel.findOne({ _id: MrId }).select('-loginLogs').lean(),
      SlmModel.findOne({ _id: MrId }).select('-loginLogs').lean(),
      TlmModel.findOne({ _id: MrId }).select('-loginLogs').lean(),
    ]);

    let userExist, userType;

    if      (mr)  { userExist = mr;  userType = 'Mr';  }
    else if (flm) { userExist = flm; userType = 'Flm'; }
    else if (slm) { userExist = slm; userType = 'Slm'; }
    else if (tlm) { userExist = tlm; userType = 'Tlm'; }

    if (!userExist) {
      return res.status(400).json({ msg: 'User Not Exist...!!!' });
    }

    // ── SIDE EFFECT: cache isMatchOn whenever profile is fetched ─────────────
    // UploadPrescription calls this API just to read isMatchOn — now it's
    // cached here automatically. No frontend changes needed at all.
    if (userType === 'Mr' && userExist.isMatchOn !== undefined) {
      matchStatusCache.set(MrId.toString(), {
        isMatchOn: userExist.isMatchOn,
        expiresAt: Date.now() + MATCH_STATUS_TTL,
      });
      console.log(`✅ Cached isMatchOn=${userExist.isMatchOn} for ${MrId}`);
    }

    // ── FIX 2: Brand counts + MatchesSchema query in PARALLEL ────────────────
    let brandCounts  = { b1: 0, b2: 0, b3: 0 };
    let last5Matches = null;

    if (userType === 'Mr') {

      const [computedBrandCounts, allTeamMatches] = await Promise.all([

        // Brand counts — pure in-memory loop, no DB
        Promise.resolve((() => {
          const counts = { b1: 0, b2: 0, b3: 0 };
          for (const upload of (userExist.MRUploadedData || [])) {
            if (upload.Status !== 'Approved') continue;
            if      (upload.NumberOfBrands === 1) counts.b1++;
            else if (upload.NumberOfBrands === 2) counts.b2++;
            else if (upload.NumberOfBrands === 3) counts.b3++;
          }
          return counts;
        })()),

        // ── FIX 3: Only fetch 3 fields — skip huge Submissions array ─────────
        MatchesSchema.find({
          $or: [{ teamA: userExist.TEAMNAME }, { teamB: userExist.TEAMNAME }],
        })
          .select('teamA teamB MatchResult')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      brandCounts = computedBrandCounts;

      // last5Matches — same logic as before
      try {
        const mrMatches = userExist.MrScoreEachMatch || [];
        const today     = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDate = (dateStr) => {
          const [day, month, year] = dateStr.split('-');
          return new Date(year, month - 1, day);
        };

        const processedMatches = [];

        for (const match of allTeamMatches) {
          if (processedMatches.length >= 5) break;

          const matchResults = match.MatchResult || [];
          if (matchResults.length === 0) continue;

          const latestResult   = matchResults.sort((a, b) => parseDate(b.startDate) - parseDate(a.startDate))[0];
          const matchStartDate = latestResult.startDate;
          const matchEndDate   = latestResult.endDate || match.endDate;

          const endDate = parseDate(matchEndDate);
          endDate.setHours(0, 0, 0, 0);
          if (endDate > today) continue;

          const mrPlayedMatch = mrMatches.find((m) => m.matchStartDate === matchStartDate);
          const isTeamA       = match.teamA === userExist.TEAMNAME;
          const teamScore     = parseInt(isTeamA ? latestResult.teamAScore : latestResult.teamBScore) || 0;
          const opponentScore = parseInt(isTeamA ? latestResult.teamBScore : latestResult.teamAScore) || 0;

          let isWin = false, isDraw = false;
          if      (latestResult.winner === 'Draw')                   isDraw = true;
          else if (latestResult.winner === 'Team A win' && isTeamA)  isWin  = true;
          else if (latestResult.winner === 'Team B win' && !isTeamA) isWin  = true;

          processedMatches.push(
            mrPlayedMatch
              ? { mrScore: parseInt(mrPlayedMatch.Score), isWin, isDraw, matchDate: matchStartDate, teamScore, opponentScore, teamName: userExist.TEAMNAME, opponentTeam: isTeamA ? match.teamB : match.teamA, isTournament: mrPlayedMatch.isTournament || false, matchEndDate, isUnplayed: false }
              : { mrScore: 0, isWin, isDraw, matchDate: matchStartDate, teamScore, opponentScore, teamName: userExist.TEAMNAME, opponentTeam: isTeamA ? match.teamB : match.teamA, isTournament: false, matchEndDate, isUnplayed: true }
          );
        }

        last5Matches = processedMatches;
      } catch (e) {
        console.error('❌ Error processing MR matches:', e);
      }
    }

    // Strip MRUploadedData — keep response light
    const userDataToSend = { ...userExist };
    delete userDataToSend.MRUploadedData;

    // ── RESPONSE: exact same shape as before, nothing changed ────────────────
    return res.status(200).json({
      success:     true,
      message:     'Profile Data Fetched Successfully',
      data:        [userDataToSend],
      userType,
      last5Matches,
      brandCounts: userType === 'Mr' ? brandCounts : null,
    });

  } catch (error) {
    console.log('❌ Error in getProfileMr:', error);
    return res.status(500).json({ msg: 'Internal Server Error', err: error.message });
  }
};


/*
const getProfileMr = async (req, res) => {
  try {
    const MrId = req.params.id;
    let userExist;
    let userType = null;

    if (!MrId) {
      return res.status(400).json({
        msg: "Mr Not Found",
      });
    }

    // Try to find in MR collection (WITH MRUploadedData for counting)
    userExist = await mrModel
      .findOne({ _id: MrId })
      .select("-loginLogs"); // Don't exclude MRUploadedData

    if (userExist) {
      userType = "Mr";
    }

    // Try FLM if not found
    if (!userExist) {
      userExist = await flmModel.findOne({ _id: MrId }).select("-loginLogs");
      if (userExist) userType = "Flm";
    }

    // Try SLM if not found
    if (!userExist) {
      userExist = await SlmModel.findOne({ _id: MrId }).select("-loginLogs");
      if (userExist) userType = "Slm";
    }

    // Try TLM if not found
    if (!userExist) {
      userExist = await TlmModel.findOne({ _id: MrId }).select("-loginLogs");
      if (userExist) userType = "Tlm";
    }

    if (!userExist) {
      return res.status(400).json({
        msg: "User Not Exist...!!!",
      });
    }

    // ✅ CALCULATE BRAND COUNTS (Only for MR users)
    let brandCounts = { b1: 0, b2: 0, b3: 0 };

    if (userType === "Mr" && userExist.MRUploadedData) {
      const uploadedData = userExist.MRUploadedData;

      uploadedData.forEach((upload) => {
        // Only count approved prescriptions
        if (upload.Status === "Approved") {
          const numberOfBrands = upload.NumberOfBrands;

          if (numberOfBrands === 1) {
            brandCounts.b1++;
          } else if (numberOfBrands === 2) {
            brandCounts.b2++;
          } else if (numberOfBrands === 3) {
            brandCounts.b3++;
          }
        }
      });

      console.log(`📊 Brand counts for ${userExist.USERNAME}:`, brandCounts);
    }

    // ✅ Remove MRUploadedData from response to keep it light
    const userDataToSend = userExist.toObject();
    delete userDataToSend.MRUploadedData;

    const data = [];
    data.push(userDataToSend);

    // ✅ If user is MR, calculate last 5 matches with win/loss info
    let last5Matches = null;

    if (userType === "Mr") {
      try {
        const mrMatches = userExist.MrScoreEachMatch || [];

        // ✅ Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper function to parse dates
        const parseDate = (dateStr) => {
          const [day, month, year] = dateStr.split("-");
          return new Date(year, month - 1, day);
        };

        // ✅ STEP 1: Get ALL team matches from MatchesSchema
        const allTeamMatches = await MatchesSchema.find({
          $or: [{ teamA: userExist.TEAMNAME }, { teamB: userExist.TEAMNAME }],
        }).sort({ createdAt: -1 });

        // ✅ STEP 2: Process each team match
        const processedMatches = [];

        for (const match of allTeamMatches) {
          // Skip if we already have 5 matches
          if (processedMatches.length >= 5) break;

          // Get the most recent match result for this match
          const matchResults = match.MatchResult || [];
          if (matchResults.length === 0) continue;

          // Sort by date and get the latest
          const sortedResults = matchResults.sort((a, b) => {
            return parseDate(b.startDate) - parseDate(a.startDate);
          });

          const latestResult = sortedResults[0];
          const matchStartDate = latestResult.startDate;
          const matchEndDate = latestResult.endDate || match.endDate;

          // ✅ STEP 3: Skip if match is ongoing (endDate > today)
          const endDate = parseDate(matchEndDate);
          endDate.setHours(0, 0, 0, 0);

          if (endDate > today) {
            console.log(
              `⏭️ Skipping ongoing match: ${matchStartDate} - ${matchEndDate}`,
            );
            continue; // Skip this match
          }

          // ✅ STEP 4: Check if MR played this match
          const mrPlayedMatch = mrMatches.find(
            (mrMatch) => mrMatch.matchStartDate === matchStartDate,
          );

          const isTeamA = match.teamA === userExist.TEAMNAME;
          const teamScore = isTeamA
            ? parseInt(latestResult.teamAScore || 0)
            : parseInt(latestResult.teamBScore || 0);
          const opponentScore = isTeamA
            ? parseInt(latestResult.teamBScore || 0)
            : parseInt(latestResult.teamAScore || 0);

          // Determine win/loss/draw based on team result
          let isWin = false;
          let isDraw = false;

          if (latestResult.winner === "Draw") {
            isDraw = true;
          } else if (latestResult.winner === "Team A win" && isTeamA) {
            isWin = true;
          } else if (latestResult.winner === "Team B win" && !isTeamA) {
            isWin = true;
          }

          // ✅ STEP 5: Build the match object
          if (mrPlayedMatch) {
            processedMatches.push({
              mrScore: parseInt(mrPlayedMatch.Score),
              isWin: isWin,
              isDraw: isDraw,
              matchDate: matchStartDate,
              teamScore: teamScore,
              opponentScore: opponentScore,
              teamName: userExist.TEAMNAME,
              opponentTeam: isTeamA ? match.teamB : match.teamA,
              isTournament: mrPlayedMatch.isTournament || false,
              matchEndDate: matchEndDate,
              isUnplayed: false,
            });
          } else {
            processedMatches.push({
              mrScore: 0,
              isWin: isWin,
              isDraw: isDraw,
              matchDate: matchStartDate,
              teamScore: teamScore,
              opponentScore: opponentScore,
              teamName: userExist.TEAMNAME,
              opponentTeam: isTeamA ? match.teamB : match.teamA,
              isTournament: false,
              matchEndDate: matchEndDate,
              isUnplayed: true,
            });
          }
        }

        last5Matches = processedMatches;
      } catch (matchProcessError) {
        console.error("❌ Error processing MR matches:", matchProcessError);
        last5Matches = null;
      }
    }

    return res.status(200).send({
      success: true,
      message: "Profile Data Fetched Successfully",
      data,
      userType: userType,
      last5Matches: last5Matches,
      brandCounts: userType === "Mr" ? brandCounts : null, // ✅ Add brand counts
    });
  } catch (error) {
    console.log("❌ Error in getProfileMr:", error);
    let err = error.message;
    return res.status(500).json({
      msg: "Internal Server Error",
      err,
    });
  }
};
*/

const handleForgetPassword = async (req, res) => {
  try {
    const { MRID } = req.body;
    const mrExist = await mrModel.findOne({ MRID: MRID });

    if (!mrExist) {
      return res
        .status(404)
        .send({ message: "MR Not found...!!!", success: false });
    }

    // Send the password directly via email
    const password = mrExist.PASSWORD;
    const email = mrExist.EMAIL;
    const name = mrExist.USERNAME;

    // NodeMailer Configuration
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "digilateraldev@gmail.com",
        pass: "ohax atcp umht xked",
      },
    });

    // Email content
    var mailOptions = {
      from: "digiLateralQuizPanel@gmail.com",
      to: email,
      subject: "Password API correctly working take your Password...",
      html: `
              <div style="border: 1px solid #000; padding: 10px; text-align: center;">
                <h3 style="text-align: center;">Dear : ${name}</h3>
                <p> Your Password For <span style="background-color: orange; color: white; padding: 3px;">Rxpl</span> : ${password}</p>
                <p>Please keep this information secure.</p>
                <p>If you didn't request this, please ignore this email.</p>
              </div>
            `,
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        // console.log(error);
        return res
          .status(500)
          .send({ message: "Error sending email", success: false });
      } else {
        // console.log("Email sent: " + info.response);
        return res
          .status(200)
          .send({ message: "Password sent successfully", success: true });
      }
    });

    res.status(201).json({
      message: `MR NAME : ${name} PASSWORD RESTORE SUCCESSFULLY...`,
      success: true,
    });
  } catch (error) {
    // console.log("Error in forgotting password");
    let err = error.message;
    return res.status(500).json({
      msg: "Internal Server Error",
      err,
    });
  }
};


async function getTokensFromFirestore(companyName) {
  try {
    console.log('\n🔍 === GETTING TOKENS FROM FIRESTORE ===');
    console.log('  Looking for company:', companyName);

    const tokens = new Set();
    const usersCollection = admin.firestore().collection("users");

    const usersSnapshot = await usersCollection.get(); // ✅ FIXED
    console.log('  📊 Total Firestore users:', usersSnapshot.size);

    const usersWithTokens = [];
    let processedCount = 0;
    let matchedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      processedCount++;
      const userData = userDoc.data();

      if (
        userData &&
        userData.deviceTokens &&
        Array.isArray(userData.deviceTokens) &&
        userData.deviceTokens.length > 0
      ) {
        const userId = userDoc.id;
        console.log(`  [${processedCount}] User ${userId} has ${userData.deviceTokens.length} tokens`);

        // Check in MR model
        let role = null;
        let BUSINESSUNIT = null;

        const mrData = await mrModel.findOne({ MRID: userId });
        if (mrData) {
          role = "Mr";
          BUSINESSUNIT = mrData.BUSINESSUNIT;
          console.log(`    ✓ Found in MongoDB: ${BUSINESSUNIT}`);
        } else {
          console.log(`    ✗ NOT found in MongoDB`);
        }

        // Filter users based on company
        if (BUSINESSUNIT === companyName) {
          matchedCount++;
          console.log(`    ✅ MATCH! Adding ${userData.deviceTokens.length} tokens`);

          usersWithTokens.push({
            id: userId,
            tokens: userData.deviceTokens,
            role,
            CompanyName: BUSINESSUNIT,
          });

          userData.deviceTokens.forEach((token) => tokens.add(token));
        } else {
          console.log(`    ⏭️  Skip (company: ${BUSINESSUNIT || 'null'})`);
        }
      }
    }

    console.log('\n  📊 SUMMARY:');
    console.log(`    Processed: ${processedCount} users`);
    console.log(`    Matched: ${matchedCount} users`);
    console.log(`    Total unique tokens: ${tokens.size}`);
    console.log('=======================================\n');

    return Array.from(usersWithTokens);
  } catch (error) {
    console.error("❌ Error getting tokens from Firestore:", error);
    return [];
  }
}


// async function sendMessage(title, body, companyName) {
//   // Fetch the tokens from an external datastore (e.g. database)
//   const tokens = await getTokensFromFirestore(companyName);
//   console.log('msg send',tokens);
//   const message = {
//     //Define message object
//     tokens: tokens,
//     notification: {
//       title: title,
//       body: body,
//     },
//     data: {
//       title: title,
//       body: body,
//     },
//   };
//   const response = await admin.messaging().sendEachForMulticast(message); //Correct usage
//   console.log(response.successCount + " messages were sent successfully");
//   console.log(response.failureCount + " messages failed to send");
// }
async function sendMessage(title, body, companyName) {
  try {
    // Fetch tokens from Firestore
    const tokenData = await getTokensFromFirestore(companyName);

    // ✅ Extract the `tokens` array
    const tokens = tokenData.flatMap((entry) => entry.tokens);

    // ✅ Check if `tokens` is empty
    if (!tokens.length) {
      console.log("No valid tokens found for company:", companyName);
      return;
    }

    // ✅ Define the multicast message
    const message = {
      tokens, // Make sure this is an array of strings
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
      },
    };

    // ✅ Send the message
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`${response.successCount} messages were sent successfully`);
    console.log(`${response.failureCount} messages failed to send`);

    if (response.failureCount > 0) {
      console.error("Failed responses:", response.responses);
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// sendMessage('testing',"Helo","Glenmark")

const sixRunsArray = [
  "It's gone all the way! A massive six!🎉",
  "What a shot! That’s a powerful hit!✨",
  "What a hit! That’s a towering six!🎉",
  "The ball is sailing into the stands! Six runs!🎊",
  "The power behind that shot was extraordinary!🎇",
  "Oh, he’s launched it high! That’s a massive six!🎆",
];

const fourRunsArray = [
  "Lovely timing! That’s four runs!🎊",
  "A perfect drive to the boundary!✨",
  "A lovely shot to get those quick four runs!🎉",
  "He swings with everything he has!🎆",
  "Four runs! A lovely cover drive!🎉",
];

const getRandomString = (array) =>
  array[Math.floor(Math.random() * array.length)];

/*const handleUploadPrescriptionData = async (req, res) => {
  try {
    // DEBUG: Check if file is received
    console.log("📥 Upload Request Debug:");
    console.log("Body:", req.body);
    console.log("File received?", !!req.file);
    if (req.file) {
      console.log("✅ File:", req.file.filename);
    } else {
      console.log("❌ NO FILE!");
    }

    const mrId = req.params.id;
    const matchId = req.params.matchId;
    let NotifyPoints;

    // Check if MR exists
    const mrExist = await mrModel.findById(mrId);
    if (!mrExist) {
      return res
        .status(501)
        .send({ message: "MR Id Not Found..!!", success: false });
    }

    const matchExist = await MatchesSchema.findById(matchId);
    if (!matchExist) {
      return res
        .status(501)
        .send({ message: "Match Not Found..!!", success: false });
    }

    const {
      Name,
      Specility,
      MOBNO,
      ScCode,
      BrandName,
      NoRxns,
      RxnDuration,
      DateOfUpload,
    } = req.body;

    // Get the uploaded filename from multer
    const PrescriptionImage = req.file?.filename || "";

   
       if (!Name || !ScCode || !BrandName || BrandName === "-" || !NoRxns || NoRxns === "-" || !PrescriptionImage) {
  // Build missing fields list for the error message (optional, for clear feedback)
  const missingFields = [];
  if (!Name) missingFields.push('Name');
  if (!ScCode) missingFields.push('ScCode');
  if (!BrandName) missingFields.push('BrandName');
  if (!NoRxns) missingFields.push('NoRxns');
  if (!PrescriptionImage) missingFields.push('PrescriptionImage');
  console.log("Missing field!!")

  return res.status(400).json({
    success: false,
    message: "Missing required fields: " + missingFields.join(', '),
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

    const MRUploadedData = {
      DrName: Name || "",
      Specility: Specility || "",
      MOBNO: MOBNO || "",
      ScCode: ScCode || "",
      BrandName: BrandName,
      NoRxns: NoRxns,
      RxnDuration: RxnDuration,
      PrescriptionImage: PrescriptionImage,
      DateOfUpload: DateOfUpload,
      matchStartDate: matchExist.startDate,
      matchEndDate: matchExist.endDate,
      TimeOfUpload: formattedTime1,
      isTournament: matchExist.isTournament === true ? true : false,
      Status: "Pending", // ✅ ADD STATUS
      DateOfCreation: new Date()
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"), // ✅ ADD DATE
    };

    // Check for required fields
    if (!BrandName || !NoRxns || !RxnDuration || !DateOfUpload) {
      return res
        .status(400)
        .json({ message: "Please fill all required details", success: false });
    }

    // Get Points for the BrandName
    let matchLiveUpdate;
    if (BrandName) {
      const brandData = await BrandScehma.findOne({ BrandName: BrandName });
      if (brandData) {
        const { Points } = brandData;
        MRUploadedData.Points = Points;
        NotifyPoints = parseInt(Points);

        const matchDate = MRUploadedData.DateOfUpload;
        const matchEndDate = MRUploadedData.matchEndDate;
        const matchStartDate = MRUploadedData.matchStartDate;
        const pointValue = parseInt(Points);

        // Initialize score and counters
        let score = 0;
        let foursCount = 0;
        let sixesCount = 0;
        let title = "";
        let message = "";

        // Adjust counters and score based on Points
        // ✅ KEEPING NoRxns MULTIPLIER AS IS
        if (pointValue === 4) {
          foursCount = parseInt(NoRxns);
          score += 4 * parseInt(NoRxns);
          NotifyPoints = NotifyPoints * parseInt(NoRxns);
          title = getRandomString(fourRunsArray);
          message = `4 Runs - ${mrExist.TEAMNAME}`;
          sendMessage(title, message, mrExist.BUSINESSUNIT);
        } else if (pointValue === 6) {
          sixesCount = parseInt(NoRxns);
          score += 6 * parseInt(NoRxns);
          NotifyPoints = NotifyPoints * parseInt(NoRxns);
          title = getRandomString(sixRunsArray);
          message = `6 Runs - ${mrExist.TEAMNAME}`;
          sendMessage(title, message, mrExist.BUSINESSUNIT);
        } else {
          // For other point values, directly add to score
          score += pointValue * parseInt(NoRxns);
          NotifyPoints = NotifyPoints * parseInt(NoRxns);
        }

        // Find or create match entry for MrScoreEachMatch
        let match = mrExist.MrScoreEachMatch.find(
          (m) => m.MatchDate === matchDate
        );
        let match1 = mrExist.MrScoreEachMatch.find(
          (m) => m.MatchDate === matchStartDate
        );
        const uploadTime = new Date();
        const formattedTime = `${uploadTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${uploadTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        if (match) {
          match.Score = parseInt(match.Score) + score;
          match.TotalFours = parseInt(match.TotalFours) + foursCount;
          match.TotalSixes = parseInt(match.TotalSixes) + sixesCount;
          match.TimeOfUpload = formattedTime;
        } else if (
          match1 &&
          MRUploadedData.DateOfUpload >= matchStartDate &&
          MRUploadedData.DateOfUpload <= matchEndDate
        ) {
          match1.Score = parseInt(match1.Score) + score;
          match1.TotalFours = parseInt(match1.TotalFours) + foursCount;
          match1.TotalSixes = parseInt(match1.TotalSixes) + sixesCount;
          match1.TimeOfUpload = formattedTime;
        } else {
          mrExist.MrScoreEachMatch.push({
            Score: score.toString(),
            TotalFours: foursCount.toString(),
            TotalSixes: sixesCount.toString(),
            MatchDate: matchDate,
            matchStartDate: matchStartDate,
            matchEndDate: matchEndDate,
            OpponentName: "",
            TimeOfUpload: formattedTime,
            DateOfCreation: new Date().toISOString().slice(0, 10),
            isTournament: matchExist.isTournament === true ? true : false,
          });
        }

        let role;
        role = matchExist.creatorRole;
        const mrIdObject = new mongoose.Types.ObjectId(mrId);

        if (role === "Flm") {
          const findManager = await FlmModel.findById(matchExist.creatorId);

          const check = findManager.Mrs.some((mrPresent) =>
            mrPresent.equals(mrIdObject)
          );

          if (check) {
            let match = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchDate
            );
            let match1 = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchStartDate
            );
            let matchExistData = matchExist.MatchResult.find(
              (m) => m.startDate === matchDate
            );
            let matchExistData1 = matchExist.MatchResult.find(
              (m) => m.startDate === matchStartDate
            );
            if (match) {
              match.score = parseInt(match.score) + score;
              await findManager.save();
            } else if (
              match1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              match1.score = parseInt(match1.score) + score;
              await findManager.save();
            } else {
              findManager.EachMatchRecord.push({
                score: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              await findManager.save();
            }

            if (matchExistData) {
              const existingScore = parseInt(matchExistData.teamAScore);
              matchExistData.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else if (
              matchExistData1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              const existingScore = parseInt(matchExistData1.teamAScore);
              matchExistData1.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else {
              matchExist.MatchResult.push({
                teamAScore: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              matchLiveUpdate = await matchExist.save();
            }
          } else {
            const alternateManager = await FlmModel.findById(
              matchExist.membersAccepted[0]
            );

            const checkAlternate = alternateManager.Mrs.some((mrPresent) =>
              mrPresent.equals(mrIdObject)
            );
            if (checkAlternate) {
              let match = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchDate
              );
              let match1 = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchStartDate
              );
              let matchExistData = matchExist.MatchResult.find(
                (m) => m.startDate === matchDate
              );
              let matchExistData1 = matchExist.MatchResult.find(
                (m) => m.startDate === matchStartDate
              );
              if (match) {
                match.score = parseInt(match.score) + score;
                await alternateManager.save();
              } else if (
                match1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                match1.score = parseInt(match1.score) + score;
                await alternateManager.save();
              } else {
                alternateManager.EachMatchRecord.push({
                  score: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                await alternateManager.save();
              }

              if (matchExistData) {
                const existingScore = parseInt(matchExistData.teamBScore);
                matchExistData.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else if (
                matchExistData1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                const existingScore = parseInt(matchExistData1.teamBScore);
                matchExistData1.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else {
                matchExist.MatchResult.push({
                  teamBScore: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                matchLiveUpdate = await matchExist.save();
              }
            }
          }
        } else if (role === "Slm") {
          const findManager = await SlmModel.findById(
            matchExist.creatorId
          ).populate({
            path: "Flm",
            populate: { path: "Mrs" },
          });

          const check = findManager.Flm.some((flm) => {
            return flm.Mrs.some((mrPresent) =>
              mrPresent._id.equals(mrIdObject)
            );
          });

          if (check) {
            let match = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchDate
            );
            let match1 = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchStartDate
            );
            let matchExistData = matchExist.MatchResult.find(
              (m) => m.startDate === matchDate
            );
            let matchExistData1 = matchExist.MatchResult.find(
              (m) => m.startDate === matchStartDate
            );

            if (match) {
              match.score = parseInt(match.score) + score;
              await findManager.save();
            } else if (
              match1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              match1.score = parseInt(match1.score) + score;
              await findManager.save();
            } else {
              findManager.EachMatchRecord.push({
                score: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              await findManager.save();
            }

            if (matchExistData) {
              const existingScore = parseInt(matchExistData.teamAScore);
              matchExistData.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else if (
              matchExistData1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              const existingScore = parseInt(matchExistData1.teamAScore);
              matchExistData1.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else {
              matchExist.MatchResult.push({
                teamAScore: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              matchLiveUpdate = await matchExist.save();
            }
          } else {
            const alternateManager = await SlmModel.findById(
              matchExist.membersAccepted[0]
            ).populate({
              path: "Flm",
              populate: { path: "Mrs" },
            });

            const checkAlternate = alternateManager.Flm.some((flm) => {
              return flm.Mrs.some((mrPresent) =>
                mrPresent._id.equals(mrIdObject)
              );
            });

            if (checkAlternate) {
              let match = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchDate
              );
              let match1 = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchStartDate
              );
              let matchExistData = matchExist.MatchResult.find(
                (m) => m.startDate === matchDate
              );
              let matchExistData1 = matchExist.MatchResult.find(
                (m) => m.startDate === matchStartDate
              );

              if (match) {
                match.score = parseInt(match.score) + score;
                await alternateManager.save();
              } else if (
                match1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                match1.score = parseInt(match1.score) + score;
                await alternateManager.save();
              } else {
                alternateManager.EachMatchRecord.push({
                  score: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                await alternateManager.save();
              }

              if (matchExistData) {
                const existingScore = parseInt(matchExistData.teamBScore);
                matchExistData.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else if (
                matchExistData1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                const existingScore = parseInt(matchExistData1.teamBScore);
                matchExistData1.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else {
                matchExist.MatchResult.push({
                  teamBScore: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                matchLiveUpdate = await matchExist.save();
              }
            }
          }
        } else if (role === "Tlm") {
          const findManager = await TlmModel.findById(
            matchExist.creatorId
          ).populate({
            path: "Slm",
            populate: { path: "Flm", populate: { path: "Mrs" } },
          });

          const check = findManager.Slm.some((slm) => {
            return slm.Flm.some((flm) => {
              return flm.Mrs.some((mrPresent) =>
                mrPresent._id.equals(mrIdObject)
              );
            });
          });

          if (check) {
            let match = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchDate
            );
            let match1 = findManager.EachMatchRecord.find(
              (m) => m.startDate === matchStartDate
            );
            let matchExistData = matchExist.MatchResult.find(
              (m) => m.startDate === matchDate
            );
            let matchExistData1 = matchExist.MatchResult.find(
              (m) => m.startDate === matchStartDate
            );
            if (match) {
              match.score = parseInt(match.score) + score;
              await findManager.save();
            } else if (
              match1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              match1.score = parseInt(match1.score) + score;
              await findManager.save();
            } else {
              findManager.EachMatchRecord.push({
                score: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              await findManager.save();
            }

            if (matchExistData) {
              const existingScore = parseInt(matchExistData.teamAScore);
              matchExistData.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else if (
              matchExistData1 &&
              MRUploadedData.DateOfUpload >= matchStartDate &&
              MRUploadedData.DateOfUpload <= matchEndDate
            ) {
              const existingScore = parseInt(matchExistData1.teamAScore);
              matchExistData1.teamAScore = !isNaN(existingScore)
                ? existingScore + score
                : score;
              matchLiveUpdate = await matchExist.save();
            } else {
              matchExist.MatchResult.push({
                teamAScore: score.toString(),
                startDate: matchStartDate,
                isTournament: matchExist.isTournament === true ? true : false,
              });
              matchLiveUpdate = await matchExist.save();
            }
          } else {
            const alternateManager = await TlmModel.findById(
              matchExist.membersAccepted[0]
            ).populate({
              path: "Slm",
              populate: { path: "Flm", populate: { path: "Mrs" } },
            });

            const checkAlternate = alternateManager.Slm.some((slm) => {
              return slm.Flm.some((flm) => {
                return flm.Mrs.some((mrPresent) =>
                  mrPresent._id.equals(mrIdObject)
                );
              });
            });

            if (checkAlternate) {
              let match = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchDate
              );
              let match1 = alternateManager.EachMatchRecord.find(
                (m) => m.startDate === matchStartDate
              );
              let matchExistData = matchExist.MatchResult.find(
                (m) => m.startDate === matchDate
              );
              let matchExistData1 = matchExist.MatchResult.find(
                (m) => m.startDate === matchStartDate
              );
              if (match) {
                match.score = parseInt(match.score) + score;
                await alternateManager.save();
              } else if (
                match1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                match1.score = parseInt(match1.score) + score;
                await alternateManager.save();
              } else {
                alternateManager.EachMatchRecord.push({
                  score: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                await alternateManager.save();
              }

              if (matchExistData) {
                const existingScore = parseInt(matchExistData.teamBScore);
                matchExistData.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else if (
                matchExistData1 &&
                MRUploadedData.DateOfUpload >= matchStartDate &&
                MRUploadedData.DateOfUpload <= matchEndDate
              ) {
                const existingScore = parseInt(matchExistData1.teamBScore);
                matchExistData1.teamBScore = !isNaN(existingScore)
                  ? existingScore + score
                  : score;
                matchLiveUpdate = await matchExist.save();
              } else {
                matchExist.MatchResult.push({
                  teamBScore: score.toString(),
                  startDate: matchStartDate,
                  isTournament: matchExist.isTournament === true ? true : false,
                });
                matchLiveUpdate = await matchExist.save();
              }
            }
          }
        }
      }
    }

    let UpdateExistingMatch = matchExist.MatchResult.find(
      (m) => m.startDate === MRUploadedData.DateOfUpload
    );
    let UpdateExistingMatch1 = matchExist.MatchResult.find(
      (m) => m.startDate === MRUploadedData.matchStartDate
    );

    if (UpdateExistingMatch) {
      if (
        parseInt(UpdateExistingMatch.teamAScore) &&
        !parseInt(UpdateExistingMatch.teamBScore)
      ) {
        UpdateExistingMatch.winner = "Team A win";
        UpdateExistingMatch.Result = matchExist.teamA;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch.teamBScore) &&
        !parseInt(UpdateExistingMatch.teamAScore)
      ) {
        UpdateExistingMatch.winner = "Team B win";
        UpdateExistingMatch.Result = matchExist.teamB;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch.teamAScore) >
        parseInt(UpdateExistingMatch.teamBScore)
      ) {
        UpdateExistingMatch.winner = "Team A win";
        UpdateExistingMatch.Result = matchExist.teamA;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch.teamAScore) ===
        parseInt(UpdateExistingMatch.teamBScore)
      ) {
        UpdateExistingMatch.winner = "Draw";
        UpdateExistingMatch.Result = "Draw";
        matchLiveUpdate = await matchExist.save();
      } else {
        UpdateExistingMatch.winner = "Team B win";
        UpdateExistingMatch.Result = matchExist.teamB;
        matchLiveUpdate = await matchExist.save();
      }
    }

    if (UpdateExistingMatch1) {
      if (
        parseInt(UpdateExistingMatch1.teamAScore) &&
        !parseInt(UpdateExistingMatch1.teamBScore)
      ) {
        UpdateExistingMatch1.winner = "Team A win";
        UpdateExistingMatch1.Result = matchExist.teamA;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch1.teamBScore) &&
        !parseInt(UpdateExistingMatch1.teamAScore)
      ) {
        UpdateExistingMatch1.winner = "Team B win";
        UpdateExistingMatch1.Result = matchExist.teamB;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch1.teamAScore) >
        parseInt(UpdateExistingMatch1.teamBScore)
      ) {
        UpdateExistingMatch1.winner = "Team A win";
        UpdateExistingMatch1.Result = matchExist.teamA;
        matchLiveUpdate = await matchExist.save();
      } else if (
        parseInt(UpdateExistingMatch1.teamAScore) ===
        parseInt(UpdateExistingMatch1.teamBScore)
      ) {
        UpdateExistingMatch1.winner = "Draw";
        UpdateExistingMatch1.Result = "Draw";
        matchLiveUpdate = await matchExist.save();
      } else {
        UpdateExistingMatch1.winner = "Team B win";
        UpdateExistingMatch1.Result = matchExist.teamB;
        matchLiveUpdate = await matchExist.save();
      }
    }

    // Push MRUploadedData to MR records and save
    mrExist.MRUploadedData.push(MRUploadedData);

    mrExist.TotalMatches = mrExist.MrScoreEachMatch.length;

    mrExist.TotalFours = mrExist.MrScoreEachMatch.reduce(
      (total, match) => total + parseInt(match.TotalFours || 0),
      0
    );

    mrExist.TotalSixes = mrExist.MrScoreEachMatch.reduce(
      (total, match) => total + parseInt(match.TotalSixes || 0),
      0
    );

    mrExist.TotalScore = mrExist.MrScoreEachMatch.reduce(
      (total, match) => total + parseInt(match.Score || 0),
      0
    );

    const maxScoreInMatches = mrExist.MrScoreEachMatch.reduce(
      (max, match) => Math.max(max, parseInt(match.Score || 0)),
      0
    );

    const maxScoreInTournament = mrExist.MrScoreEachMatch.filter(
      (match) => match.isTournament
    ).reduce((max, match) => Math.max(max, parseInt(match.Score || 0)), 0);

    const maxScoreInODI = mrExist.MrScoreEachMatch.filter(
      (match) => !match.isTournament
    ).reduce((max, match) => Math.max(max, parseInt(match.Score || 0)), 0);

    mrExist.BestScore = Math.max(mrExist.BestScore || 0, maxScoreInMatches);

    matchExist.isTournament === true
      ? (mrExist.TournamentBestScore = Math.max(
          mrExist.TournamentBestScore || 0,
          maxScoreInTournament
        ))
      : (mrExist.OdiBestScore = Math.max(
          mrExist.OdiBestScore || 0,
          maxScoreInODI
        ));

    const sendNotification = new Notification({
      Message: `${formattedTime1}:  ${mrExist.USERNAME} has Scored ${NotifyPoints} Runs - ${mrExist.TEAMNAME}`,
      CompanyName: mrExist.BUSINESSUNIT,
    });
    const notify = await sendNotification.save();

    const user = await mrExist.save();

    if (user && notify) {
      const io = socket.getIo();
      io.emit("Scores_Updated", user);
      io.emit("Match_Score_Updated", matchLiveUpdate);
      io.emit("Notification_Send", notify);

      res.status(200).json({
        message: "Updated Store successfully",
        success: true,
        MRUploadedData: MRUploadedData,
      });
    }
  } catch (error) {
    console.log("UploadPrescription", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      err: error.message,
    });
  }
};*/

const handleUploadPrescriptionData = async (req, res) => {
  try {
    const mrId = req.params.id;

    const mrExist = await mrModel.findById(mrId);
    if (!mrExist) {
      return res
        .status(501)
        .send({ message: "MR Id Not Found..!!", success: false });
    }

    // ✅ CHECK ACTIVE MATCH SCHEDULE
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSchedule = mrExist.matchSchedules.find((schedule) => {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end && schedule.isMatchOn;
    });

    if (!activeSchedule) {
      return res.status(400).json({
        success: false,
        message: "No active match schedule found for today",
      });
    }

    console.log(
      `[ACTIVE SCHEDULE] ${activeSchedule.startDate} to ${activeSchedule.endDate}`,
    );

    const {
      Name,
      Specility,
      MOBNO,
      ScCode,
      NumberOfBrands,
      SelectedBrands,
      BrandName,
      NoRxns,
      RxnDuration,
      DateOfUpload,
    } = req.body;

    const PrescriptionImage = req.file?.filename || "";

    let parsedSelectedBrands = [];
    try {
      parsedSelectedBrands = JSON.parse(SelectedBrands || "[]");
    } catch (e) {
      console.error("Error parsing SelectedBrands:", e);
    }

    if (
      !Name ||
      !Specility ||
      !parsedSelectedBrands.length ||
      !PrescriptionImage
    ) {
      const missingFields = [];
      if (!Name) missingFields.push("Name");
      if (!Specility) missingFields.push("Specility");
      if (!parsedSelectedBrands.length) missingFields.push("SelectedBrands");
      if (!PrescriptionImage) missingFields.push("PrescriptionImage");

      return res.status(400).json({
        success: false,
        message: "Missing required fields: " + missingFields.join(", "),
      });
    }

    const uploadTime1 = new Date();
    const formattedTime1 = `${uploadTime1.getHours().toString().padStart(2, "0")}:${uploadTime1.getMinutes().toString().padStart(2, "0")}`;

    // ✅ POINTS CALCULATION (for storage only)
    const numberOfBrands =
      parseInt(NumberOfBrands) || parsedSelectedBrands.length;

    let brandCountPoints = 0;
    let brandType = "";

    if (numberOfBrands === 1) {
      brandCountPoints = 1;
      brandType = "1B";
    } else if (numberOfBrands === 2) {
      brandCountPoints = 4;
      brandType = "2B";
    } else if (numberOfBrands === 3) {
      brandCountPoints = 6;
      brandType = "3B";
    }

    console.log(
      `[POINTS] Selected ${numberOfBrands} brands (${brandType}) = ${brandCountPoints} points (NOT ADDED YET - PENDING APPROVAL)`,
    );

    // ✅ CALCULATE SCORE (for storage only, not added to totals)
    let score = brandCountPoints * parseInt(NoRxns);

    console.log(
      `[SCORE CALCULATED] ${score} points (NOT ADDED - waiting for approval)`,
    );

    // ✅ CREATE MR UPLOADED DATA (Status: Pending)
    const MRUploadedData = {
      DrName: Name || "",
      Specility: Specility || "",
      MOBNO: MOBNO || "",
      ScCode: ScCode || "",
      NumberOfBrands: numberOfBrands,
      SelectedBrands: parsedSelectedBrands,
      BrandName: parsedSelectedBrands.map((b) => b.brandName).join(", "),
      NoRxns: NoRxns,
      RxnDuration: RxnDuration,
      PrescriptionImage: PrescriptionImage,
      DateOfUpload: DateOfUpload,
      matchStartDate: activeSchedule.startDate.toISOString(),
      matchEndDate: activeSchedule.endDate.toISOString(),
      TimeOfUpload: formattedTime1,
      isTournament: false,
      Status: "Pending", // ✅ Pending until approved
      Points: brandCountPoints.toString(),
      DateOfCreation: new Date()
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
    };

    // ✅ DO NOT UPDATE MR SCORES HERE - ONLY ON APPROVAL
    console.log("⏸️  Scores NOT updated - waiting for approval");

    // ✅ DO NOT CREATE/UPDATE MATCH DATA HERE - ONLY ON APPROVAL
    console.log("⏸️  MatchData NOT updated - waiting for approval");

    // ✅ DO NOT SEND NOTIFICATIONS HERE - ONLY ON APPROVAL
    console.log("⏸️  Notifications NOT sent - waiting for approval");

    // ✅ UPDATE MR'S UPLOADED DATA
    mrExist.MRUploadedData.push(MRUploadedData);

    // ✅ SAVE MR DATA
    const user = await mrExist.save();

    if (user) {
      const io = socket.getIo();
      console.log("Broadcasting upload notification (no score update)");
      io.emit("Prescription_Uploaded", user);
       
      invalidateResponseCache(mrExist.MRID);
      onNewMrUpload(mrExist._id);
await invalidateAdminCacheOnly();        // ✅ ADD
      res.status(200).json({
        message: "Prescription uploaded successfully (Pending Approval)",
        success: true,
        MRUploadedData: MRUploadedData,
        potentialScore: score, // Show what score will be added when approved
        brandType: brandType,
        status: "Pending",
      });
    }
  } catch (error) {
    console.log("UploadPrescription Error:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      err: error.message,
    });
  }
};

const fetchedBrandName = async (req, res) => {
  try {
    // ✅ Fetch all brands (existing functionality)
    const BrandName = await BrandScehma.find({});

    // ✅ Add brand count options (replaces /api/getBrandCountOptions)
    const brandCountOptions = [
      { label: "1 Brand", value: 1, points: 1, isActive: true },
      { label: "2 Brands", value: 2, points: 2, isActive: true },
      { label: "3 Brands", value: 3, points: 3, isActive: true },
      // Add more as needed: { label: '4 Brands', value: 4, points: 10, isActive: true },
    ];

    // ✅ Return both in single response
    return res.status(200).json({
      success: true,
      brands: BrandName,
      brandCountOptions: brandCountOptions,
    });
  } catch (error) {
    console.error(error);
    const err = error.message;
    res.status(500).json({
      success: false,
      error: "Internal server error",
      err,
    });
  }
};

const fetchMatchData = async (req, res) => {
  const { mrId } = req.params; // Get mrId from request params

  try {
    const models = [mrModel, flmModel, SlmModel, TlmModel];
    let userExists = null;

    for (const model of models) {
      userExists = await model.findById(mrId);
      if (userExists) break; // Exit loop if user is found
    }

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const matchData = await MatchDetails.find({}); // Add filters if necessary
    return res.status(200).json(matchData);
  } catch (error) {
    console.error("Error fetching match data:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



// ═══════════════════════════════════════════════════════════════════════════════
//  CASCADING CACHE INVALIDATION
//  Invalidates cache for MR and all their managers (FLM → SLM → TLM)
// ═══════════════════════════════════════════════════════════════════════════════
async function invalidateMrAndManagers(mrObjectId) {
  try {
    console.log(`🗑️  Starting cascading invalidation for MR: ${mrObjectId}`);
    
    // 1. Invalidate MR's cache
    invalidateResponseCache(mrObjectId.toString());
    
    // 2. Find FLM who manages this MR
    const flm = await flmModel.findOne({ Mrs: mrObjectId });
    
    if (flm) {
      console.log(`🗑️  Found FLM: ${flm.FLMEmpID}, invalidating...`);
      invalidateResponseCache(flm._id.toString());
      
      // 3. Find SLM who manages this FLM
      const slm = await SlmModel.findOne({ Flm: flm._id });
      
      if (slm) {
        console.log(`🗑️  Found SLM: ${slm.SLMEmpID}, invalidating...`);
        invalidateResponseCache(slm._id.toString());
        
        // 4. Find TLM who manages this SLM
        const tlm = await TlmModel.findOne({ Slm: slm._id });
        
        if (tlm) {
          console.log(`🗑️  Found TLM: ${tlm.TLMEmpID}, invalidating...`);
          invalidateResponseCache(tlm._id.toString());
        }
      }
    }
    
    console.log(`✅ Cascading invalidation complete for MR: ${mrObjectId}`);
  } catch (error) {
    console.error('❌ Error in cascading invalidation:', error.message);
    // Don't throw - cache invalidation failure shouldn't break the approval/rejection
  }
}



const handleRejection = async (req, res) => {
  const { id, mrId } = req.params;
  const { reason, modalTitle } = req.body;

  console.log("\n========== APPROVAL/REJECTION HANDLER ==========");
  console.log("📥 Received params:", { id, mrId, reason, modalTitle });

  try {
    if (modalTitle === "Rejected" && !reason) {
      return res.status(404).json({ success: false, message: "Reason is required for rejection" });
    }

    const currentDate = new Date();
    const day   = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year  = currentDate.getFullYear();

    // ── FIX 1: Fetch MR with .lean() for faster read ─────────────────────────
    // .lean() = plain JS object, no Mongoose overhead
    let mrExist = await mrModel.findById(mrId).lean();

    if (!mrExist) {
      return res.status(404).json({ success: false, message: "MR not found" });
    }

    console.log("✅ MR found:", mrExist.USERNAME);

    const upData = mrExist.MRUploadedData.find((data) => data._id.toString() === id);

    if (!upData) {
      return res.status(404).json({ success: false, message: "Upload data not found" });
    }

    console.log("✅ Upload data found:", {
      DrName: upData.DrName,
      Points: upData.Points,
      NoRxns: upData.NoRxns,
      NumberOfBrands: upData.NumberOfBrands,
      Status: upData.Status,
    });

    // Check if already processed
    if (upData.Status === "Approved") {
      return res.status(400).json({ success: false, message: "This prescription has already been approved" });
    }
    if (upData.Status === "Rejected") {
      return res.status(400).json({ success: false, message: "This prescription has already been rejected" });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REJECTION LOGIC — FAST PATH (no DB writes except status update)
    // ══════════════════════════════════════════════════════════════════════════
    if (modalTitle === "Rejected") {
      console.log("\n🔴 Processing REJECTION - No score changes");

      upData.Reason = reason;
      upData.Status = "Rejected";
      upData.ModifiedDate = `${day}-${month}-${year}`;

      // ── Re-fetch as Mongoose doc to save (can't save .lean() objects) ───────
      const mrDoc = await mrModel.findById(mrId);
      const uploadToUpdate = mrDoc.MRUploadedData.find((u) => u._id.toString() === id);
      uploadToUpdate.Reason = reason;
      uploadToUpdate.Status = "Rejected";
      uploadToUpdate.ModifiedDate = `${day}-${month}-${year}`;

      mrDoc.markModified("MRUploadedData");
      await mrDoc.save();

      console.log("✅ Status updated to Rejected");

      // ── Invalidate caches + emit event ────────────────────────────────────
      invalidateResponseCache(mrExist.MRID);
      invalidateResponseCache(mrId);
      await invalidateBossCaches(mrId);
      onUploadStatusChange(mrId, id, 'Rejected');

      const io = socket.getIo();
      io.emit("Prescription_Rejected", mrDoc);

      return res.status(200).json({ message: "Rejected Successfully", success: true });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPROVAL LOGIC — OPTIMIZED (parallel DB writes + notifications)
    // ══════════════════════════════════════════════════════════════════════════
    if (modalTitle === "Approved") {
      console.log("\n🟢 Processing APPROVAL - ADDING SCORES");

      const pointsToAdd = parseInt(upData.Points) * parseInt(upData.NoRxns);
      const brandType   = upData.NumberOfBrands === 1 ? "1B" : upData.NumberOfBrands === 2 ? "2B" : "3B";

      let foursCount = 0, sixesCount = 0;
      if (upData.Points === "2") foursCount = parseInt(upData.NoRxns);
      if (upData.Points === "3") sixesCount = parseInt(upData.NoRxns);

      console.log(`📊 Adding: ${pointsToAdd} total points (${brandType})`);

      // ── Parse match dates ──────────────────────────────────────────────────
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;
        if (typeof dateStr === "string" && dateStr.includes("T")) return new Date(dateStr);
        const [day, month, year] = dateStr.split("-");
        return new Date(year, month - 1, day);
      };

      let matchStartDate = parseDate(upData.matchStartDate);
      let matchEndDate   = parseDate(upData.matchEndDate);

      if (!matchStartDate || !matchEndDate) {
        const uploadDate = parseDate(upData.DateOfCreation || upData.DateOfUpload);
        if (uploadDate) {
          uploadDate.setHours(0, 0, 0, 0);
          const schedule = mrExist.matchSchedules.find((sch) => {
            const start = new Date(sch.startDate);
            const end   = new Date(sch.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return uploadDate >= start && uploadDate <= end;
          });
          if (schedule) {
            matchStartDate = new Date(schedule.startDate);
            matchEndDate   = new Date(schedule.endDate);
          }
        }
      }

      console.log("📅 Match dates:", { start: matchStartDate?.toISOString(), end: matchEndDate?.toISOString() });

      // ── Re-fetch MR as Mongoose doc to update scores ──────────────────────
      const mrDoc = await mrModel.findById(mrId);

      const matchKey = matchStartDate?.toISOString().split("T")[0];
      let mrMatch = mrDoc.MrScoreEachMatch.find(
        (m) => m.matchStartDate === matchKey || parseDate(m.matchStartDate)?.toISOString().split("T")[0] === matchKey
      );

      if (mrMatch) {
        mrMatch.Score      = (parseInt(mrMatch.Score      || 0) + pointsToAdd).toString();
        mrMatch.TotalFours = (parseInt(mrMatch.TotalFours || 0) + foursCount).toString();
        mrMatch.TotalSixes = (parseInt(mrMatch.TotalSixes || 0) + sixesCount).toString();
        console.log(`✅ Updated existing match entry`);
      } else if (matchStartDate && matchEndDate) {
        mrDoc.MrScoreEachMatch.push({
          Score:          pointsToAdd.toString(),
          TotalFours:     foursCount.toString(),
          TotalSixes:     sixesCount.toString(),
          MatchDate:      matchKey,
          matchStartDate: matchStartDate,
          matchEndDate:   matchEndDate,
          OpponentName:   "",
          TimeOfUpload:   upData.TimeOfUpload,
          DateOfCreation: new Date().toISOString().slice(0, 10),
          isTournament:   false,
        });
        console.log(`✅ Created new match entry`);
      }

      // Update MR totals
      mrDoc.TotalFours   = parseInt(mrDoc.TotalFours   || 0) + foursCount;
      mrDoc.TotalSixes   = parseInt(mrDoc.TotalSixes   || 0) + sixesCount;
      mrDoc.TotalScore   = parseInt(mrDoc.TotalScore   || 0) + pointsToAdd;
      mrDoc.TotalMatches = mrDoc.MrScoreEachMatch.length;

      const maxScoreInMatches = mrDoc.MrScoreEachMatch.reduce((max, m) => Math.max(max, parseInt(m.Score || 0)), 0);
      mrDoc.BestScore    = Math.max(mrDoc.BestScore    || 0, maxScoreInMatches);
      mrDoc.OdiBestScore = Math.max(mrDoc.OdiBestScore || 0, maxScoreInMatches);

      // Update upload status
      const uploadToUpdate = mrDoc.MRUploadedData.find((u) => u._id.toString() === id);
      uploadToUpdate.Reason       = reason || "";
      uploadToUpdate.Status       = "Approved";
      uploadToUpdate.ModifiedDate = `${day}-${month}-${year}`;

      mrDoc.markModified("MrScoreEachMatch");
      mrDoc.markModified("MRUploadedData");
      mrDoc.markModified("TotalScore");
      mrDoc.markModified("TotalFours");
      mrDoc.markModified("TotalSixes");

      // ── FIX 2: Run MR save + MatchData update + Notifications in PARALLEL ──
      // BEFORE: mrDoc.save() → wait → MatchData.save() → wait → notifications
      // AFTER:  all three fire at once, resolve together
      const [, matchData] = await Promise.all([
        mrDoc.save(),

        // MatchData find-or-create + update
        (async () => {
          if (!matchStartDate || !matchEndDate) return null;

          let match = await MatchesSchema.findOne({
            startDate: matchStartDate.toISOString(),
            endDate:   matchEndDate.toISOString(),
          });

          if (!match) {
            match = new MatchesSchema({
              startDate:   matchStartDate.toISOString(),
              endDate:     matchEndDate.toISOString(),
              creatorId:   upData.createdBy || mrId,
              isTournament: false,
              Submissions:  [],
              Statistics: {
                oneBrand:         { count: 0, totalScore: 0 },
                twoBrand:         { count: 0, totalScore: 0 },
                threeBrand:       { count: 0, totalScore: 0 },
                totalSubmissions: 0,
                totalScore:       0,
              },
            });
          }

          match.Submissions.push({
            mrId:              mrDoc._id,
            mrName:            mrDoc.USERNAME,
            teamName:          mrDoc.TEAMNAME,
            brandType:         brandType,
            brands:            upData.SelectedBrands,
            score:             pointsToAdd,
            prescriptionImage: upData.PrescriptionImage,
            doctorName:        upData.DrName,
            speciality:        upData.Specility,
            phoneNumber:       upData.MOBNO,
            scCode:            upData.ScCode,
            uploadTime:        upData.TimeOfUpload,
            uploadDate:        upData.DateOfUpload,
            approvedDate:      new Date(),
            createdAt:         new Date(),
          });

          match.Statistics.totalSubmissions += 1;
          match.Statistics.totalScore       += pointsToAdd;

          if      (brandType === "1B") { match.Statistics.oneBrand.count   += 1; match.Statistics.oneBrand.totalScore   += pointsToAdd; }
          else if (brandType === "2B") { match.Statistics.twoBrand.count   += 1; match.Statistics.twoBrand.totalScore   += pointsToAdd; }
          else if (brandType === "3B") { match.Statistics.threeBrand.count += 1; match.Statistics.threeBrand.totalScore += pointsToAdd; }

          await match.save();
          return match;
        })(),

        // ── FIX 3: Notifications fire in parallel, don't block response ──────
        (async () => {
          try {
            let title = "", message = "";

            if (upData.NumberOfBrands === 2) {
              title   = getRandomString(fourRunsArray);
              message = `${mrExist.TEAMNAME}`;
              sendMessage(title, message, mrExist.BUSINESSUNIT);
            } else if (upData.NumberOfBrands === 3) {
              title   = getRandomString(sixRunsArray);
              message = `${mrExist.TEAMNAME}`;
              sendMessage(title, message, mrExist.BUSINESSUNIT);
            }

            const sendNotification = new Notification({
              Message:     `${upData.TimeOfUpload}: ${mrExist.USERNAME} has generated ${upData.NumberOfBrands} Brand(s) Rx - ${mrExist.TEAMNAME}`,
              CompanyName: mrExist.BUSINESSUNIT,
            });

            const notify = await sendNotification.save();
            const io = socket.getIo();
            io.emit("Notification_Send", notify);
          } catch (notifError) {
            console.error("⚠️ Notification error (non-critical):", notifError.message);
          }
        })(),
      ]);

      console.log("\n✅ MR data + MatchData saved in parallel");

      // ── Invalidate caches + emit events ───────────────────────────────────
      invalidateResponseCache(mrExist.MRID);
      invalidateResponseCache(mrId);
      await invalidateBossCaches(mrId);
      onUploadStatusChange(mrId, id, 'Approved');
      const io = socket.getIo();
      io.emit("Scores_Updated", mrDoc);
      if (matchData) io.emit("Match_Data_Updated", matchData);

      return res.status(200).json({ message: "Approved Successfully - Scores Added", success: true, pointsAdded: pointsToAdd });
    }

  } catch (error) {
    console.error("\n❌ Error in handleRejection:", error);
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
};


// ══════════════════════════════════════════════════════════════════════════════
//  HELPER — Invalidate boss caches
// ══════════════════════════════════════════════════════════════════════════════
async function invalidateBossCaches(mrId) {
  try {
    const flm = await flmModel.findOne({ Mrs: mrId }).select('_id').lean();
    if (flm) {
      invalidateResponseCache(flm._id.toString());
      console.log(`🗑️ Invalidated FLM cache: ${flm._id}`);

      const slm = await SlmModel.findOne({ Flm: flm._id }).select('_id').lean();
      if (slm) {
        invalidateResponseCache(slm._id.toString());
        console.log(`🗑️ Invalidated SLM cache: ${slm._id}`);

        const tlm = await TlmModel.findOne({ Slm: slm._id }).select('_id').lean();
        if (tlm) {
          invalidateResponseCache(tlm._id.toString());
          console.log(`🗑️ Invalidated TLM cache: ${tlm._id}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error invalidating boss caches:', error.message);
  }
}



/*
const handleRejection = async (req, res) => {
  const { id, mrId } = req.params;
  const { reason, modalTitle } = req.body;

  console.log("\n========== APPROVAL/REJECTION HANDLER ==========");
  console.log("📥 Received params:");
  console.log("  - id (uploadId):", id);
  console.log("  - mrId:", mrId);
  console.log("  - reason:", reason);
  console.log("  - modalTitle:", modalTitle);

  try {
    if (modalTitle === "Rejected" && !reason) {
      console.log("❌ Missing reason for rejection");
      return res.status(404).json({
        success: false,
        message: "Reason is required for rejection",
      });
    }

    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();

    // ✅ Fetch MR data
    let mrExist = await mrModel.findById(mrId);

    if (!mrExist) {
      console.log("❌ MR not found for mrId:", mrId);
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    console.log("✅ MR found:", mrExist.USERNAME);

    // ✅ Find the upload record
    const upData = mrExist.MRUploadedData.find(
      (data) => data._id.toString() === id,
    );

    if (!upData) {
      console.log("❌ Upload data not found for id:", id);
      return res.status(404).json({
        success: false,
        message: "Upload data not found",
      });
    }

    console.log("✅ Upload data found:");
    console.log("  - DrName:", upData.DrName);
    console.log("  - Points:", upData.Points);
    console.log("  - NoRxns:", upData.NoRxns);
    console.log("  - NumberOfBrands:", upData.NumberOfBrands);
    console.log("  - Current Status:", upData.Status);
    console.log("  - DateOfUpload:", upData.DateOfUpload);
    console.log("  - matchStartDate:", upData.matchStartDate);
    console.log("  - matchEndDate:", upData.matchEndDate);

    // ✅ Check if already processed
    if (upData.Status === "Approved") {
      console.log("⚠️ This prescription is already approved!");
      return res.status(400).json({
        success: false,
        message: "This prescription has already been approved",
      });
    }

    if (upData.Status === "Rejected") {
      console.log("⚠️ This prescription is already rejected!");
      return res.status(400).json({
        success: false,
        message: "This prescription has already been rejected",
      });
    }

    // ✅ Helper function to parse dates
    function parseDate(dateStr) {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return new Date(dateStr);
      }
      const [day, month, year] = dateStr.split("-");
      return new Date(year, month - 1, day);
    }

    // ============================================
    // APPROVAL LOGIC - ADD SCORES + NOTIFICATIONS
    // ============================================
    if (modalTitle === "Approved") {
      console.log("\n🟢 Processing APPROVAL - ADDING SCORES");

      // ✅ Calculate points to add
      const pointsToAdd = parseInt(upData.Points) * parseInt(upData.NoRxns);
      const brandType =
        upData.NumberOfBrands === 1
          ? "1B"
          : upData.NumberOfBrands === 2
            ? "2B"
            : "3B";

      let foursCount = 0;
      let sixesCount = 0;

      if (upData.Points === "2") {
        foursCount = parseInt(upData.NoRxns);
      } else if (upData.Points === "3") {
        sixesCount = parseInt(upData.NoRxns);
      }

      console.log(
        `📊 Adding: ${upData.Points} points × ${upData.NoRxns} rxns = ${pointsToAdd} total points`,
      );
      console.log(`🏷️ Brand Type: ${brandType}`);
      console.log(`   Fours: ${foursCount}, Sixes: ${sixesCount}`);

      // ✅ FIND MATCH DATES
      let matchStartDate = parseDate(upData.matchStartDate);
      let matchEndDate = parseDate(upData.matchEndDate);

      if (!matchStartDate || !matchEndDate) {
        console.log(
          "⚠️ Match dates not in upload data, searching matchSchedules...",
        );
        const uploadDate = parseDate(
          upData.DateOfCreation || upData.DateOfUpload,
        );

        if (uploadDate) {
          uploadDate.setHours(0, 0, 0, 0);
          const schedule = mrExist.matchSchedules.find((sch) => {
            const start = new Date(sch.startDate);
            const end = new Date(sch.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return uploadDate >= start && uploadDate <= end;
          });

          if (schedule) {
            matchStartDate = new Date(schedule.startDate);
            matchEndDate = new Date(schedule.endDate);
            console.log("✅ Found schedule from matchSchedules");
          }
        }
      }

      console.log("📅 Match dates:");
      console.log("  - Start:", matchStartDate?.toISOString());
      console.log("  - End:", matchEndDate?.toISOString());

      // ✅ UPDATE MR'S INDIVIDUAL SCORE
      const matchKey = matchStartDate?.toISOString().split("T")[0];
      let mrMatch = mrExist.MrScoreEachMatch.find(
        (m) =>
          m.matchStartDate === matchKey ||
          parseDate(m.matchStartDate)?.toISOString().split("T")[0] === matchKey,
      );

      console.log("\n📊 Updating MrScoreEachMatch:");
      console.log("  Looking for matchKey:", matchKey);
      console.log("  Found existing entry:", !!mrMatch);

      if (mrMatch) {
        const oldScore = mrMatch.Score;
        const oldFours = mrMatch.TotalFours;
        const oldSixes = mrMatch.TotalSixes;

        mrMatch.Score = (parseInt(mrMatch.Score || 0) + pointsToAdd).toString();
        mrMatch.TotalFours = (
          parseInt(mrMatch.TotalFours || 0) + foursCount
        ).toString();
        mrMatch.TotalSixes = (
          parseInt(mrMatch.TotalSixes || 0) + sixesCount
        ).toString();

        console.log(`  ✅ Updated existing entry:`);
        console.log(`     Score: ${oldScore} → ${mrMatch.Score}`);
        console.log(`     Fours: ${oldFours} → ${mrMatch.TotalFours}`);
        console.log(`     Sixes: ${oldSixes} → ${mrMatch.TotalSixes}`);
      } else if (matchStartDate && matchEndDate) {
        mrExist.MrScoreEachMatch.push({
          Score: pointsToAdd.toString(),
          TotalFours: foursCount.toString(),
          TotalSixes: sixesCount.toString(),
          MatchDate: matchKey,
          matchStartDate: matchStartDate,
          matchEndDate: matchEndDate,
          OpponentName: "",
          TimeOfUpload: upData.TimeOfUpload,
          DateOfCreation: new Date().toISOString().slice(0, 10),
          isTournament: false,
        });
        console.log(`  ✅ Created new entry with ${pointsToAdd} points`);
      }

      // ✅ UPDATE MR'S TOTAL STATS
      const oldTotalScore = mrExist.TotalScore;
      const oldTotalFours = mrExist.TotalFours;
      const oldTotalSixes = mrExist.TotalSixes;

      mrExist.TotalFours = parseInt(mrExist.TotalFours || 0) + foursCount;
      mrExist.TotalSixes = parseInt(mrExist.TotalSixes || 0) + sixesCount;
      mrExist.TotalScore = parseInt(mrExist.TotalScore || 0) + pointsToAdd;
      mrExist.TotalMatches = mrExist.MrScoreEachMatch.length;

      console.log("\n📊 Updated MR Totals:");
      console.log(`  TotalScore: ${oldTotalScore} → ${mrExist.TotalScore}`);
      console.log(`  TotalFours: ${oldTotalFours} → ${mrExist.TotalFours}`);
      console.log(`  TotalSixes: ${oldTotalSixes} → ${mrExist.TotalSixes}`);

      // ✅ UPDATE BEST SCORES
      const maxScoreInMatches = mrExist.MrScoreEachMatch.reduce(
        (max, match) => Math.max(max, parseInt(match.Score || 0)),
        0,
      );

      mrExist.BestScore = Math.max(mrExist.BestScore || 0, maxScoreInMatches);
      mrExist.OdiBestScore = Math.max(
        mrExist.OdiBestScore || 0,
        maxScoreInMatches,
      );

      // ✅ FIND OR CREATE MATCH DATA
      if (matchStartDate && matchEndDate) {
        let matchData = await MatchesSchema.findOne({
          startDate: matchStartDate.toISOString(),
          endDate: matchEndDate.toISOString(),
        });

        if (!matchData) {
          matchData = new MatchesSchema({
            startDate: matchStartDate.toISOString(),
            endDate: matchEndDate.toISOString(),
            creatorId: upData.createdBy || mrId,
            isTournament: false,
            Submissions: [],
            Statistics: {
              oneBrand: { count: 0, totalScore: 0 },
              twoBrand: { count: 0, totalScore: 0 },
              threeBrand: { count: 0, totalScore: 0 },
              totalSubmissions: 0,
              totalScore: 0,
            },
          });
          console.log("\n✅ Created new MatchData document");
        } else {
          console.log("\n✅ Found existing MatchData document");
        }

        // ✅ ADD SUBMISSION
        matchData.Submissions.push({
          mrId: mrExist._id,
          mrName: mrExist.USERNAME,
          teamName: mrExist.TEAMNAME,
          brandType: brandType,
          brands: upData.SelectedBrands,
          score: pointsToAdd,
          prescriptionImage: upData.PrescriptionImage,
          doctorName: upData.DrName,
          speciality: upData.Specility,
          phoneNumber: upData.MOBNO,
          scCode: upData.ScCode,
          uploadTime: upData.TimeOfUpload,
          uploadDate: upData.DateOfUpload,
          approvedDate: new Date(),
          createdAt: new Date(),
        });

        // ✅ UPDATE STATISTICS
        const oldStats = { ...matchData.Statistics };
        matchData.Statistics.totalSubmissions += 1;
        matchData.Statistics.totalScore += pointsToAdd;

        if (brandType === "1B") {
          matchData.Statistics.oneBrand.count += 1;
          matchData.Statistics.oneBrand.totalScore += pointsToAdd;
        } else if (brandType === "2B") {
          matchData.Statistics.twoBrand.count += 1;
          matchData.Statistics.twoBrand.totalScore += pointsToAdd;
        } else if (brandType === "3B") {
          matchData.Statistics.threeBrand.count += 1;
          matchData.Statistics.threeBrand.totalScore += pointsToAdd;
        }

        console.log("\n📊 Updated MatchData Statistics:");
        console.log(
          `  Total Submissions: ${oldStats.totalSubmissions} → ${matchData.Statistics.totalSubmissions}`,
        );
        console.log(
          `  Total Score: ${oldStats.totalScore} → ${matchData.Statistics.totalScore}`,
        );
        console.log(
          `  ${brandType} Count: ${oldStats[brandType === "1B" ? "oneBrand" : brandType === "2B" ? "twoBrand" : "threeBrand"].count} → ${matchData.Statistics[brandType === "1B" ? "oneBrand" : brandType === "2B" ? "twoBrand" : "threeBrand"].count}`,
        );

        await matchData.save();
        console.log("✅ MatchData saved");

        const io = socket.getIo();
        io.emit("Match_Data_Updated", matchData);
      }

      // ✅ UPDATE STATUS BEFORE SENDING NOTIFICATIONS
      upData.Reason = reason || "";
      upData.Status = "Approved";
      upData.ModifiedDate = `${day}-${month}-${year}`;

      // ✅ Mark modified
      mrExist.markModified("MrScoreEachMatch");
      mrExist.markModified("MRUploadedData");
      mrExist.markModified("TotalScore");
      mrExist.markModified("TotalFours");
      mrExist.markModified("TotalSixes");

      await mrExist.save();
      console.log("\n✅ MR data saved with updated scores");
     
      //invalidateResponseCache(mrExist.MRID);
      //invalidateResponseCache(mrId);
      await invalidateMrAndManagers(mrExist._id);
      console.log("idDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD*********************", mrExist.MRID, mrId)
await invalidateAdminCacheOnly();        // ✅ ADD
     console.log("\n📧 Sending notifications...");

try {
  let title = "";
  let message = "";

  if (upData.NumberOfBrands === 2) {
    title = getRandomString(fourRunsArray);
    message = `${mrExist.TEAMNAME}`;
    sendMessage(title, message, mrExist.BUSINESSUNIT);
    console.log("  ✅ Sent FOURS push notification");
  } else if (upData.NumberOfBrands === 3) {
    title = getRandomString(sixRunsArray);
    message = `${mrExist.TEAMNAME}`;
    sendMessage(title, message, mrExist.BUSINESSUNIT);
    console.log("  ✅ Sent SIXES push notification");
  }

  // ✅ SAVE DATABASE NOTIFICATION
  const sendNotification = new Notification({
    Message: `${upData.TimeOfUpload}: ${mrExist.USERNAME} has generated ${upData.NumberOfBrands} Brand(s) Rx - ${mrExist.TEAMNAME}`,
    CompanyName: mrExist.BUSINESSUNIT,
  });

  const notify = await sendNotification.save();
  console.log("  ✅ Saved database notification");

  const io = socket.getIo();
  io.emit("Notification_Send", notify);
  io.emit("Scores_Updated", mrExist);
      } catch (dbNotifError) {
        console.error(
          "  ❌ Database notification error:",
          dbNotifError.message,
        );
        // Don't fail the approval if notification fails
      }

      return res.status(200).json({
        message: "Approved Successfully - Scores Added",
        success: true,
        pointsAdded: pointsToAdd,
      });
    }

    // ============================================
    // REJECTION LOGIC - NO SCORE CHANGES
    // ============================================
    else if (modalTitle === "Rejected") {
      console.log("\n🔴 Processing REJECTION - No score changes (was pending)");

      // ✅ Just update status - NO score deduction needed since scores were never added
      upData.Reason = reason;
      upData.Status = "Rejected";
      upData.ModifiedDate = `${day}-${month}-${year}`;

      mrExist.markModified("MRUploadedData");
      await mrExist.save();
      console.log("✅ Status updated to Rejected");
      
      //invalidateResponseCache(mrExist.MRID);
      //invalidateResponseCache(mrId);
      await invalidateMrAndManagers(mrExist._id);
await invalidateAdminCacheOnly();        // ✅ ADD
      const io = socket.getIo();
      io.emit("Prescription_Rejected", mrExist);

      return res.status(200).json({
        message: "Rejected Successfully - No scores were added",
        success: true,
      });
    }
  } catch (error) {
    console.error("\n❌ Error in handleRejection:", error);
    res.status(500).json({
      msg: "Server Error",
      error: error.message,
    });
  }
};

*/

const getPresignedUrl = async (req, res) => {
  const { fileName, fileType } = req.body;

  try {
    const params = {
      Bucket: config.awsBucketName,
      Key: fileName, // Use the file's name as the S3 key
      ContentType: fileType,
    };

    // Generate the pre-signed URL for PUT requests
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand(params),
      { expiresIn: 3600 },
    ); // 1 hour expiration

    res.status(200).json({ uploadUrl, key: fileName });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).send("Failed to generate presigned URL.");
  }
};

/*
const getMrRank = async (req, res) => {
  try {
    const CompanyName = req.params.companyName;

    console.log("\n========== GET MR RANK ==========");
    console.log("📥 Company Name:", CompanyName);

    // Fetch all MRs with USERNAME, TEAMNAME, and TotalScore
    const allMrs = await mrModel
      .find(
        { BUSINESSUNIT: CompanyName },
        {
          USERNAME: 1,
          TEAMNAME: 1,
          TotalScore: 1,
          TotalMatches: 1,
          ZONE: 1,
          HQ: 1,
          profileImage: 1,
          MRUploadedData: 1, // ✅ Include MRUploadedData
        },
      )
      .sort({ TotalScore: -1 });

    console.log(`✅ Found ${allMrs.length} MRs`);

    // Convert TotalScore to a number for correct sorting
    allMrs.forEach((mr) => {
      mr.TotalScore = parseFloat(mr.TotalScore);
    });

    // Sort again after conversion
    allMrs.sort((a, b) => b.TotalScore - a.TotalScore);

    // ✅ Calculate brand counts for each MR (APPROVED ONLY)
    const mrsWithBrandCounts = allMrs.map((mr, index) => {
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      // Check if MRUploadedData exists and is an array
      if (mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        console.log(`\n  MR[${index}] ${mr.USERNAME}: ${mr.MRUploadedData.length} total uploads`);

        mr.MRUploadedData.forEach((upload) => {
          const numberOfBrands = upload.NumberOfBrands;
          const status = upload.Status;

          // ✅ ONLY COUNT APPROVED PRESCRIPTIONS
          if (status === "Approved") {
            approvedCount++;

            // Increment the corresponding brand count
            if (numberOfBrands === 1) {
              brandCounts.brand1++;
            } else if (numberOfBrands === 2) {
              brandCounts.brand2++;
            } else if (numberOfBrands === 3) {
              brandCounts.brand3++;
            }
          } else if (status === "Pending") {
            pendingCount++;
          } else if (status === "Rejected") {
            rejectedCount++;
          }
        });

        console.log(`    ✅ Approved: ${approvedCount} (1B: ${brandCounts.brand1}, 2B: ${brandCounts.brand2}, 3B: ${brandCounts.brand3})`);
        console.log(`    ⏸️  Pending: ${pendingCount}`);
        console.log(`    ❌ Rejected: ${rejectedCount}`);
      }

      // ✅ Calculate Total Rx Brand (same as in GetCaptainDetails)
      const totalRxBrand = 
        (1 * brandCounts.brand1) + 
        (2 * brandCounts.brand2) + 
        (3 * brandCounts.brand3);

      // Return MR data with brand counts (without MRUploadedData in response)
      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: mr.TotalScore,
        TotalMatches: mr.TotalMatches,
        ZONE: mr.ZONE,
        HQ: mr.HQ,
        profileImage: mr.profileImage,
        brandCounts: brandCounts, // ✅ Only approved prescriptions
        totalRxBrand: totalRxBrand, // ✅ Total rx brand count
        approvedCount: approvedCount, // ✅ Total approved prescriptions
        pendingCount: pendingCount, // ✅ Total pending prescriptions
        rejectedCount: rejectedCount, // ✅ Total rejected prescriptions
      };
    });

    console.log("\n=== MR RANK SUMMARY ===");
    console.log(`Total MRs: ${mrsWithBrandCounts.length}`);
    console.log("Top 3 MRs:");
    mrsWithBrandCounts.slice(0, 3).forEach((mr, idx) => {
      console.log(`  ${idx + 1}. ${mr.USERNAME} - ${mr.TotalScore} points (${mr.approvedCount} approved)`);
    });

    // Send the response
    return res.status(200).json({
      success: true,
      data: mrsWithBrandCounts,
    });
  } catch (error) {
    console.error("❌ Error in getMrRank:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

const getMrRank = async (req, res) => {
  try {
const settings = await getLeaderboardSettings();
console.log("settings",settings)
    const CompanyName = req.params.companyName;

    console.log("\n========== GET MR RANK ==========");
    console.log("📥 Company Name:", CompanyName);

    // Fetch all MRs with USERNAME, TEAMNAME, and TotalScore
    const allMrs = await mrModel
      .find(
        { BUSINESSUNIT: CompanyName },
        {
          USERNAME: 1,
          TEAMNAME: 1,
          TotalScore: 1,
          TotalMatches: 1,
          ZONE: 1,
          HQ: 1,
          profileImage: 1,
          MRUploadedData: 1, // ✅ Include MRUploadedData
        },
      )
      //.sort({ TotalScore: -1 });

    console.log(`✅ Found ${allMrs.length} MRs`);

    // Convert TotalScore to a number for correct sorting
    allMrs.forEach((mr) => {
      mr.TotalScore = parseFloat(mr.TotalScore);
    });

    // Sort again after conversion
    //allMrs.sort((a, b) => b.TotalScore - a.TotalScore);

    // ✅ Calculate brand counts for each MR (APPROVED ONLY)
    const mrsWithBrandCounts = allMrs.map((mr, index) => {
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      // Check if MRUploadedData exists and is an array
      if (mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        console.log(`\n  MR[${index}] ${mr.USERNAME}: ${mr.MRUploadedData.length} total uploads`);

        mr.MRUploadedData.forEach((upload) => {
          const numberOfBrands = upload.NumberOfBrands;
          const status = upload.Status;

          // ✅ ONLY COUNT APPROVED PRESCRIPTIONS
          if (status === "Approved") {
            approvedCount++;

            // Increment the corresponding brand count
            if (numberOfBrands === 1) {
              brandCounts.brand1++;
            } else if (numberOfBrands === 2) {
              brandCounts.brand2++;
            } else if (numberOfBrands === 3) {
              brandCounts.brand3++;
            }
          } else if (status === "Pending") {
            pendingCount++;
          } else if (status === "Rejected") {
            rejectedCount++;
          }
        });

        console.log(`    ✅ Approved: ${approvedCount} (1B: ${brandCounts.brand1}, 2B: ${brandCounts.brand2}, 3B: ${brandCounts.brand3})`);
        console.log(`    ⏸️  Pending: ${pendingCount}`);
        console.log(`    ❌ Rejected: ${rejectedCount}`);
      }

      // ✅ Calculate Total Rx Brand (same as in GetCaptainDetails)
      const totalRxBrand =
        (1 * brandCounts.brand1) +
        (2 * brandCounts.brand2) +
        (3 * brandCounts.brand3);

        // ✅ NEW: Total number of approved prescriptions (NON-weighted)
const totalBrandCount =
  brandCounts.brand1 +
  brandCounts.brand2 +
  brandCounts.brand3;

const finalMrScore =
  settings.mrRankMetric === "BRAND_COUNT"
    ? totalBrandCount
    : mr.TotalScore;

// console.log("primaryMrMetric",primaryMrMetric)


      // Return MR data with brand counts (without MRUploadedData in response)
      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: finalMrScore,
        TotalMatches: mr.TotalMatches,
        ZONE: mr.ZONE,
        HQ: mr.HQ,
        profileImage: mr.profileImage,
        brandCounts: brandCounts, // ✅ Only approved prescriptions
        totalRxBrand: totalRxBrand, // ✅ Total rx brand count
          totalBrandCount: totalBrandCount, // ✅ NEW (non-weighted)
        approvedCount: approvedCount, // ✅ Total approved prescriptions
        pendingCount: pendingCount, // ✅ Total pending prescriptions
        rejectedCount: rejectedCount, // ✅ Total rejected prescriptions
      };
    });

     // ✅ FINAL SORT: by approvedCount (highest first)
mrsWithBrandCounts.sort((a, b) => {
  // Primary: approvedCount
  if (b.approvedCount !== a.approvedCount) {
    return b.approvedCount - a.approvedCount;
  }

  // Secondary tie-breaker (optional)
  return b.TotalScore - a.TotalScore;
});	  

    console.log("\n=== MR RANK SUMMARY ===");
    console.log(`Total MRs: ${mrsWithBrandCounts.length}`);
    console.log("Top 3 MRs:");
    mrsWithBrandCounts.slice(0, 3).forEach((mr, idx) => {
      console.log(`  ${idx + 1}. ${mr.USERNAME} - ${mr.TotalScore} points (${mr.approvedCount} approved)`);
    });

    // Send the response
    return res.status(200).json({
      success: true,
      data: mrsWithBrandCounts,
    });
  } catch (error) {
    console.error("❌ Error in getMrRank:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// const getLastMatchResult = async (req, res) => {
//   try {
//     const mrId = req.params.mrId;

//     // Find the MR record
//     const mrExists = await mrModel.findById(mrId);
//     if (!mrExists) {
//       return res.status(404).json({
//         success: false,
//         message: "MR not found",
//       });
//     }

//     // Get the latest 5 match IDs from lastMatchRecord
//     const lastMatchIds = mrExists.lastMatchRecord.slice(-5);

//     // Fetch match details for these IDs
//     const matchDetails = await MatchDetails.find({
//       _id: { $in: lastMatchIds },
//     });

//     if (!matchDetails.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No match details found",
//       });
//     }

//     // Prepare the result with win/loss calculation
//     const matchResults = matchDetails.map((match) => {
//       // Ensure MatchResult exists and is an array
//       if (!Array.isArray(match.MatchResult)) {
//         return {
//           matchId: match._id,
//           error: "Invalid MatchResult format",
//         };
//       }

//       // Process each MatchResult entry
//       const results = match.MatchResult.map(
//         ({ startDate, teamAScore, teamBScore, winner, _id }) => {
//           // Validate startDate format
//           if (!startDate) return null;

//           const [day, month, year] = startDate.split("-").map(Number);
//           const startDateObj = new Date(year, month - 1, day);

//           // Get today's date (ignoring time)
//           const today = new Date();
//           today.setHours(0, 0, 0, 0);

//           let present;
//           // Check if startDate is not today and is in the past
//           if (startDateObj < today) {
//             const isInTeamA = match.roomPlayersA.includes(mrId);
//             const isInTeamB = match.roomPlayersB.includes(mrId);

//             if (isInTeamA) {
//               present = "teamA";
//             } else {
//               present = "teamB";
//             }

//             // Determine win/loss
//             let result;
//             if (isInTeamA && winner === "Team A win") {
//               result = "win";
//             } else if (isInTeamB && winner === "Team B win") {
//               result = "win";
//             } else {
//               result = "loss";
//             }

//             return {
//               _id,
//               teamAScore,
//               teamBScore,
//               winner,
//               result,
//               present,
//             };
//           }

//           // return null; // Exclude invalid entries
//         }
//       )
//       // .filter((entry) => entry !== null); // Remove null entries

//       return {
//         matchId: match._id,
//         results,
//       };
//     });

//     // Filter out match objects with empty or invalid results
//     const filteredMatchResults = matchResults.filter(
//       (match) => match.results && match.results.length > 0
//     );

//     return res.status(200).json({
//       success: true,
//       matchResults: filteredMatchResults,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const getLastMatchResult = async (req, res) => {
//   try {
//     const mrId = req.params.mrId;

//     // Find the MR record
//     const mrExists = await mrModel.findById(mrId);
//     if (!mrExists) {
//       return res.status(404).json({
//         success: false,
//         message: "MR not found",
//       });
//     }

//     // Get the latest 5 match IDs from lastMatchRecord
//     // const lastMatchIds = mrExists.lastMatchRecord.slice(-5);
//     const lastMatchIds = mrExists.lastMatchRecord;

//     // Fetch match details for these IDs
//     const matchDetails = await MatchDetails.find({
//       _id: { $in: lastMatchIds },
//     });

//     // Prepare the result with win/loss calculation
//     const matchResults = matchDetails.map((match) => {
//       // Determine if MR is in Team A or Team B
//       const isInTeamA = match.roomPlayersA.includes(mrId);
//       const isInTeamB = match.roomPlayersB.includes(mrId);
//       const present = isInTeamA ? "teamA" : isInTeamB ? "teamB" : "None";

//       // Default result if MatchResult is missing or empty
//       if (
//         !match.MatchResult ||
//         !Array.isArray(match.MatchResult) ||
//         match.MatchResult.length === 0
//       ) {
//         return {
//           matchId: match._id,
//           results: [
//             {
//               _id: match._id,
//               teamAScore: 0,
//               teamBScore: 0,
//               winner: "None",
//               result: "Draw",
//               present,
//             },
//           ],
//         };
//       }

//       // Handle case where MatchResult exists and is an array
//       const results = match.MatchResult.map(
//         ({ startDate, teamAScore, teamBScore, winner, _id }) => {
//           if (!startDate) return null;

//           const [day, month, year] = startDate.split("-").map(Number);
//           const startDateObj = new Date(year, month - 1, day);

//           const today = new Date();
//           today.setHours(0, 0, 0, 0);

//           if (startDateObj < today) {
//             let result = "draw";
//             if (isInTeamA && winner === "Team A win") {
//               result = "win";
//             } else if (isInTeamB && winner === "Team B win") {
//               result = "win";
//             } else if (
//               (isInTeamA && winner === "Team B win") ||
//               (isInTeamB && winner === "Team A win")
//             ) {
//               result = "loss";
//             }

//             return {
//               _id: match._id,
//               teamAScore,
//               teamBScore,
//               startDate,
//               winner,
//               result,
//               present,
//             };
//           }
//           return null;
//         }
//       ).filter(Boolean); // Filter out null results

//       return {
//         matchId: match._id,
//         results:
//           results.length > 0
//             ? results
//             : [
//                 {
//                   _id: match._id,
//                   teamAScore: 0,
//                   teamBScore: 0,
//                   startDate:"None",
//                   winner: "None",
//                   result: "Draw",
//                   present,
//                 },
//               ],
//       };
//     });

//     // Get only the last 5 match results
//     const lastFiveMatchResults = matchResults.slice(-5);

//     return res.status(200).json({
//       success: true,
//       matchResults: lastFiveMatchResults,
//     });

//     // return res.status(200).json({
//     //   success: true,
//     //   matchResults,
//     // });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const getLastMatchResult = async (req, res) => {
//   try {
//     const mrId = req.params.mrId;

//     // Find the MR record
//     const mrExists = await mrModel.findById(mrId);
//     if (!mrExists) {
//       return res.status(404).json({
//         success: false,
//         message: "MR not found",
//       });
//     }

//     // Get all match IDs from lastMatchRecord
//     const lastMatchIds = mrExists.lastMatchRecord;

//     // Fetch match details for these IDs
//     const matchDetails = await MatchDetails.find({
//       _id: { $in: lastMatchIds },
//     });

//     // Prepare the result with win/loss calculation
//     const matchResults = matchDetails.map((match) => {
//       // Determine if MR is in Team A or Team B
//       const isInTeamA = match.roomPlayersA.includes(mrId);
//       const isInTeamB = match.roomPlayersB.includes(mrId);
//       const present = isInTeamA ? "teamA" : isInTeamB ? "teamB" : "None";

//       // Default result if MatchResult is missing or empty
//       if (
//         !match.MatchResult ||
//         !Array.isArray(match.MatchResult) ||
//         match.MatchResult.length === 0
//       ) {
//         return {
//           matchId: match._id,
//           results: [
//             {
//               _id: match._id,
//               teamAScore: 0,
//               teamBScore: 0,
//               winner: "None",
//               startDate: "None",
//               result: "Draw",
//               present,
//             },
//           ],
//         };
//       }

//       // Handle case where MatchResult exists and is an array
//       const results = match.MatchResult.map(
//         ({ startDate, teamAScore, teamBScore, winner, _id }) => {
//           if (!startDate) return null;

//           const [day, month, year] = startDate.split("-").map(Number);
//           const startDateObj = new Date(year, month - 1, day);

//           const today = new Date();
//           today.setHours(0, 0, 0, 0);

//           if (startDateObj < today) {
//             let result = "draw";
//             if (isInTeamA && winner === "Team A win") {
//               result = "win";
//             } else if (isInTeamB && winner === "Team B win") {
//               result = "win";
//             } else if (
//               (isInTeamA && winner === "Team B win") ||
//               (isInTeamB && winner === "Team A win")
//             ) {
//               result = "loss";
//             }

//             return {
//               _id: match._id,
//               teamAScore,
//               teamBScore,
//               startDate,
//               winner,
//               result,
//               present,
//             };
//           }
//           return null;
//         }
//       ).filter(Boolean); // Filter out null results

//       return {
//         matchId: match._id,
//         results:
//           results.length > 0
//             ? results
//             : [
//                 {
//                   _id: match._id,
//                   teamAScore: 0,
//                   teamBScore: 0,
//                   startDate: "None",
//                   winner: "None",
//                   result: "Draw",
//                   present,
//                 },
//               ],
//       };
//     });

//     // Filter results where startDate is found and get the last 5
//     const filteredMatchResults = matchResults.filter((match) =>
//       match.results.some(
//         (result) => result.startDate && result.startDate !== "None"
//       )
//     );

//     const lastFiveMatchResults = filteredMatchResults.slice(-5);

//     return res.status(200).json({
//       success: true,
//       matchResults: lastFiveMatchResults,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const getLastMatchResult = async (req, res) => {
//   try {
//     const mrId = req.params.mrId;

//     // Find the MR record
//     const mrExists = await mrModel.findById(mrId);
//     if (!mrExists) {
//       return res.status(404).json({
//         success: false,
//         message: "MR not found",
//       });
//     }

//     // Get all match IDs from lastMatchRecord
//     const lastMatchIds = mrExists.lastMatchRecord;

//     // Fetch match details for these IDs
//     const matchDetails = await MatchDetails.find({
//       _id: { $in: lastMatchIds },
//     });

//     // Prepare today's date for comparison
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // const formattedToday = today
//     //   .toLocaleDateString("en-GB")
//     //   .replace(/\//g, "-");
//     const formattedToday = `${String(today.getDate()).padStart(
//       2,
//       "0"
//     )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
//     console.log(formattedToday);

//     // Prepare the result with win/loss calculation
//     const matchResults = matchDetails.map((match) => {
//       const startDate = match.startDate; // Assuming match.startDate exists in match
//       const startEndDate = match.endDate; // Assuming match.startDate exists in match
//       const [day, month, year] = startDate.split("-").map(Number);
//       const startDateObj = new Date(year, month - 1, day);

//       // Skip matches that are today or in the future
//       // if (startDateObj >= today) return null;
//       if (formattedToday >= startDate && formattedToday <= startEndDate)
//         return null;

//       // Determine if MR is in Team A or Team B
//       const isInTeamA = match.roomPlayersA.includes(mrId);
//       const isInTeamB = match.roomPlayersB.includes(mrId);
//       const present = isInTeamA ? "teamA" : isInTeamB ? "teamB" : "None";

//       // Find matching score in mrExists.MrScoreEachMatch
//       const scoreEntry = mrExists.MrScoreEachMatch.find(
//         (scoreObj) => scoreObj.MatchDate === startDate
//       );
//       const score = scoreEntry ? scoreEntry.Score : "0";

//       let result = "draw";
//       if (isInTeamA && match.MatchResult[0]?.winner === "Team A win") {
//         result = "win";
//       } else if (isInTeamB && match.MatchResult[0]?.winner === "Team B win") {
//         result = "win";
//       } else if (
//         (isInTeamA && match.MatchResult[0]?.winner === "Team B win") ||
//         (isInTeamB && match.MatchResult[0]?.winner === "Team A win")
//       ) {
//         result = "loss";
//       }

//       return {
//         matchId: match._id,
//         results: [
//           {
//             _id: match._id,
//             score,
//             teamAScore: match.MatchResult[0]?.teamAScore || "0",
//             teamBScore: match.MatchResult[0]?.teamBScore || "0",
//             startDate,
//             endDate: match.endDate,
//             winner: match.MatchResult[0]?.winner || "None",
//             result,
//             present,
//           },
//         ],
//       };
//     });

//     // Filter out null matches and get the last 5 results
//     const filteredMatchResults = matchResults.filter(Boolean).slice(-5);

//     return res.status(200).json({
//       success: true,
//       matchResults: filteredMatchResults,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };
const getLastMatchResult = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Find the MR record
    const mrExists = await mrModel.findById(mrId);
    if (!mrExists) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    // Get all match IDs from lastMatchRecord
    const lastMatchIds = mrExists.lastMatchRecord;

    // Fetch match details for these IDs
    const matchDetails = await MatchDetails.find({
      _id: { $in: lastMatchIds },
    });

    // Prepare today's date for comparison (00:00:00 time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prepare the result with win/loss calculation
    const matchResults = matchDetails.map((match) => {
      const startDate = match.startDate; // Assuming match.startDate exists in match
      const endDate = match.endDate; // Assuming match.endDate exists in match

      // Convert startDate and endDate to Date objects
      const [startDay, startMonth, startYear] = startDate
        .split("-")
        .map(Number);
      const startDateObj = new Date(startYear, startMonth - 1, startDay);

      const [endDay, endMonth, endYear] = endDate.split("-").map(Number);
      const endDateObj = new Date(endYear, endMonth - 1, endDay);

      // Exclude matches where startDate or endDate is today or in the future
      if (startDateObj >= today || endDateObj >= today) return null;

      // Determine if MR is in Team A or Team B
      const isInTeamA = match.roomPlayersA.includes(mrId);
      const isInTeamB = match.roomPlayersB.includes(mrId);
      const present = isInTeamA ? "teamA" : isInTeamB ? "teamB" : "None";

      // Find matching score in mrExists.MrScoreEachMatch
      const scoreEntry = mrExists.MrScoreEachMatch.find(
        (scoreObj) => scoreObj.MatchDate === startDate,
      );
      const score = scoreEntry ? scoreEntry.Score : "0";

      let result = "draw";
      if (isInTeamA && match.MatchResult[0]?.winner === "Team A win") {
        result = "win";
      } else if (isInTeamB && match.MatchResult[0]?.winner === "Team B win") {
        result = "win";
      } else if (
        (isInTeamA && match.MatchResult[0]?.winner === "Team B win") ||
        (isInTeamB && match.MatchResult[0]?.winner === "Team A win")
      ) {
        result = "loss";
      }

      return {
        matchId: match._id,
        results: [
          {
            _id: match._id,
            score,
            teamAScore: match.MatchResult[0]?.teamAScore || "0",
            teamBScore: match.MatchResult[0]?.teamBScore || "0",
            startDate,
            endDate,
            winner: match.MatchResult[0]?.winner || "None",
            result,
            present,
          },
        ],
      };
    });

    // Filter out null matches and get the last 5 results
    const filteredMatchResults = matchResults.filter(Boolean).slice(-5);

    return res.status(200).json({
      success: true,
      matchResults: filteredMatchResults,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetMatchIdMr = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Find the MR record
    const MrExists = await mrModel.findById(mrId);
    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    // Ensure lastMatchRecord is an array
    const { lastMatchRecord, TEAMNAME } = MrExists;
    if (!Array.isArray(lastMatchRecord) || lastMatchRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matches found in lastMatchRecord",
      });
    }

    const today = new Date();
    const formattedToday = DateTime.fromJSDate(today)
      .setZone("Asia/Kolkata") // Convert to IST timezone
      .toISODate();

    const matchingMatchIds = [];

    // Loop through lastMatchRecord to find matching matchIds
    for (const matchId of lastMatchRecord) {
      const matchDetails = await MatchDetails.findById(matchId);
      if (!matchDetails) continue;

      // Ensure startDate and endDate exist
      if (!matchDetails.startDate || !matchDetails.endDate) continue;

      const [day, month, year] = matchDetails.startDate.split("-");
      const [day1, month1, year1] = matchDetails.endDate.split("-");

      const challengeDate = DateTime.fromISO(`${year}-${month}-${day}`)
        .setZone("Asia/Kolkata")
        .toISODate();
      const challengeEndDate = DateTime.fromISO(`${year1}-${month1}-${day1}`)
        .setZone("Asia/Kolkata")
        .toISODate();

      if (
        !(
          formattedToday === challengeDate ||
          (formattedToday >= challengeDate &&
            formattedToday <= challengeEndDate)
        )
      )
        continue;

      // Check if mrId exists in roomPlayers
      if (
        !Array.isArray(matchDetails.roomPlayers) ||
        !matchDetails.roomPlayers.includes(mrId)
      )
        continue;

      // Check if TEAMNAME matches teamA or teamB
      if (matchDetails.teamA !== TEAMNAME && matchDetails.teamB !== TEAMNAME)
        continue;

      // Add the matchId to the matchingMatchIds array
      matchingMatchIds.push(matchId);
    }

    // Check if we found any matching matchIds
    if (matchingMatchIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching matchIds found",
      });
    }

    // Return all matching matchIds
    return res.status(200).json({
      success: true,
      matchIds: matchingMatchIds,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const UploadProfilePhoto = async (req, res) => {
  try {
    let playerId = req.params.Id;
    let userExists;

    // Find user across all models
    userExists = await mrModel.findById(playerId);
    if (!userExists) {
      userExists = await flmModel.findById(playerId);
    }
    if (!userExists) {
      userExists = await SlmModel.findById(playerId);
    }
    if (!userExists) {
      userExists = await TlmModel.findById(playerId);
    }
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "User Not Exists!",
      });
    }

    // ✅ CHECK IF FILE WAS UPLOADED
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // ✅ DELETE OLD PROFILE IMAGE IF EXISTS
    if (userExists.profileImage) {
      const oldFilePath = path.join(
        __dirname,
        "../uploads",
        userExists.profileImage,
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log("🗑️ Deleted old profile image");
      }
    }

    // ✅ SAVE NEW FILENAME TO DATABASE
    userExists.profileImage = req.file.filename;
    await userExists.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      fileName: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const DeleteProfilePhoto = async (req, res) => {
  try {
    const playerId = req.params.Id;
    let userExists;

    userExists =
      (await mrModel.findById(playerId)) ||
      (await flmModel.findById(playerId)) ||
      (await SlmModel.findById(playerId)) ||
      (await TlmModel.findById(playerId));

    if (!userExists) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Exists!" });
    }

    if (!userExists.profileImage) {
      return res
        .status(400)
        .json({ success: false, message: "No profile image to delete" });
    }

    const oldFilePath = path.join(
      __dirname,
      "../uploads",
      userExists.profileImage,
    );
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log("🗑️ Deleted old profile image");
    } else {
      console.log("⚠️ File not found on disk:", oldFilePath);
    }

    // remove reference from DB
    userExists.profileImage = undefined;
    await userExists.save();

    return res
      .status(200)
      .json({ success: true, message: "Profile photo deleted" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// const getAllTeamRank = async (req, res) => {
//   try {
//     // Fetch all teams from the three models
//     const [FlmTeamScores, SlmTeamScores, TlmTeamScores] = await Promise.all([
//       flmModel.find({}),
//       SlmModel.find({}),
//       TlmModel.find({}),
//     ]);

//     // Function to process team scores
//     const calculateTeamScores = (teamData) => {
//       return teamData.map((team) => {
//         const { TeamName, EachMatchRecord = [] } = team;
//         MatchesCount = EachMatchRecord.length;
//         const teamScore = EachMatchRecord.reduce(
//           (sum, record) => sum + (parseInt(record.score) || 0),
//           0
//         );
//         return { TeamName, teamScore, MatchesCount };
//       });
//     };

//     // Calculate scores for each model
//     const flmScores = calculateTeamScores(FlmTeamScores);
//     const slmScores = calculateTeamScores(SlmTeamScores);
//     const tlmScores = calculateTeamScores(TlmTeamScores);

//     // Combine all team scores into a single array
//     const allTeamScores = [...flmScores, ...slmScores, ...tlmScores];
//     const sortedTeamScores = allTeamScores.sort(
//       (a, b) => b.teamScore - a.teamScore
//     );

//     // Respond with the combined team scores
//     return res.status(200).json({
//       success: true,
//       data: sortedTeamScores,
//     });
//   } catch (error) {
//     // Handle errors
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const getAllTeamRank = async (req, res) => {
//   try {
//     // Fetch all teams from the three models
//     const [FlmTeamScores, SlmTeamScores, TlmTeamScores] = await Promise.all([
//       flmModel.find({}),
//       SlmModel.find({}),
//       TlmModel.find({}),
//     ]);

//     // Function to process team scores
//     const calculateTeamScores = (teamData) => {
//       return teamData.map((team) => {
//         const { TeamName, EachMatchRecord = [] } = team;
//         const MatchesCount = EachMatchRecord.length;
//         const teamScore = EachMatchRecord.reduce(
//           (sum, record) => sum + (parseInt(record.score) || 0),
//           0
//         );
//         return { TeamName, teamScore, MatchesCount };
//       });
//     };

//     // Calculate scores for each model
//     const flmScores = calculateTeamScores(FlmTeamScores);
//     const slmScores = calculateTeamScores(SlmTeamScores);
//     const tlmScores = calculateTeamScores(TlmTeamScores);

//     // Combine all team scores into a single array
//     const allTeamScores = [...flmScores, ...slmScores, ...tlmScores];

//     // Filter out duplicate team names, keeping the highest score
//     const uniqueTeamScores = allTeamScores.reduce((acc, current) => {
//       const existingTeam = acc.find(
//         (team) => team.TeamName === current.TeamName
//       );
//       if (!existingTeam) {
//         acc.push(current);
//       } else if (current.teamScore > existingTeam.teamScore) {
//         // Replace the existing team if the current score is higher
//         const index = acc.indexOf(existingTeam);
//         acc[index] = current;
//       }
//       return acc;
//     }, []);

//     // Sort unique teams by score
//     const sortedTeamScores = uniqueTeamScores.sort(
//       (a, b) => b.teamScore - a.teamScore
//     );

//     // Respond with the unique, combined team scores
//     return res.status(200).json({
//       success: true,
//       data: sortedTeamScores,
//     });
//   } catch (error) {
//     // Handle errors
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

/*
const getAllTeamRank = async (req, res) => {
  try {
    // ✅ ONLY fetch from SLM level (which includes all MRs through FLMs)
    const SlmTeamScores = await SlmModel.find({}).populate({
      path: "Flm",
      populate: {
        path: "Mrs",
        select: "USERNAME MRUploadedData TotalScore _id", // ✅ Added TotalScore
      },
    });

    console.log("\n=== CALCULATING TEAM RANKS ===");
    console.log("SLM Teams:", SlmTeamScores.length);

    // Function to process team scores and brand counts
    const calculateTeamScores = (teamData) => {
      return teamData.map((team) => {
        const { TeamName, EachMatchRecord = [] } = team;
        const MatchesCount = EachMatchRecord.length;

        console.log(`\n--- Processing: ${TeamName} ---`);

        const brandCounts = {
          brand1: 0,
          brand2: 0,
          brand3: 0,
        };

        const countedUploads = new Set();
        let calculatedTeamScore = 0; // ✅ Calculate from prescriptions

        // Get all MRs from FLMs
        let allMRs = [];
        const flms = team.Flm || [];
        console.log(`  FLMs in this team: ${flms.length}`);

        flms.forEach((flm) => {
          if (flm && flm.Mrs) {
            console.log(`    - FLM has ${flm.Mrs.length} MRs`);
            allMRs = [...allMRs, ...flm.Mrs];
          }
        });

        console.log(`  Total MRs: ${allMRs.length}`);

        // Count brands and calculate score from all MRs
        allMRs.forEach((mr) => {
          if (mr && mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
            mr.MRUploadedData.forEach((upload) => {
              const uploadId = upload._id.toString();
              const status = upload.Status;
              const brands = upload.NumberOfBrands;

              // ✅ Only count APPROVED prescriptions
              if (status === "Approved" && !countedUploads.has(uploadId)) {
                countedUploads.add(uploadId);

                // Calculate score from this prescription
                const points = parseInt(upload.Points || 0);
                const rxns = parseInt(upload.NoRxns || 1);
                const prescriptionScore = points * rxns;

                calculatedTeamScore += prescriptionScore;

                // Count brands
                if (brands === 1) {
                  brandCounts.brand1++;
                } else if (brands === 2) {
                  brandCounts.brand2++;
                } else if (brands === 3) {
                  brandCounts.brand3++;
                }

                console.log(`    ✅ Approved: ${brands}B, ${points}×${rxns} = ${prescriptionScore} points`);
              }
            });
          }
        });

        console.log(`  ${TeamName} Final Counts:`, brandCounts);
        console.log(`  Unique approved uploads: ${countedUploads.size}`);
        console.log(`  Calculated Team Score: ${calculatedTeamScore}`);

        // ✅ Use calculated score instead of EachMatchRecord score
        return { 
          TeamName, 
          teamScore: calculatedTeamScore, // ✅ Use calculated score
          MatchesCount, 
          brandCounts 
        };
      });
    };

    // ✅ Calculate scores ONLY from SLM level
    const teamScores = calculateTeamScores(SlmTeamScores);

    // ✅ No combining needed! Each team appears once at SLM level
    const highestMatchCount = Math.max(
      ...teamScores.map((team) => team.MatchesCount),
      0,
    );

    const normalizedTeamScores = teamScores.map((team) => ({
      ...team,
      MatchesCount: highestMatchCount,
    }));

    // ✅ Sort by calculated team score
    const sortedTeamScores = normalizedTeamScores.sort(
      (a, b) => b.teamScore - a.teamScore,
    );

    console.log("\n=== FINAL RESULT ===");
    sortedTeamScores.forEach((team) => {
      const total =
        team.brandCounts.brand1 +
        team.brandCounts.brand2 +
        team.brandCounts.brand3;
      console.log(
        `${team.TeamName}: Score=${team.teamScore}, 1B=${team.brandCounts.brand1}, 2B=${team.brandCounts.brand2}, 3B=${team.brandCounts.brand3}, Total=${total}`,
      );
    });

    return res.status(200).json({
      success: true,
      data: sortedTeamScores,
    });
  } catch (error) {
    console.error("❌ Error in getAllTeamRank:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

*/


const getAllTeamRank = async (req, res) => {
  try {
    const settings = await getLeaderboardSettings();

    const SlmTeamScores = await SlmModel.find({}).populate({
      path: "Flm",
      populate: {
        path: "Mrs",
        select: "USERNAME MRUploadedData TotalScore _id",
      },
    });

    console.log("\n=== CALCULATING TEAM RANKS ===");
    console.log("SLM Teams:", SlmTeamScores.length);

    const calculateTeamScores = (teamData) => {
      return teamData.map((team) => {
        const { TeamName, EachMatchRecord = [] } = team;
        const MatchesCount = EachMatchRecord.length;

        console.log(`\n--- Processing: ${TeamName} ---`);

        const brandCounts = {
          brand1: 0,
          brand2: 0,
          brand3: 0,
        };

        const countedUploads = new Set();
        let calculatedTeamScore = 0;

        let allMRs = [];
        const flms = team.Flm || [];
        console.log(`  FLMs in this team: ${flms.length}`);

        flms.forEach((flm) => {
          if (flm && flm.Mrs) {
            console.log(`    - FLM has ${flm.Mrs.length} MRs`);
            allMRs = [...allMRs, ...flm.Mrs];
          }
        });

        console.log(`  Total MRs: ${allMRs.length}`);

        allMRs.forEach((mr) => {
          if (mr && mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
            mr.MRUploadedData.forEach((upload) => {
              const uploadId = upload._id.toString();
              const status = upload.Status;
              const brands = upload.NumberOfBrands;

              if (status === "Approved" && !countedUploads.has(uploadId)) {
                countedUploads.add(uploadId);

                const points = parseInt(upload.Points || 0);
                const rxns = parseInt(upload.NoRxns || 1);
                const prescriptionScore = points * rxns;

                calculatedTeamScore += prescriptionScore;

                if (brands === 1) {
                  brandCounts.brand1++;
                } else if (brands === 2) {
                  brandCounts.brand2++;
                } else if (brands === 3) {
                  brandCounts.brand3++;
                }

                console.log(`    ✅ Approved: ${brands}B, ${points}×${rxns} = ${prescriptionScore} points`);
              }
            });
          }
        });

        console.log(`  ${TeamName} Final Counts:`, brandCounts);
        console.log(`  Unique approved uploads: ${countedUploads.size}`);
        console.log(`  Calculated Team Score: ${calculatedTeamScore}`);

        const totalBrandCount =
          brandCounts.brand1 +
          brandCounts.brand2 +
          brandCounts.brand3;

        const finalTeamScore =
          settings.teamRankMetric === "BRAND_COUNT"
            ? totalBrandCount
            : calculatedTeamScore;

        return {
          TeamName,
          teamScore: finalTeamScore,
          MatchesCount,
          brandCounts,
          totalBrandCount,
        };
      });
    };

    const teamScores = calculateTeamScores(SlmTeamScores);

    const highestMatchCount = Math.max(
      ...teamScores.map((team) => team.MatchesCount),
      0,
    );

    const normalizedTeamScores = teamScores.map((team) => ({
      ...team,
      MatchesCount: highestMatchCount,
    }));

    const sortedTeamScores = normalizedTeamScores.sort(
      (a, b) => b.teamScore - a.teamScore,
    );

    // ✅ Always subtract KOLKATATIGER, ODISHAPERFORMER, BIHARBRILLIANT from ASSAMACHIEVERS
    const TEAMS_TO_SUBTRACT = ["KOLKATATIGER", "ODISHAPERFORMER", "BIHARBRILLIANT"];

    const assamIndex = sortedTeamScores.findIndex(
      (t) => t.TeamName === "ASSAMACHIEVERS"
    );

    if (assamIndex !== -1) {
      const assam = sortedTeamScores[assamIndex];

      TEAMS_TO_SUBTRACT.forEach((teamName) => {
        const team = sortedTeamScores.find((t) => t.TeamName === teamName);
        if (team) {
          assam.brandCounts.brand1 -= team.brandCounts.brand1;
          assam.brandCounts.brand2 -= team.brandCounts.brand2;
          assam.brandCounts.brand3 -= team.brandCounts.brand3;
        }
      });

      assam.totalBrandCount =
        assam.brandCounts.brand1 +
        assam.brandCounts.brand2 +
        assam.brandCounts.brand3;

      if (settings.teamRankMetric === "BRAND_COUNT") {
        assam.teamScore = assam.totalBrandCount;
      }

      console.log(
        `\n✅ ASSAMACHIEVERS after subtraction: Score=${assam.teamScore}, 1B=${assam.brandCounts.brand1}, 2B=${assam.brandCounts.brand2}, 3B=${assam.brandCounts.brand3}, Total=${assam.totalBrandCount}`
      );
    }

    // Re-sort after adjustment
    sortedTeamScores.sort((a, b) => b.teamScore - a.teamScore);

    console.log("\n=== FINAL RESULT ===");
    sortedTeamScores.forEach((team) => {
      const total =
        team.brandCounts.brand1 +
        team.brandCounts.brand2 +
        team.brandCounts.brand3;
      console.log(
        `${team.TeamName}: Score=${team.teamScore}, 1B=${team.brandCounts.brand1}, 2B=${team.brandCounts.brand2}, 3B=${team.brandCounts.brand3}, Total=${total}`,
      );
    });

    return res.status(200).json({
      success: true,
      data: sortedTeamScores,
    });
  } catch (error) {
    console.error("❌ Error in getAllTeamRank:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const SendQueryToAdmin = async (req, res) => {
  try {
    const { Mobile, Query } = req.body;
    const mrId = req.params.mrId;
    const io = getIo();
    const mrExists = await mrModel.findById(mrId);
    if (!mrExists) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      }); 
    }
    if (!Mobile || !Query) {
      return res.status(402).json({
        success: false,
        message: "Please provide both mobile and query..!!",
      });
    }

    const flmData = await flmModel
      .findOne({ Mrs: mrId })
      .populate("Mrs", "BDMName FLMEmpID _id HQ");
    if (!flmData) {
      return res.status(404).send({
        message: "Mr not found for the given FLM..!!",
        success: false,
      });
    }

    const slmData = await SlmModel.findOne({ Flm: flmData._id }).populate(
      "Flm",
      "SLMName SLMEmpID _id HQ",
    );
    if (!SlmModel) {
      return res.status(404).send({
        message: "Flm not found for the given SLM..!!",
        success: false,
      });
    }

    const tlmData = await TlmModel.findOne({ Slm: slmData._id }).populate(
      "Slm",
      "TLMName TLMEmpID _id HQ",
    );
    if (!tlmData) {
      return res.status(404).send({
        message: "Slm not found for the given TLM..!!",
        success: false,
      });
    }

    const lastRecord = await SupportModel.findOne()
      .sort({ caseNo: -1 })
      .select("caseNo");

    let newCaseNo;
    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();

    if (lastRecord) {
      const lastCaseNoValue = lastRecord.caseNo;

      if (typeof lastCaseNoValue === "number") {
        newCaseNo = (lastCaseNoValue + 1).toString().padStart(6, "0");
      } else if (typeof lastCaseNoValue === "string") {
        // 1. Remove the '#' and any other non-digits
        const numericPart = lastCaseNoValue.replace(/[^0-9]/g, ""); // Remove non-digits using character set

        if (numericPart) {
          const parsedValue = parseInt(numericPart, 10);
          if (!isNaN(parsedValue)) {
            newCaseNo = (parsedValue + 1).toString().padStart(6, "0");
          } else {
            newCaseNo = "000001";
          }
        } else {
          newCaseNo = "000001";
        }
      } else if (lastCaseNoValue === null || lastCaseNoValue === undefined) {
        newCaseNo = "000001";
      } else {
        newCaseNo = "000001";
      }
    } else {
      newCaseNo = "000001"; // First case
    }

    const supportData = new SupportModel({
      caseNo: `#${newCaseNo}`,
      Mobile: Mobile,
      Query: Query,
      MrName: mrExists.USERNAME,
      HQ: mrExists.HQ,
      Region: mrExists.REGION,
      Zone: mrExists.ZONE,
      FlmName: flmData.BDMName,
      FlmHQ: flmData.HQ,
      SlmName: slmData.SLMName,
      SlmHQ: slmData.HQ,
      TlmName: tlmData.TLMName,
      TlmHQ: tlmData.HQ,
      ModifiedDate: `${day}-${month}-${year}`,
      isRead: false,
      CompanyName: mrExists.BUSINESSUNIT,
    });
    const data = await supportData.save();
    if (data) {
      io.emit("queryReply_Updated", data);
    }
    const queryData = await SupportModel.find({});
    if (queryData) {
      io.emit("AllqueryData", queryData);
      return res.status(200).json({
        message: "Read status updated successfully",
        success: true,
      });
    }

    // NodeMailer Configuration
    // var transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: "digilateraldev@gmail.com",
    //     pass: "ohax atcp umht xked",
    //   },
    // });

    // // Email content
    // var mailOptions = {
    //   from: "digiLateralRxpl@gmail.com",
    //   to: "digilateraldev@gmail.com",
    //   subject: "Request For Technical Support",
    //   html: `
    //           <div style="border: 1px solid #000; padding: 10px; text-align: center;">
    //             <h3 style="text-align: center;">Case No : ${
    //               parseInt(lastCaseNo) + 1
    //             }</h3>
    //             <h3 style="text-align: center;">Customer : ${MrName}</h3>
    //             <h3 style="text-align: center;">MobileNo : ${Mobile}</h3>
    //             <p style="background-color: pink; color: white; padding: 3px;">Query: ${Query}</p>
    //             <p>If you didn't request this, please ignore this email.</p>
    //           </div>
    //         `,
    // };

    // // Send the email
    // transporter.sendMail(mailOptions, function (error, info) {
    //   if (error) {
    //     console.log(error);
    //     return res
    //       .status(500)
    //       .send({ message: "Error sending email", success: false });
    //   } else {
    //     console.log("Email sent: " + info.response);
    //     return res
    //       .status(200)
    //       .send({ message: "Email sent successfully", success: true });
    //   }
    // });

    return res.status(200).json({
      success: true,
      message: "We will Respond within 24 hours",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const SendQueryToAdminByMR = async (req, res) => {
  try {
    const { PrevCaseNo, Query } = req.body;
    const mrName = req.params.mrName;
    const io = getIo();
    const mrExists = await mrModel.findOne({ USERNAME: mrName });
    if (!mrExists) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }
    if (!PrevCaseNo || !Query) {
      return res.status(402).json({
        success: false,
        message: "Please provide both CaseNo and query..!!",
      });
    }

    const flmData = await flmModel
      .findOne({ Mrs: mrExists._id })
      .populate("Mrs", "BDMName FLMEmpID _id HQ");
    if (!flmData) {
      return res.status(404).send({
        message: "Mr not found for the given FLM..!!",
        success: false,
      });
    }

    const slmData = await SlmModel.findOne({ Flm: flmData._id }).populate(
      "Flm",
      "SLMName SLMEmpID _id HQ",
    );
    if (!SlmModel) {
      return res.status(404).send({
        message: "Flm not found for the given SLM..!!",
        success: false,
      });
    }

    const tlmData = await TlmModel.findOne({ Slm: slmData._id }).populate(
      "Slm",
      "TLMName TLMEmpID _id HQ",
    );
    if (!tlmData) {
      return res.status(404).send({
        message: "Slm not found for the given TLM..!!",
        success: false,
      });
    }

    let supportCase = await SupportModel.findOne({ caseNo: PrevCaseNo });
    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();
    if (supportCase) {
      // Append query to existing case
      supportCase.Query.push(Query);
      supportCase.ModifiedDate = `${day}-${month}-${year}`;
      supportCase.isRead = false;
      const data = await supportCase.save();
      if (data) {
        io.emit("queryReply_Updated", data);
      }
      const queryData = await SupportModel.find({});
      if (queryData) {
        io.emit("AllqueryData", queryData);
        return res.status(200).json({
          message: "Read status updated successfully",
          success: true,
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "We will Respond within 24 hours",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// const GetCaptainDetails = async (req, res) => {
//   try {
//     const Id = req.params.id;
//     let userExists,
//       matchDetails,
//       TotalMatches = 0,
//       userWinCount = 0,
//       userLossCount = 0,
//       userDrawCount = 0;

//     // Check user existence in various models
//     userExists = await flmModel.findById(Id);
//     if (!userExists) {
//       userExists = await SlmModel.findById(Id);
//     }
//     if (!userExists) {
//       userExists = await TlmModel.findById(Id);
//     }

//     if (!userExists) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Find match details based on user ID
//     matchDetails = await MatchDetails.find({
//       $or: [{ creatorId: userExists._id }, { membersAccepted: userExists._id }],
//     });

//     if (!matchDetails || matchDetails.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No match details found",
//         TotalMatches,
//         userWinCount,
//         userLossCount,
//         userDrawCount,
//       });
//     }

//     const today = new Date().setHours(0, 0, 0, 0); // Today's date without time

//     // Calculate TotalMatches and analyze results
//     matchDetails.forEach((match) => {
//       const matchStartDate = new Date(match.startDate).setHours(0, 0, 0, 0); // Normalize match start date

//       // console.log(matchStartDate < today)
//       // Only include matches where the startDate is in the past
//       if (
//         matchStartDate < today &&
//         (match.creatorId?.toString() === userExists._id.toString() ||
//           (Array.isArray(match.membersAccepted) &&
//             match.membersAccepted.some(
//               (member) => member.toString() === userExists._id.toString()
//             )))
//       ) {
//         TotalMatches++;
//       }

//       const { teamA, teamB, MatchResult } = match;

//       if (userExists.TeamName === teamA || userExists.TeamName === teamB) {
//         MatchResult.forEach((result) => {
//           if (
//             result.Result === teamB &&
//             result.winner === "Team B win" &&
//             userExists.TeamName === teamB
//           ) {
//             userWinCount++;
//           } else if (
//             result.Result === teamA &&
//             result.winner === "Team A win" &&
//             userExists.TeamName === teamA
//           ) {
//             userWinCount++;
//           } else if (
//             result.Result === teamB &&
//             result.winner === "Team B win" &&
//             userExists.TeamName === teamA
//           ) {
//             userLossCount++;
//           } else if (
//             result.Result === teamA &&
//             result.winner === "Team A win" &&
//             userExists.TeamName === teamB
//           ) {
//             userLossCount++;
//           } else if (
//             result.teamAScore === result.teamBScore
//           ) {
//             userDrawCount++;
//           }
//         });
//       }
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Data fetched successfully",
//       TotalMatches,
//       userWinCount,
//       userLossCount,
//       userDrawCount,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const CaptainLastMatchResult = async (req, res) => {
//   try {
//     const Id = req.params.id;
//     let userExists,
//       matchDetails = [],
//       resultStatus = [],
//       userScores = [],
//       opponentScores = [];

//     // Check user existence in various models
//     userExists = await flmModel.findById(Id);
//     if (!userExists) {
//       userExists = await SlmModel.findById(Id);
//     }
//     if (!userExists) {
//       userExists = await TlmModel.findById(Id);
//     }

//     if (!userExists) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Query to fetch match details
//     matchDetails = await MatchDetails.find({
//       $or: [{ creatorId: userExists._id }, { membersAccepted: userExists._id }],
//     }).exec(); // Ensure that the result is an array by calling .exec()

//     // // Now you can use map on the result (since it's an array)
//     // matchDetails = matchDetails.map((match) => {
//     //   const [day, month, year] = match.startDate.split("-").map(Number);
//     //   const startDateObj = new Date(year, month - 1, day);

//     //   // Convert the startDate to a timestamp for comparison
//     //   // match.startDate = convertToDate(match.startDate); // Add the timestamp to check
//     //   match.startDate = startDateObj; // Add the timestamp to check
//     //   console.log(startDateObj)
//     //   return match;
//     // });

//     if (!matchDetails || matchDetails.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No match details found",
//         resultStatus,
//         userScores,
//         opponentScores,
//       });
//     }

//     let results = [];
//     // Process each match to calculate the result and scores
//     matchDetails.forEach((match) => {
//       const { teamA, teamB, MatchResult, startDate } = match;
//       let matchResult = "No Result";
//       let userScore = null;

//       if (!startDate) return null;

//       const [day, month, year] = startDate.split("-").map(Number);
//       const startDateObj = new Date(year, month - 1, day);

//       // Get today's date (ignoring time)
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       // Determine if the user was part of Team A or Team B
//       const isTeamA = userExists.TeamName === teamA;
//       const isTeamB = userExists.TeamName === teamB;

//       let present;
//       if (isTeamA) {
//         present = "teamA";
//       } else {
//         present = "teamB";
//       }

//       if (startDateObj < today) {
//         MatchResult.forEach((result) => {
//           console.log("Result",result);
//           if (isTeamA && result.winner === "Team A win") {
//             matchResult = "Win";
//             userScore = result.teamAScore;
//           } else if (isTeamB && result.winner === "Team B win") {
//             matchResult = "Win";
//             userScore = result.teamBScore;
//           } else if (isTeamA && result.winner !== "Team A win") {
//             matchResult = "Loss";
//             userScore = result.teamAScore;
//           } else if (isTeamB && result.winner !== "Team B win") {
//             matchResult = "Loss";
//             userScore = result.teamBScore;
//           } else {
//             matchResult = "Draw";
//             userScore = 0;
//           }

//           let teamAScore = result.teamAScore || "0";
//           let teamBScore = result.teamBScore || "0" ;
//           let winner = result.winner;
//           let startDate = result.startDate

//           if(isTeamA && present === "teamA") {
//             results.push({
//               teamAScore,
//               matchResult,
//               present,
//               winner,
//               startDate
//             });
//           }
//           else{
//             results.push({
//               teamBScore,
//               matchResult,
//               present,
//               winner,
//               startDate
//             });
//           }

//         });
//       }

//       // // Store results and scores for each match
//       // resultStatus.push(matchResult);
//       // userScores.push(userScore);
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Last 5 match results fetched successfully",
//       results,
//       // resultStatus,
//       // userScores,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const CaptainLastMatchResult = async (req, res) => {
//   try {
//     const Id = req.params.id;

//     // Check user existence in various models
//     let userExists = await flmModel.findById(Id) ||
//                      await SlmModel.findById(Id) ||
//                      await TlmModel.findById(Id);

//     if (!userExists) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Fetch match details
//     const matchDetails = await MatchDetails.find({
//       $or: [{ creatorId: userExists._id }, { membersAccepted: userExists._id }],
//     }).exec();

//     if (!matchDetails.length) {
//       return res.status(200).json({
//         success: true,
//         message: "No match details found",
//         results: [],
//       });
//     }

//     let results = [];
//     matchDetails.forEach((match) => {
//       const { teamA, teamB, MatchResult, startDate } = match;

//       // if (!startDate) return;

//       const [day, month, year] = startDate.split("-").map(Number);
//       const startDateObj = new Date(year, month - 1, day);

//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       if (startDateObj >= today) return;

//       let matchResult = "Draw";
//       let teamAScore = 0;
//       let teamBScore = 0;
//       let winner = "None";
//       let present = userExists.TeamName === teamA ? "teamA" : "teamB";

//       if (Array.isArray(MatchResult) && MatchResult.length > 0) {
//         // Process MatchResult if present
//         MatchResult.forEach((result) => {
//           if (present === "teamA") {
//             if (result.winner === "Team A win") {
//               matchResult = "Win";
//               teamAScore = result.teamAScore;
//               teamBScore = result.teamBScore;
//               winner = result.winner;
//               startDate
//             } else if (result.winner === "Team B win") {
//               matchResult = "Loss";
//               teamAScore = result.teamAScore;
//               teamBScore = result.teamBScore;
//               winner = result.winner;
//               startDate
//             }
//           } else if (present === "teamB") {
//             if (result.winner === "Team B win") {
//               matchResult = "Win";
//               teamAScore = result.teamAScore;
//               teamBScore = result.teamBScore;
//               winner = result.winner;
//               startDate
//             } else if (result.winner === "Team A win") {
//               matchResult = "Loss";
//               teamAScore = result.teamAScore;
//               teamBScore = result.teamBScore;
//               winner = result.winner;
//               startDate
//             }
//           }
//         });
//       } else {
//         // Default values when MatchResult is not present
//         matchResult = "Draw";
//         teamAScore = 0;
//         teamBScore = 0;
//         winner = "None";
//         startDate
//       }

//       results.push({
//         teamAScore,
//         teamBScore,
//         matchResult,
//         present,
//         winner,
//         startDate
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Last match results fetched successfully",
//       results,
//     });
//   } catch (error) {
//     console.error("Error fetching match results:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const GetCaptainDetails = async (req, res) => {
  try {
    const Id = req.params.id;
    let userExists;

    // ✅ MR Statistics
    let mrStats = {
      brand1B: 0,
      brand2B: 0,
      brand3B: 0,
      totalScore: 0,
      totalRxBrand: 0,
      totalMRs: 0,
      totalPrescriptions: 0,
      totalPending: 0,
      totalRejected: 0,
    };

    console.log("\n========== GET CAPTAIN DETAILS ==========");
    console.log("📥 User ID:", Id);

    // Check user existence in various models
    let userLevel = "";
    
    userExists = await TlmModel.findById(Id).populate({
      path: "Slm",
      populate: {
        path: "Flm",
        populate: {
          path: "Mrs",
          select: "USERNAME MRUploadedData TotalScore TotalFours TotalSixes",
        },
      },
    });

    if (userExists) {
      userLevel = "TLM";
      console.log("✅ Found user as TLM:", userExists.TeamName);
    }

    if (!userExists) {
      userExists = await SlmModel.findById(Id).populate({
        path: "Flm",
        populate: {
          path: "Mrs",
          select: "USERNAME MRUploadedData TotalScore TotalFours TotalSixes",
        },
      });
      if (userExists) {
        userLevel = "SLM";
        console.log("✅ Found user as SLM:", userExists.TeamName);
      }
    }

    if (!userExists) {
      userExists = await flmModel.findById(Id).populate({
        path: "Mrs",
        select: "USERNAME MRUploadedData TotalScore TotalFours TotalSixes",
      });
      if (userExists) {
        userLevel = "FLM";
        console.log("✅ Found user as FLM:", userExists.TeamName);
      }
    }

    if (!userExists) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("\n========== CALCULATING MR STATISTICS ==========");
    console.log("User Level:", userLevel);

    // ✅ COLLECT ALL MRs BASED ON HIERARCHY
    let allMRs = [];

    if (userLevel === "FLM") {
      allMRs = userExists.Mrs || [];
      console.log(`📊 FLM has ${allMRs.length} direct MRs`);
    } else if (userLevel === "SLM") {
      const flms = userExists.Flm || [];
      console.log(`📊 SLM has ${flms.length} FLMs`);
      
      flms.forEach((flm, idx) => {
        if (flm && flm.Mrs) {
          console.log(`  - FLM[${idx}] has ${flm.Mrs.length} MRs`);
          allMRs = [...allMRs, ...flm.Mrs];
        }
      });
      console.log(`📊 Total MRs under SLM: ${allMRs.length}`);
    } else if (userLevel === "TLM") {
      const slms = userExists.Slm || [];
      console.log(`📊 TLM has ${slms.length} SLMs`);
      
      slms.forEach((slm, slmIdx) => {
        if (slm && slm.Flm) {
          console.log(`  - SLM[${slmIdx}] has ${slm.Flm.length} FLMs`);
          slm.Flm.forEach((flm, flmIdx) => {
            if (flm && flm.Mrs) {
              console.log(`    - FLM[${flmIdx}] has ${flm.Mrs.length} MRs`);
              allMRs = [...allMRs, ...flm.Mrs];
            }
          });
        }
      });
      console.log(`📊 Total MRs under TLM: ${allMRs.length}`);
    }

    // ✅ CALCULATE STATISTICS FROM ALL MRs
    const countedUploads = new Set(); // Prevent duplicates

    allMRs.forEach((mr, mrIdx) => {
      if (mr && mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        console.log(`\n  MR[${mrIdx}] ${mr.USERNAME}: ${mr.MRUploadedData.length} uploads`);
        
        mr.MRUploadedData.forEach((upload) => {
          const uploadId = upload._id.toString();
          
          // Avoid duplicates
          if (!countedUploads.has(uploadId)) {
            countedUploads.add(uploadId);
            
            const brands = upload.NumberOfBrands;
            const points = parseInt(upload.Points || 0);
            const rxns = parseInt(upload.NoRxns || 1);
            const score = points * rxns;
            const status = upload.Status;

            console.log(`    Upload: ${brands}B, ${points}pts × ${rxns}rxns = ${score} score, Status: ${status}`);

            // Count by status
            if (status === "Approved") {
              if (brands === 1) {
                mrStats.brand1B++;
              } else if (brands === 2) {
                mrStats.brand2B++;
              } else if (brands === 3) {
                mrStats.brand3B++;
              }

              mrStats.totalScore += score;
              mrStats.totalPrescriptions++;
              console.log(`      ✅ Counted as Approved`);
            } else if (status === "Pending") {
              mrStats.totalPending++;
              console.log(`      ⏸️  Counted as Pending`);
            } else if (status === "Rejected") {
              mrStats.totalRejected++;
              console.log(`      ❌ Counted as Rejected`);
            }
          }
        });
      }
    });

    // ✅ CALCULATE TOTAL RX BRAND
    mrStats.totalRxBrand = 
      (1 * mrStats.brand1B) + 
      (2 * mrStats.brand2B) + 
      (3 * mrStats.brand3B);

    mrStats.totalMRs = allMRs.length;

    console.log("\n========== MR STATISTICS SUMMARY ==========");
    console.log("Brand 1B Count:", mrStats.brand1B);
    console.log("Brand 2B Count:", mrStats.brand2B);
    console.log("Brand 3B Count:", mrStats.brand3B);
    console.log("Total Score:", mrStats.totalScore);
    console.log("Total Rx Brand:", `${mrStats.brand1B} + (2×${mrStats.brand2B}) + (3×${mrStats.brand3B}) = ${mrStats.totalRxBrand}`);
    console.log("Total MRs:", mrStats.totalMRs);
    console.log("Total Approved:", mrStats.totalPrescriptions);
    console.log("Total Pending:", mrStats.totalPending);
    console.log("Total Rejected:", mrStats.totalRejected);
    console.log("Total Uploads:", mrStats.totalPrescriptions + mrStats.totalPending + mrStats.totalRejected);

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      userLevel, // FLM, SLM, or TLM
      teamName: userExists.TeamName,
      mrStats,
    });
  } catch (error) {
    console.error("❌ Error in GetCaptainDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



const CaptainLastMatchResult = async (req, res) => {
  try {
    const Id = req.params.id;

    // Check user existence in various models
    let userExists =
      (await SlmModel.findById(Id)) ||
      (await flmModel.findById(Id)) ||
      (await TlmModel.findById(Id));

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch match details
    const matchDetails = await MatchDetails.find({
      $or: [{ creatorId: userExists._id }, { membersAccepted: userExists._id }],
    }).exec();

    if (!matchDetails.length) {
      return res.status(200).json({
        success: true,
        message: "No match details found",
        results: [],
      });
    }

    // Filter past matches and sort them by date in descending order
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastMatches = matchDetails
      .filter((match) => {
        const [day, month, year] = match.startDate.split("-").map(Number);
        const startDateObj = new Date(year, month - 1, day);
        return startDateObj < today;
      })
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a.startDate.split("-").map(Number);
        const [dayB, monthB, yearB] = b.startDate.split("-").map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB - dateA; // Sort in descending order
      })
      .slice(0, 5); // Limit to the last 5 matches

    let results = [];
    pastMatches.forEach((match) => {
      const { teamA, teamB, MatchResult, startDate, _id, endDate } = match;

      let matchResult = "Draw";
      let teamAScore = 0;
      let teamBScore = 0;
      let winner = "None";
      let Id = _id;
      let present = userExists.TeamName === teamA ? "teamA" : "teamB";

      if (Array.isArray(MatchResult) && MatchResult.length > 0) {
        // Process MatchResult if present
        MatchResult.forEach((result) => {
          if (present === "teamA") {
            if (result.winner === "Team A win") {
              matchResult = "Win";
              teamAScore = result.teamAScore;
              teamBScore = result.teamBScore;
              winner = result.winner;
            } else if (result.winner === "Team B win") {
              matchResult = "Loss";
              teamAScore = result.teamAScore;
              teamBScore = result.teamBScore;
              winner = result.winner;
            }
          } else if (present === "teamB") {
            if (result.winner === "Team B win") {
              matchResult = "Win";
              teamAScore = result.teamAScore;
              teamBScore = result.teamBScore;
              winner = result.winner;
            } else if (result.winner === "Team A win") {
              matchResult = "Loss";
              teamAScore = result.teamAScore;
              teamBScore = result.teamBScore;
              winner = result.winner;
            }
          }
        });
      } else {
        // Default values when MatchResult is not present
        _id: Id;
        result: matchResult = "Draw";
        teamAScore = 0;
        teamBScore = 0;
        winner = "None";
      }

      results.push({
        _id,
        teamAScore,
        teamBScore,
        result: matchResult,
        present,
        winner,
        startDate,
        endDate,
      });
    });

    // const lastFiveMatchResults = results.slice(-5);

    // return res.status(200).json({
    //   success: true,
    //   message: "Last match results fetched successfully",
    //   results: lastFiveMatchResults,
    // });

    return res.status(200).json({
      success: true,
      message: "Last match results fetched successfully",
      results,
    });
  } catch (error) {
    console.error("Error fetching match results:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetAllTeamNames = async (req, res) => {
  try {
    const flmExists = await flmModel.find({});
    const slmExists = await SlmModel.find({});
    const tlmExists = await TlmModel.find({});

    let flmTeam = [];
    let slmTeam = [];
    let tlmTeam = [];

    for (let data of flmExists) {
      flmTeam.push(data.TeamName);
    }
    for (let data of slmExists) {
      slmTeam.push(data.TeamName);
    }
    for (let data of tlmExists) {
      tlmTeam.push(data.TeamName);
    }

    // Combine all team names and ensure uniqueness using a Set
    const allTeam = [...new Set([...flmTeam, ...slmTeam, ...tlmTeam])];

    return res.status(200).json({
      success: true,
      message: "Team names fetched successfully",
      allTeam,
    });
  } catch (error) {
    console.error("Error in GetAllTeamNames:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetOdiMatchSummary = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Check if the MR exists
    const MrExists = await mrModel.findById(mrId);
    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "MR Not Found",
      });
    }

    // Extract the score details
    const { MrScoreEachMatch = [] } = MrExists;

    // Filter matches where `isTournament` is false or not present
    const odiMatches = MrScoreEachMatch.filter((match) => !match.isTournament);

    // Calculate totals
    const Matches = odiMatches.length;
    const Runs = odiMatches.reduce(
      (sum, match) => sum + (parseInt(match.Score) || 0),
      0,
    );
    const TotalSixes = odiMatches.reduce(
      (sum, match) => sum + (parseInt(match.TotalSixes) || 0),
      0,
    );
    const TotalFours = odiMatches.reduce(
      (sum, match) => sum + (parseInt(match.TotalFours) || 0),
      0,
    );
    const BestScore = !odiMatches
      ? parseInt(MrExists.TournamentBestScore)
      : parseInt(MrExists.OdiBestScore);

    // Respond with the calculated summary
    return res.status(200).json({
      success: true,
      data: {
        TotalMatches: Matches,
        TotalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
      },
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetTournamentDataSummary = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Check if the MR exists
    const MrExists = await mrModel.findById(mrId);
    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "MR Not Found",
      });
    }

    // Extract the score details
    const { MrScoreEachMatch = [] } = MrExists;

    // Filter matches where `isTournament` is false or not present
    const odiMatches = MrScoreEachMatch.filter(
      (match) => match.isTournament === true,
    );

    // Calculate totals
    const Matches = odiMatches.length;
    const Runs = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Score) || 0),
      0,
    );

    const TotalSixes = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.TotalSixes) || 0),
      0,
    );
    const TotalFours = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.TotalFours) || 0),
      0,
    );
    const BestScore = !odiMatches
      ? parseFloat(MrExists.OdiBestScore)
      : parseFloat(MrExists.TournamentBestScore);

    // Respond with the calculated summary
    return res.status(200).json({
      success: true,
      data: {
        Matches,
        Runs,
        TotalSixes,
        TotalFours,
        BestScore,
      },
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllOdiMatchData = async (req, res) => {
  try {
    // Fetch all MRs from the database
    const allMRs = await mrModel.find({});

    // Process each MR to calculate ODI match data
    const allOdiMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], OdiBestScore, TournamentBestScore } = mr;

      // Filter matches where `isTournament` is false or not present
      const odiMatches = MrScoreEachMatch.filter(
        (match) => match.isTournament === false || !match.isTournament,
      );

      // Calculate totals
      const Matches = odiMatches.length;
      const Runs = odiMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Score) || 0),
        0,
      );
      const TotalSixes = odiMatches.reduce(
        (sum, match) => sum + (parseFloat(match.TotalSixes) || 0),
        0,
      );
      const TotalFours = odiMatches.reduce(
        (sum, match) => sum + (parseFloat(match.TotalFours) || 0),
        0,
      );

      // Determine the best score (ODI or Tournament)
      const BestScore = !odiMatches
        ? parseFloat(OdiBestScore)
        : parseFloat(TournamentBestScore);

      // Return calculated data for this MR
      return {
        MrName: mr.USERNAME,
        Matches,
        Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TeamName: mr.TEAMNAME,
      };
    });
    allOdiMatchData.sort((a, b) => b.Runs - a.Runs);

    // Respond with the calculated data for all MRs
    return res.status(200).json({
      success: true,
      data: allOdiMatchData,
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllTournamentMatchData = async (req, res) => {
  try {
    // Fetch all MRs from the database
    const allMRs = await mrModel.find({});

    // Process each MR to calculate ODI match data
    const allOdiMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], OdiBestScore, TournamentBestScore } = mr;

      // Filter matches where `isTournament` is false or not present
      const tournamentMathes = MrScoreEachMatch.filter(
        (match) => match.isTournament === true,
      );

      // Calculate totals
      const Matches = tournamentMathes.length;
      const Runs = tournamentMathes.reduce(
        (sum, match) => sum + (parseInt(match.Score) || 0),
        0,
      );
      const TotalSixes = tournamentMathes.reduce(
        (sum, match) => sum + (parseInt(match.TotalSixes) || 0),
        0,
      );
      const TotalFours = tournamentMathes.reduce(
        (sum, match) => sum + (parseInt(match.TotalFours) || 0),
        0,
      );

      // Determine the best score (ODI or Tournament)
      const BestScore = !tournamentMathes
        ? parseInt(OdiBestScore)
        : parseInt(TournamentBestScore);

      // Return calculated data for this MR
      return {
        MrName: mr.USERNAME,
        Matches,
        Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TeamName: mr.TEAMNAME,
      };
    });
    allOdiMatchData.sort((a, b) => b.Runs - a.Runs);

    // Respond with the calculated data for all MRs
    return res.status(200).json({
      success: true,
      data: allOdiMatchData,
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllOdiMatchDataTeamWise = async (req, res) => {
  try {
    // Fetch all MRs from the database
    const allMRs = await mrModel.find({});

    // Group data team-wise
    const teamWiseData = {};

    allMRs.forEach((mr) => {
      const {
        MrScoreEachMatch = [],
        OdiBestScore,
        TournamentBestScore,
        TEAMNAME,
      } = mr;

      // Filter matches where `isTournament` is false or not present
      const odiMatches = MrScoreEachMatch.filter(
        (match) => match.isTournament === false || !match.isTournament,
      );

      // Calculate totals for this MR
      const Matches = odiMatches.length;
      const Runs = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.Score) || 0),
        0,
      );
      const TotalSixes = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.TotalSixes) || 0),
        0,
      );
      const TotalFours = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.TotalFours) || 0),
        0,
      );
      const BestScore = odiMatches.reduce(
        (max, match) => Math.max(max, parseInt(match.Score) || 0),
        parseInt(OdiBestScore) || 0,
      );

      // Aggregate data by team
      if (!teamWiseData[TEAMNAME]) {
        teamWiseData[TEAMNAME] = {
          TeamName: TEAMNAME,
          Matches: 0,
          Runs: 0,
          TotalSixes: 0,
          TotalFours: 0,
          BestScore: 0,
        };
      }

      // Update team-wise totals
      teamWiseData[TEAMNAME].Matches += Matches;
      teamWiseData[TEAMNAME].Runs += Runs;
      teamWiseData[TEAMNAME].TotalSixes += TotalSixes;
      teamWiseData[TEAMNAME].TotalFours += TotalFours;
      teamWiseData[TEAMNAME].BestScore = Math.max(
        teamWiseData[TEAMNAME].BestScore,
        BestScore,
      );
    });

    // Convert team-wise data to an array and sort by Runs
    const allOdiMatchData = Object.values(teamWiseData).sort(
      (a, b) => b.Runs - a.Runs,
    );

    // Respond with the calculated data
    return res.status(200).json({
      success: true,
      data: allOdiMatchData,
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllTournamentMatchDataTeamWise = async (req, res) => {
  try {
    // Fetch all MRs from the database
    const allMRs = await mrModel.find({});

    // Group data team-wise
    const teamWiseData = {};

    allMRs.forEach((mr) => {
      const {
        MrScoreEachMatch = [],
        OdiBestScore,
        TournamentBestScore,
        TEAMNAME,
      } = mr;

      // Filter matches where `isTournament` is false or not present
      const odiMatches = MrScoreEachMatch.filter(
        (match) => match.isTournament === true,
      );

      // Calculate totals for this MR
      const Matches = odiMatches.length;
      const Runs = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.Score) || 0),
        0,
      );
      const TotalSixes = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.TotalSixes) || 0),
        0,
      );
      const TotalFours = odiMatches.reduce(
        (sum, match) => sum + (parseInt(match.TotalFours) || 0),
        0,
      );
      const BestScore = odiMatches.reduce(
        (max, match) => Math.max(max, parseInt(match.Score) || 0),
        parseInt(TournamentBestScore) || 0,
      );

      // Aggregate data by team
      if (!teamWiseData[TEAMNAME]) {
        teamWiseData[TEAMNAME] = {
          TeamName: TEAMNAME,
          Matches: 0,
          Runs: 0,
          TotalSixes: 0,
          TotalFours: 0,
          BestScore: 0,
        };
      }

      // Update team-wise totals
      teamWiseData[TEAMNAME].Matches += Matches;
      teamWiseData[TEAMNAME].Runs += Runs;
      teamWiseData[TEAMNAME].TotalSixes += TotalSixes;
      teamWiseData[TEAMNAME].TotalFours += TotalFours;
      teamWiseData[TEAMNAME].BestScore = Math.max(
        teamWiseData[TEAMNAME].BestScore,
        BestScore,
      );
    });

    // Convert team-wise data to an array and sort by Runs
    const allTournamentMatchData = Object.values(teamWiseData).sort(
      (a, b) => b.Runs - a.Runs,
    );

    // Respond with the calculated data
    return res.status(200).json({
      success: true,
      data: allTournamentMatchData,
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetQuery = async (req, res) => {
  try {
    const { mrid } = req.params;
    let userExist, userName;

    userExist = await mrModel.findById(mrid);
    if (userExist) {
      userName = userExist.USERNAME;
    }

    if (!userExist) {
      userExist = await flmModel.findById(mrid);
      if (userExist) {
        userName = userExist.BDMName;
      }
    }
    if (!userExist) {
      userExist = await SlmModel.findById(mrid);
      if (userExist) {
        userName = userExist.SLMName;
      }
    }
    if (!userExist) {
      userExist = await TlmModel.findById(mrid);
      if (userExist) {
        userName = userExist.TLMName;
      }
    }

    if (!userExist) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const supportModel = await SupportModel.find({
      MrName: userName,
    });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Success",
      supportModel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getMrRankZoneWise = async (req, res) => {
  try {
    const Zone = req.params.zone;
    if (!Zone) {
      return res.status(404).json({
        success: false,
        message: "Zone is Not Found",
      });
    }

    const FindMrs = await mrModel
      .find({ ZONE: Zone })
      .select("_id USERNAME TotalMatches TotalScore TEAMNAME ZONE")
      .lean();

    if (!FindMrs || FindMrs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Mr Not Found For Particular Zone",
      });
    }

    // Convert TotalScore to a number and sort by TotalScore in descending order
    FindMrs.forEach((mr) => (mr.TotalScore = Number(mr.TotalScore)));
    FindMrs.sort((a, b) => b.TotalScore - a.TotalScore);

    // Format the data to match the required structure
    const formattedData = FindMrs.map((mr) => ({
      MrName: mr.USERNAME,
      TeamName: mr.TEAMNAME,
      ZONE: mr.ZONE,
      Matches: parseInt(mr.TotalMatches),
      Runs: mr.TotalScore,
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getMrRankMonthWise = async (req, res) => {
  try {
    const Month = req.params.month;
    const Year = req.params.year;

    if (!Month) {
      return res
        .status(404)
        .json({ success: false, message: "Month is Not Found" });
    }
    if (!Year) {
      return res
        .status(404)
        .json({ success: false, message: "Year is Not Found" });
    }

    // Convert month name to a number (e.g., "Jan" → "01", "Feb" → "02", etc.)
    const monthMap = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const monthNumber = monthMap[Month];

    if (!monthNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Month Name" });
    }

    const allMRs = await mrModel.find({});

    const results = allMRs.map((mr) => {
      const { USERNAME, TEAMNAME, MrScoreEachMatch = [], ZONE } = mr;

      // Filter matches for the given month and year
      const filteredMatches = MrScoreEachMatch.filter(({ MatchDate }) => {
        if (!MatchDate) return false;
        const [day, month, year] = MatchDate.split("-");
        return month === monthNumber && year === Year;
      });

      // Aggregate stats
      const Matches = filteredMatches.length;
      const Runs = filteredMatches.reduce(
        (sum, match) => sum + Number(match.Score || 0),
        0,
      );
      const TotalFours = filteredMatches.reduce(
        (sum, match) => sum + Number(match.TotalFours || 0),
        0,
      );
      const TotalSixes = filteredMatches.reduce(
        (sum, match) => sum + Number(match.TotalSixes || 0),
        0,
      );

      return {
        MrName: USERNAME,
        TeamName: TEAMNAME,
        Matches,
        Runs,
        TotalFours,
        TotalSixes,
        ZONE,
      };
    });

    // **Sort in Ascending Order based on Runs**
    results.sort((a, b) => b.Runs - a.Runs);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// const getAdminUploadMatchesMonthWise = async (req, res) => {
//   try {
//     const { monthName, year, companyName, teamName } = req.params;

//     // Step 1: Check if company exists
//     const companyData = await CompanyMonthProvide.findOne({ CompanyName: companyName });
//     if (!companyData || !companyData.isProvide) {
//       return res.status(404).json({ success: false, message: "Company Not Exists" });
//     }

//     // Step 2: Find MrModel data (all MRs in the company)
//     const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

//     // Month mapping
//     const monthMap = {
//       january: "01", february: "02", march: "03", april: "04",
//       may: "05", june: "06", july: "07", august: "08",
//       september: "09", october: "10", november: "11", december: "12",
//     };

//     const formattedMonth = monthMap[monthName.toLowerCase()];

//     let teamScores = {};  // Stores team scores
//     let matchDates = {};  // Stores match dates

//     // Step 3: Iterate through all MR records and collect scores
//     mrRecords.forEach((mr) => {
//       if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
//         mr.MrScoreEachMatch.forEach((match) => {
//           const [day, matchMonth, matchYear] = match.MatchDate.split('-');

//           if (matchMonth === formattedMonth && matchYear === year && match.isAdminUpload) {
//             const currentTeam = mr.TEAMNAME;
//             const score = Number(match.Score); // Convert to number

//             if (!teamScores[currentTeam]) {
//               teamScores[currentTeam] = 0;  // Initialize score
//               matchDates[currentTeam] = match.MatchDate; // Store match date
//             }

//             teamScores[currentTeam] += score; // Sum up scores
//           }
//         });
//       }
//     });

//     // Ensure all teams in the company are included (even if they have no score)
//     let allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));

//     // Step 4: Prepare the final comparison result
//     let result = [];

//     allTeams.forEach((teamB) => {
//       if (teamB !== teamName) { // Exclude TeamA from TeamB
//         const teamAScore = teamScores[teamName] || 0; // TeamA's total score
//         const teamBScore = teamScores[teamB] || 0; // TeamB's total score (default to 0)
//         let winningMessage;

//         if (teamAScore > teamBScore) {
//           winningMessage = `${teamName} won by ${teamAScore - teamBScore} runs`;
//         } else if (teamBScore > teamAScore) {
//           winningMessage = `${teamB} won by ${teamBScore - teamAScore} runs`;
//         } else {
//           winningMessage = "Match Draw";
//         }

//         result.push({
//           TeamA: teamName,
//           TeamB: teamB,  // **Fixed: Ensuring TeamB is assigned correctly**
//           TeamAScore: teamAScore,
//           TeamBScore: teamBScore,
//           MatchDates: matchDates[teamName] || "-", // Use TeamA's match date
//           Winner: winningMessage,
//         });
//       }
//     });

//     return res.status(200).json({ success: true, data: result });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// const getUserDetailsCompanyWise = async (req, res) => {
//   try {
//     const { monthName, year, companyName, teamName } = req.params;

//     // Step 1: Check if company exists
//     const companyData = await CompanyMonthProvide.findOne({ CompanyName: companyName });
//     if (!companyData || !companyData.isProvide) {
//       return res.status(404).json({ success: false, message: "Company Not Exists" });
//     }

//     // Step 2: Find only MR records under this company and team
//     const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName, TEAMNAME: teamName });

//     if (!mrRecords.length) {
//       return res.status(404).json({ success: false, message: "No MR records found for this company and team" });
//     }

//     // Month mapping
//     const monthMap = {
//       january: "01", february: "02", march: "03", april: "04",
//       may: "05", june: "06", july: "07", august: "08",
//       september: "09", october: "10", november: "11", december: "12",
//     };

//     const formattedMonth = monthMap[monthName.toLowerCase()];
//     let result = [];

//     // Step 3: Iterate through all MR records and extract required details
//     mrRecords.forEach((mr) => {
//       if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
//         mr.MrScoreEachMatch.forEach((match) => {
//           const [day, matchMonth, matchYear] = match.MatchDate.split('-');

//           if (matchMonth === formattedMonth && matchYear === year) {
//             result.push({
//               id: mr._id,
//               MRName: mr.USERNAME,
//               Score: Number(match.Score) || 0,
//               TotalFours: Number(match.TotalFours) || 0,
//               TotalSixes: Number(match.TotalSixes) || 0,
//               Time: match.TimeOfUpload,
//               MatchDates: match.MatchDate,
//               TeamName: mr.TEAMNAME
//             });
//           }
//         });
//       } else {
//         // If MR has no match records, still include them with default values
//         result.push({
//           MRName: mr.USERNAME,
//           Score: 0,
//           TimeOfUpload: 0,
//           TotalFours: 0,
//           TotalSixes: 0,
//           MatchDates: "-",
//           TeamName: mr.TEAMNAME
//         });
//       }
//     });

//     // Sort by MatchDates in ascending order
//     result.sort((a, b) => {
//       if (a.MatchDates === "-") return 1; // Keep empty dates at the end
//       if (b.MatchDates === "-") return -1;
//       return new Date(b.Score) - new Date(a.Score);
//     });

//     return res.status(200).json({ success: true, data: result });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

const getAdminUploadMatchesMonthWise = async (req, res) => {
  try {
    const { monthName, year, companyName, teamName } = req.params;

    // Step 1: Check if company exists
    const companyData = await CompanyMonthProvide.findOne({
      CompanyName: companyName,
    });
    if (!companyData || !companyData.isProvide) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Exists" });
    }

    // Step 2: Find MrModel data (all MRs in the company)
    const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

    // Month mapping
    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const formattedMonth = monthMap[monthName.toLowerCase()];
    let teamScores = {}; // Stores team scores
    let matchDates = {}; // Stores match dates

    let hasValidMatch = false; // Flag to check if any match meets the condition

    // Step 3: Iterate through all MR records and collect scores
    mrRecords.forEach((mr) => {
      if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
        mr.MrScoreEachMatch.forEach((match) => {
          const [day, matchMonth, matchYear] = match.MatchDate.split("-");

          if (
            matchMonth === formattedMonth &&
            matchYear === year &&
            match.isAdminUpload
          ) {
            hasValidMatch = true; // Set flag to true if we have at least one valid match
            const currentTeam = mr.TEAMNAME;
            const score = Number(match.Score); // Convert to number

            if (!teamScores[currentTeam]) {
              teamScores[currentTeam] = 0; // Initialize score
              matchDates[currentTeam] = match.MatchDate; // Store match date
            }

            teamScores[currentTeam] += score; // Sum up scores
          }
        });
      }
    });

    // If no valid matches found, return an empty array
    if (!hasValidMatch) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Ensure all teams in the company are included (even if they have no score)
    let allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));

    // Step 4: Prepare the final comparison result
    let result = [];

    allTeams.forEach((teamB) => {
      if (teamB !== teamName) {
        // Exclude TeamA from TeamB
        const teamAScore = teamScores[teamName] || 0; // TeamA's total score
        const teamBScore = teamScores[teamB] || 0; // TeamB's total score (default to 0)
        let winningMessage;

        if (teamAScore > teamBScore) {
          winningMessage = `${teamName} won by ${teamAScore - teamBScore} runs`;
        } else if (teamBScore > teamAScore) {
          winningMessage = `${teamB} won by ${teamBScore - teamAScore} runs`;
        } else {
          winningMessage = "Match Draw";
        }

        result.push({
          TeamA: teamName,
          TeamB: teamB,
          TeamAScore: teamAScore,
          TeamBScore: teamBScore,
          MatchDates: matchDates[teamName] || "-", // Use TeamA's match date
          Winner: winningMessage,
        });
      }
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUserDetailsCompanyWise = async (req, res) => {
  try {
    const { monthName, year, companyName, teamName } = req.params;

    // Step 1: Check if company exists
    const companyData = await CompanyMonthProvide.findOne({
      CompanyName: companyName,
    });
    if (!companyData || !companyData.isProvide) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Exists" });
    }

    // Step 2: Find only MR records under this company and team
    const mrRecords = await mrModel.find({
      BUSINESSUNIT: companyName,
      TEAMNAME: teamName,
    });

    if (!mrRecords.length) {
      return res.status(404).json({
        success: false,
        message: "No MR records found for this company and team",
      });
    }

    // Month mapping
    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const formattedMonth = monthMap[monthName.toLowerCase()];
    let aggregatedResults = new Map();

    // Step 3: Iterate through all MR records and aggregate required details
    mrRecords.forEach((mr) => {
      if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
        mr.MrScoreEachMatch.forEach((match) => {
          const [day, matchMonth, matchYear] = match.MatchDate.split("-");

          if (matchMonth === formattedMonth && matchYear === year) {
            const id = mr._id.toString();

            if (!aggregatedResults.has(id)) {
              aggregatedResults.set(id, {
                id: id,
                MRName: mr.USERNAME,
                Score: 0,
                TotalFours: 0,
                TotalSixes: 0,
                Time: match.TimeOfUpload,
                MatchDates: match.MatchDate,
                TeamName: mr.TEAMNAME,
              });
            }

            let existing = aggregatedResults.get(id);
            existing.Score += Number(match.Score) || 0;
            existing.TotalFours += Number(match.TotalFours) || 0;
            existing.TotalSixes += Number(match.TotalSixes) || 0;
            // existing.MatchDates.add(match.MatchDate); // Store unique match dates
          }
        });
      } else {
        // If MR has no match records, still include them with default values
        const id = mr._id.toString();
        if (!aggregatedResults.has(id)) {
          aggregatedResults.set(id, {
            id: id,
            MRName: mr.USERNAME,
            Score: 0,
            TotalFours: 0,
            TotalSixes: 0,
            Time: null,
            MatchDates: "-",
            TeamName: mr.TEAMNAME,
          });
        }
      }
    });

    // Convert Set of MatchDates to array and sort records by Score
    let result = Array.from(aggregatedResults.values()).map((item) => ({
      ...item,
      MatchDates: item.MatchDates, // Convert Set to string
    }));

    // Sort by Score in descending order
    result.sort((a, b) => b.Score - a.Score);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const getAllCompanyMonths = async (req, res) => {
  try {
    const CompanyName = req.params.companyName;
    const findCompanyMonths = await CompanyMonthProvide.find({ CompanyName });
    if (!findCompanyMonths.length > 0) {
      return res.status(200).json({
        success: false,
        message: "Company Not Found",
      });
    }

    return res.status(200).json({
      data: findCompanyMonths,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const getAdminUploadLastMatchResults = async (req, res) => {
  try {
    const MrId = req.params.mrId;
    const MrExists = await mrModel.findById(MrId);

    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "Mr Not Found",
      });
    }

    // Filter records where isAdminUpload is true and return only Score
    const filteredMatches =
      MrExists.MrScoreEachMatch?.filter((match) => match.isAdminUpload).map(
        (match) => ({ Score: match.Score }),
      ) || [];

    return res.status(200).json({
      success: true,
      message: "Fetch Data Success",
      data: filteredMatches,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getMrRankMonthWiseZoneWise = async (req, res) => {
  try {
    const { month: Month, year: Year, zone: Zone } = req.params;

    if (!Month) {
      return res
        .status(404)
        .json({ success: false, message: "Month is Not Found" });
    }
    if (!Year) {
      return res
        .status(404)
        .json({ success: false, message: "Year is Not Found" });
    }
    if (!Zone) {
      return res
        .status(404)
        .json({ success: false, message: "Zone is Not Found" });
    }

    // Convert month name to a number (e.g., "Jan" → "01", "Feb" → "02", etc.)
    const monthMap = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const monthNumber = monthMap[Month];

    if (!monthNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Month Name" });
    }

    // Fetch all MRs belonging to the given Zone
    const allMRs = await mrModel.find({ ZONE: { $in: [Zone] } });

    const results = allMRs.map((mr) => {
      const { USERNAME, TEAMNAME, MrScoreEachMatch = [], ZONE } = mr;

      // Filter matches for the given month and year
      const filteredMatches = Array.isArray(MrScoreEachMatch)
        ? MrScoreEachMatch.filter(({ MatchDate }) => {
            if (!MatchDate) return false;
            const [day, month, year] = MatchDate.split("-");
            return month === monthNumber && year === Year;
          })
        : [];

      // Aggregate stats
      const Matches = filteredMatches.length;
      const Runs = filteredMatches.reduce(
        (sum, match) => sum + Number(match.Score || 0),
        0,
      );
      const TotalFours = filteredMatches.reduce(
        (sum, match) => sum + Number(match.TotalFours || 0),
        0,
      );
      const TotalSixes = filteredMatches.reduce(
        (sum, match) => sum + Number(match.TotalSixes || 0),
        0,
      );

      return {
        MrName: USERNAME,
        TeamName: TEAMNAME,
        Matches,
        Runs,
        TotalFours,
        TotalSixes,
        ZONE,
      };
    });

    // **Sort in Descending Order based on Runs**
    results.sort((a, b) => b.Runs - a.Runs);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// const TrackUserReportEachDay = async (req, res) => {
//   try {
//     console.log('Incoming Data:', req.body);

//     // Ensure req.body is an array and extract the first object
//     if (!Array.isArray(req.body) || req.body.length === 0) {
//       return res.status(400).json({ success: false, message: "Invalid request data" });
//     }

//     const userData = req.body[0]; // Get the first object in the array
//     const { Id, date, ObjId, mrId, mrName, updatedTimeSpentInSeconds } = userData;

//     if (!Id || !date || !ObjId || !mrId || !mrName || !updatedTimeSpentInSeconds) {
//       return res.status(400).json({ success: false, message: "Missing required fields" });
//     }

//     const userTrackData = {
//       Id,
//       today: date,
//       ObjId,
//       mrId,
//       mrName,
//       startTime,
//       endTime,
//       formattedScreenTime: updatedTimeSpentInSeconds,
//     };

//     console.log('Data to be Stored:', userTrackData);

//     // Find the document based on mrId and update it
//     const updatedUserTrack = await UserTrackageModel.findOneAndUpdate(
//       {}, // Use mrId to find the correct document
//       { $push: { UserTrackSummary: userTrackData } },
//       { new: true, upsert: true } // Return updated doc, create if not exists
//     );

//     console.log('Updated Document:', updatedUserTrack);

//     return res.status(200).json({
//       success: true,
//       message: "User Added Successfully",
//       data: updatedUserTrack,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const TrackUserReportEachDay = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data" });
    }

    let updatedUserTrack;

    for (const userData of req.body) {
      const {
        Id,
        date,
        ObjId,
        mrId,
        mrName,
        startTime,
        endTime,
        updatedTimeSpentInSeconds,
        companyName,
      } = userData;

      if (!Id || !date || !ObjId || !mrId || !mrName) {
        console.warn(`Skipping entry due to missing fields:`, userData);
        continue; // Skip invalid entries
      }

      const userTrackData = {
        Id,
        today: date,
        ObjId,
        mrId,
        mrName,
        startTime,
        endTime,
        formattedScreenTime: updatedTimeSpentInSeconds,
        companyName,
      };

      // Store each entry in the database
      updatedUserTrack = await UserTrackageModel.findOneAndUpdate(
        {}, // Find document based on mrId and date
        { $push: { UserTrackSummary: userTrackData } }, // Push data into array
        { new: true, upsert: true }, // Return updated doc, create if not exists
      );
    }

    return res.status(200).json({
      success: true,
      message: "User Data Added Successfully",
      data: updatedUserTrack,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllUsersFromDatabase = async (req, res) => {
  try {
    const companyName = req.params.companyName;
    const UserData = await mrModel
      .find({ BUSINESSUNIT: companyName })
      .select(
        "_id MRID USERNAME PASSWORD HQ REGION ZONE TEAMNAME BUSINESSUNIT updatedAt",
      );
    if (!UserData) {
      return res.status(404).json({
        success: false,
        message: "Mr Not Found",
      });
    }

    // Add Role = "MR" to each object
    const updatedUserData = UserData.map((user) => ({
      ...user.toObject(), // Convert Mongoose document to plain JS object
      Role: "MR",
    }));

    const mrIds = UserData.map((user) => user._id);

    // Step 4: Find FLMs where any MR id is in the MRs array
    const flmUsers = await flmModel
      .find({ Mrs: { $in: mrIds } })
      .select(
        "_id FLMEmpID BDMName Password HQ REGION ZONE TeamName createdAt updatedAt",
      );

    // Step 5: Add Role = "FLM" to each FLM
    const updatedFlmUsers = flmUsers.map((flm) => ({
      ...flm.toObject(),
      Role: "FLM",
    }));

    const flmIds = flmUsers.map((flm) => flm._id);

    const slmUsers = await SlmModel.find({ Flm: { $in: flmIds } }).select(
      "_id SLMEmpID SLMName Password HQ REGION ZONE TeamName createdAt updatedAt",
    );

    // Step 5: Add Role = "FLM" to each FLM
    const updatedSlmUsers = slmUsers.map((slm) => ({
      ...slm.toObject(),
      Role: "SLM",
    }));

    const slmIds = slmUsers.map((flm) => flm._id);

    const tlmUsers = await TlmModel.find({ Slm: { $in: slmIds } }).select(
      "_id TLMEmpID TLMName Password HQ ZONE TeamName createdAt updatedAt",
    );

    // Step 5: Add Role = "FLM" to each FLM
    const updatedSTlmUsers = tlmUsers.map((tlm) => ({
      ...tlm.toObject(),
      Role: "TLM",
    }));

    const allUsers = [
      ...updatedUserData,
      ...updatedFlmUsers,
      ...updatedSlmUsers,
      ...updatedSTlmUsers,
    ];

    return res.status(200).json({
      success: true,
      message: "Data Fetched Success",
      data: allUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUserDataSingleUser = async (req, res) => {
  try {
    const Id = req.params.id;
    const Role = req.params.role;
    let userDetails;

    if (Role === "TLM") {
      userDetails = await TlmModel.findById(Id);
      if (!userDetails) {
        res.status(404).json({
          success: false,
          message: "Tlm Not Found",
        });
      }
      userDetails = {
        ...userDetails.toObject(),
        Role: "TLM",
      };
    } else if (Role === "SLM") {
      userDetails = await SlmModel.findById(Id);
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: "Slm Not Found",
        });
      }
      userDetails = {
        ...userDetails.toObject(),
        Role: "SLM",
      };
    } else if (Role === "FLM") {
      userDetails = await FlmModel.findById(Id);
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: "Flm Not Found",
        });
      }
      userDetails = {
        ...userDetails.toObject(),
        Role: "FLM",
      };
    } else if (Role === "MR") {
      userDetails = await mrModel.findById(Id);
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: "MR Not Found",
        });
      }
      userDetails = {
        ...userDetails.toObject(),
        Role: "MR",
      };
    } else {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(202).json({
      success: true,
      message: "Get User Data Success",
      User: userDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const UpdateUserDataSingleUser = async (req, res) => {
  try {
    const Id = req.params.id;
    const Role = req.params.role;
    let userDetails;
    const { UserId, Name, HQ, Region, Zone, TeamName } = req.body;

    if (Role === "TLM") {
      userDetails = await TlmModel.findByIdAndUpdate(
        { _id: Id },
        {
          TLMEmpID: UserId,
          TLMName: Name,
          HQ: HQ,
          ZONE: Zone,
          TeamName: TeamName,
        },
      );
      userDetails.save();
    } else if (Role === "SLM") {
      userDetails = await SlmModel.findByIdAndUpdate(
        { _id: Id },
        {
          SLMEmpID: UserId,
          SLMName: Name,
          REGION: Region,
          HQ: HQ,
          ZONE: Zone,
          TeamName: TeamName,
        },
      );
      userDetails.save();
    } else if (Role === "FLM") {
      userDetails = await FlmModel.findByIdAndUpdate(
        { _id: Id },
        {
          FLMEmpID: UserId,
          BDMName: Name,
          REGION: Region,
          HQ: HQ,
          ZONE: Zone,
          TeamName: TeamName,
        },
      );
      userDetails.save();
    } else if (Role === "MR") {
      userDetails = await mrModel.findByIdAndUpdate(
        { _id: Id },
        {
          MRID: UserId,
          USERNAME: Name,
          REGION: Region,
          HQ: HQ,
          ZONE: Zone,
          TEAMNAME: TeamName,
        },
      );
      userDetails.save();
    } else {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(202).json({
      success: true,
      message: "User Updated Success",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetZoneWiseTopScorerNpl = async (req, res) => {
  try {
    const { Zone, MonthName, companyName } = req.params;

    // Convert month name to number (January -> 01, February -> 02, etc.)
    const monthMap = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };
    const monthNumber = monthMap[MonthName];

    if (!monthNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid month name provided",
      });
    }

    // Find all MRs with their scores
    const mrs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        ZONE: Zone,
      })
      .select("_id MRID USERNAME MrScoreEachMatch HQ TEAMNAME profileImage");

    if (!mrs || mrs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No MRs found for the given zone and company",
      });
    }

    // Process each MR's scores
    const scorers = mrs
      .map((mr) => {
        const monthlyScores = mr.MrScoreEachMatch.filter((score) => {
          const scoreMonth = score.MatchDate.split("-")[1]; // Get month part from dd-mm-yyyy
          return scoreMonth === monthNumber;
        });

        // Convert scores to numbers before summing
        const totalScore = monthlyScores.reduce((sum, score) => {
          return sum + (Number(score.Score) || 0);
        }, 0);

        const matchesPlayed = monthlyScores.length;

        return {
          mrId: mr._id,
          mrCode: mr.MRID,
          mrName: mr.USERNAME,
          totalScore: totalScore, // This will now be a number
          Hq: mr.HQ,
          TeamName: mr.TEAMNAME,
          Image: mr.profileImage,
          matchesPlayed,
        };
      })
      .filter((scorer) => scorer.matchesPlayed > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: scorers,
      message: "Top scorers retrieved successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetRegionWiseTopScorerNpl = async (req, res) => {
  try {
    const { Region, MonthName, companyName } = req.params;

    // Convert month name to number (January -> 01, February -> 02, etc.)
    const monthMap = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };
    const monthNumber = monthMap[MonthName];

    if (!monthNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid month name provided",
      });
    }

    // Find all MRs with their scores
    const mrs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        REGION: Region,
      })
      .select("_id MRID USERNAME MrScoreEachMatch HQ TEAMNAME profileImage");

    if (!mrs || mrs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No MRs found for the given Region and company",
      });
    }

    // Process each MR's scores
    const scorers = mrs
      .map((mr) => {
        const monthlyScores = mr.MrScoreEachMatch.filter((score) => {
          const scoreMonth = score.MatchDate.split("-")[1]; // Get month part from dd-mm-yyyy
          return scoreMonth === monthNumber;
        });

        // Convert scores to numbers before summing
        const totalScore = monthlyScores.reduce((sum, score) => {
          return sum + (Number(score.Score) || 0);
        }, 0);

        const matchesPlayed = monthlyScores.length;

        return {
          mrId: mr._id,
          mrCode: mr.MRID,
          mrName: mr.USERNAME,
          totalScore: totalScore, // This will now be a number
          Hq: mr.HQ,
          TeamName: mr.TEAMNAME,
          Image: mr.profileImage,
          matchesPlayed,
        };
      })
      .filter((scorer) => scorer.matchesPlayed > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: scorers,
      message: "Top scorers retrieved successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const getAdminUploadMatchesMonthWiseNpl = async (req, res) => {
//   try {
//     const { monthName, year, companyName, teamName,brandName } = req.params;

//     // Step 1: Check if company exists
//     const companyData = await CompanyMonthProvide.findOne({
//       CompanyName: companyName,
//     });
//     if (!companyData || !companyData.isProvide) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Company Not Exists" });
//     }

//     // Step 2: Find MrModel data (all MRs in the company)
//     const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

//     // Month mapping
//     const monthMap = {
//       january: "01",
//       february: "02",
//       march: "03",
//       april: "04",
//       may: "05",
//       june: "06",
//       july: "07",
//       august: "08",
//       september: "09",
//       october: "10",
//       november: "11",
//       december: "12",
//     };

//     const formattedMonth = monthMap[monthName.toLowerCase()];
//     let teamScores = {}; // Stores team scores
//     let matchDates = {}; // Stores match dates

//     let hasValidMatch = false; // Flag to check if any match meets the condition

//     // Step 3: Iterate through all MR records and collect scores
//     mrRecords.forEach((mr) => {
//       if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
//         mr.MrScoreEachMatch.forEach((match) => {
//           const [day, matchMonth, matchYear] = match.MatchDate.split("-");

//           if (
//             matchMonth === formattedMonth &&
//             matchYear === year &&
//             match.isAdminUpload
//           ) {
//             hasValidMatch = true; // Set flag to true if we have at least one valid match
//             const currentTeam = mr.TEAMNAME;
//             const score = Number(match.Score); // Convert to number

//             if (!teamScores[currentTeam]) {
//               teamScores[currentTeam] = 0; // Initialize score
//               matchDates[currentTeam] = match.MatchDate; // Store match date
//             }

//             teamScores[currentTeam] += score; // Sum up scores
//           }
//         });
//       }
//     });

//     // If no valid matches found, return an empty array
//     if (!hasValidMatch) {
//       return res.status(200).json({ success: true, data: [] });
//     }

//     // Ensure all teams in the company are included (even if they have no score)
//     let allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));

//     // Step 4: Prepare the final comparison result
//     let result = [];

//     allTeams.forEach((teamB) => {
//       if (teamB !== teamName) {
//         // Exclude TeamA from TeamB
//         const teamAScore = teamScores[teamName] || 0; // TeamA's total score
//         const teamBScore = teamScores[teamB] || 0; // TeamB's total score (default to 0)
//         let winningMessage;

//         if (teamAScore > teamBScore) {
//           winningMessage = `${teamName} won by ${teamAScore - teamBScore} runs`;
//         } else if (teamBScore > teamAScore) {
//           winningMessage = `${teamB} won by ${teamBScore - teamAScore} runs`;
//         } else {
//           winningMessage = "Match Draw";
//         }

//         result.push({
//           TeamA: teamName,
//           TeamB: teamB,
//           TeamAScore: teamAScore,
//           TeamBScore: teamBScore,
//           MatchDates: matchDates[teamName] || "-", // Use TeamA's match date
//           Winner: winningMessage,
//         });
//       }
//     });

//     return res.status(200).json({ success: true, data: result });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const getAdminUploadMatchesMonthWiseNpl = async (req, res) => {
  try {
    const { monthName, year, companyName, teamName, brandName } = req.params;

    // Step 1: Check if company exists
    const companyData = await CompanyMonthProvide.findOne({
      CompanyName: companyName,
    });
    if (!companyData || !companyData.isProvide) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Exists" });
    }

    // Step 2: Find MrModel data (all MRs in the company)
    const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

    // Month mapping
    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const formattedMonth = monthMap[monthName.toLowerCase()];
    let teamScores = {}; // Stores team scores
    let matchDates = {}; // Stores match dates

    let hasValidMatch = false; // Flag to check if any match meets the condition

    // Step 3: Iterate through all MR records and collect scores
    mrRecords.forEach((mr) => {
      if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
        mr.MrScoreEachMatch.forEach((match) => {
          const [day, matchMonth, matchYear] = match.MatchDate.split("-");

          if (
            matchMonth === formattedMonth &&
            matchYear === year &&
            match.isAdminUpload
          ) {
            hasValidMatch = true; // Set flag to true if we have at least one valid match
            const currentTeam = mr.TEAMNAME;

            // Determine which score to use based on brandName
            let score;
            if (brandName === "Nucoxia") {
              score = Number(match.Brand1Score || 0);
            } else if (brandName === "ONG") {
              score = Number(match.Brand2Score || 0);
            } else {
              score = Number(match.Score || 0); // Default to original Score field
            }

            if (!teamScores[currentTeam]) {
              teamScores[currentTeam] = 0; // Initialize score
              matchDates[currentTeam] = match.MatchDate; // Store match date
            }

            teamScores[currentTeam] += score; // Sum up scores
          }
        });
      }
    });

    // If no valid matches found, return an empty array
    if (!hasValidMatch) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Ensure all teams in the company are included (even if they have no score)
    let allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));

    // Step 4: Prepare the final comparison result
    let result = [];

    allTeams.forEach((teamB) => {
      if (teamB !== teamName) {
        // Exclude TeamA from TeamB
        const teamAScore = teamScores[teamName] || 0; // TeamA's total score
        const teamBScore = teamScores[teamB] || 0; // TeamB's total score (default to 0)
        let winningMessage;

        if (teamAScore > teamBScore) {
          winningMessage = `${teamName} won by ${teamAScore - teamBScore} runs`;
        } else if (teamBScore > teamAScore) {
          winningMessage = `${teamB} won by ${teamBScore - teamAScore} runs`;
        } else {
          winningMessage = "Match Draw";
        }

        result.push({
          TeamA: teamName,
          TeamB: teamB,
          TeamAScore: teamAScore,
          TeamBScore: teamBScore,
          MatchDates: matchDates[teamName] || "-", // Use TeamA's match date
          Winner: winningMessage,
          BrandUsedForScore: brandName || "Default", // Add which brand was used for scoring
        });
      }
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// const getAdminUploadMatchesNplQTR = async (req, res) => {
//   try {
//     const { monthName, companyName, teamName, brandName } = req.params;

//     const companyData = await CompanyMonthProvide.findOne({
//       CompanyName: companyName,
//     });

//     if (!companyData || !companyData.isProvide) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Company Not Exists" });
//     }

//     const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

//     const monthMap = {
//       january: "01",
//       february: "02",
//       march: "03",
//       april: "04",
//       may: "05",
//       june: "06",
//       july: "07",
//       august: "08",
//       september: "09",
//       october: "10",
//       november: "11",
//       december: "12",
//     };

//     // Define quarters
//     const quarterMap = {
//       q1: ["01", "02", "03"], // Jan, Feb, Mar
//       q2: ["04", "05", "06"], // Apr, May, Jun
//       q3: ["07", "08", "09"], // Jul, Aug, Sep
//       q4: ["10", "11", "12"], // Oct, Nov, Dec
//     };

//     const lowerMonthName = monthName.toLowerCase();
//     let targetMonths = [];
//     let isQuarter = false;

//     if (quarterMap[lowerMonthName]) {
//       targetMonths = quarterMap[lowerMonthName];
//       isQuarter = true;
//     } else if (monthMap[lowerMonthName]) {
//       targetMonths = [monthMap[lowerMonthName]];
//     } else {
//       return res.status(400).json({ success: false, message: "Invalid month or quarter" });
//     }

//     let teamScores = {};
//     let matchDates = {};
//     let hasValidMatch = false;

//     mrRecords.forEach((mr) => {
//       if (mr.MrScoreEachMatch && Array.isArray(mr.MrScoreEachMatch)) {
//         mr.MrScoreEachMatch.forEach((match) => {
//           const [day, matchMonth, matchYear] = match.MatchDate.split("-");

//           if (
//             targetMonths.includes(matchMonth) &&
//             matchYear === "2025" &&
//             match.isAdminUpload
//           ) {
//             hasValidMatch = true;
//             const currentTeam = mr.TEAMNAME;

//             let score;
//             score = parseFloat(match.Score || 0);

//             if (!teamScores[currentTeam]) {
//               teamScores[currentTeam] = 0;
//               matchDates[currentTeam] = match.MatchDate;
//             }

//             teamScores[currentTeam] += score;
//           }
//         });
//       }
//     });

//     if (!hasValidMatch) {
//       return res.status(200).json({ success: true, data: [] });
//     }

//     let allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));
//     let result = [];

//     allTeams.forEach((teamB) => {
//       if (teamB !== teamName) {
//         let teamAScore = teamScores[teamName] || 0;
//         let teamBScore = teamScores[teamB] || 0;

//         // Divide scores by 3 if it's a quarter
//         if (isQuarter) {
//           teamAScore = teamAScore / 3;
//           teamBScore = teamBScore / 3;
//         }

//         let winningMessage;

//         if (teamAScore > teamBScore) {
//           winningMessage = `${teamName} won by ${(teamAScore - teamBScore)} runs`;
//         } else if (teamBScore > teamAScore) {
//           winningMessage = `${teamB} won by ${(teamBScore - teamAScore)} runs`;
//         } else {
//           winningMessage = "Match Draw";
//         }

//         result.push({
//           TeamA: teamName,
//           TeamB: teamB,
//           TeamAScore: teamAScore,
//           TeamBScore: teamBScore,
//           MatchDates: matchDates[teamName] || "-",
//           Winner: winningMessage,
//         });
//       }
//     });

//     return res.status(200).json({ success: true, data: result });
//   } catch (error) {
//     console.error("Error in getAdminUploadMatchesNplQTR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const getAdminUploadMatchesNplQTR = async (req, res) => {
  try {
    const { monthName, companyName, teamName, brandName } = req.params;

    const companyData = await CompanyMonthProvide.findOne({
      CompanyName: companyName,
    });

    if (!companyData || !companyData.isProvide) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Exists" });
    }

    const mrRecords = await mrModel.find({ BUSINESSUNIT: companyName });

    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const lowerMonthName = monthName.toLowerCase();
    const upperMonthName = monthName.toUpperCase();

    const isQuarter = ["Q1", "Q2", "Q3", "Q4"].includes(upperMonthName);
    const targetMonth = isQuarter ? upperMonthName : monthMap[lowerMonthName];

    if (!targetMonth) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid month or quarter" });
    }

    let teamScores = {};
    let matchDates = {};
    let hasValidMatch = false;

    // Iterate MRs and gather scores
    mrRecords.forEach((mr) => {
      if (Array.isArray(mr.MrScoreEachMatch)) {
        mr.MrScoreEachMatch.forEach((match) => {
          const matchDate = match.MatchDate;

          const isValid = isQuarter
            ? matchDate === targetMonth
            : (() => {
                const parts = matchDate.split("-");
                return parts[1] === targetMonth && parts[2] === "2025";
              })();

          if (isValid && match.isAdminUpload) {
            hasValidMatch = true;
            const currentTeam = mr.TEAMNAME;

            let score = 0;

            if (brandName === "ONG") {
              score = parseFloat(match.Brand2Score || 0);
            } else if (brandName === "Nucoxia") {
              score = parseFloat(match.Brand1Score || 0);
            } else {
              score = parseFloat(match.Score || 0);
            }

            if (!teamScores[currentTeam]) {
              teamScores[currentTeam] = 0;
              matchDates[currentTeam] = match.MatchDate;
            }

            teamScores[currentTeam] += score;
          }
        });
      }
    });

    if (!hasValidMatch) {
      return res.status(200).json({ success: true, data: [] });
    }

    const allTeams = new Set(mrRecords.map((mr) => mr.TEAMNAME));
    const result = [];

    allTeams.forEach((teamB) => {
      if (teamB !== teamName) {
        const teamAScore = teamScores[teamName] || 0;
        const teamBScore = teamScores[teamB] || 0;

        let winningMessage;

        if (teamAScore > teamBScore) {
          winningMessage = `${teamName} won by ${teamAScore - teamBScore} runs`;
        } else if (teamBScore > teamAScore) {
          winningMessage = `${teamB} won by ${teamBScore - teamAScore} runs`;
        } else {
          winningMessage = "Match Draw";
        }

        result.push({
          TeamA: teamName,
          TeamB: teamB,
          TeamAScore: teamAScore,
          TeamBScore: teamBScore,
          MatchDates: matchDates[teamName] || "-",
          Winner: winningMessage,
        });
      }
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getAdminUploadMatchesNplQTR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetAllRegionWiseScorerNpl = async (req, res) => {
  try {
    const { companyName, Region } = req.params;

    // Add REGION to the query to filter by region
    const mrs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        REGION: Region, // Only include MRs from the specified region
      })
      .select(
        "_id MRID USERNAME TEAMNAME REGION MrScoreEachMatch profileImage",
      );

    const results = [];

    for (const mr of mrs) {
      const totalScore = mr.MrScoreEachMatch.reduce((sum, score) => {
        return sum + (Number(score.Score) || 0);
      }, 0);

      const matchesPlayed = mr.MrScoreEachMatch.length;

      results.push({
        mrId: mr._id,
        mrCode: mr.MRID,
        mrName: mr.USERNAME,
        totalScore,
        matchesPlayed,
        Region: mr.REGION, // Use the region from the MR document
        Image: mr.profileImage,
        TEAMNAME: mr.TEAMNAME,
      });
    }

    // Sort by totalScore (descending)
    results.sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({
      success: true,
      data: results,
      message: `All users in ${Region} region sorted by total score successfully`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetAllZoneWiseScorerNpl = async (req, res) => {
  try {
    const { companyName, Zone } = req.params;

    // Add REGION to the query to filter by zone
    const mrs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        ZONE: Zone, // Only include MRs from the specified zone
      })
      .select("_id MRID USERNAME TEAMNAME ZONE MrScoreEachMatch profileImage");

    const results = [];

    for (const mr of mrs) {
      const totalScore = mr.MrScoreEachMatch.reduce((sum, score) => {
        return sum + (Number(score.Score) || 0);
      }, 0);

      const matchesPlayed = mr.MrScoreEachMatch.length;

      results.push({
        mrId: mr._id,
        mrCode: mr.MRID,
        mrName: mr.USERNAME,
        totalScore,
        matchesPlayed,
        Zone: mr.ZONE,
        Image: mr.profileImage,
        TEAMNAME: mr.TEAMNAME,
      });
    }

    // Sort by totalScore (descending)
    results.sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({
      success: true,
      data: results,
      message: `All users in ${Zone} sorted by total score successfully`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllOdiMatchDataNplRegion = async (req, res) => {
  try {
    const { Region, companyName } = req.params;

    const allMRs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        REGION: Region,
      })
      .select("USERNAME TEAMNAME REGION MrScoreEachMatch OdiBestScore");

    const allOdiMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], OdiBestScore, REGION } = mr;

      const odiMatches = MrScoreEachMatch.filter(
        (match) => match.isAdminUpload === true,
      );

      const Matches = odiMatches.length;
      const Runs = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Score) || 0);
      }, 0);

      const TotalSixes = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Sixes, 10) || 0);
      }, 0);

      const TotalFours = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Fours, 10) || 0);
      }, 0);

      const BestScore = parseFloat(OdiBestScore) || 0;

      return {
        mrName: mr.USERNAME,
        matchesPlayed: Matches,
        totalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TeamName: mr.TEAMNAME,
        Region: REGION,
      };
    });

    allOdiMatchData.sort((a, b) => b.Runs - a.Runs);

    return res.status(200).json({
      success: true,
      data: allOdiMatchData,
      message: `ODI match data for ${Region} region`,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAllTournamentMatchDataNplRegion = async (req, res) => {
  try {
    const { Region, companyName } = req.params;

    // Fetch MRs from specified region and company
    const allMRs = await mrModel.find({
      BUSINESSUNIT: companyName,
      REGION: Region,
    });

    // Process each MR
    const allTournamentMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], TournamentBestScore, REGION } = mr;

      // Filter tournament matches (assuming isAdminUpload indicates tournament matches)
      const tournamentMatches = MrScoreEachMatch.filter(
        (match) => match.isAdminUpload === true,
      );

      // Calculate stats using Brand2 metrics (as per your code)
      const Matches = tournamentMatches.length;
      const Runs = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Score) || 0),
        0,
      );
      const TotalSixes = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Sixes) || 0),
        0,
      );
      const TotalFours = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Fours) || 0),
        0,
      );

      // Determine best score (using Brand2Score)
      const BestScore =
        Matches > 0
          ? Math.max(
              ...tournamentMatches.map((m) => parseFloat(m.Brand2Score) || 0),
            )
          : parseFloat(TournamentBestScore || 0);

      return {
        mrName: mr.USERNAME,
        matchesPlayed: Matches,
        totalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TEAMNAME: mr.TEAMNAME,
        Region: REGION,
      };
    });

    // Sort in DESCENDING order (highest totalScore first)
    allTournamentMatchData.sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({
      success: true,
      data: allTournamentMatchData,
      message: `Tournament match data for ${Region} region (${companyName})`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllOdiMatchDataNplZone = async (req, res) => {
  try {
    const { Zone, companyName } = req.params;

    const allMRs = await mrModel
      .find({
        BUSINESSUNIT: companyName,
        ZONE: Zone,
      })
      .select("USERNAME TEAMNAME ZONE MrScoreEachMatch OdiBestScore");

    const allOdiMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], OdiBestScore, ZONE } = mr;

      const odiMatches = MrScoreEachMatch.filter(
        (match) => match.isAdminUpload === true,
      );

      const Matches = odiMatches.length;
      const Runs = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Score) || 0);
      }, 0);

      const TotalSixes = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Sixes, 10) || 0);
      }, 0);

      const TotalFours = MrScoreEachMatch.reduce((sum, match) => {
        return sum + (Number(match.Brand1Fours, 10) || 0);
      }, 0);

      const BestScore = parseFloat(OdiBestScore) || 0;

      return {
        mrName: mr.USERNAME,
        matchesPlayed: Matches,
        totalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TeamName: mr.TEAMNAME,
        Zone: ZONE,
      };
    });

    allOdiMatchData.sort((a, b) => b.Runs - a.Runs);

    return res.status(200).json({
      success: true,
      data: allOdiMatchData,
      message: `ODI match data for ${Zone} Zone`,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAllTournamentMatchDataNplZone = async (req, res) => {
  try {
    const { Zone, companyName } = req.params;

    // Fetch MRs from specified region and company
    const allMRs = await mrModel.find({
      BUSINESSUNIT: companyName,
      ZONE: Zone,
    });

    // Process each MR
    const allTournamentMatchData = allMRs.map((mr) => {
      const { MrScoreEachMatch = [], TournamentBestScore, ZONE } = mr;

      // Filter tournament matches (assuming isAdminUpload indicates tournament matches)
      const tournamentMatches = MrScoreEachMatch.filter(
        (match) => match.isAdminUpload === true,
      );

      // Calculate stats using Brand2 metrics (as per your code)
      const Matches = tournamentMatches.length;
      const Runs = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Score) || 0),
        0,
      );
      const TotalSixes = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Sixes) || 0),
        0,
      );
      const TotalFours = tournamentMatches.reduce(
        (sum, match) => sum + (parseFloat(match.Brand2Fours) || 0),
        0,
      );

      // Determine best score (using Brand2Score)
      const BestScore =
        Matches > 0
          ? Math.max(
              ...tournamentMatches.map((m) => parseFloat(m.Brand2Score) || 0),
            )
          : parseFloat(TournamentBestScore || 0);

      return {
        mrName: mr.USERNAME,
        matchesPlayed: Matches,
        totalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
        TEAMNAME: mr.TEAMNAME,
        Zone: ZONE,
      };
    });

    // Sort in DESCENDING order (highest totalScore first)
    allTournamentMatchData.sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({
      success: true,
      data: allTournamentMatchData,
      message: `Tournament match data for ${Zone} Zone (${companyName})`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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

const getUserDetailsCompanyWiseNpl = async (req, res) => {
  try {
    const { monthName, year, companyName, teamName, brandName } = req.params;

    const companyData = await CompanyMonthProvide.findOne({
      CompanyName: companyName,
    });

    if (!companyData || !companyData.isProvide) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Exists" });
    }

    const mrRecords = await mrModel.find({
      BUSINESSUNIT: companyName,
      TEAMNAME: teamName,
    });

    if (!mrRecords.length) {
      return res.status(404).json({
        success: false,
        message: "No MR records found for this company and team",
      });
    }

    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const isQuarter = /^q[1-4]$/i.test(monthName);
    const formattedMonth = monthMap[monthName.toLowerCase()];
    const formattedQuarter = monthName.toUpperCase();

    let aggregatedResults = new Map();

    mrRecords.forEach((mr) => {
      if (Array.isArray(mr.MrScoreEachMatch)) {
        mr.MrScoreEachMatch.forEach((match) => {
          const matchDate = match.MatchDate;

          let isMatchValid = false;

          if (isQuarter) {
            // MatchDate is like "Q1", "Q2" etc.
            isMatchValid = matchDate === formattedQuarter;
          } else {
            // MatchDate is like "01-01-2025"
            const [, matchMonth, matchYear] = matchDate.split("-");
            isMatchValid = matchMonth === formattedMonth && matchYear === year;
          }

          if (isMatchValid) {
            const id = mr._id.toString();

            if (!aggregatedResults.has(id)) {
              aggregatedResults.set(id, {
                id,
                MRName: mr.USERNAME,
                Score: 0,
                TotalFours: 0,
                TotalSixes: 0,
                Time: match.TimeOfUpload,
                MatchDates: match.MatchDate,
                TeamName: mr.TEAMNAME,
              });
            }

            // Extract fields based on brandName
            let score = 0,
              fours = 0,
              sixes = 0;

            if (brandName === "ONG") {
              score = parseFloat(match.Brand2Score || 0);
              fours = parseInt(match.Brand2Fours || 0);
              sixes = parseInt(match.Brand2Sixes || 0);
            } else if (brandName === "Nucoxia") {
              score = parseFloat(match.Brand1Score || 0);
              fours = parseInt(match.Brand1Fours || 0);
              sixes = parseInt(match.Brand1Sixes || 0);
            } else {
              score = parseFloat(match.Score || 0);
              fours = parseInt(match.TotalFours || 0);
              sixes = parseInt(match.TotalSixes || 0);
            }

            let existing = aggregatedResults.get(id);
            existing.Score += score;
            existing.TotalFours += fours;
            existing.TotalSixes += sixes;
          }
        });
      } else {
        // If MR has no match records, still include them with default values
        const id = mr._id.toString();
        if (!aggregatedResults.has(id)) {
          aggregatedResults.set(id, {
            id,
            MRName: mr.USERNAME,
            Score: 0,
            TotalFours: 0,
            TotalSixes: 0,
            Time: null,
            MatchDates: "-",
            TeamName: mr.TEAMNAME,
          });
        }
      }
    });

    const result = Array.from(aggregatedResults.values());
    result.sort((a, b) => b.Score - a.Score);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const GetOdiMatchSummaryNpl = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Check if the MR exists
    const MrExists = await mrModel.findById(mrId);
    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "MR Not Found",
      });
    }

    // Extract the score details
    const { MrScoreEachMatch = [] } = MrExists;

    // Filter matches where `isTournament` is false or not present
    const odiMatches = MrScoreEachMatch.filter((match) => match.isAdminUpload);

    // Calculate totals
    const Matches = odiMatches.length;
    const Runs = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand1Score) || 0),
      0,
    );
    const TotalSixes = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand1Sixes) || 0),
      0,
    );
    const TotalFours = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand1Fours) || 0),
      0,
    );
    const BestScore = parseFloat(MrExists.OdiBestScore);

    // Respond with the calculated summary
    return res.status(200).json({
      success: true,
      data: {
        TotalMatches: Matches,
        TotalScore: Runs,
        TotalSixes,
        TotalFours,
        BestScore,
      },
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetTournamentDataSummaryNpl = async (req, res) => {
  try {
    const mrId = req.params.mrId;

    // Check if the MR exists
    const MrExists = await mrModel.findById(mrId);
    if (!MrExists) {
      return res.status(404).json({
        success: false,
        message: "MR Not Found",
      });
    }

    // Extract the score details
    const { MrScoreEachMatch = [] } = MrExists;

    // Filter matches where `isTournament` is false or not present
    const odiMatches = MrScoreEachMatch.filter(
      (match) => match.isAdminUpload === true,
    );

    // Calculate totals
    const Matches = odiMatches.length;
    const Runs = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand2Score) || 0),
      0,
    );

    const TotalSixes = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand2Sixes) || 0),
      0,
    );
    const TotalFours = odiMatches.reduce(
      (sum, match) => sum + (parseFloat(match.Brand2Fours) || 0),
      0,
    );
    const BestScore = parseFloat(MrExists.TournamentBestScore);

    // Respond with the calculated summary
    return res.status(200).json({
      success: true,
      data: {
        Matches,
        Runs,
        TotalSixes,
        TotalFours,
        BestScore,
      },
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleResubmit = async (req, res) => {
  try {
    const { mrId, uploadId } = req.params;

    const mrExist = await mrModel.findById(mrId).populate("MRUploadedData");

    if (!mrExist) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    const upload = mrExist.MRUploadedData.find(
      (data) => data._id.toString() === uploadId,
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // ✅ CHECK IF ALREADY ATTEMPTED
    if (upload.Attempt >= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot resubmit - maximum attempts reached",
      });
    }

    // ✅ CHECK IF NOT REJECTED
    if (upload.Status !== "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Can only resubmit rejected prescriptions",
      });
    }

    // ✅ UPDATE THE PRESCRIPTION
    upload.Status = "Pending";
    upload.Reason = null;
    upload.Attempt = 1; // ← Increment attempt

    await mrExist.save();

    // ✅ EMIT SOCKET EVENT FOR REAL-TIME UPDATE
    const io = socket.getIo();
    io.emit("Prescription_Resubmitted", {
      mrId: mrId,
      uploadId: uploadId,
      upload: upload,
    });

    return res.status(200).json({
      success: true,
      message: "Prescription resubmitted successfully",
      data: upload,
    });
  } catch (error) {
    console.error("❌ Resubmit error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleUpdatePrescriptionImage = async (req, res) => {
  try {
    const { mrId, uploadId } = req.params;

    // Find the MR
    const mrExist = await mrModel.findById(mrId).populate("MRUploadedData");

    if (!mrExist) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    // Find the specific upload
    const upload = mrExist.MRUploadedData.find(
      (data) => data._id.toString() === uploadId,
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // Check if prescription is rejected
    if (upload.Status !== "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Can only edit rejected prescriptions",
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    // ✅ DELETE OLD IMAGE FILE
    const oldImagePath = path.join(
      __dirname,
      "../uploads",
      upload.PrescriptionImage,
    );
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
      console.log("✅ Deleted old image:", upload.PrescriptionImage);
    }

    // ✅ UPDATE WITH NEW IMAGE
    upload.PrescriptionImage = req.file.filename;
    console.log("✅ Updated with new image:", req.file.filename);

    await mrExist.save();

    return res.status(200).json({
      success: true,
      message: "Prescription image updated successfully",
      data: {
        newFileName: req.file.filename,
        upload: upload,
      },
    });
  } catch (error) {
    console.error("❌ Update image error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/*
const getDailyLeaderboard = async (req, res) => {
  try {
    const { day, month, year, businessUnit } = req.query;

    console.log("📅 Fetching daily leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);

    // ✅ FETCH ALL MRs WITH THEIR PRESCRIPTION UPLOADS
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MRUploadedData")
      .lean();

    const dailyData = allMRs.map((mr) => {
      // ✅ FILTER PRESCRIPTIONS BY DateOfUpload OR DateOfCreation
      const dailyUploads = mr.MRUploadedData.filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      // ✅ CALCULATE BRAND COUNTS FOR THIS DAY
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      // ✅ SUM UP POINTS AND COUNT BRANDS FROM ALL APPROVED/PENDING UPLOADS
      const dailyScore = dailyUploads.reduce((total, upload) => {
        // Only count if Status is Approved or Pending
        if (upload.Status === "Approved" || upload.Status === "Pending") {
          const points = parseInt(upload.Points || 0);
          const noRxns = parseInt(upload.NoRxns || 1);

          // ✅ COUNT BRANDS
          const numberOfBrands = upload.NumberOfBrands;
          if (numberOfBrands === 1) {
            brandCounts.brand1++;
          } else if (numberOfBrands === 2) {
            brandCounts.brand2++;
          } else if (numberOfBrands === 3) {
            brandCounts.brand3++;
          }

          return total + points * noRxns;
        }
        return total;
      }, 0);

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: dailyScore,
        TotalMatches: mr.TotalMatches,
        Matches: dailyUploads.length, // Number of prescriptions uploaded that day
        brandCounts: brandCounts, // ✅ Add brand counts
      };
    });

    // ✅ FILTER AND SORT
    const rankedData = dailyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedData.length,
      "players with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day: day,
      month: month,
      year: year,
      date: targetDateString,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

/*
const getDailyLeaderboard = async (req, res) => {
  try {
    const { day, month, year, businessUnit } = req.query;

    console.log("📅 Fetching daily leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);

    // ✅ FETCH ALL MRs WITH THEIR PRESCRIPTION UPLOADS
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MRUploadedData")
      .lean();

    const dailyData = allMRs.map((mr) => {
      // ✅ FILTER PRESCRIPTIONS BY DateOfUpload OR DateOfCreation
      const dailyUploads = mr.MRUploadedData.filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      // ✅ CALCULATE BRAND COUNTS FOR THIS DAY
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      // ✅ SUM UP POINTS AND COUNT BRANDS FROM ALL APPROVED/PENDING UPLOADS
      const dailyScore = dailyUploads.reduce((total, upload) => {
        // Only count if Status is Approved or Pending
        if (upload.Status === "Approved") {
          const points = parseInt(upload.Points || 0);
          const noRxns = parseInt(upload.NoRxns || 1);

          // ✅ COUNT BRANDS
          const numberOfBrands = upload.NumberOfBrands;
          if (numberOfBrands === 1) {
            brandCounts.brand1++;
          } else if (numberOfBrands === 2) {
            brandCounts.brand2++;
          } else if (numberOfBrands === 3) {
            brandCounts.brand3++;
          }

          return total + points * noRxns;
        }
        return total;
      }, 0);

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: dailyScore,
        TotalMatches: mr.TotalMatches,
        Matches: dailyUploads.length, // Number of prescriptions uploaded that day
        brandCounts: brandCounts, // ✅ Add brand counts
      };
    });

    // ✅ FILTER AND SORT
    const rankedData = dailyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedData.length,
      "players with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day: day,
      month: month,
      year: year,
      date: targetDateString,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

const getDailyLeaderboard = async (req, res) => {
  try {
    const { day, month, businessUnit } = req.query;
    const year = '2026';

    console.log("📅 Fetching daily leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

        const settings = await getLeaderboardSettings();

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);

    // ✅ FETCH ALL MRs WITH THEIR PRESCRIPTION UPLOADS
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MRUploadedData")
      .lean();

    const dailyData = allMRs.map((mr) => {
      // ✅ FILTER PRESCRIPTIONS BY DateOfUpload OR DateOfCreation
      const dailyUploads = mr.MRUploadedData.filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      // ✅ CALCULATE BRAND COUNTS FOR THIS DAY
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      // ✅ SUM UP POINTS AND COUNT BRANDS FROM ALL APPROVED/PENDING UPLOADS
      const dailyScore = dailyUploads.reduce((total, upload) => {
        // Only count if Status is Approved or Pending
        if (upload.Status === "Approved") {
          const points = parseInt(upload.Points || 0);
          const noRxns = parseInt(upload.NoRxns || 1);

          // ✅ COUNT BRANDS
          const numberOfBrands = upload.NumberOfBrands;
          if (numberOfBrands === 1) {
            brandCounts.brand1++;
          } else if (numberOfBrands === 2) {
            brandCounts.brand2++;
          } else if (numberOfBrands === 3) {
            brandCounts.brand3++;
          }

          return total + points * noRxns;
        }
        return total;
      }, 0);

   // ✅ NON-WEIGHTED BRAND COUNT
      const totalBrandCount =
        brandCounts.brand1 +
        brandCounts.brand2 +
        brandCounts.brand3;

      // 🔑 DECIDE WHAT "TotalScore" MEANS
      const finalScore =
        settings.mrRankMetric === "BRAND_COUNT"
          ? totalBrandCount
          : dailyScore;

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: finalScore,
        TotalMatches: mr.TotalMatches,
        Matches: dailyUploads.length, // Number of prescriptions uploaded that day
        brandCounts: brandCounts, // ✅ Add brand counts
      };
    });

    // ✅ FILTER AND SORT
    const rankedData = dailyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedData.length,
      "players with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day: day,
      month: month,
      year: year,
      date: targetDateString,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


/*
const getMonthlyLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly leaderboard:", {
      month,
      year,
      businessUnit,
    });

    // ✅ GET MONTH START AND END DATES
    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0); // Last day of month

      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month),
    );

    console.log(
      "📊 Month Range:",
      monthStartDate.toISOString().split("T")[0],
      "to",
      monthEndDate.toISOString().split("T")[0],
    );

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch")
      .populate("MrScoreEachMatch");

    const monthlyData = allMRs.map((mr) => {
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        // ✅ CHECK IF MATCH DATE IS WITHIN MONTH
        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      const monthlyScore = monthlyMatches.reduce((total, match) => {
        return total + parseInt(match.Score || 0);
      }, 0);

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: monthlyScore,
        TotalMatches: mr.TotalMatches,
      };
    });

    const rankedData = monthlyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log("✅ Found", rankedData.length, "players with scores");

    return res.status(200).json({
      success: true,
      month: month,
      year: year,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/


/*
const getMonthlyLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly leaderboard:", {
      month,
      year,
      businessUnit,
    });

    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);
      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month)
    );

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch MRUploadedData")
      .populate("MrScoreEachMatch");

    const monthlyData = allMRs.map((mr) => {
      // ✅ BRAND COUNTS PER MR (FIX)
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      // ✅ FILTER MATCHES IN MONTH
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      // ✅ COUNT BRANDS (APPROVED ONLY)
      if (mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        mr.MRUploadedData.forEach((upload) => {
          if (upload.Status !== "Approved") return;

          const dateStr = upload.DateOfCreation || upload.DateOfUpload;
          let uploadDate;

          if (dateStr.includes("T")) {
            uploadDate = new Date(dateStr);
          } else {
            const [d, m, y] = dateStr.split("-").map(Number);
            uploadDate = new Date(y, m - 1, d);
          }

          if (uploadDate >= monthStartDate && uploadDate <= monthEndDate) {
            const brands = upload.NumberOfBrands;
            if (brands === 1) brandCounts.brand1++;
            else if (brands === 2) brandCounts.brand2++;
            else if (brands === 3) brandCounts.brand3++;
          }
        });
      }

      const monthlyScore = monthlyMatches.reduce(
        (total, match) => total + parseInt(match.Score || 0),
        0
      );

      const totalBrandCount =
        brandCounts.brand1 +
        brandCounts.brand2 +
        brandCounts.brand3;

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: monthlyScore,
        TotalMatches: mr.TotalMatches,

        // ✅ ADDED FIELDS
        brandCounts,
        totalBrandCount,
      };
    });

    const rankedData = monthlyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    return res.status(200).json({
      success: true,
      month,
      year,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

const getMonthlyLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly leaderboard:", {
      month,
      year,
      businessUnit,
    });

        const settings = await getLeaderboardSettings();


    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);
      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month)
    );

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch MRUploadedData")
      .populate("MrScoreEachMatch");

    const monthlyData = allMRs.map((mr) => {
      // ✅ BRAND COUNTS PER MR (FIX)
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      // ✅ FILTER MATCHES IN MONTH
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      // ✅ COUNT BRANDS (APPROVED ONLY)
      if (mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        mr.MRUploadedData.forEach((upload) => {
          if (upload.Status !== "Approved") return;

          const dateStr = upload.DateOfCreation || upload.DateOfUpload;
          let uploadDate;

          if (dateStr.includes("T")) {
            uploadDate = new Date(dateStr);
          } else {
            const [d, m, y] = dateStr.split("-").map(Number);
            uploadDate = new Date(y, m - 1, d);
          }

          if (uploadDate >= monthStartDate && uploadDate <= monthEndDate) {
            const brands = upload.NumberOfBrands;
            if (brands === 1) brandCounts.brand1++;
            else if (brands === 2) brandCounts.brand2++;
            else if (brands === 3) brandCounts.brand3++;
          }
        });
      }

      const monthlyScore = monthlyMatches.reduce(
        (total, match) => total + parseInt(match.Score || 0),
        0
      );

      const totalBrandCount =
        brandCounts.brand1 +
        brandCounts.brand2 +
        brandCounts.brand3;


        // 🔑 DECIDE WHAT "TotalScore" MEANS
      const finalScore =
        settings.mrRankMetric === "BRAND_COUNT"
          ? totalBrandCount
          : monthlyScore;

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: finalScore,
        TotalMatches: mr.TotalMatches,

        // ✅ ADDED FIELDS
        brandCounts,
        totalBrandCount,
      };
    });

    const rankedData = monthlyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    return res.status(200).json({
      success: true,
      month,
      year,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const getWeeklyLeaderboard = async (req, res) => {
  try {
    const { weekNumber, year, businessUnit } = req.query;

    const getISOWeekDates = (year, weekNumber) => {
      const jan4 = new Date(year, 0, 4);
      const jan4DayOfWeek = (jan4.getDay() + 6) % 7;

      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);

      const weekStartDate = new Date(week1Monday);
      weekStartDate.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 5); // ✅ Saturday (Mon + 5 days)

      return { weekStartDate, weekEndDate };
    };

    const formatDate = (date) => {
      const day = date.getDate();
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames[date.getMonth()];
      return `${day} ${month}`;
    };

    const { weekStartDate, weekEndDate } = getISOWeekDates(
      parseInt(year),
      parseInt(weekNumber),
    );

    // ✅ LOG TO VERIFY DATES
    console.log(`📅 Week ${weekNumber} of ${year}:`);
    console.log(
      `   Start: ${weekStartDate.toISOString()} (${weekStartDate.toDateString()})`,
    );
    console.log(
      `   End: ${weekEndDate.toISOString()} (${weekEndDate.toDateString()})`,
    );
    console.log(
      `   Start day: ${weekStartDate.getDay()} (should be 1 for Monday)`,
    );
    console.log(
      `   End day: ${weekEndDate.getDay()} (should be 6 for Saturday)`,
    );

    const dateRangeLabel = `${formatDate(weekStartDate)} - ${formatDate(
      weekEndDate,
    )}`;

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch")
      .populate("MrScoreEachMatch");

    const weeklyData = allMRs.map((mr) => {
      const weeklyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        // ✅ NORMALIZE ALL DATES TO MIDNIGHT UTC TO AVOID TIMEZONE ISSUES
        const matchDateNormalized = new Date(
          Date.UTC(
            matchDate.getFullYear(),
            matchDate.getMonth(),
            matchDate.getDate(),
          ),
        );

        const weekStartNormalized = new Date(
          Date.UTC(
            weekStartDate.getFullYear(),
            weekStartDate.getMonth(),
            weekStartDate.getDate(),
          ),
        );

        const weekEndNormalized = new Date(
          Date.UTC(
            weekEndDate.getFullYear(),
            weekEndDate.getMonth(),
            weekEndDate.getDate(),
            23,
            59,
            59,
            999,
          ),
        );

        const isInRange =
          matchDateNormalized >= weekStartNormalized &&
          matchDateNormalized <= weekEndNormalized;

        // ✅ DEBUG LOG (remove after testing)
        if (isInRange) {
          console.log(`   ✅ Match on ${matchDate.toDateString()} included`);
        }

        return isInRange;
      });

      const weeklyScore = weeklyMatches.reduce((total, match) => {
        return total + parseInt(match.Score || 0);
      }, 0);

      return {
        _id: mr._id,
        USERNAME: mr.USERNAME,
        TEAMNAME: mr.TEAMNAME,
        TotalScore: weeklyScore,
        TotalMatches: mr.TotalMatches,
      };
    });

    const rankedData = weeklyData
      .filter((item) => item.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    return res.status(200).json({
      success: true,
      weekNumber: weekNumber,
      year: year,
      weekStartDate: weekStartDate.toISOString().split("T")[0],
      weekEndDate: weekEndDate.toISOString().split("T")[0],
      dateRangeLabel: dateRangeLabel,
      data: rankedData,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAvailableMonths = async (req, res) => {
  try {
    const { businessUnit } = req.query;

    console.log("📅 Fetching available months for:", businessUnit);

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("MrScoreEachMatch")
      .populate("MrScoreEachMatch");

    console.log("✅ Found", allMRs.length, "MRs");

    const monthsSet = new Set();

    allMRs.forEach((mr) => {
      mr.MrScoreEachMatch.forEach((match) => {
        // ✅ HANDLE ISO DATE FORMAT (YYYY-MM-DD)
        const dateStr = match.DateOfCreation;

        if (dateStr.includes("T")) {
          // If it's a full ISO timestamp
          const date = new Date(dateStr);
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          monthsSet.add(`${month}-${year}`);
        } else {
          // If it's YYYY-MM-DD format
          const [year, month, day] = dateStr.split("-");
          monthsSet.add(`${month}-${year}`);
        }
      });
    });

    const availableMonths = Array.from(monthsSet).sort();

    console.log("✅ Available months:", availableMonths);

    return res.status(200).json({
      success: true,
      data: availableMonths,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getWeeklyTeamLeaderboard = async (req, res) => {
  try {
    const { weekNumber, year, businessUnit } = req.query;

    const getISOWeekDates = (year, weekNumber) => {
      const jan4 = new Date(year, 0, 4);
      const jan4DayOfWeek = (jan4.getDay() + 6) % 7;

      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);

      const weekStartDate = new Date(week1Monday);
      weekStartDate.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 5); // Monday to Saturday

      return { weekStartDate, weekEndDate };
    };

    const formatDate = (date) => {
      const day = date.getDate();
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames[date.getMonth()];
      return `${day} ${month}`;
    };

    const { weekStartDate, weekEndDate } = getISOWeekDates(
      parseInt(year),
      parseInt(weekNumber),
    );

    const dateRangeLabel = `${formatDate(weekStartDate)} - ${formatDate(
      weekEndDate,
    )}`;

    // ✅ GET ALL MRS WITH THEIR MATCHES AND TotalMatches
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch")
      .populate("MrScoreEachMatch");

    // ✅ AGGREGATE SCORES BY TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TotalScore: 0,
          TotalMatches: mr.TotalMatches || 0, // ✅ JUST USE THE FIRST MR'S VALUE AS-IS
        };
      }

      // Filter matches within the week
      const weeklyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= weekStartDate && matchDate <= weekEndDate;
      });

      // Add up scores for this MR's team
      weeklyMatches.forEach((match) => {
        teamScores[teamName].TotalScore += parseInt(match.Score || 0);
      });
    });

    // ✅ CONVERT TO ARRAY AND SORT
    const rankedTeams = Object.values(teamScores)
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log("✅ Found", rankedTeams.length, "teams with scores");

    return res.status(200).json({
      success: true,
      weekNumber: weekNumber,
      year: year,
      weekStartDate: weekStartDate.toISOString().split("T")[0],
      weekEndDate: weekEndDate.toISOString().split("T")[0],
      dateRangeLabel: dateRangeLabel,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/*
const getMonthlyTeamLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly team leaderboard:", {
      month,
      year,
      businessUnit,
    });

    // ✅ GET MONTH START AND END DATES
    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);

      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month),
    );

    console.log(
      "📊 Month Range:",
      monthStartDate.toISOString().split("T")[0],
      "to",
      monthEndDate.toISOString().split("T")[0],
    );

    // ✅ GET ALL MRS WITH THEIR MATCHES
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch")
      .populate("MrScoreEachMatch");

    // ✅ AGGREGATE SCORES BY TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TotalScore: 0,
          TotalMatches: mr.TotalMatches,
        };
      }

      // Filter matches within the month
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      // Add up scores for this MR's team
      monthlyMatches.forEach((match) => {
        teamScores[teamName].TotalScore += parseInt(match.Score || 0);
        //teamScores[teamName].TotalMatches++;
      });
    });

    // ✅ CONVERT TO ARRAY AND SORT
    const rankedTeams = Object.values(teamScores)
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log("✅ Found", rankedTeams.length, "teams with scores");

    return res.status(200).json({
      success: true,
      month: month,
      year: year,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

/*
const getMonthlyTeamLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly team leaderboard:", {
      month,
      year,
      businessUnit,
    });

    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);
      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month)
    );

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MrScoreEachMatch MRUploadedData")
      .populate("MrScoreEachMatch");

    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      // ✅ INIT TEAM (ADDED brandCounts)
      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TotalScore: 0,
          TotalMatches: 0,
          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },
        };
      }

      // ✅ MONTHLY MATCH SCORE (unchanged)
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      monthlyMatches.forEach((match) => {
        teamScores[teamName].TotalScore += parseInt(match.Score || 0);
      });

      // ✅ BRAND COUNT (APPROVED ONLY)
      if (mr.MRUploadedData && Array.isArray(mr.MRUploadedData)) {
        mr.MRUploadedData.forEach((upload) => {
          if (upload.Status !== "Approved") return;

          const dateStr = upload.DateOfCreation || upload.DateOfUpload;
          let uploadDate;

          if (dateStr.includes("T")) {
            uploadDate = new Date(dateStr);
          } else {
            const [d, m, y] = dateStr.split("-").map(Number);
            uploadDate = new Date(y, m - 1, d);
          }

          if (uploadDate >= monthStartDate && uploadDate <= monthEndDate) {
            const brands = upload.NumberOfBrands;
            if (brands === 1) teamScores[teamName].brandCounts.brand1++;
            else if (brands === 2) teamScores[teamName].brandCounts.brand2++;
            else if (brands === 3) teamScores[teamName].brandCounts.brand3++;
          }
        });
      }
    });

    // ✅ FINALIZE RESPONSE
    const rankedTeams = Object.values(teamScores)
      .map((team) => ({
        ...team,
        totalBrandCount:
          team.brandCounts.brand1 +
          team.brandCounts.brand2 +
          team.brandCounts.brand3,
      }))
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    return res.status(200).json({
      success: true,
      month,
      year,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

const getMonthlyTeamLeaderboard = async (req, res) => {
  try {
    const { month, year, businessUnit } = req.query;

    console.log("📅 Fetching monthly team leaderboard:", {
      month,
      year,
      businessUnit,
    });

    // 🔑 Load leaderboard settings
    const settings = await getLeaderboardSettings();
    console.log("⚙️ Team Rank Metric:", settings.teamRankMetric);

    const getMonthDates = (year, month) => {
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);
      return { monthStartDate, monthEndDate };
    };

    const { monthStartDate, monthEndDate } = getMonthDates(
      parseInt(year),
      parseInt(month),
    );

    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME MrScoreEachMatch MRUploadedData")
      .populate("MrScoreEachMatch");

    // 🔢 Aggregate per TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,

          // internal accumulators
          teamScore: 0,

          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },
        };
      }

      // ✅ SCORE (from matches – unchanged logic)
      const monthlyMatches = mr.MrScoreEachMatch.filter((match) => {
        const dateStr = match.DateOfCreation;
        let matchDate;

        if (dateStr.includes("T")) {
          matchDate = new Date(dateStr);
        } else {
          const [y, m, d] = dateStr.split("-").map(Number);
          matchDate = new Date(y, m - 1, d);
        }

        return matchDate >= monthStartDate && matchDate <= monthEndDate;
      });

      monthlyMatches.forEach((match) => {
        teamScores[teamName].teamScore += parseInt(match.Score || 0);
      });

      // ✅ BRAND COUNTS (APPROVED ONLY)
      if (Array.isArray(mr.MRUploadedData)) {
        mr.MRUploadedData.forEach((upload) => {
          if (upload.Status !== "Approved") return;

          const dateStr = upload.DateOfCreation || upload.DateOfUpload;
          let uploadDate;

          if (dateStr.includes("T")) {
            uploadDate = new Date(dateStr);
          } else {
            const [d, m, y] = dateStr.split("-").map(Number);
            uploadDate = new Date(y, m - 1, d);
          }

          if (uploadDate >= monthStartDate && uploadDate <= monthEndDate) {
            const brands = upload.NumberOfBrands;
            if (brands === 1) teamScores[teamName].brandCounts.brand1++;
            else if (brands === 2) teamScores[teamName].brandCounts.brand2++;
            else if (brands === 3) teamScores[teamName].brandCounts.brand3++;
          }
        });
      }
    });

    // 🧮 FINAL RESPONSE (NO FE CHANGE)
    const rankedTeams = Object.values(teamScores)
      .map((team) => {
        const totalBrandCount =
          team.brandCounts.brand1 +
          team.brandCounts.brand2 +
          team.brandCounts.brand3;

        const finalScore =
          settings.teamRankMetric === "BRAND_COUNT"
            ? totalBrandCount
            : team.teamScore;
	      
	 //const finalScore = totalBrandCount;

        return {
          TeamName: team.TeamName,

          // 🔥 FE keeps reading this
          TotalScore: finalScore,
          Runs: finalScore,

          brandCounts: team.brandCounts,
          totalBrandCount,
        };
      })
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    return res.status(200).json({
      success: true,
      month,
      year,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


/*
const getDailyTeamLeaderboard = async (req, res) => {
  try {
    const { day, month, year, businessUnit } = req.query;

    console.log("📅 Fetching daily team leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);

    // ✅ FETCH ALL MRs WITH THEIR PRESCRIPTION UPLOADS
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MRUploadedData")
      .lean();

    // ✅ AGGREGATE SCORES BY TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TEAMNAME: teamName,
          TotalScore: 0,
          TotalMatches: 0,
          Matches: 0,
          Runs: 0,
          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },
        };
      }

      // ✅ FILTER PRESCRIPTIONS BY DateOfUpload
      const dailyUploads = mr.MRUploadedData.filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      // ✅ COUNT MATCHES (PRESCRIPTIONS) FOR THIS TEAM
      teamScores[teamName].TotalMatches += dailyUploads.length;
      teamScores[teamName].Matches += dailyUploads.length;

      // ✅ SUM UP POINTS AND COUNT BRANDS FROM ALL APPROVED/PENDING UPLOADS
      dailyUploads.forEach((upload) => {
        if (upload.Status === "Approved" || upload.Status === "Pending") {
          const points = parseInt(upload.Points || 0);
          const noRxns = parseInt(upload.NoRxns || 1);
          const totalPoints = points * noRxns;

          teamScores[teamName].TotalScore += totalPoints;
          teamScores[teamName].Runs += totalPoints;

          // ✅ COUNT BRANDS
          const numberOfBrands = upload.NumberOfBrands;
          if (numberOfBrands === 1) {
            teamScores[teamName].brandCounts.brand1++;
          } else if (numberOfBrands === 2) {
            teamScores[teamName].brandCounts.brand2++;
          } else if (numberOfBrands === 3) {
            teamScores[teamName].brandCounts.brand3++;
          }
        }
      });
    });

    // ✅ CONVERT TO ARRAY AND SORT
    const rankedTeams = Object.values(teamScores)
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedTeams.length,
      "teams with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day: day,
      month: month,
      year: year,
      date: targetDateString,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/


/*
const getDailyTeamLeaderboard = async (req, res) => {
  try {
    const { day, month, year, businessUnit } = req.query;

    console.log("📅 Fetching daily team leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);

    // ✅ FETCH ALL MRs WITH THEIR PRESCRIPTION UPLOADS
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME TotalMatches MRUploadedData")
      .lean();



    // ✅ AGGREGATE SCORES BY TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TEAMNAME: teamName,
          TotalScore: 0,
          TotalMatches: 0,
          Matches: 0,
          Runs: 0,
          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },
          totalBrandCount: 0, // ✅ NEW
        };
      }

      // ✅ FILTER PRESCRIPTIONS BY DateOfUpload
      const dailyUploads = mr.MRUploadedData.filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      // ✅ COUNT MATCHES (PRESCRIPTIONS) FOR THIS TEAM
      teamScores[teamName].TotalMatches += dailyUploads.length;
      teamScores[teamName].Matches += dailyUploads.length;

      // ✅ SUM UP POINTS AND COUNT BRANDS FROM ALL APPROVED/PENDING UPLOADS
      dailyUploads.forEach((upload) => {
        if (upload.Status === "Approved") {
          const points = parseInt(upload.Points || 0);
          const noRxns = parseInt(upload.NoRxns || 1);
          const totalPoints = points * noRxns;

          teamScores[teamName].TotalScore += totalPoints;
          teamScores[teamName].Runs += totalPoints;

          // ✅ COUNT BRANDS
          const numberOfBrands = upload.NumberOfBrands;
          if (numberOfBrands === 1) {
            teamScores[teamName].brandCounts.brand1++;
          } else if (numberOfBrands === 2) {
            teamScores[teamName].brandCounts.brand2++;
          } else if (numberOfBrands === 3) {
            teamScores[teamName].brandCounts.brand3++;
          }
          teamScores[teamName].totalBrandCount =
  teamScores[teamName].brandCounts.brand1 +
  teamScores[teamName].brandCounts.brand2 +
  teamScores[teamName].brandCounts.brand3;

        }
      });
    });

    // ✅ CONVERT TO ARRAY AND SORT
    const rankedTeams = Object.values(teamScores)
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedTeams.length,
      "teams with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day: day,
      month: month,
      year: year,
      date: targetDateString,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/
const getDailyTeamLeaderboard = async (req, res) => {
  try {
    const { day, month, businessUnit } = req.query;
    const year = '2026';

    console.log("📅 Fetching daily team leaderboard:", {
      day,
      month,
      year,
      businessUnit,
    });

    // 🔑 Load leaderboard settings (DB-driven)
   
    const settings = await getLeaderboardSettings();
  //  console.log("settingsssssssssssssssssss", settings.teamRankMetric);

    // ✅ CREATE TARGET DATE STRING IN DD-MM-YYYY FORMAT
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const targetDateString = `${dayStr}-${monthStr}-${year}`;

    console.log("📊 Target Date String:", targetDateString);
    console.log("⚙️ Team Rank Metric:", settings.teamRankMetric);

    // ✅ FETCH ALL MRs
    const allMRs = await mrModel
      .find({ BUSINESSUNIT: businessUnit })
      .select("_id USERNAME TEAMNAME MRUploadedData")
      .lean();

    // ✅ AGGREGATE BY TEAM
    const teamScores = {};

    allMRs.forEach((mr) => {
      const teamName = mr.TEAMNAME;
      if (!teamName) return;

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TEAMNAME: teamName,

          // 🔥 SAME FIELD USED BY FE
          TotalScore: 0,

          Runs: 0,
          Matches: 0,
          TotalMatches: 0,

          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },
          totalBrandCount: 0,
        };
      }

      // ✅ FILTER PRESCRIPTIONS FOR THIS DAY
      const dailyUploads = (mr.MRUploadedData || []).filter((upload) => {
        const uploadDate = upload.DateOfUpload || upload.DateOfCreation;
        return uploadDate === targetDateString;
      });

      teamScores[teamName].Matches += dailyUploads.length;
      teamScores[teamName].TotalMatches += dailyUploads.length;

      // ✅ PROCESS APPROVED UPLOADS
      dailyUploads.forEach((upload) => {
        if (upload.Status !== "Approved") return;

        const points = parseInt(upload.Points || 0);
        const rxns = parseInt(upload.NoRxns || 1);
        const score = points * rxns;

        teamScores[teamName].Runs += score;

        // BRAND COUNT
        const brands = upload.NumberOfBrands;
        if (brands === 1) teamScores[teamName].brandCounts.brand1++;
        else if (brands === 2) teamScores[teamName].brandCounts.brand2++;
        else if (brands === 3) teamScores[teamName].brandCounts.brand3++;
      });
    });

    // ✅ FINALIZE TOTALS + METRIC SWITCH
    const rankedTeams = Object.values(teamScores)
      .map((team) => {
        const totalBrandCount =
          team.brandCounts.brand1 +
          team.brandCounts.brand2 +
          team.brandCounts.brand3;

        // 🔑 SWITCH METRIC (NO FE CHANGE)
       // const finalScore =
         // settings.teamRankMetric === "BRAND_COUNT"
           // ? totalBrandCount
           // : team.Runs;

	  const finalScore =
          settings.teamRankMetric === "BRAND_COUNT"
            ? totalBrandCount
            : totalBrandCount;

        return {
          ...team,
          totalBrandCount,
          TotalScore: finalScore, // 🔥 FE reads this
	  Runs: finalScore,
        };
      })
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "✅ Found",
      rankedTeams.length,
      "teams with scores on",
      targetDateString,
    );

    return res.status(200).json({
      success: true,
      day,
      month,
      year,
      date: targetDateString,
      data: rankedTeams,
    });
  } catch (error) {
    console.error("❌ Error in getDailyTeamLeaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/*
const handleGetWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching week range leaderboard:", {
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
        message: "Missing required parameters",
      });
    }

    // Create date strings for the range
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
      dates.push(dateStr);
    }

    console.log("📅 Date range:", dates);

    // ✅ OPTIMIZED: Only select necessary fields
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users in ${businessUnit}`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No users found",
      });
    }

    // Calculate scores for each user
    const leaderboardData = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let totalScore = 0;
      let matchesCount = 0;

      // ✅ ONLY LOG FIRST 10 USERS
      const shouldLog = i < 10;

      if (shouldLog) {
        console.log(`\n👤 [${i + 1}] Processing user: ${user.USERNAME}`);
        console.log(`📋 Total uploads: ${user.MRUploadedData?.length || 0}`);
      }

      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        for (const upload of user.MRUploadedData) {
          if (shouldLog) {
            console.log(
              `  📄 Upload - Date: ${upload.DateOfCreation}, Status: ${upload.Status}, Points: ${upload.Points}`,
            );
          }

          const dateMatches = dates.includes(upload.DateOfCreation);
          const statusMatches =
            upload.Status === "Approved" || upload.Status === "Pending";

          if (shouldLog) {
            console.log(
              `    ✓ Date matches: ${dateMatches}, Status matches: ${statusMatches}`,
            );
          }

          if (dateMatches && statusMatches) {
            const points = parseInt(upload.Points) || 0;
            if (shouldLog) {
              console.log(`    ✅ Adding ${points} points`);
            }
            totalScore += points;
            matchesCount++;
          }
        }
      }

      if (shouldLog) {
        console.log(
          `💯 ${user.USERNAME} total: ${totalScore} points, ${matchesCount} matches`,
        );
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

    console.log(
      `\n📊 Processed ${users.length} users, ${leaderboardData.length} have scores`,
    );

    // Sort by TotalScore descending
    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(`✅ Returning ${leaderboardData.length} players`);
    console.log(
      `🏆 Top 5 players:`,
      leaderboardData.slice(0, 5).map((p) => `${p.USERNAME}: ${p.TotalScore}`),
    );

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getWeekRangeLeaderboard:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
*/

/*
const handleGetWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching week range leaderboard:", {
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
        message: "Missing required parameters",
      });
    }

    // Create date strings for the range (DD-MM-YYYY)
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
      dates.push(dateStr);
    }

    console.log("📅 Date range:", dates);

    // Fetch users
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users in ${businessUnit}`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No users found",
      });
    }

    const leaderboardData = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let totalScore = 0;
      let matchesCount = 0;

      // ✅ Brand counts per MR (reset per user)
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        for (const upload of user.MRUploadedData) {
          const dateMatches = dates.includes(
            upload.DateOfCreation || upload.DateOfUpload
          );

          // ✅ APPROVED ONLY
          if (dateMatches && upload.Status === "Approved") {
            console.log("upload",upload)
            const points = parseInt(upload.Points || 0);
            const rxns = parseInt(upload.NoRxns || 1);

            totalScore += points * rxns;
            matchesCount++;

            // ✅ Brand counting
            const numberOfBrands = upload.NumberOfBrands;
            if (numberOfBrands === 1) brandCounts.brand1++;
            else if (numberOfBrands === 2) brandCounts.brand2++;
            else if (numberOfBrands === 3) brandCounts.brand3++;
          }
        }
      }

      const totalBrandCount =
        brandCounts.brand1 +
        brandCounts.brand2 +
        brandCounts.brand3;

      // ✅ Keep response shape SAME + added fields
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

          // ✅ ADDED ONLY
          brandCounts,
          totalBrandCount,
        });
      }
    }

    console.log(
      `📊 Processed ${users.length} users, ${leaderboardData.length} have scores`,
    );

    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "🏆 Top 5:",
      leaderboardData.slice(0, 5).map((p) => `${p.USERNAME}: ${p.TotalScore}`),
    );

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getWeekRangeLeaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
*/
const handleGetWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching week range leaderboard:", {
      startDay,
      endDay,
      month,
      year,
      businessUnit,
    });

        const settings = await getLeaderboardSettings();

    // Validate parameters
    if (!startDay || !endDay || !month || !year || !businessUnit) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Create date strings for the range (DD-MM-YYYY)
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
      dates.push(dateStr);
    }

    console.log("📅 Date range:", dates);

    // Fetch users
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users in ${businessUnit}`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No users found",
      });
    }

    const leaderboardData = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let totalScore = 0;
      let matchesCount = 0;

      // ✅ Brand counts per MR (reset per user)
      const brandCounts = {
        brand1: 0,
        brand2: 0,
        brand3: 0,
      };

      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        for (const upload of user.MRUploadedData) {
          const dateMatches = dates.includes(
            upload.DateOfCreation || upload.DateOfUpload
          );

          // ✅ APPROVED ONLY
          if (dateMatches && upload.Status === "Approved") {
            console.log("upload",upload)
            const points = parseInt(upload.Points || 0);
            const rxns = parseInt(upload.NoRxns || 1);

            totalScore += points * rxns;
            matchesCount++;

            // ✅ Brand counting
            const numberOfBrands = upload.NumberOfBrands;
            if (numberOfBrands === 1) brandCounts.brand1++;
            else if (numberOfBrands === 2) brandCounts.brand2++;
            else if (numberOfBrands === 3) brandCounts.brand3++;
          }
        }
      }

      const totalBrandCount =
        brandCounts.brand1 +
        brandCounts.brand2 +
        brandCounts.brand3;

        // 🔑 DECIDE WHAT "TotalScore" MEANS
      const finalScore =
        settings.mrRankMetric === "BRAND_COUNT"
          ? totalBrandCount
          : totalScore;

      // ✅ Keep response shape SAME + added fields
      if (totalScore > 0) {
        leaderboardData.push({
          _id: user._id,
          USERNAME: user.USERNAME,
          MrName: user.USERNAME,
          TEAMNAME: user.TEAMNAME,
          TeamName: user.TEAMNAME,
          TotalScore: finalScore,
          Runs: finalScore,
          TotalMatches: matchesCount,
          Matches: matchesCount,

          // ✅ ADDED ONLY
          brandCounts,
          totalBrandCount,
        });
      }
    }

    console.log(
      `📊 Processed ${users.length} users, ${leaderboardData.length} have scores`,
    );

    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(
      "🏆 Top 5:",
      leaderboardData.slice(0, 5).map((p) => `${p.USERNAME}: ${p.TotalScore}`),
    );

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getWeekRangeLeaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


/*
const handleGetTeamWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching TEAM week range leaderboard:", {
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
        message: "Missing required parameters",
      });
    }

    // Create date strings for the range
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
      dates.push(dateStr);
    }

    console.log("📅 Date range:", dates);

    // Get all users in the business unit
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users in ${businessUnit}`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No users found",
      });
    }

    // ✅ Calculate scores grouped by TEAM
    const teamScores = {};

    for (const user of users) {
      const teamName = user.TEAMNAME || "No Team";

      // Initialize team if not exists
      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          teamName: teamName,
          totalScore: 0,
          totalMatches: 0,
          memberCount: 0,
          members: [],
        };
      }

      teamScores[teamName].memberCount++;
      teamScores[teamName].members.push(user.USERNAME);

      // Calculate user's score for this date range
      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        for (const upload of user.MRUploadedData) {
          const dateMatches = dates.includes(upload.DateOfCreation);
          const statusMatches =
            upload.Status === "Approved" || upload.Status === "Pending";

          if (dateMatches && statusMatches) {
            const points = parseInt(upload.Points) || 0;
            teamScores[teamName].totalScore += points;
            teamScores[teamName].totalMatches++;
          }
        }
      }
    }

    console.log(`🏢 Found ${Object.keys(teamScores).length} unique teams`);

    // ✅ Convert to array and filter teams with score > 0
    const leaderboardData = [];

    for (const teamName in teamScores) {
      const team = teamScores[teamName];

      if (team.totalScore > 0) {
        leaderboardData.push({
          TeamName: team.teamName,
          TEAMNAME: team.teamName,
          TotalScore: team.totalScore,
          Runs: team.totalScore,
          TotalMatches: team.totalMatches,
          Matches: team.totalMatches,
          MemberCount: team.memberCount,
          Members: team.members,
        });
      }
    }

    console.log(`📊 ${leaderboardData.length} teams have scores`);

    // Sort by TotalScore descending
    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(`✅ Returning ${leaderboardData.length} teams`);
    console.log(
      `🏆 Top 5 teams:`,
      leaderboardData.slice(0, 5).map((t) => `${t.TeamName}: ${t.TotalScore}`),
    );

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getTeamWeekRangeLeaderboard:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
*/

/*
const handleGetTeamWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching TEAM week range leaderboard:", {
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
        message: "Missing required parameters",
      });
    }

    // Create date strings for the range
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      const dateStr = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
      dates.push(dateStr);
    }

    console.log("📅 Date range:", dates);

    // Get all users in the business unit
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users in ${businessUnit}`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No users found",
      });
    }

    // ✅ Calculate scores grouped by TEAM
    const teamScores = {};

    for (const user of users) {
      const teamName = user.TEAMNAME || "No Team";

      // Initialize team if not exists
      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          teamName: teamName,
          totalScore: 0,
          totalMatches: 0,
          memberCount: 0,
          members: [],
            // ✅ NEW (added only)
    brandCounts: {
      brand1: 0,
      brand2: 0,
      brand3: 0,
    },
        };
      }

      teamScores[teamName].memberCount++;
      teamScores[teamName].members.push(user.USERNAME);

      // Calculate user's score for this date range
      if (user.MRUploadedData && Array.isArray(user.MRUploadedData)) {
        for (const upload of user.MRUploadedData) {
          const dateMatches = dates.includes(upload.DateOfCreation);
          const statusMatches =
            upload.Status === "Approved";

          if (dateMatches && statusMatches) {
            const points = parseInt(upload.Points) || 0;
            teamScores[teamName].totalScore += points;
            teamScores[teamName].totalMatches++;

            // ✅ COUNT BRANDS
  const numberOfBrands = upload.NumberOfBrands;
  if (numberOfBrands === 1) {
    teamScores[teamName].brandCounts.brand1++;
  } else if (numberOfBrands === 2) {
    teamScores[teamName].brandCounts.brand2++;
  } else if (numberOfBrands === 3) {
    teamScores[teamName].brandCounts.brand3++;
  }
          }
        }
      }
    }

    console.log(`🏢 Found ${Object.keys(teamScores).length} unique teams`);

    // ✅ Convert to array and filter teams with score > 0
    const leaderboardData = [];

    for (const teamName in teamScores) {
      const team = teamScores[teamName];

      if (team.totalScore > 0) {
        leaderboardData.push({
          TeamName: team.teamName,
          TEAMNAME: team.teamName,
          TotalScore: team.totalScore,
          Runs: team.totalScore,
          TotalMatches: team.totalMatches,
          Matches: team.totalMatches,
          MemberCount: team.memberCount,
          Members: team.members,
          // ✅ NEW (added only)
  brandCounts: team.brandCounts,
  totalBrandCount:
    team.brandCounts.brand1 +
    team.brandCounts.brand2 +
    team.brandCounts.brand3,

        });
      }
    }

    console.log(`📊 ${leaderboardData.length} teams have scores`);

    // Sort by TotalScore descending
    leaderboardData.sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(`✅ Returning ${leaderboardData.length} teams`);
    console.log(
      `🏆 Top 5 teams:`,
      leaderboardData.slice(0, 5).map((t) => `${t.TeamName}: ${t.TotalScore}`),
    );

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getTeamWeekRangeLeaderboard:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
*/

const handleGetTeamWeekRangeLeaderboard = async (req, res) => {
  try {
    const { startDay, endDay, month, year, businessUnit } = req.query;

    console.log("📊 Fetching TEAM week range leaderboard:", {
      startDay,
      endDay,
      month,
      year,
      businessUnit,
    });

    // 🔑 Load leaderboard settings
    const settings = await getLeaderboardSettings();
    console.log("⚙️ Team Rank Metric:", settings.teamRankMetric);

    // Validate parameters
    if (!startDay || !endDay || !month || !year || !businessUnit) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Create date strings
    const dates = [];
    for (let day = parseInt(startDay); day <= parseInt(endDay); day++) {
      dates.push(
        `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`,
      );
    }

    console.log("📅 Date range:", dates);

    // Fetch MRs
    const users = await mrModel
      .find(
        { BUSINESSUNIT: businessUnit },
        { USERNAME: 1, TEAMNAME: 1, MRUploadedData: 1 },
      )
      .lean();

    console.log(`📦 Found ${users.length} users`);

    if (!users.length) {
      return res.json({ success: true, data: [] });
    }

    // 🔢 Aggregate by TEAM
    const teamScores = {};

    for (const user of users) {
      const teamName = user.TEAMNAME || "No Team";

      if (!teamScores[teamName]) {
        teamScores[teamName] = {
          TeamName: teamName,
          TEAMNAME: teamName,

          // internal accumulators
          teamScore: 0,
          totalMatches: 0,

          brandCounts: {
            brand1: 0,
            brand2: 0,
            brand3: 0,
          },

          memberCount: 0,
          members: [],
        };
      }

      teamScores[teamName].memberCount++;
      teamScores[teamName].members.push(user.USERNAME);

      if (!Array.isArray(user.MRUploadedData)) continue;

      for (const upload of user.MRUploadedData) {
        const dateMatches = dates.includes(upload.DateOfCreation);
        const statusMatches = upload.Status === "Approved"; // ✅ APPROVED ONLY

        if (!dateMatches || !statusMatches) continue;

        const points = parseInt(upload.Points || 0);
        const rxns = parseInt(upload.NoRxns || 1);
        teamScores[teamName].teamScore += points * rxns;
        teamScores[teamName].totalMatches++;

        const brands = upload.NumberOfBrands;
        if (brands === 1) teamScores[teamName].brandCounts.brand1++;
        else if (brands === 2) teamScores[teamName].brandCounts.brand2++;
        else if (brands === 3) teamScores[teamName].brandCounts.brand3++;
      }
    }

    // 🧮 Build final response (NO FE CHANGE)
    const leaderboardData = Object.values(teamScores)
      .map((team) => {
        const totalBrandCount =
          team.brandCounts.brand1 +
          team.brandCounts.brand2 +
          team.brandCounts.brand3;

        const finalScore =
          settings.teamRankMetric === "BRAND_COUNT"
            ? totalBrandCount
            : team.teamScore;

        return {
          TeamName: team.TeamName,
          TEAMNAME: team.TeamName,

          // 🔥 FE keeps reading this
          TotalScore: finalScore,
          Runs: finalScore,

          TotalMatches: team.totalMatches,
          Matches: team.totalMatches,

          MemberCount: team.memberCount,
          Members: team.members,

          brandCounts: team.brandCounts,
          totalBrandCount,
        };
      })
      .filter((team) => team.TotalScore > 0)
      .sort((a, b) => b.TotalScore - a.TotalScore);

    console.log(`✅ Returning ${leaderboardData.length} teams`);

    return res.json({
      success: true,
      data: leaderboardData,
      dateRange: `${startDay}-${endDay}`,
    });
  } catch (error) {
    console.error("❌ Error in getTeamWeekRangeLeaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Helper function to get month name
function getMonthName(month) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[parseInt(month) - 1];
}

// const saveWeeklyResults = async (req, res) => {
//   try {
//     const { weekNumber, year, matches } = req.body;

//     // Calculate display dates (Saturday 11:59 PM to Monday 11:59 PM)
//     const weekStartDate = getISOWeekStart(year, weekNumber);
//     const weekEndDate = new Date(weekStartDate);
//     weekEndDate.setDate(weekStartDate.getDate() + 6);

//     // Display from Saturday night
//     const displayStartDate = new Date(weekEndDate);
//     displayStartDate.setHours(23, 59, 59);

//     // Display until Monday night
//     const displayEndDate = new Date(displayStartDate);
//     displayEndDate.setDate(displayStartDate.getDate() + 2);

//     const weeklyResult = new WeeklyMatchResult({
//       weekNumber,
//       year,
//       weekStartDate: formatDate(weekStartDate),
//       weekEndDate: formatDate(weekEndDate),
//       matches: matches,
//       displayStartDate: formatDateTime(displayStartDate),
//       displayEndDate: formatDateTime(displayEndDate),
//       isActive: true,
//     });

//     await weeklyResult.save();

//     return res.status(200).json({
//       success: true,
//       message: "Weekly results saved",
//       data: weeklyResult,
//     });
//   } catch (error) {
//     console.error("Error saving weekly results:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

const parseDateTimeIST = (dateStr) => {
  try {
    // dateStr format: "16-11-2025 23:59" (IST)
    const [datePart, timePart] = dateStr.split(" ");
    const [day, month, year] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // Create date in LOCAL timezone (server is IST)
    return new Date(year, month - 1, day, hours, minutes, 0);
  } catch (error) {
    console.error("❌ Parse error:", error);
    return null;
  }
};

const getActiveWeeklyResults = async (req, res) => {
  try {
    // Current IST time on server
    const now = new Date();

    console.log("📅 Server IST time:", now.toString());

    const activeResults = await WeeklyMatchResult.findOne({
      isActive: true,
    });

    if (!activeResults) {
      console.log("  No active results found");
      return res.status(200).json({
        success: true,
        hasResults: false,
        message: "No active weekly results",
      });
    }

    // Parse display window dates as IST
    const displayStart = parseDateTimeIST(activeResults.displayStartDate);
    const displayEnd = parseDateTimeIST(activeResults.displayEndDate);

    if (!displayStart || !displayEnd) {
      return res.status(500).json({
        success: false,
        message: "Invalid date format",
      });
    }

    console.log("📅 Display window (IST):", {
      displayStart: displayStart.toString(),
      displayEnd: displayEnd.toString(),
    });

    // Check if now is within display window
    if (now < displayStart || now > displayEnd) {
      console.log("❌ Not in display window");
      return res.status(200).json({
        success: true,
        hasResults: false,
        message:
          now < displayStart
            ? "Results not available yet"
            : "Results display period ended",
      });
    }

    console.log("✅ In display window!");

    // Build carousel data
    const carouselData = [];

    activeResults.matches.forEach((match, index) => {
      carouselData.push({
        type: "winner",
        bannerImage: "MatchWinnerBanner.png",
        matchNumber: index + 1,
        winner: match.winner,
        teamA: match.teamA,
        teamB: match.teamB,
        teamAScore: match.teamAScore || 0,
        teamBScore: match.teamBScore || 0,
        startDate: activeResults.weekStartDate,
        endDate: activeResults.weekEndDate,
      });

      carouselData.push({
        type: "mom",
        bannerImage: "ManOfTheMatchBanner.png",
        matchNumber: index + 1,
        mrName: match.manOfTheMatch.mrName,
        teamName: match.manOfTheMatch.teamName,
        score: match.manOfTheMatch.score || 0,
        startDate: activeResults.weekStartDate,
        endDate: activeResults.weekEndDate,
      });
    });

    console.log(`✅ Returning ${carouselData.length} items`);

    return res.status(200).json({
      success: true,
      hasResults: true,
      data: carouselData,
      weekInfo: {
        weekNumber: activeResults.weekNumber,
        weekStartDate: activeResults.weekStartDate,
        weekEndDate: activeResults.weekEndDate,
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// const scheduleWeeklyResultsCalculation = () => {
//   cron.schedule(
//     "59 23 * * 6",
//     async () => {
//       console.log("🏆 Running weekly results calculation...");

//       try {
//         await calculateAndSaveWeeklyResults();
//         io.emit("weeklyResultsUpdated", {
//           hasResults: true,
//           data: carouselData,
//         });
//       } catch (error) {
//         console.error("❌ Error in weekly results cron:", error);
//       }
//     },
//     {
//       timezone: "Asia/Kolkata",
//     }
//   );

//   console.log(
//     "✅ Weekly results cron scheduled for every Saturday 11:59 PM IST"
//   );
// };

// // ✅ MAIN CALCULATION FUNCTION
// const calculateAndSaveWeeklyResults = async () => {
//   try {
//     console.log("📊 Calculating weekly results...");

//     // Get current week info
//     const now = new Date();
//     const weekInfo = getISOWeekInfo(now);

//     console.log(`Week: ${weekInfo.weekNumber}, Year: ${weekInfo.year}`);

//     // Get week dates
//     const weekStartDate = getISOWeekStart(weekInfo.year, weekInfo.weekNumber);
//     const weekEndDate = new Date(weekStartDate);
//     weekEndDate.setDate(weekStartDate.getDate() + 6);

//     const startDateStr = formatDate(weekStartDate);
//     const endDateStr = formatDate(weekEndDate);

//     console.log(`Week range: ${startDateStr} to ${endDateStr}`);

//     // ✅ FIND ALL MATCHES THAT ENDED THIS WEEK
//     const weeklyMatches = await MatchesSchema.find({
//       isTournament: true,
//       endDate: endDateStr, // Matches ending today (Saturday)
//     });

//     if (weeklyMatches.length === 0) {
//       console.log("⚠️ No matches ended this week");
//       return;
//     }

//     console.log(`✅ Found ${weeklyMatches.length} matches`);

//     // ✅ CALCULATE WINNER AND MOM FOR EACH MATCH
//     const matchResults = [];

//     for (const match of weeklyMatches) {
//       console.log(`\n🏆 Processing: ${match.teamA} vs ${match.teamB}`);

//       // Calculate team scores
//       const teamAScore = await calculateTeamScore(
//         match.roomPlayersA,
//         match._id
//       );
//       const teamBScore = await calculateTeamScore(
//         match.roomPlayersB,
//         match._id
//       );

//       console.log(
//         `${match.teamA}: ${teamAScore}, ${match.teamB}: ${teamBScore}`
//       );

//       // Determine winner
//       const winner = teamAScore > teamBScore ? match.teamA : match.teamB;
//       console.log(`Winner: ${winner}`);

//       // Find Man of the Match
//       const allPlayers = [...match.roomPlayersA, ...match.roomPlayersB];
//       const mom = await findManOfTheMatch(allPlayers, match._id);

//       if (mom) {
//         console.log(`Man of the Match: ${mom.mrName} (${mom.score} points)`);

//         matchResults.push({
//           matchId: match._id,
//           teamA: match.teamA,
//           teamB: match.teamB,
//           teamAScore: teamAScore,
//           teamBScore: teamBScore,
//           winner: winner,
//           manOfTheMatch: {
//             mrId: mom.mrId,
//             mrName: mom.mrName,
//             teamName: mom.teamName,
//             score: mom.score,
//           },
//         });
//       }
//     }

//     if (matchResults.length === 0) {
//       console.log("⚠️ No match results to save");
//       return;
//     }

//     // ✅ DEACTIVATE PREVIOUS WEEK'S RESULTS
//     await WeeklyMatchResult.updateMany(
//       { isActive: true },
//       { $set: { isActive: false } }
//     );

//     // ✅ SAVE NEW WEEKLY RESULTS
//     const displayStartDate = new Date(weekEndDate);
//     displayStartDate.setHours(23, 59, 59);

//     const displayEndDate = new Date(displayStartDate);
//     displayEndDate.setDate(displayStartDate.getDate() + 2);

//     const weeklyResult = new WeeklyMatchResult({
//       weekNumber: weekInfo.weekNumber,
//       year: weekInfo.year,
//       weekStartDate: startDateStr,
//       weekEndDate: endDateStr,
//       matches: matchResults,
//       displayStartDate: formatDateTime(displayStartDate),
//       displayEndDate: formatDateTime(displayEndDate),
//       isActive: true,
//     });

//     await weeklyResult.save();

//     console.log("✅ Weekly results saved!");
//     console.log(
//       `📅 Display: ${formatDateTime(displayStartDate)} to ${formatDateTime(
//         displayEndDate
//       )}`
//     );
//   } catch (error) {
//     console.error("❌ Error:", error);
//     throw error;
//   }
// };

// // ✅ CALCULATE TEAM TOTAL SCORE
// const calculateTeamScore = async (playerIds, matchId) => {
//   let totalScore = 0;

//   for (const playerId of playerIds) {
//     const mr = await mrModel.findById(playerId).populate("MrScoreEachMatch");

//     if (mr && mr.MrScoreEachMatch) {
//       const matchScores = mr.MrScoreEachMatch.filter(
//         (score) =>
//           score.MatchId && score.MatchId.toString() === matchId.toString()
//       );

//       matchScores.forEach((score) => {
//         totalScore += parseInt(score.Score || 0);
//       });
//     }
//   }

//   return totalScore;
// };

// // ✅ FIND MAN OF THE MATCH
// const findManOfTheMatch = async (playerIds, matchId) => {
//   let maxScore = 0;
//   let manOfTheMatch = null;

//   for (const playerId of playerIds) {
//     const mr = await mrModel.findById(playerId).populate("MrScoreEachMatch");

//     if (mr && mr.MrScoreEachMatch) {
//       const matchScores = mr.MrScoreEachMatch.filter(
//         (score) =>
//           score.MatchId && score.MatchId.toString() === matchId.toString()
//       );

//       const playerScore = matchScores.reduce((sum, score) => {
//         return sum + parseInt(score.Score || 0);
//       }, 0);

//       if (playerScore > maxScore) {
//         maxScore = playerScore;
//         manOfTheMatch = {
//           mrId: mr._id,
//           mrName: mr.USERNAME,
//           teamName: mr.TEAMNAME,
//           score: playerScore,
//         };
//       }
//     }
//   }

//   return manOfTheMatch;
// };

// // ✅ GET CURRENT WEEK INFO
// const getISOWeekInfo = (date) => {
//   const year = date.getFullYear();
//   const jan4 = new Date(year, 0, 4);
//   const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
//   const week1Monday = new Date(jan4);
//   week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);

//   const diffInMs = date - week1Monday;
//   const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
//   const weekNumber = Math.floor(diffInDays / 7) + 1;

//   return { weekNumber, year };
// };

// function getISOWeekStart(year, weekNumber) {
//   const jan4 = new Date(year, 0, 4);
//   const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
//   const week1Monday = new Date(jan4);
//   week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);
//   const weekStartDate = new Date(week1Monday);
//   weekStartDate.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);
//   return weekStartDate;
// }

// function formatDate(date) {
//   const day = String(date.getDate()).padStart(2, "0");
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const year = date.getFullYear();
//   return `${day}-${month}-${year}`;
// }

// function formatDateTime(date) {
//   return `${formatDate(date)} ${String(date.getHours()).padStart(
//     2,
//     "0"
//   )}:${String(date.getMinutes()).padStart(2, "0")}`;
// }

//MOM CALCULATION AND WEEKLY RESULT SAVE FUNCTION

const calculateAndSaveWeeklyResults = async () => {
  try {
    console.log("🏆 Starting weekly results calculation...");

    const now = new Date();
    const weekInfo = getISOWeekInfo(now);

    const weekStartDate = getISOWeekStart(weekInfo.year, weekInfo.weekNumber);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 5);

    const startDateStr = formatDate(weekStartDate); // "10-11-2025"
    const endDateStr = formatDate(weekEndDate); // "16-11-2025"

    console.log(`📆 Week range: ${startDateStr} to ${endDateStr}`);
    console.log(
      `📆 Week range (Date objects): ${weekStartDate.toISOString()} to ${weekEndDate.toISOString()}`,
    );

    // ✅ ADD THIS HELPER FUNCTION
    const parseStoredDate = (dateStr) => {
      const [day, month, year] = dateStr.split("-");
      return new Date(year, month - 1, day);
    };

    // ✅ MODIFIED: Fetch all matches first, then filter in memory
    console.log("🔍 Fetching all tournament matches...");
    const allMatches = await MatchesSchema.find({
      isTournament: true,
      "MatchResult.0": { $exists: true },
    });

    console.log(`📊 Total tournament matches found: ${allMatches.length}`);

    // ✅ FILTER IN MEMORY with proper date comparison
    const weeklyMatches = allMatches.filter((match) => {
      const matchEnd = parseStoredDate(match.endDate);
      const isInRange = matchEnd >= weekStartDate && matchEnd <= weekEndDate;

      if (isInRange) {
        console.log(
          `✅ Match included: ${match.teamA} vs ${match.teamB}, endDate: ${match.endDate}`,
        );
      }

      return isInRange;
    });

    console.log(
      `✅ Found ${weeklyMatches.length} tournament matches in week range`,
    );

    // ✅ REST OF THE CODE STAYS EXACTLY THE SAME
    // ✅ PROCESS EACH MATCH
    const matchResults = [];

    for (const match of weeklyMatches) {
      console.log(`\n🏏 Processing: ${match.teamA} vs ${match.teamB}`);

      // Get the latest match result
      const latestResult = match.MatchResult[match.MatchResult.length - 1];

      if (!latestResult) {
        console.log("  ⚠️ No result found for this match");
        continue;
      }

      const teamAScore = parseInt(latestResult.teamAScore || 0);
      const teamBScore = parseInt(latestResult.teamBScore || 0);

      console.log(`  ${match.teamA}: ${teamAScore} runs`);
      console.log(`  ${match.teamB}: ${teamBScore} runs`);

      // ✅ DETERMINE WINNER
      let winner = "";
      let winningTeamPlayers = [];

      if (latestResult.winner === "Team A win") {
        winner = match.teamA;
        winningTeamPlayers = match.roomPlayersA;
      } else if (latestResult.winner === "Team B win") {
        winner = match.teamB;
        winningTeamPlayers = match.roomPlayersB;
      } else {
        console.log("  ⚠️ Match result is draw or invalid");
        continue;
      }

      console.log(`  🏆 Winner: ${winner}`);

      // ✅ FIND MAN OF THE MATCH FROM WINNING TEAM
      const mom = await findManOfTheMatch(
        winningTeamPlayers,
        match.startDate,
        match.endDate,
      );

      if (!mom) {
        console.log("  ⚠️ Could not determine Man of the Match");
        continue;
      }

      console.log(
        `  ⭐ Man of the Match: ${mom.mrName} (${mom.score} runs, ${mom.sixes} sixes, ${mom.fours} fours)`,
      );

      // ✅ ADD TO RESULTS
      matchResults.push({
        matchId: match._id,
        teamA: winner,
        teamB: match.teamB,
        teamAScore: Math.abs(teamAScore - teamBScore),
        teamBScore: teamBScore,
        winner: winner,
        manOfTheMatch: {
          mrId: mom.mrId,
          mrName: mom.mrName,
          teamName: mom.teamName,
          score: mom.score,
        },
      });
    }

    if (matchResults.length === 0) {
      console.log("⚠️ No valid match results to save");
      return;
    }

    console.log(`\n💾 Saving ${matchResults.length} match results...`);

    // ✅ DEACTIVATE PREVIOUS WEEK'S RESULTS
    await WeeklyMatchResult.updateMany(
      { isActive: true },
      { $set: { isActive: false } },
    );

    console.log("✅ Deactivated previous week results");

    // ✅ SAVE NEW WEEKLY RESULTS
    const displayStartDate = new Date(weekEndDate);
    displayStartDate.setHours(23, 59, 0);

    const displayEndDate = new Date(displayStartDate);
    displayEndDate.setDate(displayStartDate.getDate() + 2); // Monday 11:59 PM

    const weeklyResult = new WeeklyMatchResult({
      weekNumber: weekInfo.weekNumber,
      year: weekInfo.year,
      weekStartDate: startDateStr,
      weekEndDate: endDateStr,
      matches: matchResults,
      displayStartDate: formatDateTime(displayStartDate),
      displayEndDate: formatDateTime(displayEndDate),
      isActive: true,
    });

    await weeklyResult.save();

    console.log("✅ Weekly results saved successfully!");
    console.log(
      `📅 Display period: ${formatDateTime(
        displayStartDate,
      )} to ${formatDateTime(displayEndDate)}`,
    );
    console.log(`📊 Total matches saved: ${matchResults.length}`);

    // ✅ EMIT SOCKET EVENT (if you have socket.io setup)
    if (global.io) {
      const carouselData = buildCarouselData(weeklyResult);
      global.io.emit("weeklyResultsUpdated", {
        hasResults: true,
        data: carouselData,
      });
      console.log("📡 Socket event emitted");
    }

    return weeklyResult;
  } catch (error) {
    console.error("❌ Error in calculateAndSaveWeeklyResults:", error);
    throw error;
  }
};

// ✅ FIND MAN OF THE MATCH FROM WINNING TEAM
const findManOfTheMatch = async (playerIds, matchStartDate, matchEndDate) => {
  try {
    let topPlayer = null;
    let maxScore = -1;
    let maxSixes = -1;
    let maxFours = -1;

    for (const playerId of playerIds) {
      // Find the MR
      const mr = await mrModel.findById(playerId);

      if (!mr || !mr.MrScoreEachMatch || mr.MrScoreEachMatch.length === 0) {
        continue;
      }

      // Find scores for this specific match period
      const matchScores = mr.MrScoreEachMatch.filter(
        (scoreObj) =>
          scoreObj.matchStartDate === matchStartDate &&
          scoreObj.matchEndDate === matchEndDate &&
          scoreObj.isTournament === true,
      );

      if (matchScores.length === 0) {
        continue;
      }

      // Calculate total score for this player in this match
      let playerTotalScore = 0;
      let playerTotalSixes = 0;
      let playerTotalFours = 0;

      matchScores.forEach((scoreObj) => {
        playerTotalScore += parseInt(scoreObj.Score || 0);
        playerTotalSixes += parseInt(scoreObj.TotalSixes || 0);
        playerTotalFours += parseInt(scoreObj.TotalFours || 0);
      });

      // ✅ COMPARISON LOGIC: Score → Sixes → Fours
      const isNewTopPlayer =
        playerTotalScore > maxScore ||
        (playerTotalScore === maxScore && playerTotalSixes > maxSixes) ||
        (playerTotalScore === maxScore &&
          playerTotalSixes === maxSixes &&
          playerTotalFours > maxFours);

      if (isNewTopPlayer) {
        maxScore = playerTotalScore;
        maxSixes = playerTotalSixes;
        maxFours = playerTotalFours;

        topPlayer = {
          mrId: mr._id,
          mrName: mr.USERNAME,
          teamName: mr.TEAMNAME,
          score: playerTotalScore,
          sixes: playerTotalSixes,
          fours: playerTotalFours,
        };
      }
    }

    return topPlayer;
  } catch (error) {
    console.error("❌ Error in findManOfTheMatch:", error);
    return null;
  }
};

// ✅ BUILD CAROUSEL DATA FOR FRONTEND
const buildCarouselData = (weeklyResult) => {
  const carouselData = [];

  weeklyResult.matches.forEach((match, index) => {
    // Add Winner banner
    carouselData.push({
      type: "winner",
      bannerImage: "MatchWinnerBanner.png",
      matchNumber: index + 1,
      winner: match.winner,
      teamA: match.teamA,
      teamB: match.teamB,
      teamAScore: match.teamAScore,
      teamBScore: match.teamBScore,
      startDate: weeklyResult.weekStartDate,
      endDate: weeklyResult.weekEndDate,
    });

    // Add MOM banner
    carouselData.push({
      type: "mom",
      bannerImage: "ManOfTheMatchBanner.png",
      matchNumber: index + 1,
      mrName: match.manOfTheMatch.mrName,
      teamName: match.manOfTheMatch.teamName,
      score: match.manOfTheMatch.score,
      startDate: weeklyResult.weekStartDate,
      endDate: weeklyResult.weekEndDate,
    });
  });

  return carouselData;
};

// ✅ GET ACTIVE WEEKLY RESULTS (API for Frontend)
// const getActiveWeeklyResults = async (req, res) => {
//   try {
//     const now = new Date();
//     const nowStr = formatDateTime(now);

//     console.log('🔍 Current time:', nowStr);

//     const activeResults = await WeeklyMatchResult.findOne({
//       isActive: true,
//       displayStartDate: { $lte: nowStr },
//       displayEndDate: { $gte: nowStr }
//     });

//     if (!activeResults) {
//       return res.status(200).json({
//         success: true,
//         hasResults: false,
//         message: 'No active weekly results'
//       });
//     }

//     // Build carousel data
//     const carouselData = buildCarouselData(activeResults);

//     return res.status(200).json({
//       success: true,
//       hasResults: true,
//       data: carouselData,
//       weekInfo: {
//         weekNumber: activeResults.weekNumber,
//         weekStartDate: activeResults.weekStartDate,
//         weekEndDate: activeResults.weekEndDate
//       }
//     });

//   } catch (error) {
//     console.error('❌ Error getting active results:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal Server Error',
//       error: error.message
//     });
//   }
// };

// ✅ DEACTIVATE RESULTS (Runs Monday 11:59 PM)
const deactivateWeeklyResults = async () => {
  try {
    console.log("🔄 Deactivating expired weekly results...");

    const now = new Date();
    const nowStr = formatDateTime(now);

    const result = await WeeklyMatchResult.updateMany(
      {
        isActive: true,
        displayEndDate: { $lt: nowStr },
      },
      { $set: { isActive: false } },
    );

    console.log(`✅ Deactivated ${result.modifiedCount} expired results`);

    // Emit socket event
    if (global.io) {
      global.io.emit("weeklyResultsUpdated", {
        hasResults: false,
        data: [],
      });
    }
  } catch (error) {
    console.error("❌ Error deactivating results:", error);
  }
};

// ✅ SCHEDULE CRON JOBS
const scheduleWeeklyResultsCron = () => {
  // Saturday 11:59 PM IST - Calculate and save results
  cron.schedule(
    "59 23 * * 6",
    async () => {
      console.log(
        "🏆 Running weekly results calculation (Saturday 11:59 PM)...",
      );
      try {
        await calculateAndSaveWeeklyResults();
      } catch (error) {
        console.error("❌ Error in weekly results cron:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  // Monday 11:59 PM IST - Deactivate results
  cron.schedule(
    "59 23 * * 1",
    async () => {
      console.log("🔄 Deactivating weekly results (Monday 11:59 PM)...");
      try {
        await deactivateWeeklyResults();
      } catch (error) {
        console.error("❌ Error in deactivation cron:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("✅ Weekly results cron jobs scheduled:");
  console.log("   - Saturday 11:59 PM: Calculate results");
  console.log("   - Monday 11:59 PM: Deactivate results");
};

// ✅ MANUAL TRIGGER API (for testing)
const manualTriggerWeeklyResults = async (req, res) => {
  try {
    console.log("🔧 Manual trigger: Calculating weekly results...");
    const result = await calculateAndSaveWeeklyResults();

    return res.status(200).json({
      success: true,
      message: "Weekly results calculated successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in manual trigger:", error);
    return res.status(500).json({
      success: false,
      message: "Error calculating results",
      error: error.message,
    });
  }
};

// ✅ HELPER FUNCTIONS
function getISOWeekInfo(date) {
  const year = date.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);

  const diffInMs = date - week1Monday;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffInDays / 7) + 1;

  return { weekNumber, year };
}

function getISOWeekStart(year, weekNumber) {
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);
  const weekStartDate = new Date(week1Monday);
  weekStartDate.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);
  return weekStartDate;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(date)} ${hours}:${minutes}`;
}

// TEST VERSION - runs every minute
scheduleWeeklyResultsCron();

module.exports = {
  createMr,
  loginMr,
  getProfileMr,
  handleForgetPassword,
  handleUploadPrescriptionData,
  fetchedBrandName,
  fetchMatchData,
  handleRejection,
  getPresignedUrl,
  getMrRank,
  getLastMatchResult,
  GetMatchIdMr,
  UploadProfilePhoto,
  getAllTeamRank,
  SendQueryToAdmin,
  GetCaptainDetails,
  CaptainLastMatchResult,
  GetAllTeamNames,
  GetOdiMatchSummary,
  GetTournamentDataSummary,
  getAllOdiMatchData,
  getAllTournamentMatchData,
  getAllOdiMatchDataTeamWise,
  getAllTournamentMatchDataTeamWise,
  handleGetQuery,
  SendQueryToAdminByMR,
  getMrRankZoneWise,
  getMrRankMonthWise,
  getAdminUploadMatchesMonthWise,
  getUserDetailsCompanyWise,
  getAllCompanyMonths,
  getAdminUploadLastMatchResults,
  getMrRankMonthWiseZoneWise,
  TrackUserReportEachDay,
  getAllUsersFromDatabase,
  getUserDataSingleUser,
  UpdateUserDataSingleUser,
  GetZoneWiseTopScorerNpl,
  GetRegionWiseTopScorerNpl,
  getAdminUploadMatchesMonthWiseNpl,
  GetAllRegionWiseScorerNpl,
  GetAllZoneWiseScorerNpl,
  getAllOdiMatchDataNplRegion,
  getAllTournamentMatchDataNplRegion,
  getAllOdiMatchDataNplZone,
  getAllTournamentMatchDataNplZone,
  getAdminUploadMatchesNplQTR,
  getAllImagesByAdminCompany,
  getUserDetailsCompanyWiseNpl,
  GetOdiMatchSummaryNpl,
  GetTournamentDataSummaryNpl,
  handleResubmit,
  handleUpdatePrescriptionImage,
  getWeeklyLeaderboard,
  getAvailableMonths,
  getMonthlyLeaderboard,
  getWeeklyTeamLeaderboard,
  getMonthlyTeamLeaderboard,
  // saveWeeklyResults,
  getActiveWeeklyResults,
  // scheduleWeeklyResultsCalculation,
  // calculateAndSaveWeeklyResults,
  // getActiveWeeklyResults,
  manualTriggerWeeklyResults,
  scheduleWeeklyResultsCron,
  calculateAndSaveWeeklyResults,
  deactivateWeeklyResults,
  DeleteProfilePhoto,
  // getLeaderboardMonths,
  getDailyLeaderboard,
  getDailyTeamLeaderboard,
  handleGetWeekRangeLeaderboard,
  handleGetTeamWeekRangeLeaderboard,
  invalidateMatchStatusCache
};
