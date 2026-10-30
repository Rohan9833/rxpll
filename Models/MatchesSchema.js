const mongoose = require("mongoose");

const MatchDetails = new mongoose.Schema({
  startDate: String,
  endDate: String,
  creatorId: String, // Admin who created this schedule
  isTournament: {
    type: Boolean,
    default: false
  },
  // Prescription submissions for this match period
  Submissions: [
    {
      mrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MR'
      },
      mrName: String,
      teamName: String,
      brandType: String, // "1B", "2B", or "3B"
      brands: [
        {
          brandName: String,
          points: Number
        }
      ],
      score: Number,
      prescriptionImage: String,
      doctorName: String,
      speciality: String,
      phoneNumber: String,
      scCode: String,
      uploadTime: String,
      uploadDate: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // Statistics by brand type
  Statistics: {
    oneBrand: {
      count: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 }
    },
    twoBrand: {
      count: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 }
    },
    threeBrand: {
      count: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 }
    },
    totalSubmissions: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 }
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

module.exports = mongoose.model("MatchData", MatchDetails);
