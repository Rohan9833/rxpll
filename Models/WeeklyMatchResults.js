const mongoose = require('mongoose');

const weeklyMatchResultSchema = new mongoose.Schema({
  weekNumber: Number,
  year: Number,
  weekStartDate: String, // "11-11-2025"
  weekEndDate: String,   // "16-11-2025"
  matches: [{
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchDetails'
    },
    teamA: String,
    teamB: String,
    teamAScore: Number,  // ✅ ADDED - Team A's score
    teamBScore: Number,  // ✅ ADDED - Team B's score
    winner: String,      // Team name
    manOfTheMatch: {
      mrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MR'
      },
      mrName: String,
      teamName: String,
      score: Number      // ✅ ADDED - Man of the Match score
    }
  }],
  displayStartDate: String, 
  displayEndDate: String,   
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('WeeklyMatchResult', weeklyMatchResultSchema);
