const mongoose = require("mongoose");

const CompanyRestrict = new mongoose.Schema({
    CompanyName: {
      type: String,
      required: true
    },
    UserRestrict: {
      type: [Object],
      default: []
    }
})

module.exports = mongoose.model("CompanyRestrict", CompanyRestrict);
