const mongoose = require('mongoose');


const popupSchema = new mongoose.Schema({
    popupImg:{
        type: String
    },
    popupText:{
        type: String
    },
    popupStatus:{
        type: String
    },
    ModifiedDate: String
})

module.exports = mongoose.model('PopupAdmin', popupSchema);