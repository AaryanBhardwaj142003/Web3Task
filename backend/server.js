const express = require("express");
const http = require("http");

const { greet, hasPlaybackPermission, hasAdminPermission } = require("./contols/adminpermission");

const { User } = require("./contols/user");

const { Room } = require("./contols/rooms");

const app = express();

const server = http.createServer(app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});

const rooms = new Map();
const Redis = require("ioredis");
const REDIS_URL = process.env.REDIS_URL || "rediss://default:gQAAAAAAARhjAAIgcDE1ZWFlYjg5MmEwNTg0ZmZlYTYxOWYyMzFjM2YzOTU4Yg@well-wallaby-71779.upstash.io:6379";
const redisClient = new Redis(REDIS_URL);

redisClient.on("connect", () => {
    console.log("Connected to Upstash Redis");
});

redisClient.on("error", (err) => {
    console.error("Redis connection error:", err);
});

async function getRoom(roomId) {
    if (!roomId) return null;
    let room = rooms.get(roomId);
    if (!room) {
        try {
            const data = await redisClient.get(`room:${roomId}`);
            if (data) {
                const parsed = JSON.parse(data);
                room = new Room(parsed.roomId);
                room.admin = parsed.admin;
                room.users = parsed.users || [];
                room.video = parsed.video || { videoId: "dQw4w9WgXcQ", isPlaying: false, time: 0 };
                rooms.set(roomId, room);
            }
        } catch (e) {
            console.error("Error reading room from Redis:", e);
        }
    }
    return room;
}

async function saveRoom(room) {
    if (!room || !room.roomId) return;
    rooms.set(room.roomId, room);
    try {
        const roomData = JSON.stringify({
            roomId: room.roomId,
            admin: room.admin,
            users: room.users,
            video: room.video
        });
        await redisClient.set(`room:${room.roomId}`, roomData, "EX", 86400); // 24 hour TTL
    } catch (e) {
        console.error("Error saving room to Redis:", e);
    }
}

