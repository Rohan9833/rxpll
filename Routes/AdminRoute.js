const express = require("express");
const router = express.Router();

const multer = require("multer");

const fs = require("fs");

const upload = multer({ dest: "uploads/" });

const storage = multer.memoryStorage();
const upload1 = multer({ storage });


const {
  handleAdminCreation,
  sendChallengeByManager,
  joinChallengeRoom,
  handleAdminLogin,
  handleExcelsheetUpload,
  uploadLiveMatches,
  addNewBrandNames,
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
  handleGetSingleBrandData,
  uploadNoMatchImage,
  getNoMatchImage,
  deleteAllNoMatchImages,
  reorderNoMatchImages,
  editNoMatchImage,
  deleteNoMatchImage,
  toggleNoMatchImage,
  getAllNoMatchImages,
  createMatchSchedule,
  getMatchSchedules,
  editMatchSchedule,
  deleteMatchSchedule,
  getMonthlyBrandSummary,
  getPrescriptionStats,
  getBrandStats,
  handleGetUploadDataAdminOnly,
  handleAdminUploadAnalytics,
  handleGetUploadDataPaginated
} = require("../Controllers/AdminController");

router.route("/create-admin").post(handleAdminCreation);
router.route("/admin-login").post(handleAdminLogin);

//ExcelSheet upload with new branching(TLM-SLM-FLM-MR)....
router.post(
  "/upload-excelSheet-admin/:id",
  upload.single("file"),
  handleExcelsheetUpload
);
router.post("/addBrands/:id", addNewBrandNames);
router.post("/liveMatches/:id", uploadLiveMatches);
router.post("/SendChallengeByManager/:id", sendChallengeByManager); //for One Day International Match
router.post("/joinChallengeRoom/:id", joinChallengeRoom); //Join that One Day International Match challenge Match
router.post("/scheduleChallenge/:id", scheduleChallengeRoom); //Schedule that One Day International Match Based on Ids
router.post("/getBillCount/:id", GetBillCount);
router.post('/calculateBillSizeCount/:id', handleCalculateBillSize);

router.post("/scheduleMatchesAdmin/:id",upload.single("file"),handleScheduleMatchesAdmin);

//create popupData
router.post("/createNewPopup/:Id",handleCreateNewPopup);
router.patch("/updatePopupStatus/:Id/:popupId",handleUpdatePopuStatus);

//AdminReplyto query
router.patch('/queryReplyAdmin/:id', handleQueryReplyByAdmin);
router.patch('/updateReadStatus/:id', handleUpdateReadStatus);



router.post("/setMatchDuration/:id", setMatchDurationRoom);
router.patch("/updateMatchDuration/:id",updateMatchDurationRoom);


//Update APIs
router.put("/updateRoomDetails/:id", updateRoomDetailsRoom);
router.put("/EditBrandName/:id", EditBrandNameRoom);


//Delete Created One Day International Match Room
router.delete("/deleteChallengeRoom/:roomId/:creatorId", deleteChallengeRoom);


//Replace Old User to New One Update API Based on User Id
router.put("/updateOldToNew/:adminId",updateOldToNewUser);



//Restrict Company 
router.post("/restrictCompany/:adminId",RestrictCompanyByAdmin);

//Restrict Company Update Details
router.put("/restrictCompanyUpdate/:companyName/:adminId",RestrictCompanyUpdate);

//Upload PrescriptDetails By Admin Excel
router.post("/uploadExcelPrescriptionDetails/:adminId",upload.single("file"),uploadExcelPrescriptionDetails);

//Create CompanyWiseMonthly Reports
router.post("/createCompanyWiseReports/:adminId",createCompany);

//Create CompanyMonths 
router.post('/createCompanyMonths/:adminId',CreateCompanyMonths);


//All The GET Api Details
router.get("/getAllCreatedRoomDetails", getAllCreatedRoomDetails);

//Get Room Based on Room Id
router.get("/getRoomByRoomId/:roomId", getRoomByRoomId);
router.get("/getUploadData/:id", handleGetUploadData);
router.get("/getMatchData/:mrId", handleGetMatchDataByMatchDate);
router.get('/getAllBrandData/:id', handleGetAllBrandData);

//Get Top Run Scorer Api
router.get("/topRunScorer", handleGetTopRunScorer);

