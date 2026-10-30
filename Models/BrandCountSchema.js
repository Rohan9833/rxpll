const mongoose = require("mongoose");

const brandCountSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true, // e.g., "Brand 1", "Brand 2"
  },
  value: {
    type: Number,
    required: true, // 1, 2, 3, etc.
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("BrandCount", brandCountSchema);
