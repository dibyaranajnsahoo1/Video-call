import React, { useState, useEffect } from 'react';
import Message from './Message';
import { socket } from '../socket';

export default function Chat({ socketId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const sendMessage = () => {
    if (text.trim()) {
      const msg = { text, from: socket.id };
      socket.emit("send-message", msg);
      setMessages(prev => [...prev, msg]);
      setText('');
    }
  };

  useEffect(() => {
    socket.on("receive-message", msg => {
      setMessages(prev => [...prev, msg]);
    });
    return () => socket.off("receive-message");
  }, []);

  return (
    <div className="chat">
      <div className="chat-header">Chat - Your Socket ID: {socketId}</div>
      <div className="messages">
        {messages.map((msg, i) => (
          <Message key={i} text={msg.text} isOwn={msg.from === socket.id} />
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}