import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import server from "../utils/server";

const Dashboard = () => {
  const [id, setId] = useState("");
  const [username, setUsername] = useState(
    localStorage.getItem("syncstream_username") || ""
  );
  const navigate = useNavigate();

  useEffect(() => {
    server.on("message", (msg) => {
      console.log(msg);
    });

    server.on("room-id", (roomData) => {
      localStorage.setItem("room", JSON.stringify(roomData));
      navigate(`/room/${roomData.roomId}`);
    });

    return () => {
      server.off("message");
      server.off("room-id");
    };
  }, [navigate]);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    localStorage.setItem("syncstream_username", val);
  };

  function makeRoom() {
    const finalUsername = username.trim() || `User_${Math.floor(1000 + Math.random() * 9000)}`;
    if (!username.trim()) {
      handleUsernameChange(finalUsername);
    }
    server.emit("create-room", { username: finalUsername });
  }

  function joinRoom() {
    if (!id.trim()) return;
    const finalUsername = username.trim() || `User_${Math.floor(1000 + Math.random() * 9000)}`;
    if (!username.trim()) {
      handleUsernameChange(finalUsername);
    }
    navigate(`/room/${id.trim()}`);
  }

  return (
    <div className="dashboard-container">
      <div className="glow-background"></div>
      
      <div className="dashboard-card">
        <header className="dashboard-header">
          <div className="logo-badge">LIVE</div>
          <h1 className="app-title">SyncStream</h1>
          <p className="app-subtitle">Watch YouTube together in real-time.</p>
        </header>

        <div className="dashboard-content">
          <div className="username-section">
            <input
              className="input-field username-input"
              placeholder="Choose a display name"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
            />
          </div>

          <div className="action-section">
            <button className="btn btn-primary" onClick={makeRoom}>
              Create Room
            </button>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="action-section">
            <div className="join-form">
              <input
                className="input-field"
                placeholder="Enter Room Code"
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
              <button className="btn btn-secondary" onClick={joinRoom}>
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
