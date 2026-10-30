const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema({
  BrandName: {
    type: String,
    unique: true,
  },
  Points:{
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
  ModifiedDate: {
    type: String,
  },
});

module.exports = mongoose.model("BrandName",BrandSchema);
