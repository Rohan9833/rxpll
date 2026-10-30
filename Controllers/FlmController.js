const tlmModel = require("../Models/TlmModel");
const slmModel = require("../Models/SlmModel");
const flmModel = require("../Models/FlmModel");
const axios = require("axios");
const xlsx = require("xlsx");
const fs = require("fs");

const API_URL = "https://dev.admin.rxpl.digilateral.com/api/login-mr";
const API_URL1 = "https://somprazquiz.digilateral.com/downloadAll/SOLARES"; // Your GET API
const API_URL2 = "https://dev.admin.rxpl.digilateral.com/api/getMrRank"; // Your GET API
const TOTAL_REQUESTS = 380; // Number of times to hit the API

//Register Flm controller...
const flmRegister = async (req, res) => {
  try {
    const { ID, NAME, PASSWORD, HQ, REGION, ZONE, TeamName } = req.body;
    const flm = await flmModel.findOne({ ID: ID });

    const Id = req.params.id;
    const slm = await slmModel.findById({ _id: Id });

    if (flm) {
      return res.status(400).json({
        msg: "Flm Already Exists",
        success: false,
      });
    }

    const format = {
      FLMEmpID: ID,
      BDMName: NAME,
      Password: PASSWORD,
      HQ: HQ,
      REGION: REGION,
      ZONE: ZONE,
      TeamName: TeamName,
    };

    const newFlm = new flmModel(format);

    // Save the new MR to the database
    await newFlm.save();
    slm.Flm.push(newFlm._id);
    await slm.save();
    return res.status(201).json({
      msg: "Flm created successfully",
      success: true,
      Flm: newFlm,
    });
  } catch (error) {
    const errMsg = error.message;
    console.log("Error in flm Create..!!");
    return res.status(500).json({
      success: false,
      errMsg,
    });
  }
};

//Login Flm controller....
const flmLogin = async (req, res) => {
  try {
    const { ID, PASSWORD } = req.body;
    const flm = await flmModel.findOne({ FLMEmpID: ID });
    if (!flm) {
      return res.status(400).json({
        msg: "flm not Found",
        success: false,
      });
    } else {
      if (PASSWORD == flm.Password) {
        flm.loginLogs.push({
          timestamp: new Date(),
          cnt: flm.loginLogs.length + 1,
        });
        await flm.save();
        return res.status(200).json({
          msg: "Login Done",
          success: true,
          flm,
        });
      } else {
        return res.status(400).json({
          msg: "Password is not correct",
          success: false,
        });
      }
    }
  } catch (error) {
    const errMsg = error.message;
    console.log("Error in loginTlm");
    return res.status(500).json({
      success: false,
      errMsg,
    });
  }
};

//Testing Concurrency Login-Api
function readExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Read first sheet
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return data;
}

// Read users from Excel
//   const users = readExcel("users.xlsx");

async function loginUser(user) {
  try {
    const payload = {
      MRID: user.MRID,
      PASSWORD: String(user.PASSWORD), // Ensure PASSWORD is always a string
    };

    const response = await axios.post(API_URL, payload);
    console.log(`✅ Success: ${user.MRID}`);
  } catch (error) {
    console.error(
      `❌ Failed: ${user.MRID}`,
      error.response ? error.response.data : error.message
    );
  }
}

async function testConcurrency() {
  console.log(`🚀 Starting parallel logins for ${users.length} users...`);
  await Promise.all(users.map(loginUser));
  console.log("✅ All logins completed!");
}

// Run the test For Login APi
//   testConcurrency();

//Test Assets Api For Testing
let success = 0;
let failed = 0;
async function fetchData(requestNumber) {
  try {
    const response = await axios.get(API_URL1);
    console.log(`✅ Success: Request ${requestNumber}`);
    success += 1;
  } catch (error) {
    failed += 1;
    console.error(
      `❌ Failed: Request ${requestNumber}`,
      error.response ? error.response.data : error.message
    );
  }
}

async function testConcurrency() {
  console.log(`🚀 Starting ${TOTAL_REQUESTS} concurrent API calls...`);
  const requests = Array.from({ length: TOTAL_REQUESTS }, (_, i) =>
    fetchData(i + 1)
  );
  await Promise.all(requests);
  console.log("✅ All requests completed!");
  console.log("Success Count", success);
  console.log("Failed Count", failed);
}

//   testConcurrency();

//Testing Upload Prescription Api
// 📌 Load users from Excel
function readExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return data;
}

// ✅ Read users from Excel
const users = readExcel("users.xlsx"); // Ensure users.xlsx has MRID, Password, FilePath

async function uploadPrescription(user) {
  try {
    // ✅ Get Presigned URL
    const { data: presignedData } = await axios.post(
      "https://somprazquiz.digilateral.com/getPresignedUrlrx",
      {
        fileName: `DigiTesting/Testing_${Date.now()}.jpg`, // Change extension if needed
        fileType: "image/jpeg",
      }
    );

    const { uploadUrl, key } = presignedData;

    // ✅ Read File and Convert to Buffer
    const fileData = fs.readFileSync("Jack.jpeg"); // Ensure correct path in users.xlsx

    // ✅ Upload to S3
    await axios.put(uploadUrl, fileData, {
      headers: { "Content-Type": "image/jpeg" },
    });

    // ✅ Send Data to API
    await axios.post(
      `https://dev.admin.rxpl.digilateral.com/api/uploadPrescriptionData/67695900da2ed1c559b18312/67d7c3f524ba9cad762b7f60`,
      {
        Name: "Doctor Name",
        Specility: "Speciality",
        MOBNO: "1234567890",
        ScCode: "SC123",
        BrandName: "A",
        NoRxns: "1",
        RxnDuration: "1",
        PrescriptionImage: key,
        DateOfUpload: new Date().toISOString().split("T")[0],
      }
    );

    console.log(`✅ Uploaded Prescription for ${user.MRID}`);
  } catch (error) {
    console.error(`❌ Failed for ${user.MRID}`, error.message);
  }
}

// 🔥 **Test 100-120 Users Concurrently**
async function testConcurrentUploads() {
  console.log(`🚀 Starting ${users.length} concurrent uploads...`);
  await Promise.all(users.map(uploadPrescription));
  console.log("✅ All uploads completed!");
}

// Run the Test
//   testConcurrentUploads();

module.exports = { flmRegister, flmLogin };
