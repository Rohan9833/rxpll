// const LeaderboardSettings = require("../Models/LeaderboardSettings");

// let cachedSettings = null;

// const getLeaderboardSettings = async () => {
//   if (cachedSettings) return cachedSettings;

//   cachedSettings =
//     (await LeaderboardSettings.findById("leaderboard_config").lean()) || {
//       mrRankMetric: "SCORE",
//       teamRankMetric: "SCORE",
//     };

//   return cachedSettings;
// };

// module.exports = getLeaderboardSettings;

const LeaderboardSettings = require("../Models/LeaderboardSettings");

let cachedSettings = null;
let lastFetchedAt = 0;

const CACHE_TTL_MS = 5 * 1000; // 30 seconds

const getLeaderboardSettings = async () => {
  const now = Date.now();

  if (!cachedSettings || now - lastFetchedAt > CACHE_TTL_MS) {
    cachedSettings =
      (await LeaderboardSettings.findOne({}).lean()) || {
        mrRankMetric: "SCORE",
        teamRankMetric: "SCORE",
      };

    lastFetchedAt = now;
    console.log("🔄 Leaderboard settings loaded:", cachedSettings);
  }

  return cachedSettings;
};

module.exports = getLeaderboardSettings;