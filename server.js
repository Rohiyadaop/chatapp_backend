const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();

/* =========================
   CORS
========================= */

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://app-chat-delta.vercel.app",
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

/* =========================
   ROUTES
========================= */

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/* =========================
   HOME ROUTE
========================= */

app.get("/", (req, res) => {
  res.send("Backend Running Successfully 🚀");
});

/* =========================
   HTTP SERVER
========================= */

const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */

const io = new Server(server, {

  cors: {

    origin: [
      "http://localhost:5173",
      "https://app-chat-delta.vercel.app",
    ],

    methods: ["GET", "POST"],

    credentials: true,
  },

  transports: ["websocket", "polling"],
});

/* =========================
   ONLINE USERS
========================= */

const onlineUsers = new Map();

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", (socket) => {

  console.log("User Connected:", socket.id);

  /* USER JOIN */

  socket.on("join", (userId) => {

    onlineUsers.set(userId, socket.id);

    io.emit(
      "online_users",
      Array.from(onlineUsers.keys())
    );

    console.log(
      "Online Users:",
      Array.from(onlineUsers.keys())
    );
  });

  /* SEND MESSAGE */

  socket.on("send_message", async (data) => {

    try {

      const receiverSocketId = onlineUsers.get(
        data.receiverId
      );

      // SEND TO RECEIVER
      if (receiverSocketId) {

        io.to(receiverSocketId).emit(
          "receive_message",
          data
        );
      }

      // SEND BACK TO SENDER
      socket.emit(
        "receive_message",
        data
      );

    } catch (err) {

      console.log(err);

    }
  });

  /* DISCONNECT */

  socket.on("disconnect", () => {

    for (const [userId, socketId] of onlineUsers.entries()) {

      if (socketId === socket.id) {

        onlineUsers.delete(userId);

      }
    }

    io.emit(
      "online_users",
      Array.from(onlineUsers.keys())
    );

    console.log("User Disconnected");
  });
});

/* =========================
   DATABASE
========================= */

mongoose
.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});