const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const archiver = require("archiver");
const AdminModel = require("../Models/AdminModel");
const MrModel = require("../Models/MrModel");

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const safeFilePart = (value) =>
  String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);

const exportPrescriptions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const admin = await AdminModel.findById(adminId).select("_id").lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const mrs = await MrModel.find({
      "MRUploadedData.0": { $exists: true },
    })
      .select("MRID USERNAME EMAIL HQ REGION ZONE BUSINESSUNIT TEAMNAME MRUploadedData")
      .lean();

    const rows = [];
    const imageFiles = [];
    let imageNumber = 0;

    for (const mr of mrs) {
      for (const prescription of mr.MRUploadedData || []) {
        imageNumber += 1;
        const storedImageName = prescription.PrescriptionImage
          ? path.basename(String(prescription.PrescriptionImage))
          : "";
        const sourcePath = storedImageName
          ? path.resolve(UPLOADS_DIR, storedImageName)
          : "";
        const imageExists =
          !!sourcePath &&
          sourcePath.startsWith(UPLOADS_DIR + path.sep) &&
          fs.existsSync(sourcePath) &&
          fs.statSync(sourcePath).isFile();

        const extension = imageExists
          ? path.extname(storedImageName) || ".jpg"
          : "";
        const exportImageName = imageExists
          ? `Prescription_${String(imageNumber).padStart(6, "0")}_${safeFilePart(mr.MRID)}_${safeFilePart(prescription._id)}${extension}`
          : "";

        if (imageExists) {
          imageFiles.push({ sourcePath, exportImageName });
        }

        const selectedBrands = Array.isArray(prescription.SelectedBrands)
          ? prescription.SelectedBrands
              .map((brand) =>
                typeof brand === "string"
                  ? brand
                  : [brand.brandName, brand.points != null ? `Points: ${brand.points}` : ""]
                      .filter(Boolean)
                      .join(" - ")
              )
              .join(", ")
          : "";

        rows.push({
          "Prescription Link": imageExists ? "Open Prescription" : "Image Missing",
          "Image Export Status": imageExists ? "Included" : "Missing",
          "MR ID": mr.MRID || "",
          "MR Name": mr.USERNAME || "",
          "MR Email": mr.EMAIL || "",
          "HQ": mr.HQ || "",
          "Region": mr.REGION || "",
          "Zone": mr.ZONE || "",
          "Business Unit": mr.BUSINESSUNIT || "",
          "Team": mr.TEAMNAME || "",
          "Doctor Name": prescription.DrName || "",
          "Specialty": prescription.Specility || "",
          "Mobile Number": prescription.MOBNO || "",
          "SC Code": prescription.ScCode || "",
          "Brand Name": prescription.BrandName || "",
          "Selected Brands": selectedBrands,
          "Number Of Brands": prescription.NumberOfBrands ?? "",
          "Points": prescription.Points || "",
          "Number Of Prescriptions": prescription.NoRxns || "",
          "Prescription Duration": prescription.RxnDuration || "",
          "Date Of Upload": prescription.DateOfUpload || "",
          "Date Of Creation": prescription.DateOfCreation || "",
          "Time Of Upload": prescription.TimeOfUpload || "",
          "Status": prescription.Status || "",
          "Reason": prescription.Reason || "",
          "Attempt": prescription.Attempt ?? "",
          "Match Start Date": prescription.matchStartDate || "",
          "Match End Date": prescription.matchEndDate || "",
          "Tournament": prescription.isTournament ? "Yes" : "No",
          "__imageFile": exportImageName,
        });
      }
    }

    const worksheetRows = rows.map(({ __imageFile, ...row }) => row);
    const worksheet = xlsx.utils.json_to_sheet(worksheetRows);
    rows.forEach((row, index) => {
      if (row.__imageFile) {
        const cellAddress = xlsx.utils.encode_cell({ r: index + 1, c: 0 });
        worksheet[cellAddress].l = {
          Target: `Prescriptions/${row.__imageFile}`,
          Tooltip: "Open the exported prescription image",
        };
      }
    });

    worksheet["!cols"] = Object.keys(worksheetRows[0] || {}).map((header) => ({
      wch: Math.min(Math.max(header.length + 4, 16), 32),
    }));

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Prescriptions");
    const excelBuffer = xlsx.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="RXPL_Prescription_Export.zip"'
    );

    const archive = archiver("zip", { zlib: { level: 1 } });
    archive.on("warning", (error) => {
      if (error.code !== "ENOENT") {
        console.error("Prescription export warning:", error);
      }
    });
    archive.on("error", (error) => {
      console.error("Prescription export archive error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to create prescription export",
        });
      } else {
        res.destroy(error);
      }
    });

    archive.pipe(res);
    archive.append(excelBuffer, { name: "Prescriptions.xlsx" });

    for (const image of imageFiles) {
      archive.file(image.sourcePath, {
        name: `Prescriptions/${image.exportImageName}`,
      });
    }

    archive.append(
      Buffer.from(
        `Total prescriptions: ${rows.length}\nImages included: ${imageFiles.length}\nImages missing: ${rows.length - imageFiles.length}\n`,
        "utf8"
      ),
      { name: "Export_Summary.txt" }
    );

    await archive.finalize();
  } catch (error) {
    console.error("Prescription export failed:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Unable to export prescriptions",
        error: error.message,
      });
    }
    res.destroy(error);
  }
};

module.exports = { exportPrescriptions };
