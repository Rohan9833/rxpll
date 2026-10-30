const socket = require("../WebSocket");
const LiveUserModel = require("../Models/LiveUserModel");



const AddCountLiveUser = async (req, res) => {
  try {
    const { MRID, MRName, TeamName, userType, HQ, Region, Zone } = req.body;

    if (!MRID || !MRName || !TeamName || !userType || !HQ || !Region || !Zone) {
      return res.status(400).json({ message: "Not Found User Required Details" });
    }

    const uploadTime1 = new Date();
    const formattedTime1 = `${uploadTime1.getHours().toString().padStart(2, "0")}:${uploadTime1.getMinutes().toString().padStart(2, "0")}`;

    const data = {
      MRID,
      MRName,
      TeamName,
      userType,
      HQ,
      Region,
      Zone,
      TimeOfLive: formattedTime1,
    };

    // ── FIX 1: Don't store individual logins, just increment counter ─────────
    // BEFORE: PlayerDetails array grows forever → slow after 1000+ logins
    // AFTER:  Just update counter + last 10 logins
    const liveModel = await LiveUserModel.findOneAndUpdate(
      {},
      {
        $inc: { LiveUser: 1 },
        $push: {
          PlayerDetails: {
            $each: [data],
            $position: 0,      // Add to front
            $slice: 10         // Keep only last 10 logins (not 10,000)
          }
        }
      },
      { upsert: true, new: true }
    );

    // ── FIX 2: Emit event without awaiting (non-blocking) ────────────────────
    const io = socket.getIo();
    setImmediate(() => {
      io.emit("LiveUser_Count", liveModel);
    });

    // ── FIX 3: Respond immediately, don't wait for socket emit ───────────────
    return res.status(200).json({
      success: true,
      message: "Live User Count Success",
    });

  } catch (error) {
    console.error('❌ AddCountLiveUser error:', error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



/*
const AddCountLiveUser = async (req, res) => {
  try {
    const io = socket.getIo();
    const { MRID, MRName, TeamName, userType, HQ, Region, Zone } = req.body;

    if (!MRID || !MRName || !TeamName || !userType || !HQ || !Region || !Zone) {
      return res
        .status(400)
        .json({ message: "Not Found User Required Details" });
    }

    const uploadTime1 = new Date();
    const formattedTime1 = `${uploadTime1
      .getHours()
      .toString()
      .padStart(2, "0")}:${uploadTime1
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const data = {
      MRID,
      MRName,
      TeamName,
      userType,
      HQ,
      Region,
      Zone,
      TimeOfLive: formattedTime1,
    };

    const liveModel = await LiveUserModel.findOneAndUpdate(
      {},
      { $inc: { LiveUser: 1 } },
      { upsert: true, new: true }
    );
    liveModel.PlayerDetails.push(data);

    const response = await liveModel.save();
    io.emit("LiveUser_Count", response);

    return res.status(200).json({
      success: true,
      message: "Live User Count Success",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
*/

const RemoveCountLiveUser = async (req, res) => {
  try {
    const io = socket.getIo();

    const liveModel1 = await LiveUserModel.find({});
    // if (liveModel1[0].LiveUser === 0) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "No Live Users Available",
    //   });
    // }
    if (!liveModel1 || liveModel1[0].LiveUser <= 0) {
      return res.status(200).json({
        success: true,
        message: "No action taken as no live users are available.",
      });
    }

    const liveModel = await LiveUserModel.findOneAndUpdate(
      {},
      { $inc: { LiveUser: -1 } },
      { upsert: true, new: true }
    );
    const response = await liveModel.save();
    io.emit("LiveUser_Count", response); // Emitting to all connected clients  about the live user count change.  // Replace 'LiveUser_Count' with the
    return res.status(200).json({
      success: true,
      message: "Count of live users Decrese successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const GetAllLiveUserCount = async (req, res) => {
  try {
    const liveModel = await LiveUserModel.find({});
    return res.status(200).json({
      success: true,
      message: "Live User Count Fetched Successfully",
      data: liveModel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetEachLiveUserDetails = async (req, res) => {
  try {
    const liveModel = await LiveUserModel.find({});
    if (liveModel[0].PlayerDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Live Users Available",
      });
    }
    return res.status(200).json({
      success: true,
      message: "All User Details Fetched Successfully",
      data: liveModel[0].PlayerDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const handleGetUserCountLiveAccordingToTime = async (req, res) => {
  try {
    const liveModel = await LiveUserModel.find({});

    if (!liveModel[0] || liveModel[0].PlayerDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Live Users Available",
      });
    }

    const { PlayerDetails,LiveUser } = liveModel[0];

    // Get the current date and time
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1; // Month is 0-indexed
    const currentYear = now.getFullYear();

    // Helper function to parse `DateOfLive` and `TimeOfLive`
    const parseDateTime = (dateStr, timeStr) => {
      const [day, month, year] = dateStr.split("-").map(Number);
      const [hours, minutes] = timeStr.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    };

    // Arrays for each time range
    let last30Minutes = [];
    let last1Hour = [];
    let last2Hours = [];
    let last4Hours = [];

    // Iterate over PlayerDetails
    PlayerDetails.forEach((entry) => {
      const entryDate = parseDateTime(entry.DateOfLive, entry.TimeOfLive);

      // Check if the entry is from today
      if (
        entryDate.getDate() === currentDay &&
        entryDate.getMonth() + 1 === currentMonth &&
        entryDate.getFullYear() === currentYear
      ) {
        const timeDifference = (now - entryDate) / (60 * 1000); // Difference in minutes

        if (timeDifference <= 30) {
          last30Minutes.push(entry);
        } else if (timeDifference > 30 && timeDifference <= 60) {
          last1Hour.push(entry);
        } else if (timeDifference > 60 && timeDifference <= 120) {
          last2Hours.push(entry);
        } else if (timeDifference > 120 && timeDifference <= 240) {
          last4Hours.push(entry);
        }
      }
    });

    return res.status(200).json({
      success: true,
      LiveUser,
      last30Minutes,
      last1Hour,
      last2Hours,
      last4Hours,
    });
  } catch (error) {
    console.error("Error fetching live user data:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



module.exports = {
  AddCountLiveUser,
  RemoveCountLiveUser,
  GetAllLiveUserCount,
  handleGetEachLiveUserDetails,
  handleGetUserCountLiveAccordingToTime
};
