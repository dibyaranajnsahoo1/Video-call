import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

export default function VideoCall() {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const [partnerId, setPartnerId] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideo.current.srcObject = stream;
      socket.emit("join-call", socket.id);
    });

    socket.on("partner-id", id => {
      setPartnerId(id);
    });

    return () => socket.off("partner-id");
  }, []);

  return (
    <div className="video-call">
      <video ref={localVideo} autoPlay muted className="local-video" />
      <video ref={remoteVideo} autoPlay className="remote-video" />
      {partnerId && <p>Partner Socket ID: {partnerId}</p>}
    </div>
  );
}