//Get Highest Batting Average Api
router.get('/highestBatchingAverage', handleGetHighestBatchingAverage);

//Get Total Runs Api
router.get('/totalRuns', handleGetTotalRuns);

//Highest Team Score Api
router.get("/getHighestTeamScore", handleGetHighestTeamScore);

//Lowest Team Score Api
router.get('/getLowestTeamScore', handleGetLowestTeamScore);

//Get total Sixes Api
router.get("/getTotalSixes", handleTotalSixes);

//Get total Fours Api
router.get("/getTotalFours", handleTotalFours)

//Get Total Centuries Api
router.get('/totalCenturiesCount', handleTotalCenturiesCount);

//Get Total Half Centuries Api
router.get('/totalHalfCenturiesCount', handleTotalHalfCenturiesCount);

//Get BestScore by Player Api
router.get("/bestScoreByPlayer", handleBestScoreByPlayer);

//Get Most No of Matches Played By Any Team
router.get("/getMostNoOfMatchesByTeam", handleMostNoOfMatchesByTeam);

//Compare Two Mrs Api Get MrData by Name
router.get('/getMrNames', handleGetMrNames);

//Get Mr Data for Comparision
router.get('/playerDetails/:mrName', handleGetPlayerDetails);

router.get('/getAllNotification/:companyName', handleGetAllNotification);

//Get Team Details By TeamName
router.get("/getTeamDetails/:TeamName", handleGetTeamDetailsByTeamName);

//Get Points Table By TeamName
router.get("/getPointsTableByTeamName/:TeamName", handleGetPointsTableByTeamName);

//Get All Matches By AdminID
router.get("/getAllMatches",handleGetAllMatches);

router.get("/getAllPopup", handlegetAllPopup);

router.get("/getAllQueryByAdmin/:id", handleGetAllQueryByAdmin);
router.get('/getQueryByCaseNo/:caseNo', handleGetAllQueryByCaseNo);

router.get('/getMatchDuration/:id',handleGetMatchDuration);

//Get All Company Details
router.get("/getRestrictedComapanyDetails/:companyName",GetAllRestrictedCompanyDetails);

//Get User Details To Send Notification to Login Users 
router.get('/getNotificationDeviceTokenByAdmin/:adminId',getNotificationDeviceTokenByAdmin);

//Send Notification to Login Users 
router.post('/sendNotificationToUsers',sendNotificationToUsers);

router.post("/uploadImageFromAdminMonthWise/:adminId/:companyName/:monthName",upload1.single("image"),uploadImageFromAdminMonthWise)

router.put("/updateImageUploadByAdminMonthWise/:adminId/:companyName/:monthName",upload1.single("image"),updateImageUploadByAdminMonthWise);

router.get("/getAllImagesByAdminCompany/:companyName",getAllImagesByAdminCompany);


router.get("/getUsersScreenTime/:adminId/:companyName",getUsersScreenTime);

router.get('/getsingleBrandData/:id', handleGetSingleBrandData);

router.post('/uploadNoMatchImage/:adminId', upload.single('image'), uploadNoMatchImage);
router.get('/getNoMatchImage', getNoMatchImage);
router.delete("/deleteNoMatchImage/:fileName", deleteNoMatchImage);
 

router.put(
  "/editNoMatchImage/:adminId/:fileName",
  upload.single("image"),
  editNoMatchImage
);
 
router.post("/reorderNoMatchImages", reorderNoMatchImages )

router.get("/getAllNoMatchImages", getAllNoMatchImages);
router.put("/toggleNoMatchImage/:fileName", toggleNoMatchImage);

router.post('/createMatchSchedule', createMatchSchedule);
router.get('/getMatchSchedules/:businessUnit', getMatchSchedules);
router.put('/editMatchSchedule', editMatchSchedule);
router.delete('/deleteMatchSchedule', deleteMatchSchedule);

router.get("/monthly-brand-summary",getMonthlyBrandSummary);

router.get("/prescription-stats", getPrescriptionStats);

router.get("/brand-stats", getBrandStats);

router.get(
  '/admin/uploads/:id',
    handleGetUploadDataAdminOnly
);
router.get("/getUploadDataWeb/:id", handleGetUploadDataPaginated);
router.get("/adminUploadAnalytics/:id",handleAdminUploadAnalytics);
module.exports = router;
