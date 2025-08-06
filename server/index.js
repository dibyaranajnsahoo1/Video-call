const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

const PORT = process.env.PORT || 5000;
let connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 New user connected: ${socket.id}`);
  connectedUsers.set(socket.id, socket);

  io.emit("online-users", Array.from(connectedUsers.keys()));

  socket.on("send-message", ({ message, to }) => {
    io.to(to).emit("receive-message", { from: socket.id, message });
  });

  socket.on("typing", (to) => {
    io.to(to).emit("typing");
  });

  socket.on("call-user", ({ signalData, to }) => {
    io.to(to).emit("incoming-call", { signal: signalData, from: socket.id });
  });

  socket.on("accept-call", ({ signal, to }) => {
    io.to(to).emit("call-accepted", signal);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
    io.emit("online-users", Array.from(connectedUsers.keys()));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
