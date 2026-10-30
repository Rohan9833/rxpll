const express = require("express");
const router = express.Router();
const {
  AddCountLiveUser,
  RemoveCountLiveUser,
  GetAllLiveUserCount,
  handleGetEachLiveUserDetails,
  handleGetUserCountLiveAccordingToTime
} = require("../Controllers/LiveUserController");

router.post("/addCountLiveUser", AddCountLiveUser);
router.post("/removeCountLiveUser", RemoveCountLiveUser);
router.get("/getLiveUserCount", GetAllLiveUserCount);

router.get("/getEachLiveUserDetails", handleGetEachLiveUserDetails);

router.get("/getUserCountLiveAccordingToTime", handleGetUserCountLiveAccordingToTime);

module.exports = router;
