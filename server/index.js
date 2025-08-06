const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, use the actual origin
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

let connectedUsers = new Map(); // socketID -> socket

io.on("connection", (socket) => {
  console.log(`🔌 New user connected: ${socket.id}`);
  connectedUsers.set(socket.id, socket);

  // Emit online users list
  io.emit("online-users", Array.from(connectedUsers.keys()));

  // Handle sending message
  socket.on("send-message", ({ message, to }) => {
    io.to(to).emit("receive-message", { from: socket.id, message });
  });

  // Handle typing indicator
  socket.on("typing", (to) => {
    io.to(to).emit("typing");
  });

  // Handle video call request
  socket.on("call-user", ({ signalData, to }) => {
    io.to(to).emit("incoming-call", { signal: signalData, from: socket.id });
  });

  // Handle call acceptance
  socket.on("accept-call", ({ signal, to }) => {
    io.to(to).emit("call-accepted", signal);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
    io.emit("online-users", Array.from(connectedUsers.keys()));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
