const mongoose = require("mongoose");

//Configure MR schema...
const mrSchema = new mongoose.Schema(
  {
    MRID: {
      type: String,
      required: true,
      unique: true,
    },
    USERNAME: {
      type: String,
      required: false,
    },
    PASSWORD: {
      type: String,
      required: false,
    },
    EMAIL: {
      type: String,
      required: false,
    },
    HQ: {
      type: String,
      required: false,
    },
    REGION: {
      type: String,
      required: false,
    },
    ZONE: {
      type: String,
    },
    BUSINESSUNIT: {
      type: String,
      required: false,
    },
    TEAMNAME: {
      type: String,
      required: false,
    },
    TotalMatches: {
      type: String,
      default: 0,
    },
    TotalScore: {
      type: String,
      default: 0,
    },
    TotalSixes: {
      type: String,
      default: 0,
    },
    TotalFours: {
      type: String,
      default: 0,
    },
    BestScore: {
      type: String,
      default: 0,
    },
    TournamentBestScore: {
      type: String,
      default: 0,
    },
    OdiBestScore: {
      type: String,
      default: 0,
    },
    isMatchOn: {
      type: Boolean,
      default: false,
    },
    MatchId: {
      type: String,
      required: false,
    },
    DOJ: {
      type: String,
      required: false,
    },
    profileImage: {
      type: String,
      required: false,
    },
    lastMatchRecord: [
      {
        type: String,
        required: false,
      },
    ],
    matchSchedules: [
      {
        startDate: Date,
        endDate: Date,
        isMatchOn: Boolean,
        createdAt: Date,
        createdBy: String,
      },
    ],
    MRUploadedData: [
      {
        DrName: String,
        Specility: String,
        MOBNO: String,
        ScCode: String,
        NumberOfBrands: {
          type: Number,
          required: false,
        },
        SelectedBrands: [
          {
            brandName: String,
            points: Number,
          },
        ],
        BrandName: String,
        Points: {
          type: String,
          default: 0,
        },
        NoRxns: String,
        RxnDuration: String,
        PrescriptionImage: String,
        DateOfUpload: String,
        DateOfCreation: {
          type: String,
          default: () => {
            const currentDate = new Date();
            const day = currentDate.getDate().toString().padStart(2, "0");
            const month = (currentDate.getMonth() + 1)
              .toString()
              .padStart(2, "0");
            const year = currentDate.getFullYear();
            return `${day}-${month}-${year}`;
          },
        },
        TimeOfUpload: {
          type: String,
          required: false,
        },
         matchStartDate: String,  // ✅ ADD THIS
         matchEndDate: String, 
        isTournament: {
          type: Boolean,
        },
        Status: { type: String, default: "Pending" },
        Reason: String,
        Attempt: {
          type: Number,
          default: 0,
        },
        ModifiedDate: String,
      },
    ],
    MrScoreEachMatch: [
      {
        Score: {
          type: String,
          default: 0,
        },
        TotalFours: {
          type: String,
          default: 0,
        },
        TotalSixes: {
          type: String,
          default: 0,
        },
        MatchDate: {
          type: String,
          default: 0,
        },

        OpponentName: {
          type: String,
          required: false,
        },
        TimeOfUpload: {
          type: String,
          required: false,
        },
        DateOfCreation: {
          type: String,
          default: () => {
            const currentDate = new Date();
            const day = currentDate.getDate().toString().padStart(2, "0");
            const month = (currentDate.getMonth() + 1)
              .toString()
              .padStart(2, "0");
            const year = currentDate.getFullYear();
            return `${day}-${month}-${year}`;
          },
        },
        isTournament: {
          type: Boolean,
        },
        isAdminUpload: {
          type: Boolean,
        },
        Brand1Score: {
          type: String,
        },
        Brand1Fours: {
          type: String,
        },
        Brand1Sixes: {
          type: String,
        },
        Brand2Score: {
          type: String,
        },
        Brand2Fours: {
          type: String,
        },
        Brand2Sixes: {
          type: String,
        },
        TargetVal1: {
          type: String,
        },
        TargetVal2: {
          type: String,
        },
        SalesVal1: {
          type: String,
        },
        SalesVal2: {
          type: String,
        },
        percentageFactorBrand1: {
          type: String,
        },
        percentageFactorBrand2: {
          type: String,
        },
        pcpm1: {
          type: String,
        },
        pcpm2: {
          type: String,
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
  },
  { timestamps: true }
);

const mrModel = mongoose.model("Mr", mrSchema);

module.exports = mrModel;

// BillClickCount:{
//   type: Number,
//   default: 0
// },
// BillSizeCount:{
//   type: Number,
//   default: 0
// },
