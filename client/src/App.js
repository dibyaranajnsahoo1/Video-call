// Optimized and fixed React App.js with camera switch and fullscreen toggle
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./App.css";

const socket = io("https://video-call-aayx.onrender.com", { transports: ["websocket"] });

function App() {
  const [yourID, setYourID] = useState("");
  const [partnerID, setPartnerID] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [file, setFile] = useState(null);

  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [currentFacingMode, setCurrentFacingMode] = useState("user");
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const chatRef = useRef();

  useEffect(() => {
    socket.on("connect", () => setYourID(socket.id));
    getMedia(currentFacingMode);

    socket.on("receive-message", ({ from, message }) => {
      if (message && from) {
        setMessages((prev) => [...prev, { from, message }]);
        new Audio("/notification.mp3").play();
      }
    });

    socket.on("typing", () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    });

    socket.on("incoming-call", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.on("call-accepted", (signal) => {
      setCallAccepted(true);
      connectionRef.current?.signal(signal);
    });

    socket.on("online-users", (users) => setOnlineUsers(users));
  }, [currentFacingMode]);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getMedia = (facingMode) => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true }).then((newStream) => {
      if (myVideo.current) myVideo.current.srcObject = newStream;
      setStream(newStream);
    });
  };

  const switchCamera = () => {
    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
    setCurrentFacingMode(newFacingMode);
  };

  const handleTyping = () => socket.emit("typing", partnerID);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const fileMsg = `<a href="${reader.result}" download="${file.name}" target="_blank">📁 ${file.name}</a>`;
      socket.emit("send-message", { message: fileMsg, to: partnerID });
      setMessages((prev) => [...prev, { from: socket.id, message: fileMsg }]);
    };
    reader.readAsDataURL(file);
  };

  const callUser = () => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (data) => socket.emit("call-user", { signalData: data, to: partnerID }));
    peer.on("stream", (remoteStream) => userVideo.current.srcObject = remoteStream);
    connectionRef.current = peer;
  };

  const acceptCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => socket.emit("accept-call", { signal: data, to: caller }));
    peer.on("stream", (remoteStream) => userVideo.current.srcObject = remoteStream);
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.destroy();
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller("");
    setCallerSignal(null);
    setPartnerID("");
    setMessages([]);
    window.location.reload();
  };

  const toggleCamera = () => {
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  };

  const sendMessage = () => {
    if (message.trim() && partnerID) {
      const msgObj = { from: yourID, message };
      socket.emit("send-message", { ...msgObj, to: partnerID });
      setMessages((prev) => [...prev, msgObj]);
      setMessage("");
    }
  };

  const takeScreenshot = () => {
    const video = myVideo.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const img = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = img;
    a.download = "screenshot.png";
    a.click();
  };

  const toggleFullscreen = (ref) => {
    setFullscreenVideo(fullscreenVideo === ref ? null : ref);
  };

  return (
    <div className="app">
      <div className="header">
        <span>📡 Your Socket ID: <b>{yourID}</b></span>
        <button onClick={() => navigator.clipboard.writeText(yourID)}>📋 Copy</button>
        <span>🟢 Online: {onlineUsers.length}</span>
      </div>

      <div className={`chat-box ${fullscreenVideo ? "fullscreen" : ""}`}>
        <div className="video-section">
          <video
            playsInline
            muted
            ref={myVideo}
            autoPlay
            className={`video ${fullscreenVideo === myVideo ? "fullscreen-video" : ""}`}
            onClick={() => toggleFullscreen(myVideo)}
          />
          {callAccepted && !callEnded && (
            <video
              playsInline
              ref={userVideo}
              autoPlay
              className={`video ${fullscreenVideo === userVideo ? "fullscreen-video" : ""}`}
              onClick={() => toggleFullscreen(userVideo)}
            />
          )}
          {fullscreenVideo && (
            <button className="exit-fullscreen" onClick={() => setFullscreenVideo(null)}>❌</button>
          )}
        </div>

        <div className="controls">
          <input placeholder="Partner Socket ID" value={partnerID} onChange={(e) => setPartnerID(e.target.value)} />
          <button onClick={callUser}>📞 Call</button>
          <button onClick={toggleCamera}>{cameraEnabled ? "🙈 Cam Off" : "📷 Cam On"}</button>
          <button onClick={toggleAudio}>{micEnabled ? "🔇 Mic Off" : "🎙️ Mic On"}</button>
          <button onClick={switchCamera}>🔄 Switch Camera</button>
          <button onClick={takeScreenshot}>📸 Screenshot</button>
          <button onClick={leaveCall} className="end-call">❌ End</button>
        </div>

        <div className="messages">
          <input placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleTyping} />
          <button onClick={sendMessage}>📨 Send</button>
          <input type="file" onChange={handleFileChange} />

          <div className="chat">
            {messages.map((msg, i) => (
              <p key={i} className={msg.from === yourID ? "msg-me" : "msg-partner"}
                data-time={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}>
                <b>{msg.from === yourID ? "You" : "Partner"}</b>: <span dangerouslySetInnerHTML={{ __html: msg.message }} />
              </p>
            ))}
            {isTyping && <p className="msg-partner">✍️ Partner is typing...</p>}
            <div ref={chatRef}></div>
          </div>
        </div>

        {receivingCall && !callAccepted && (
          <div className="incoming-call">
            <h3>{caller} is calling you...</h3>
            <button onClick={acceptCall}>✅ Accept</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

