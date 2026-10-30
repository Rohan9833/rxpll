const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: String,
  creatorRole: String,
  teamName: String,
  creatorId: String,
  challengeDate: String,
  challengeEndDate: String,
  maxAccepts: String,
  allowedMembers: [],
  players: [],
  membersAccepted: [],
  Status: {
    type: Boolean,
  },
  isTournament: {
    type: Boolean
  },
  AcceptedManager: { type: [String], default: [] },
  RejectedManager: { type: [String], default: [] },
});

module.exports = mongoose.model("RoomData", RoomSchema);
