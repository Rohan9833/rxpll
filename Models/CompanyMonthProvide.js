const mongoose = require('mongoose');



const CompanyMonthProvide = new mongoose.Schema({
    CompanyName: String,
    Months: [{
        type: String
    }],
    isProvide: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model("CompanyMonthsProvide",CompanyMonthProvide)