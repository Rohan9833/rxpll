const mongoose = require("mongoose");

const flmModel = new mongoose.Schema(
  {
    FLMEmpID: {
      type: String,
      unique: true,
      required: false,
    },
    BUSINESSUNIT: {
      type: String,
      required: false,
    },
    BDMName: {
      type: String,
      required: false,
    },
    Password: {
      type: String,
      required: false,
    },
    HQ: {
      type: String,
      required: false,
    },
    REGION: {
      type: String,
      required: false,
    },
    ZONE: {
      type: String,
      required: false,
    },
    TeamName: {
      type: String,
    },
    profileImage: {
      type: String,
      required: false,
    },
    BillClickCount: {
      type: Number,
      default: 0,
    },
    BillSizeCount: {
      type: Number,
      default: 0,
    },
    EachMatchRecord: [
      {
        score: String,
        startDate: String,
        isTournament: {
          type: Boolean
        },
      },
    ],
    doc: Date,
    loginLogs: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        cnt: {
          type: Number,
          required: false,
          default: 0,
        },
      },
    ],
    Mrs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mr" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flm", flmModel);
