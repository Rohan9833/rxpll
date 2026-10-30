const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");

const {
  createMr,
  getAdminUploadMatchesMonthWise,
  handleGetQuery,
  getAllTournamentMatchDataTeamWise,
  getAllOdiMatchDataTeamWise,
  getAllTournamentMatchData,
  GetTournamentDataSummary,
  getAllOdiMatchData,
  GetOdiMatchSummary,
  GetAllTeamNames,
  CaptainLastMatchResult,
  GetCaptainDetails,
  SendQueryToAdmin,
  getAllTeamRank,
  UploadProfilePhoto,
  GetMatchIdMr,
  getLastMatchResult,
  getMrRank,
  getPresignedUrl,
  handleRejection,
  fetchedBrandName,
  fetchMatchData,
  loginMr,
  getProfileMr,
  handleForgetPassword,
  handleUploadPrescriptionData,
  SendQueryToAdminByMR,
  getMrRankZoneWise,
  getMrRankMonthWise,
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
  getAvailableMonths,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
  getWeeklyTeamLeaderboard,
  getMonthlyTeamLeaderboard,
  // getActiveWeeklyResults,
  manualTriggerWeeklyResults,
  // saveWeeklyResults,
  getActiveWeeklyResults,
  DeleteProfilePhoto,
  getDailyLeaderboard,
  getDailyTeamLeaderboard,
  handleGetWeekRangeLeaderboard,
  handleGetTeamWeekRangeLeaderboard,
  getPlayersByTeamName,
 // getLeaderboardMonths
} = require("../Controllers/MrController");



// Multer configuration for file uploads....
const PrescriptionImage = "uploads";
if (!fs.existsSync(PrescriptionImage)) {
  fs.mkdirSync(PrescriptionImage);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PrescriptionImage);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

//All Post Api here
router.post("/create-mr/:id", createMr);
router.post("/login-mr", loginMr);
router.post("/forget-mr-password", handleForgetPassword);
// router.post("/uploadPrescriptionData/:id", upload.single('PrescriptionImage'),handleUploadPrescriptionData)
router.post(
  "/uploadPrescriptionData/:id",
  upload.single('PrescriptionImage'),
  handleUploadPrescriptionData
);
router.post("/getPresignedUrl", getPresignedUrl);
router.post("/ProfilePhoto/:Id", upload.single('profileImage'), UploadProfilePhoto);
router.delete("/ProfilePhoto/:Id", DeleteProfilePhoto);
router.post("/sendQueryMr/:mrId", SendQueryToAdmin);
router.post("/sendQueryMrAgain/:mrName", SendQueryToAdminByMR); 

//All Put Api here
router.put("/reject/:id/:mrId", handleRejection);

//All Get Api here
router.get("/profile/:id", getProfileMr);
router.get("/fetchedBrandName", fetchedBrandName);
router.get("/MatchDataFetch/:mrId", fetchMatchData);
router.get("/getMrRank/:companyName", getMrRank);
router.get("/getLastMatchResult/:mrId", getLastMatchResult);
router.get("/onlyGetMatchId/:mrId", GetMatchIdMr);
router.get("/getAllTeamRank", getAllTeamRank);
router.get("/getCaptainDetails/:id", GetCaptainDetails);
router.get("/captainLastMatchResult/:id", CaptainLastMatchResult);
router.get("/getTeamNames", GetAllTeamNames);

router.get("/getOdiMatchData/:mrId", GetOdiMatchSummary);
router.get("/getTournamentMatchData/:mrId", GetTournamentDataSummary);

router.get("/getAllOdiMatchData", getAllOdiMatchData);
router.get("/getAllTournamentMatchData", getAllTournamentMatchData);

router.get("/getAllOdiMatchDataTeamWise", getAllOdiMatchDataTeamWise);
router.get(
  "/getAllTournamentMatchDataTeamWise",
  getAllTournamentMatchDataTeamWise
);

router.get("/getQuery/:mrid", handleGetQuery);

//Get Mr-Rank Based On ZoneWise
router.get("/getMrRank-ZoneWise/:zone", getMrRankZoneWise);

//Get Mr-Rank Month Wise
router.get("/getMrRank-MonthWise/:month/:year", getMrRankMonthWise);

//Get Mr-Rank Monthwise-yearwise-zonewise
router.get("/getMrRank-MonthWise-ZoneWise/:month/:year/:zone",getMrRankMonthWiseZoneWise);

