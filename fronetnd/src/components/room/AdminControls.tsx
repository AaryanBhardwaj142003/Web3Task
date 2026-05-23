interface AdminControlsProps {
  role: string;
  vididInput: string;
  setVididInput: (val: string) => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleSkipAhead: () => void;
  handleSkipTo: (sec: number) => void;
  handleChangeVideo: () => void;
  currentTime: number;
  duration: number;
}

export default function AdminControls({
  role,
  vididInput,
  setVididInput,
  handlePlay,
  handlePause,
  handleSkipAhead,
  handleSkipTo,
  handleChangeVideo,
  currentTime,
  duration,
}: AdminControlsProps) {
  const hasControls = role === "host" || role === "moderator" || role === "admin";

  if (!hasControls) {
    return (
      <div className="sync-status-card">
        <span className="status-indicator live"></span>
        <p>Synchronized with Host. Controls are locked.</p>
      </div>
    );
  }

  const panelTitle = role === "moderator" ? "Moderator Control Panel" : "Host Control Panel";

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mStr = m < 10 && h > 0 ? `0${m}` : `${m}`;
    const sStr = s < 10 ? `0${s}` : `${s}`;
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSkipTo(parseFloat(e.target.value));
  };

  return (
    <div className="controls-card">
      <h3 className="card-subtitle">{panelTitle}</h3>
      
      <div className="control-groups">
        {/* Local Synced Timeline Progress Bar */}
        <div className="timeline-container" style={{ width: "100%", padding: "5px 0 15px 0" }}>
          <div className="time-labels" style={{ display: "flex", justifyContent: "space-between", color: "#a0aec0", fontSize: "0.85rem", marginBottom: "6px" }}>
            <span style={{ fontWeight: 500, color: "#63b3ed" }}>{formatTime(currentTime)}</span>
            <span style={{ color: "#718096" }}>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            style={{
              width: "100%",
              accentColor: "#3182ce",
              cursor: "pointer",
              height: "6px",
              borderRadius: "3px",
              background: "#2d3748",
              outline: "none"
            }}
          />
        </div>

        <div className="playback-controls">
          <button className="btn btn-action play" onClick={handlePlay}>
            ▶ Play
          </button>
          <button className="btn btn-action pause" onClick={handlePause}>
            ❚❚ Pause
          </button>
          <button className="btn btn-action-secondary" onClick={handleSkipAhead}>
            +30s
          </button>
        </div>

        <div className="video-change-form">
          <input
            type="text"
            className="input-field control-input"
            placeholder="Enter YouTube Video ID or URL"
            value={vididInput}
            onChange={(e) => setVididInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChangeVideo()}
          />
          <button className="btn btn-primary btn-control" onClick={handleChangeVideo}>
            Change Video
          </button>
        </div>
      </div>
    </div>
  );
}
