import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

interface ChatBoxProps {
  currentSocketId: string;
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
}

export default function ChatBox({ currentSocketId, messages, onSendMessage }: ChatBoxProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="sidebar-card chat-card">
      <h3 className="card-subtitle">Room Chat</h3>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span>💬</span>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isSelf = msg.userId === currentSocketId;
            return (
              <div key={idx} className={`chat-message-row ${isSelf ? "self" : ""}`}>
                {!isSelf && <span className="message-author">{msg.username}</span>}
                <div className="message-bubble-container">
                  <div className="message-bubble">
                    <p className="message-text">{msg.message}</p>
                  </div>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="input-field chat-input"
          placeholder="Send a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-chat-send">
          Send
        </button>
      </form>
    </div>
  );
}
