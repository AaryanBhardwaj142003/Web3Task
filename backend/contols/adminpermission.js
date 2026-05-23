function hasPlaybackPermission(socket) {
    if (!socket.role) return false;
    return socket.role === "host" || socket.role === "moderator" || socket.role === "admin";
}

function hasAdminPermission(socket) {
    if (!socket.role) return false;
    return socket.role === "host" || socket.role === "admin";
}

// greet remains as a playback permission alias for compatibility
function greet(socket) {
    return hasPlaybackPermission(socket);
}

module.exports = {
    greet,
    hasPlaybackPermission,
    hasAdminPermission
};