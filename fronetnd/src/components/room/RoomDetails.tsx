interface RoomDetailsProps {
  roomId: string;
  copied: boolean;
  handleCopyLink: () => void;
}

export default function RoomDetails({ roomId, copied, handleCopyLink }: RoomDetailsProps) {
  return (
    <div className="sidebar-card room-details">
      <h3 className="card-subtitle">Room Details</h3>
      <div className="detail-item">
        <span className="label">Room Code:</span>
        <span className="value code-value">{roomId}</span>
      </div>
      <button className="btn btn-secondary w-full" onClick={handleCopyLink}>
        {copied ? "✓ Copied Link!" : "📋 Copy Invite Link"}
      </button>
    </div>
  );
}
