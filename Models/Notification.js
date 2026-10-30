const mongoose = require("mongoose");

//Configure MR schema...
const notificationSchema = new mongoose.Schema({
  Message: {
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
  CompanyName: {
    type: String
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