async function deleteRoom(roomId) {
    if (!roomId) return;
    rooms.delete(roomId);
    try {
        await redisClient.del(`room:${roomId}`);
    } catch (e) {
        console.error("Error deleting room from Redis:", e);
    }
}

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.emit("message", "hello from server");

    // CREATE ROOM
    socket.on("create-room", async (data) => {
        const username = data?.username || "Host";
        const roomId = Math.random().toString(36).substring(2, 7);

        const room = new Room(roomId);

        socket.join(roomId);

        socket.role = "host";
        socket.username = username;
        socket.roomId = roomId;

        const user = new User(socket.id, socket.role, username);

        room.setadmin(socket.id);
        room.addUser(user);

        await saveRoom(room);

        socket.emit("room-id", {
            roomId,
            id: socket.id,
            role: socket.role,
            username: socket.username
        });
    });

    // JOIN ROOM
    socket.on("join-room", async (data) => {
        let roomId;
        let lastSocketId;
        let username;
        if (data && typeof data === "object") {
            roomId = data.roomId;
            lastSocketId = data.lastSocketId;
            username = data.username;
        } else {
            roomId = data;
        }

        const room = await getRoom(roomId);

        if (!room) {
            socket.emit("error-message", "Room not found");
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        if (room.admin === lastSocketId || room.admin === socket.id) {
            socket.role = "host";
            room.admin = socket.id;
        } else {
            socket.role = "participant";
        }

        socket.username = username || `User_${socket.id.substring(0, 5)}`;

        const user = new User(socket.id, socket.role, socket.username);

        room.addUser(user, lastSocketId);

        await saveRoom(room);

        socket.emit("room-id", {
            roomId,
            id: socket.id,
            role: socket.role,
            username: socket.username
        });

        socket.emit("video-sync", room.video);

        // Broadcast user joined activity to room
        io.to(roomId).emit("user_joined", {
            userId: socket.id,
            username: socket.username,
            role: socket.role,
            participants: room.getAllUsers()
        });

        // For backwards compatibility with old user-joined event
        io.to(roomId).emit("user-joined", room.getAllUsers());
    });

    // LEAVE ROOM
    socket.on("leave_room", async () => {
        const room = await getRoom(socket.roomId);
        if (room) {
            room.removeUser(socket.id);
            socket.leave(socket.roomId);

            if (room.users.length === 0) {
                await deleteRoom(socket.roomId);
            } else {
                await saveRoom(room);
                io.to(socket.roomId).emit("user_left", {
                    userId: socket.id,
                    username: socket.username || `User_${socket.id.substring(0, 5)}`,
                    participants: room.getAllUsers()
                });

                // Compatibility
                io.to(socket.roomId).emit("user-joined", room.getAllUsers());
            }

            socket.roomId = null;
        }
    });

    // PLAY VIDEO
    socket.on("video-play", async () => {
        const allowed = hasPlaybackPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            room.video.isPlaying = true;
            await saveRoom(room);
            socket.to(socket.roomId).emit("video-play");
        }
    });

    socket.on("video-pause", async () => {
        const allowed = hasPlaybackPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            room.video.isPlaying = false;
            await saveRoom(room);
            socket.to(socket.roomId).emit("video-pause");
        }
    });

    socket.on("sync-time", async (time) => {
        const allowed = hasPlaybackPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            room.video.time = time;
            await saveRoom(room);
            socket.to(socket.roomId).emit("sync-time", time);
        }
    });

    socket.on("video-sync", async () => {
        const room = await getRoom(socket.roomId);
        if (!room) return;
        socket.emit("video-sync", room.video);
    });

    socket.on("change-video", async (vidid) => {
        const allowed = hasPlaybackPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            room.video.videoId = vidid;
            room.video.time = 0;
            room.video.isPlaying = false;
            await saveRoom(room);
            socket.to(socket.roomId).emit("change-video", vidid);
        }
    });

    // CHANGE USER ROLE (Assign Role & Host Transfer)
    socket.on("change-user-role", async ({ targetUserId, newRole }) => {
        const allowed = hasAdminPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            const targetUser = room.getUser(targetUserId);
            if (targetUser) {
                const targetSocket = io.sockets.sockets.get(targetUserId);

                if (newRole === "host") {
                    // Host transfer
                    // Old host becomes moderator
                    socket.role = "moderator";
                    room.changeRole(socket.id, "moderator");
                    room.admin = targetUserId;

                    // New host gets host role
                    targetUser.role = "host";
                    room.changeRole(targetUserId, "host");

                    // Broadcast old host role update
                    io.to(socket.roomId).emit("role_assigned", {
                        userId: socket.id,
                        username: socket.username,
                        role: "moderator",
                        participants: room.getAllUsers()
                    });

                    // Update old host socket
                    socket.emit("room-id", {
                        roomId: socket.roomId,
                        id: socket.id,
                        role: "moderator",
                        username: socket.username
                    });
                } else {
                    room.changeRole(targetUserId, newRole);
                }

                // Broadcast role change activity
                io.to(socket.roomId).emit("role_assigned", {
                    userId: targetUserId,
                    username: targetUser.username,
                    role: targetUser.role,
                    participants: room.getAllUsers()
                });

                // Compatibility
                io.to(socket.roomId).emit("user-joined", room.getAllUsers());

                // Update target socket details
                if (targetSocket) {
                    targetSocket.role = targetUser.role;
                    targetSocket.emit("room-id", {
                        roomId: socket.roomId,
                        id: targetUserId,
                        role: targetUser.role,
                        username: targetUser.username
                    });
                }

                await saveRoom(room);
            }
        }
    });

    // KICK PARTICIPANT
    socket.on("kick-participant", async (targetUserId) => {
        const allowed = hasAdminPermission(socket);

        if (!allowed) {
            socket.emit("error-message", "No permission");
            return;
        }

        const room = await getRoom(socket.roomId);
        if (room) {
            const targetUser = room.getUser(targetUserId);
            if (targetUser) {
                const targetUsername = targetUser.username;
                room.removeUser(targetUserId);

                // Broadcast to room
                io.to(socket.roomId).emit("participant_removed", {
                    userId: targetUserId,
                    username: targetUsername,
                    participants: room.getAllUsers()
                });

                // Compatibility
                io.to(socket.roomId).emit("user-joined", room.getAllUsers());

                // Notify target socket
                const targetSocket = io.sockets.sockets.get(targetUserId);
                if (targetSocket) {
                    targetSocket.emit("kicked");
                    targetSocket.leave(socket.roomId);
                }

                await saveRoom(room);
            }
        }
    });

    // CHAT MESSAGE
    socket.on("send-chat-message", (data) => {
        if (!socket.roomId) return;

        let messageText = "";
        if (data && typeof data === "object" && typeof data.message === "string") {
            messageText = data.message;
        } else if (typeof data === "string") {
            messageText = data;
        }

        io.to(socket.roomId).emit("chat-message", {
            userId: socket.id,
            username: socket.username || `User_${socket.id.substring(0, 5)}`,
            message: messageText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
        const room = await getRoom(socket.roomId);
        if (room) {
            room.removeUser(socket.id);
            
            if (room.users.length === 0) {
                await deleteRoom(socket.roomId);
            } else {
                await saveRoom(room);
                // Broadcast user left activity
                io.to(socket.roomId).emit("user_left", {
                    userId: socket.id,
                    username: socket.username || `User_${socket.id.substring(0, 5)}`,
                    participants: room.getAllUsers()
                });

                // Compatibility
                io.to(socket.roomId).emit("user-joined", room.getAllUsers());
            }
        }
        console.log("Disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
