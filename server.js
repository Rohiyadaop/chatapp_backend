const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);


// Create HTTP Server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "https://app-chat-delta.vercel.app",
    methods: ["GET", "POST"],
  },
});


// MongoDB Connection
mongoose
.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

const onlineUsers = new Map();
io.on("connection", (socket) => {

  console.log("User Connected:", socket.id);

  // USER JOINS
  socket.on("join", (userId) => {

    onlineUsers.set(userId, socket.id);

    // SEND ONLINE USERS TO EVERYONE
    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log("Online Users:", onlineUsers);

  });

  // SEND MESSAGE
  socket.on("send_message", (data) => {

    const receiverSocketId = onlineUsers.get(data.receiverId);

    if (receiverSocketId) {

      io.to(receiverSocketId).emit("receive_message", data);

    }

    socket.emit("receive_message", data);

  });

  // DISCONNECT
  socket.on("disconnect", () => {

    for (const [userId, socketId] of onlineUsers.entries()) {

      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log("User Disconnected");

  });
});


const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
app.post("*",(req,res)=>{
  return res.status(404).json({ message: "backend is running" });
}
);

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});