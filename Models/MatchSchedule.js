const mongoose = require("mongoose");

const MatchSchedule = new mongoose.Schema({
  SetMatchDurationBefore: {
    type: String,
  },
  DateOfCreation: {
    type: String,
    default: () => {
      const currentDate = new Date();
      const day = currentDate.getDate().toString().padStart(2, "0");
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const year = currentDate.getFullYear();
      return `${day}-${month}-${year}`;
    },
  },
  ModifiedDate:{
    type: String
  }
});

const MatchScheduleData = mongoose.model("MatchDuration", MatchSchedule)

module.exports = {
    MatchScheduleData
}
