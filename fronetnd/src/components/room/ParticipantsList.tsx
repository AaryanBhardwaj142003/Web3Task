interface UserData {
  id: string;
  role: string;
  username?: string;
}

interface ParticipantsListProps {
  users: UserData[];
  currentSocketId: string;
  currentRole: string;
  onChangeRole: (targetUserId: string, newRole: string) => void;
  onKick: (targetUserId: string) => void;
}

export default function ParticipantsList({
  users,
  currentSocketId,
  currentRole,
  onChangeRole,
  onKick,
}: ParticipantsListProps) {
  const isHost = currentRole === "host" || currentRole === "admin";

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case "host":
      case "admin":
        return "👑";
      case "moderator":
        return "🛡️";
      case "viewer":
        return "👁️";
      default:
        return "👤";
    }
  };

  return (
    <div className="sidebar-card user-list-card">
      <h3 className="card-subtitle">Participants ({users.length})</h3>
      <div className="user-list">
        {users.map((user, idx) => {
          const isSelf = user.id === currentSocketId;
          return (
            <div 
              key={user.id || idx} 
              className={`user-item ${isSelf ? "self" : ""}`}
            >
              <div className="user-avatar" title={user.role}>
                {getRoleIcon(user.role)}
              </div>
              <div className="user-details">
                <span className="user-name">
                  {user.username || `User_${user.id ? user.id.substring(0, 5) : "Unknown"}`}
                  {isSelf && " (You)"}
                </span>
                <span className="user-role-badge">
                  {user.role}
                </span>
              </div>
              
              {/* User management actions for Host */}
              {isHost && !isSelf && (
                <div className="user-actions">
                  <select
                    className="role-select"
                    value={user.role}
                    onChange={(e) => onChangeRole(user.id, e.target.value)}
                  >
                    <option value="participant">Participant</option>
                    <option value="moderator">Moderator</option>
                    <option value="viewer">Viewer</option>
                    <option value="host">Transfer Host</option>
                  </select>
                  <button 
                    className="btn-kick"
                    onClick={() => onKick(user.id)}
                    title="Remove user from room"
                  >
                    ✕
                  </button>
                </div>
              )}

              {!isHost && <span className="status-dot active"></span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
