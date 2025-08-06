import React from 'react';
export default function Message({ text, isOwn }) {
  return (
    <div className={`message ${isOwn ? 'own' : ''}`}>
      <p>{text}</p>
    </div>
  );
}