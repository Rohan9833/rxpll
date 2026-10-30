const mongoose = require("mongoose");

const CompanyWiseMonthlyUpload = new mongoose.Schema({
    CompanyName: { type: String, required: true },
    MonthlyResult: {
      type: Map,
      of: Boolean,
      default: {
        January: false,
        February: false,
        March: false,
        April: false,
        May: false,
        June: false,
        July: false,
        August: false,
        September: false,
        October: false,
        November: false,
        December: false,
      },
    },
  });

module.exports = mongoose.model(
  "CompanyWiseMonthlyReport",
  CompanyWiseMonthlyUpload
);
