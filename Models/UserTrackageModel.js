const mongoose = require("mongoose");


const UserTrackage = new mongoose.Schema({
    UserTrackSummary:{
        type: [Object],
        default: []
    }
})

module.exports = mongoose.model('UserTrackage',UserTrackage);