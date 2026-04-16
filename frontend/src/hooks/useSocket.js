import { useEffect, useRef, useState } from "react";
import { getSocket, joinRoom, syncSocketIdentity } from "../config/socket";
import { useSelector } from "react-redux";

/**
 * Custom hook to manage Socket.io connection and events
 * @param {Object} options
 * @param {boolean} options.autoConnect - Auto connect on mount (default: true)
 * @param {string} options.role - 'user' | 'shop' | 'deliveryPartner'
 * @param {string|null} options.roleId - custom id for role room join (e.g. shopId)
 * @param {Array}  options.events - [{ event: string, callback: fn }]
 */
const useSocket = ({ autoConnect = true, role = null, roleId = null, events = [] } = {}) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const currentUser = useSelector((state) => state.user.userData);

  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!autoConnect || !userId) return;
    syncSocketIdentity(userId);

    const socket = getSocket();
    socketRef.current = socket;
    setConnected(Boolean(socket.connected));
    const onConnectState = () => setConnected(true);
    const onDisconnectState = () => setConnected(false);
    socket.on("connect", onConnectState);
    socket.on("disconnect", onDisconnectState);


    // ✅ Ensure socket connects (important edge case fix)
    if (!socket.connected) {
      socket.connect();
    }

    // ✅ Join rooms AFTER connection (CRITICAL FIX)
    const handleConnect = () => {
      joinRoom("user", userId);

      if (role) {
        if (role === "deliveryPartner" && currentUser?.role !== "deliveryPartner") {
          return;
        }
        const joinId = roleId || userId;
        if (joinId) {
          joinRoom(role, joinId);
        }
      }
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.once("connect", handleConnect);
    }

    // ✅ Snapshot events (your fix - correct)
    const registeredEvents = [...events];

    // ✅ Register listeners
    registeredEvents.forEach(({ event, callback }) => {
      if (event && typeof callback === "function") {
        socket.on(event, callback);
      }
    });

    // ✅ Cleanup
    return () => {
      registeredEvents.forEach(({ event, callback }) => {
        if (event && typeof callback === "function") {
          socket.off(event, callback);
        }
      });

      // ✅ Prevent duplicate "connect" handlers
      socket.off("connect", handleConnect);
      socket.off("connect", onConnectState);
      socket.off("disconnect", onDisconnectState);
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, role, roleId, currentUser?._id, currentUser?.id]);

  return {
    socket: socketRef.current,
    connected,
    id: socketRef.current?.id || null,
  };
};

export default useSocket;