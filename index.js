process.env.TZ = "Asia/Kolkata";

const express = require("express");
const dotenv = require("dotenv");
const colors = require("colors");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const connectDB = require("./Config/Db");
const http = require('http');
const admin = require('firebase-admin');
const serviceAccount = require('./Config/serviceAccountKey.json'); // Replace with your JSON file path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://rxplnew-default-rtdb.firebaseio.com',
});
let messaging = admin.messaging();


const { loggerMiddleware } = require("./Bucket/Logger");
const { prewarmAdminCache } = require("./Controllers/AdminController");

const socket = require('./WebSocket'); // Import the setup function

//Configure dotenv file...
dotenv.config();

//Configure Database connectin file...
connectDB();

//Configure Object Files...
const app = express();

const server = http.createServer(app); // Create HTTP server


//Setup Middlewares...
app.use(express());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/DIGI', express.static(path.join(__dirname, 'DIGI')));

// Initialize a new instance of Socket.IO by passing the HTTP server
const io = socket.init(server); 




// Listen for incoming Socket.IO connections
io.on("connection", (socket) => {
    // console.log("User connected ", socket.id); // Log the socket ID of the connected user

    // Listen for "send_message" events from the connected client
    socket.on("send_message", (data) => {
        // console.log("Message Received ", data); // Log the received message data

        // Emit the received message data to all connected clients
        io.emit("receive_message", data);
    });
});


// Use loggerMiddleware before defining routes
app.use(loggerMiddleware);

const AdminRoute = require("./Routes/AdminRoute");
const TlmRoute = require("./Routes/TlmRoute");
const SlmRoute = require("./Routes/SlmRoute");
const FlmRoute = require("./Routes/FlmRoute");
const MrRoute = require("./Routes/MrRoute");
const LiveUserRoute = require("./Routes/LiveUserRoute");

app.use("/api",AdminRoute);
app.use("/api",TlmRoute);
app.use("/api",SlmRoute);
app.use("/api",FlmRoute);
app.use("/api",MrRoute);
app.use("/api",LiveUserRoute);



//Configure Server Port...
const port = process.env.PORT || 7501;
//Setup Server port...
server.listen(port, () => {
    console.log(
      `Server is successfully running at port no : ${process.env.PORT}`.bgCyan.black
    );
     prewarmAdminCache();
  });
