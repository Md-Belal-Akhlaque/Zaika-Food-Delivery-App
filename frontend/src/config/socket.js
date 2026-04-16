import { io } from "socket.io-client";

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;
const SOCKET_URL =
  typeof rawSocketUrl === "string" && rawSocketUrl.trim()
    ? rawSocketUrl.trim()
    : "http://localhost:5000";

let socket;
const joinedRooms = new Set();
let socketIdentity = "";

const normalizeRoom = (room) => {
  const normalized = String(room || "").trim().toLowerCase();
  if (normalized === "owner") return "shop";
  if (normalized === "deliverypartner") return "deliveryPartner";
  if (normalized === "user") return "user";
  if (normalized === "shop") return "shop";
  return "";
};

const normalizeId = (id) => (id == null ? "" : String(id).trim());
const makeRoomKey = (room, id) => `${normalizeRoom(room)}:${normalizeId(id)}`;

const parseRoomKey = (roomKey) => {
  const colonIndex = roomKey.indexOf(":");
  if (colonIndex === -1) return { room: "", id: "" };
  return {
    room: roomKey.slice(0, colonIndex),
    id: roomKey.slice(colonIndex + 1),
  };
};

const replayJoins = () => {
  joinedRooms.forEach((roomKey) => {
    const { room, id } = parseRoomKey(roomKey);
    if (room && id) {
      socket.emit("join", { type: room, id });
    }
  });
};

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      replayJoins();
    });
  }

  return socket;
};

export const connectSocket = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    joinedRooms.clear();
    socketIdentity = "";
  }
};

export const syncSocketIdentity = (userId) => {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) {
    socketIdentity = "";
    joinedRooms.clear();
    return;
  }

  if (socketIdentity && socketIdentity !== normalizedUserId) {
    if (socket && socket.connected) {
      joinedRooms.forEach((roomKey) => {
        const { room, id } = parseRoomKey(roomKey);
        if (room && id) {
          socket.emit("leave", { type: room, id });
        }
      });
    }
    joinedRooms.clear();
  }

  socketIdentity = normalizedUserId;
};

export const joinRoom = (room, id) => {
  const normalizedRoom = normalizeRoom(room);
  const normalizedId = normalizeId(id);
  if (!normalizedRoom || !normalizedId) return;

  const roomKey = makeRoomKey(normalizedRoom, normalizedId);
  joinedRooms.add(roomKey);

  const s = getSocket();
  if (s.connected) {
    s.emit("join", { type: normalizedRoom, id: normalizedId });
  }
};

export const leaveRoom = (room, id) => {
  const normalizedRoom = normalizeRoom(room);
  const normalizedId = normalizeId(id);
  if (!normalizedRoom || !normalizedId) return;

  const roomKey = makeRoomKey(normalizedRoom, normalizedId);
  joinedRooms.delete(roomKey);

  if (socket && socket.connected) {
    socket.emit("leave", { type: normalizedRoom, id: normalizedId });
  }
};

export const onSocketEvent = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};

export const offSocketEvent = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};

export const emitSocketEvent = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
};

export default socket;
