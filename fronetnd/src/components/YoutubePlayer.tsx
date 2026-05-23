import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import server from "../utils/server";

import PlayerScreen from "./room/PlayerScreen";
import AdminControls from "./room/AdminControls";
import RoomDetails from "./room/RoomDetails";
import ParticipantsList from "./room/ParticipantsList";
import ChatBox from "./room/ChatBox";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
}

function YoutubePlayer() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const playerRef = useRef<any>(null);
  const statesync = useRef(false);
  const timesync = useRef(0);

  const initialRoom = JSON.parse(localStorage.getItem("room") || "{}");
  const [role, setRole] = useState<any>(initialRoom);
  const [vidid, setVidid] = useState("dQw4w9WgXcQ");
  const [vididInput, setVididInput] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Keep a ref of the role object to avoid closures capturing stale state in socket callbacks
  const roleRef = useRef(initialRoom);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // Helper to check control permission
  const isAllowedToControl = (roleName: string) => {
    return roleName === "host" || roleName === "moderator" || roleName === "admin";
  };

  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initializing YT Player
  const initPlayer = (videoId: string, initialTime: number, shouldPlay: boolean) => {
    setVidid(videoId);

    if (playerRef.current) {
      try {
        const activeVidId = playerRef.current.getVideoData?.()?.video_id;
        if (activeVidId !== videoId) {
          playerRef.current.loadVideoById(videoId, initialTime);
        } else {
          const currentTime = playerRef.current.getCurrentTime();
          if (Math.abs(currentTime - initialTime) > 3) {
            playerRef.current.seekTo(initialTime, true);
          }
        }

        statesync.current = true;
        if (shouldPlay) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch (err) {
        console.error("Player sync error:", err);
      }
      return;
    }

    const setup = () => {
      if (!document.getElementById("player")) return;

      playerRef.current = new window.YT.Player("player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          mute: 0,
          rel: 0,
          playsinline: 1,
          controls: 0,
          fs: 1,
          disablekb: 0,
          enablejsapi: 1,
          iv_load_policy: 3,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            console.log("Player ready");
            setIsPlayerReady(true);
            playerRef.current.seekTo(initialTime, true);
            statesync.current = true;
            if (shouldPlay) {
              playerRef.current.playVideo();
            } else {
              playerRef.current.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            if (statesync.current) {
              statesync.current = false;
              return;
            }

            // Only broadcast actions if the current user has control permissions
            if (isAllowedToControl(roleRef.current.role)) {
              if (event.data === window.YT.PlayerState.PLAYING) {
                server.emit("video-play");
              }
              if (event.data === window.YT.PlayerState.PAUSED) {
                server.emit("video-pause");
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      setup();
    } else {
      window.onYouTubeIframeAPIReady = setup;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }
  };

  useEffect(() => {
    // 1. Establish regular time sync intervals for Host ONLY to prevent multi-timer conflicts
    const interval = setInterval(() => {
      const currentRole = roleRef.current.role;
      const isHost = currentRole === "host" || currentRole === "admin";
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function" && isHost) {
        const currentTime = playerRef.current.getCurrentTime();
        timesync.current = currentTime;
        server.emit("sync-time", currentTime);
      }
    }, 5000);

    // 2. Register socket event listeners
    server.on("room-id", (roomData) => {
      console.log("Room ID updated:", roomData);
      setRole(roomData);
      localStorage.setItem("room", JSON.stringify(roomData));
    });

    server.on("video-sync", (data) => {
      console.log("Video sync state received:", data);
      if (data && data.videoId) {
        initPlayer(data.videoId, data.time, data.isPlaying);
      }
    });

    server.on("sync-time", (time) => {
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        const currentTime = playerRef.current.getCurrentTime();
        if (Math.abs(currentTime - time) > 3) {
          statesync.current = true;
          playerRef.current.seekTo(time, true);
        }
      }
    });

    server.on("video-play", () => {
      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
        statesync.current = true;
        playerRef.current.playVideo();
      }
    });

    server.on("video-pause", () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
        statesync.current = true;
        playerRef.current.pauseVideo();
      }
    });

    server.on("change-video", (vidId) => {
      console.log("Received new video ID:", vidId);
      setVidid(vidId);
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        statesync.current = true;
        playerRef.current.loadVideoById(vidId);
      }
    });

    server.on("user-joined", (roomUsers) => {
      console.log("Active users in room (legacy):", roomUsers);
      setUsers(roomUsers);
    });

    server.on("error-message", (msg) => {
      console.error("Socket error message:", msg);
      setErrorMsg(msg);
    });

    // Activity and Notification Event Listeners
    server.on("user_joined", (data) => {
      console.log("User joined:", data);
      if (data && data.participants) {
        setUsers(data.participants);
        if (data.userId !== roleRef.current.id) {
          addToast(`${data.username} joined the party!`, "success");
        }
      }
    });

    server.on("user_left", (data) => {
      console.log("User left:", data);
      if (data && data.participants) {
        setUsers(data.participants);
        addToast(`${data.username} left the party.`, "warning");
      }
    });

    server.on("role_assigned", (data) => {
      console.log("Role assigned:", data);
      if (data && data.participants) {
        setUsers(data.participants);
        addToast(`${data.username} is now a ${data.role}!`, "info");
        if (data.userId === roleRef.current.id) {
          setRole((prev: any) => ({ ...prev, role: data.role }));
        }
      }
    });

    server.on("participant_removed", (data) => {
      console.log("Participant removed:", data);
      if (data && data.participants) {
        setUsers(data.participants);
        addToast(`${data.username} was removed from the room.`, "danger");
      }
    });

    server.on("kicked", () => {
      console.log("You have been kicked");
      setIsKicked(true);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        playerRef.current = null;
      }
    });

    server.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 3. Emit join room event
    if (roomId) {
      const storedUsername = localStorage.getItem("syncstream_username") || "";
      server.emit("join-room", { 
        roomId, 
        lastSocketId: initialRoom.id,
        username: storedUsername 
      });
    }

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      server.off("room-id");
      server.off("video-sync");
      server.off("sync-time");
      server.off("video-play");
      server.off("video-pause");
      server.off("change-video");
      server.off("user-joined");
      server.off("error-message");
      server.off("user_joined");
      server.off("user_left");
      server.off("role_assigned");
      server.off("participant_removed");
      server.off("kicked");
      server.off("chat-message");

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying YT player:", e);
        }
        playerRef.current = null;
      }
    };
  }, [roomId]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        const dur = playerRef.current.getDuration();
        if (dur) {
          setDuration(dur);
        }
      }
    }, 500);
    return () => clearInterval(progressInterval);
  }, []);

  // Admin controls
  function handlePlay() {
    if (playerRef.current && isAllowedToControl(role.role)) {
      playerRef.current.playVideo();
      server.emit("video-play");
    }
  }

  // Pause
  function handlePause() {
    if (playerRef.current && isAllowedToControl(role.role)) {
      playerRef.current.pauseVideo();
      server.emit("video-pause");
    }
  }

  // Skip forward 30 seconds
  function handleSkipAhead() {
    if (playerRef.current && isAllowedToControl(role.role)) {
      const current = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(current + 30, true);
      server.emit("sync-time", current + 30);
    }
  }

  function handleSkipTo(seconds: number) {
    if (playerRef.current && isAllowedToControl(role.role)) {
      playerRef.current.seekTo(seconds, true);
      server.emit("sync-time", seconds);
    }
  }

  function handleChangeVideo() {
    if (!vididInput.trim()) return;

    let parsedId = vididInput.trim();
    try {
      if (parsedId.includes("youtube.com") || parsedId.includes("youtu.be")) {
        const urlObj = new URL(parsedId);
        if (parsedId.includes("youtu.be")) {
          parsedId = urlObj.pathname.substring(1);
        } else {
          parsedId = urlObj.searchParams.get("v") || parsedId;
        }
      }
    } catch (e) {
      console.warn("Could not parse pasted video URL as object:", e);
    }

    setVidid(parsedId);
    if (playerRef.current && isAllowedToControl(role.role)) {
      statesync.current = true;
      playerRef.current.loadVideoById(parsedId, 0);
      playerRef.current.pauseVideo();
      server.emit("change-video", parsedId);
    }
  }

  const handleCopyLink = () => {
    const url = `${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleChangeUserRole = (targetUserId: string, newRole: string) => {
    server.emit("change-user-role", { targetUserId, newRole });
  };

  const handleKickParticipant = (targetUserId: string) => {
    server.emit("kick-participant", targetUserId);
  };

  const handleSendMessage = (msg: string) => {
    server.emit("send-chat-message", { message: msg });
  };

  if (isKicked) {
    return (
      <div className="error-screen">
        <div className="error-card kicked-card">
          <span className="error-icon">🚫</span>
          <h2>Removed from Room</h2>
          <p>You have been removed from the Watch Party by the host.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Join Room</h2>
          <p>{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div className="glow-background"></div>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" && "🟢"}
              {toast.type === "info" && "🔵"}
              {toast.type === "warning" && "🟠"}
              {toast.type === "danger" && "🔴"}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="room-layout">
        {/* Left Side: Video Section */}
        <div className="video-section">
          <PlayerScreen 
            isPlayerReady={isPlayerReady} 
            currentVideoId={vidid} 
            isAllowedToControl={isAllowedToControl(role.role)} 
          />

          <AdminControls
            role={role.role}
            vididInput={vididInput}
            setVididInput={setVididInput}
            handlePlay={handlePlay}
            handlePause={handlePause}
            handleSkipAhead={handleSkipAhead}
            handleSkipTo={handleSkipTo}
            handleChangeVideo={handleChangeVideo}
            currentTime={currentTime}
            duration={duration}
          />
        </div>

        {/* Right Side: Sidebar */}
        <div className="sidebar-section">
          <RoomDetails roomId={roomId || ""} copied={copied} handleCopyLink={handleCopyLink} />
          <ParticipantsList
            users={users}
            currentSocketId={role.id}
            currentRole={role.role}
            onChangeRole={handleChangeUserRole}
            onKick={handleKickParticipant}
          />
          <ChatBox
            currentSocketId={role.id}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}

export default YoutubePlayer;
