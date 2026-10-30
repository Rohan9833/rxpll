const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  caseNo: {
    type: String,
  },
  Mobile: {
    type: String,
  },
  Query: [String],
  MrName: {
    type: String,
  },
  HQ: {
    type: String,
  },
  Region: {
    type: String,
  },
  Zone: {
    type: String,
  },
  FlmName: {
    type: String,
  },
  FlmHQ: {
    type: String,
  },
  SlmName: {
    type: String,
  },
  SlmHQ: {
    type: String,
  },
  TlmName: {
    type: String,
  },
  TlmHQ: {
    type: String,
  },
  Reply: [String],
  ModifiedDate: {
    type: String
  },
  isRead: {
    type: Boolean
  },
  CompanyName:{
    type: String
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
});

module.exports = mongoose.model("Support", supportSchema);
