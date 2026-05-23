interface PlayerScreenProps {
  isPlayerReady: boolean;
  currentVideoId: string;
}

export default function PlayerScreen({ isPlayerReady, currentVideoId }: PlayerScreenProps) {
  return (
    <div className="video-card">
      <div className="video-player-wrapper">
        <div id="player"></div>
        {!isPlayerReady && (
          <div className="player-loading">
            <div className="spinner"></div>
            <p>Connecting to stream...</p>
          </div>
        )}
      </div>

      <div className="video-info-bar">
        <div className="video-meta">
          <span className="live-pill">WATCHING</span>
          <span className="video-title-text">
            Video ID: <code className="vid-code">{currentVideoId || "Loading..."}</code>
          </span>
        </div>
      </div>
    </div>
  );
}
