const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        console.log("MONGO_URL:", process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL, {
          maxPoolSize: 100,
          minPoolSize: 20,
          serverSelectionTimeoutMS: 40000,  // ✅ 30 seconds (was 5s)
          socketTimeoutMS: 120000,          // ✅ 2 minutes (was 45s)
          connectTimeoutMS: 30000,          // ✅ Add this - 30 seconds
          heartbeatFrequencyMS: 10000,      // ✅ Check connection every 10s
      });
      console.log(process.env.MONGO_URL);
        console.log(`RXPL-SERVER Successfully Connected to Mongodb Atlas Database...`.bgYellow.black);
    } catch (err) {
        console.log(`Mongo server ${err}`.bgRed.white);
        console.log(`RXPL-SERVER Failed to connect to Database...`.bgRed.black);
    }
}
module.exports = connectDB;
