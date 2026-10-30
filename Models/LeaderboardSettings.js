const mongoose = require("mongoose");

const leaderboardSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String },
    mrRankMetric: { type: String, default: "SCORE" }, //BRAND_COUNT 
    teamRankMetric: { type: String, default: "SCORE" }, //BRAND_COUNT 
  },
  { collection: "leaderboardSettings" }
);

module.exports = mongoose.model("LeaderboardSettings", leaderboardSettingsSchema);
