const mongoose = require("mongoose");

const tlmSchema = new mongoose.Schema(
  {
    TLMEmpID: {
      type: String,
      unique: true,
      required: false,
    },
    BUSINESSUNIT: {
      type: String,
      required: false,
    },
    TLMName: {
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
    Slm: [{ type: mongoose.Schema.Types.ObjectId, ref: "Slm" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tlm", tlmSchema);
