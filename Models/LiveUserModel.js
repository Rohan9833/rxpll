const mongoose = require("mongoose");

const liveUserCount = new mongoose.Schema({
  LiveUser: {
    type: Number,
  },
  PlayerDetails: [
    {
      MRID: String,
      MRName: String,
      TeamName: String,
      userType: String,
      HQ: String,
      Region: String,
      Zone: String,
      DateOfLive: {
        type: String,
        default: () => {
          const currentDate = new Date();
          const day = currentDate.getDate().toString().padStart(2, "0");
          const month = (currentDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const year = currentDate.getFullYear();
          return `${day}-${month}-${year}`;
        },
      },
      TimeOfLive: String
    },
  ],
});

module.exports = mongoose.model("live", liveUserCount);
