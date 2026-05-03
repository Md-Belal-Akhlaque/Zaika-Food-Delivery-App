import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import DeliveryAssignment from "./models/deliveryAssignmentModel.js";
import Order from "./models/orderModel.js";
import Shop from "./models/shopModel.js";

//  Redis adapter REMOVED — not needed on single Render instance
// Redis adapter is only required when running multiple server instances (horizontal scaling)
// Using Socket.io's built-in in-memory adapter instead — zero extra Redis connections

let io;
const DELIVERY_PARTNER_ROOM = "deliveryPartner";

const userSocketMap = new Map();
const shopSocketMap = new Map();
const deliveryPartnerSocketMap = new Map();

const normalizeId = (id) => (id == null ? "" : String(id).trim());

const normalizeRoomType = (type) => {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "owner") return "shop";
  if (normalized === "deliverypartner") return DELIVERY_PARTNER_ROOM;
  if (normalized === "user") return "user";
  if (normalized === "shop") return "shop";
  return "";
};

const getMapByType = (type) => {
  if (type === "user") return userSocketMap;
  if (type === "shop") return shopSocketMap;
  if (type === DELIVERY_PARTNER_ROOM) return deliveryPartnerSocketMap;
  return null;
};

const getRoomName = (type, id) => `${type}:${id}`;

const addSocketToMap = (map, id, socketId) => {
  const existing = map.get(id) || new Set();
  existing.add(socketId);
  map.set(id, existing);
};

const removeSocketFromMap = (map, id, socketId) => {
  const existing = map.get(id);
  if (!existing) return false;
  existing.delete(socketId);
  if (existing.size === 0) {
    map.delete(id);
  } else {
    map.set(id, existing);
  }
  return true;
};

const sumSocketIds = (map) =>
  Array.from(map.values()).reduce((total, socketSet) => total + socketSet.size, 0);

const removeSocketFromAllMaps = (socketId) => {
  const mapEntries = [userSocketMap, shopSocketMap, deliveryPartnerSocketMap];
  for (const map of mapEntries) {
    for (const [id, socketSet] of map.entries()) {
      if (!socketSet.has(socketId)) continue;
      removeSocketFromMap(map, id, socketId);
    }
  }
};

const registerJoin = (socket, rawType, rawId) => {
  const type = normalizeRoomType(rawType);
  const id = normalizeId(rawId);
  const targetMap = getMapByType(type);
  if (!targetMap || !id) return false;

  const room = getRoomName(type, id);
  const existingSockets = targetMap.get(id);
  if (existingSockets?.has(socket.id)) {
    socket.emit("connected", { message: `Connected as ${type}`, room, id });
    return true;
  }

  socket.join(room);
  socket.join(type);
  addSocketToMap(targetMap, id, socket.id);

  if (!socket.data.joinedRooms) socket.data.joinedRooms = new Set();
  socket.data.joinedRooms.add(room);

  socket.emit("connected", { message: `Connected as ${type}`, room, id });
  return true;
};

const registerLeave = (socket, rawType, rawId) => {
  const type = normalizeRoomType(rawType);
  const id = normalizeId(rawId);
  const targetMap = getMapByType(type);
  if (!targetMap || !id) return false;

  const room = getRoomName(type, id);
  socket.leave(room);
  removeSocketFromMap(targetMap, id, socket.id);

  if (socket.data.joinedRooms) {
    socket.data.joinedRooms.delete(room);
  }

  return true;
};

const emitByType = (type, id, event, data) => {
  if (!io) return false;

  const normalizedType = normalizeRoomType(type);
  const normalizedId = normalizeId(id);
  const targetMap = getMapByType(normalizedType);
  if (!targetMap || !normalizedId) return false;

  const room = getRoomName(normalizedType, normalizedId);
  const socketsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;
  if (socketsInRoom === 0) return false;

  io.to(room).emit(event, data);
  return true;
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        "http://localhost:5173",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"]
  });

  // No Redis adapter — in-memory adapter is used automatically
  // This removes 2 Redis connections (pubClient + subClient)

  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token =
        cookies.token || socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.userId) {
        return next(new Error("Authentication error: Invalid token"));
      }

      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (err) {
      console.error("[SOCKET] Auth error:", err.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const authUserId = socket.data.userId;
    const authRole = socket.data.role;

    registerJoin(socket, "user", authUserId);
    if (authRole === "deliveryPartner") {
      registerJoin(socket, DELIVERY_PARTNER_ROOM, authUserId);
    }

    socket.on("join", async (payload = {}) => {
      const type = normalizeRoomType(payload?.type);
      const id = normalizeId(payload?.id);

      if ((type === "user" || type === DELIVERY_PARTNER_ROOM) && id !== authUserId) {
        return;
      }

      if (type === "shop") {
        try {
          const shop = await Shop.findById(id).select("owner");
          if (!shop || shop.owner.toString() !== authUserId) return;
        } catch (err) {
          console.error("[SOCKET] Error verifying shop owner:", err);
          return;
        }
      }

      registerJoin(socket, payload?.type, payload?.id);
    });

    socket.on("leave", (payload = {}) => {
      registerLeave(socket, payload?.type, payload?.id);
    });

    socket.on("deliveryPartner:locationUpdate", async (payload = {}) => {
      const { latitude, longitude } = payload;
      const deliveryPartnerId = authUserId;

      if (authRole !== "deliveryPartner") return;
      if (latitude == null || longitude == null) return;

      try {
        const activeAssignment = await DeliveryAssignment.findOne({
          assignedDeliveryPartner: deliveryPartnerId,
          assignmentStatus: { $in: ["assigned", "picked", "delivering"] }
        }).select("order");

        if (activeAssignment && activeAssignment.order) {
          const order = await Order.findById(activeAssignment.order).select("user");
          if (order && order.user) {
            const userId = order.user.toString();
            emitToUser(userId, "order:locationUpdate", {
              orderId: activeAssignment.order,
              deliveryPartnerId,
              latitude,
              longitude,
              timestamp: new Date()
            });
          }
        }
      } catch (err) {
        console.error("[SOCKET] locationUpdate error:", err);
      }
    });

    socket.on("disconnecting", () => {
      removeSocketFromAllMaps(socket.id);
    });

    socket.on("error", (error) => {
      console.error(`[SOCKET] error socket=${socket.id}:`, error);
    });
  });

  return io;
};

export const emitToUser = (userId, event, data) => emitByType("user", userId, event, data);
export const emitToShop = (shopId, event, data) => emitByType("shop", shopId, event, data);
export const emitToDeliveryPartner = (deliveryPartnerId, event, data) =>
  emitByType(DELIVERY_PARTNER_ROOM, deliveryPartnerId, event, data);

export const broadcastToAllDeliveryPartners = (event, data) => {
  if (!io) return false;
  io.to(DELIVERY_PARTNER_ROOM).emit(event, data);
  return true;
};

export const getSocketStats = () => ({
  totalConnections: io?.engine?.clientsCount || 0,
  users: userSocketMap.size,
  shops: shopSocketMap.size,
  deliveryPartners: deliveryPartnerSocketMap.size,
  userSockets: sumSocketIds(userSocketMap),
  shopSockets: sumSocketIds(shopSocketMap),
  deliveryPartnerSockets: sumSocketIds(deliveryPartnerSocketMap)
});

export const getConnectedDeliveryPartnerIds = () =>
  Array.from(deliveryPartnerSocketMap.keys()).filter(Boolean);

process.on("SIGTERM", () => {
  if (io) io.close();
});