interface AdminControlsProps {
  role: string;
  vididInput: string;
  setVididInput: (val: string) => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleSkipAhead: () => void;
  handleSkipTo: (sec: number) => void;
  handleChangeVideo: () => void;
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

  return (
    <div className="controls-card">
      <h3 className="card-subtitle">{panelTitle}</h3>
      
      <div className="control-groups">
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
          <button className="btn btn-action-secondary" onClick={() => handleSkipTo(120)}>
            Go to 2:00
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