//When Admin Upload Excel The Routes is Following
router.get(
  "/getAdminUploadMatchesMonthWise/:companyName/:monthName/:year/:teamName",
  getAdminUploadMatchesMonthWise
);

router.get(
    "/getUserDetailsCompanyWise/:companyName/:monthName/:year/:teamName",
    getUserDetailsCompanyWise
  );

router.get("/getAllCompanyMonths/:companyName",getAllCompanyMonths);

router.get("/getAdminUploadLastMatchResults/:mrId",getAdminUploadLastMatchResults);

router.post("/postUserTrackReportEachDay",TrackUserReportEachDay);


//All User Based on CompanyName
router.get("/getAllUsersFromDatabase/:companyName",getAllUsersFromDatabase);

//Get User Based on Id
router.get("/getUserDataSingleUser/:id/:role",getUserDataSingleUser);

//Edit User Based on Id
router.put("/updateUserDataSingleUser/:id/:role",UpdateUserDataSingleUser);




router.get("/GetZoneWiseTopScorerNpl/:Zone/:MonthName/:companyName",GetZoneWiseTopScorerNpl);
router.get("/getRegionWiseTopScorerNpl/:Region/:MonthName/:companyName",GetRegionWiseTopScorerNpl);

router.get("/getAllRegionWiseScorerNpl/:Region/:companyName",GetAllRegionWiseScorerNpl);
router.get("/getAllZoneWiseScorerNpl/:Zone/:companyName",GetAllZoneWiseScorerNpl);


router.get("/getAllOdiMatchDataNplRegion/:Region/:companyName",getAllOdiMatchDataNplRegion);
router.get("/getAllTournamentMatchDataNplRegion/:Region/:companyName",getAllTournamentMatchDataNplRegion);


router.get("/getAllOdiMatchDataNplZone/:Zone/:companyName",getAllOdiMatchDataNplZone);
router.get("/getAllTournamentMatchDataNplZone/:Zone/:companyName",getAllTournamentMatchDataNplZone);

router.get(
  "/getAdminUploadMatchesMonthWiseNpl/:companyName/:monthName/:year/:teamName/:brandName",
  getAdminUploadMatchesMonthWiseNpl
);

router.get(
  "/getAdminUploadMatchesNplQTR/:companyName/:monthName/:teamName/:brandName",
  getAdminUploadMatchesNplQTR
);

router.get("/getAllImagesByAdminCompany/:companyName",getAllImagesByAdminCompany);


router.get(
    "/getUserDetailsCompanyWiseNpl/:companyName/:monthName/:year/:teamName/:brandName",
    getUserDetailsCompanyWiseNpl
  );


  router.get("/getOdiMatchDataNpl/:mrId", GetOdiMatchSummaryNpl);
router.get("/getTournamentMatchDataNpl/:mrId", GetTournamentDataSummaryNpl);

router.put('/resubmitPrescription/:mrId/:uploadId', handleResubmit);

router.put(
  '/updatePrescriptionImage/:mrId/:uploadId',
  upload.single('prescriptionImage'),
  handleUpdatePrescriptionImage
);


router.get('/getAvailableMonths', getAvailableMonths);
router.get('/getWeeklyLeaderboard', getWeeklyLeaderboard);

router.get('/getDailyLeaderboard', getDailyLeaderboard);

router.get('/getMonthlyLeaderboard', getMonthlyLeaderboard);

router.get('/getWeeklyTeamLeaderboard', getWeeklyTeamLeaderboard);

router.get('/getMonthlyTeamLeaderboard', getMonthlyTeamLeaderboard);

router.get('/getDailyTeamLeaderboard', getDailyTeamLeaderboard);

router.get('/getWeekRangeLeaderboard', handleGetWeekRangeLeaderboard)

router.get('/teamWeekRangeLeaderboard', handleGetTeamWeekRangeLeaderboard);

router.get(
  '/getPlayersByTeamName',
  getPlayersByTeamName
);
// router.post('/saveWeeklyResults', saveWeeklyResults);
router.get('/getActiveWeeklyResults', getActiveWeeklyResults);


// router.get('/getActiveWeeklyResults', getActiveWeeklyResults);
router.post('/triggerWeeklyResults', manualTriggerWeeklyResults);

//router.get('/getLeaderboardConfig',getLeaderboardMonths);

module.exports = router;
