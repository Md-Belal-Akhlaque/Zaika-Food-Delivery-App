import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { clearCart } from "../redux/cartSlice";
import { disconnectSocket, getSocket, joinRoom } from "../config/socket";
import api, { useApi } from "../hooks/useApi";
import { 
  Loader2, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Package, 
  Bike, 
  Truck, 
  Navigation, 
  Map as MapIcon,
  IndianRupee,
  Wallet,
  Timer,
  ChevronRight,
  RefreshCw,
  Power,
  LogOut,
  Bell,
  MapPinOff,
  Activity
} from "lucide-react";
import { cn } from "../utility/cn";
import { serverURL } from "../config";

// ─── Constants ───────────────────────────────────────────────────────────────
const BROADCAST_DURATION = 25; // seconds countdown per new order
const TABS = { available: "Available", ongoing: "Ongoing", completed: "Completed" };

// ─── Utility ─────────────────────────────────────────────────────────────────
const normalizeAssignment = (a) => ({
  id: a?._id,
  assignmentStatus: a?.assignmentStatus || "unassigned",
  broadcastStatus: a?.broadcastStatus || "active",
  createdAt: a?.createdAt || new Date().toISOString(),
  orderId: a?.order?._id || a?.order || null,
  shopOrderId: a?.shopOrder?._id || a?.shopOrder || null,
  shopName: a?.shop?.name || "Shop",
  shopImage: a?.shop?.image || null,
  pickupAddress: a?.pickupLocation?.address || "Pickup not available",
  pickupLat: a?.pickupLocation?.coordinates?.[1] || null,
  pickupLng: a?.pickupLocation?.coordinates?.[0] || null,
  dropAddress: a?.dropoffLocation?.address || "Drop not available",
  dropLat: a?.dropoffLocation?.coordinates?.[1] || null,
  dropLng: a?.dropoffLocation?.coordinates?.[0] || null,
  deliveryDistance: Number(a?.deliveryDistance || 0),
  estimatedDeliveryTime: Number(a?.estimatedDeliveryTime || 0),
  paymentMethod: a?.order?.paymentMethod || "cod",
  totalAmount: Number(a?.order?.totalAmount || a?.shopOrder?.subtotal || 0),
  riderEarning: Number(a?.shopOrder?.riderEarning || 0),
  customerPhone: a?.order?.deliveryAddress?.phone || null,
  customerName: a?.order?.deliveryAddress?.name || "Customer",
  raw: a,
});

const openMap = (lat, lng) => {
  if (!lat || !lng) return;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gains = [0.4, 0.3, 0.2];
    const freqs = [880, 1100, 1320];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(gains[i], ctx.currentTime + i * 0.12 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.2);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch (error) {
    // Silence error
  }
};

// ─── Countdown Timer Hook ────────────────────────────────────────────────────
const useCountdown = (duration, onExpire) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timeLeft !== duration) setTimeLeft(duration);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [duration]);

  return { timeLeft, percent: (timeLeft / duration) * 100 };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    unassigned: { label: "New", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <AlertCircle size={10} /> },
    assigned:   { label: "Accepted", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <CheckCircle2 size={10} /> },
    picked:     { label: "Picked Up", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: <Package size={10} /> },
    delivering: { label: "On Way", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Bike size={10} /> },
    delivered:  { label: "Delivered", cls: "bg-teal-500/20 text-teal-400 border-teal-500/30", icon: <CheckCircle2 size={10} /> },
    cancelled:  { label: "Cancelled", cls: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle size={10} /> },
  };
  const { label, cls, icon } = map[status] || map.unassigned;
  return (
    <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", cls)}>
      {icon} {label}
    </span>
  );
};

const InfoPill = ({ icon, label, value, accent }) => (
  <div className={cn("flex flex-col gap-0.5 rounded-xl p-3 border", accent || "bg-white/5 border-white/10")}>
    <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">{icon} {label}</span>
    <span className="text-sm font-bold text-white">{value}</span>
  </div>
);

// ─── Broadcast Timer Ring ────────────────────────────────────────────────────
const TimerRing = ({ timeLeft, total }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const color = pct > 0.5 ? "#10b981" : pct > 0.25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="text-sm font-black text-white tabular-nums z-10">{timeLeft}s</span>
    </div>
  );
};

// ─── Available Order Card ────────────────────────────────────────────────────
const AvailableOrderCard = ({ assignment, onAccept, onExpire }) => {
  const [status, setStatus] = useState("active"); // active | expired | taken | accepting | accepted
  const [accepting, setAccepting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleExpire = useCallback(() => {
    setStatus("expired");
    setTimeout(() => onExpire?.(assignment.id), 3000);
  }, [assignment.id, onExpire]);

  const { timeLeft } = useCountdown(BROADCAST_DURATION, handleExpire);

  // listen for taken event
  useEffect(() => {
    if (status === "taken") {
      setTimeout(() => onExpire?.(assignment.id), 2500);
    }
  }, [status]);

  const handleAccept = async () => {
    if (accepting || status !== "active") return;
    setAccepting(true);
    setStatus("accepting");
    try {
      await onAccept(assignment.id);
      setStatus("accepted");
    } catch (error) {
      setStatus("active");
      setAccepting(false);
    }
  };

  const isExpired = status === "expired";
  const isTaken = status === "taken";
  const isAccepted = status === "accepted";
  const isAccepting = status === "accepting";

  return (
    <div
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-[#1a1a2e] to-[#16213e] shadow-2xl"
    >
      {/* Glow pulse on new */}
      {status === "active" && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse-slow"
          style={{ boxShadow: "inset 0 0 40px rgba(16,185,129,0.06)" }} />
      )}

      {/* Expired / Taken Overlay */}
      {(isExpired || isTaken || isAccepted) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm"
          style={{ background: isAccepted ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.65)" }}>
          {isExpired && (
            <>
              <Clock className="text-white/40 mb-2" size={40} />
              <p className="text-white font-bold text-lg">Request Expired</p>
              <p className="text-white/50 text-sm mt-1">Waiting for next broadcast</p>
            </>
          )}
          {isTaken && (
            <>
              <XCircle className="text-white/40 mb-2" size={40} />
              <p className="text-white font-bold text-lg">Order Taken</p>
              <p className="text-white/50 text-sm mt-1">Another partner accepted</p>
            </>
          )}
          {isAccepted && (
            <>
              <CheckCircle2 className="text-emerald-400 mb-2" size={40} />
              <p className="text-emerald-400 font-bold text-lg">Order Accepted!</p>
              <p className="text-white/50 text-sm mt-1">Moving to Ongoing</p>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-black text-sm shrink-0">
            {assignment.shopName?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{assignment.shopName}</p>
            <p className="text-white/40 text-[11px]">#{String(assignment.id).slice(-6).toUpperCase()}</p>
          </div>
        </div>
        <TimerRing timeLeft={timeLeft} total={BROADCAST_DURATION} />
      </div>

      {/* Route */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center pt-1 gap-1 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
            <div className="w-px h-8 bg-linear-to-b from-emerald-400/40 to-violet-400/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-violet-400/30" />
          </div>
          <div className="flex flex-col justify-between gap-3 flex-1 min-w-0">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Pickup</p>
              <p className="text-white/90 text-sm leading-snug line-clamp-1">{assignment.pickupAddress}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Drop</p>
              <p className="text-white/90 text-sm leading-snug line-clamp-1">{assignment.dropAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-4 pb-3">
        <InfoPill icon={<MapPin size={10} />} label="Dist" value={`${assignment.deliveryDistance}km`} />
        <InfoPill icon={<Clock size={10} />} label="ETA" value={`${assignment.estimatedDeliveryTime}m`} />
        <InfoPill icon={<Wallet size={10} />} label="Pay" value={assignment.paymentMethod.toUpperCase()} />
        <InfoPill icon={<IndianRupee size={10} />} label="Earn" value={`₹${assignment.riderEarning}`} accent="bg-emerald-500/10 border-emerald-500/20" />
      </div>

      {/* Action */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAccept}
          disabled={isExpired || isTaken || isAccepting || isAccepted}
          className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isExpired || isTaken ? "rgba(255,255,255,0.05)" :
              isAccepting ? "rgba(16,185,129,0.3)" :
              "linear-gradient(135deg, #f97316, #ec4899)",
            boxShadow: (!isExpired && !isTaken && !isAccepting) ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
            transform: (!isExpired && !isTaken && !isAccepting) ? "translateY(0)" : "translateY(0)",
          }}
        >
          {isAccepting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Accepting...
            </>
          ) : isExpired ? "Expired" : isTaken ? "Taken" : "Accept Order →"}
        </button>
      </div>
    </div>
  );
};

// ─── Ongoing Order Card ──────────────────────────────────────────────────────
const OngoingOrderCard = ({ assignment, onMarkPicked, onMarkDelivered, loading }) => {
  const steps = ["assigned", "picked", "delivering", "delivered"];
  const currentStep = steps.indexOf(assignment.assignmentStatus);

  return (
    <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#1a1a2e] to-[#16213e] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-linear-to-r from-blue-500/10 to-violet-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-black text-sm">
            {assignment.shopName?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{assignment.shopName}</p>
            <p className="text-white/40 text-[11px]">#{String(assignment.id).slice(-6).toUpperCase()}</p>
          </div>
        </div>
        <StatusBadge status={assignment.assignmentStatus} />
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-0">
          {steps.slice(0, 3).map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500", 
                  i <= currentStep ? "bg-linear-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-white/30"
                )}>
                  {i < currentStep ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={cn("text-[9px] uppercase tracking-widest", i <= currentStep ? "text-blue-400" : "text-white/25")}>
                  {step === "assigned" ? "Accept" : step === "picked" ? "Pickup" : "Deliver"}
                </span>
              </div>
              {i < 2 && (
                <div className={cn("flex-1 h-0.5 mb-5 transition-all duration-700", i < currentStep ? "bg-linear-to-r from-blue-500 to-violet-500" : "bg-white/10")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Route */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center pt-1 gap-1 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="w-px h-7 bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Pickup</p>
                <p className="text-white/80 text-xs leading-snug line-clamp-1">{assignment.pickupAddress}</p>
              </div>
              <button onClick={() => openMap(assignment.pickupLat, assignment.pickupLng)}
                className="shrink-0 text-[10px] font-bold text-emerald-400 border border-emerald-400/30 rounded-lg px-2 py-1 hover:bg-emerald-400/10 transition-colors">
                MAP
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Drop — {assignment.customerName}</p>
                <p className="text-white/80 text-xs leading-snug line-clamp-1">{assignment.dropAddress}</p>
              </div>
              <button onClick={() => openMap(assignment.dropLat, assignment.dropLng)}
                className="shrink-0 text-[10px] font-bold text-violet-400 border border-violet-400/30 rounded-lg px-2 py-1 hover:bg-violet-400/10 transition-colors">
                NAV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer call + earnings */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        {assignment.customerPhone && (
          <a href={`tel:${assignment.customerPhone}`}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors">
            <Phone size={14} /> Call Customer
          </a>
        )}
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
          <IndianRupee size={14} /> {assignment.riderEarning} • {assignment.paymentMethod.toUpperCase()}
        </div>
      </div>

      {/* Action button */}
      <div className="px-4 pb-4">
        {assignment.assignmentStatus === "assigned" && (
          <button onClick={() => onMarkPicked(assignment.id)} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
            {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
            {loading ? "Updating..." : "📦 Mark Picked Up"}
          </button>
        )}
        {assignment.assignmentStatus === "picked" && (
          <button onClick={() => onMarkDelivered(assignment.id)} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
            {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
            {loading ? "Updating..." : "✅ Mark Delivered"}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Completed Order Card ────────────────────────────────────────────────────
const CompletedOrderCard = ({ assignment }) => (
  <div className="rounded-2xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", 
      assignment.assignmentStatus === "delivered" ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"
    )}>
      {assignment.assignmentStatus === "delivered" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white/80 font-bold text-sm">{assignment.shopName}</p>
      <p className="text-white/40 text-[11px] line-clamp-1">{assignment.dropAddress}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-white/70 font-bold text-sm flex items-center justify-end gap-0.5">
        <IndianRupee size={12} />{assignment.riderEarning}
      </p>
      <StatusBadge status={assignment.assignmentStatus} />
    </div>
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const DeliveryPartnerDashboard = () => {
  const { userData } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { request } = useApi();

  const [activeTab, setActiveTab] = useState("available");
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [actionLoadingById, setActionLoadingById] = useState({});
  const [isOnline, setIsOnline] = useState(Boolean(userData?.isAvailable));
  const [earnings, setEarnings] = useState({ today: 0, total: 0, trips: 0 });

  const setActionLoading = (id, v) => setActionLoadingById((p) => ({ ...p, [id]: v }));

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setRefreshing(true);
    const [avRes, mineRes, earnRes] = await Promise.all([
      request({ url: "/api/delivery/available-assignments", method: "get" }, { showToast: false }),
      request({ url: "/api/delivery/my-assignments", method: "get" }, { showToast: false }),
      request({ url: "/api/delivery/earnings", method: "get" }, { showToast: false }),
    ]);

    if (avRes.data) setAvailableAssignments((avRes.data.assignments || []).map(normalizeAssignment));
    if (mineRes.data) setMyAssignments((mineRes.data.assignments || []).map(normalizeAssignment));

    if (earnRes.data?.success) {
      setEarnings({
        trips: earnRes.data.totalDeliveries || 0,
        total: earnRes.data.totalEarnings || 0,
        today: (earnRes.data.orderEarnings || [])
          .filter(e => new Date(e.deliveredAt).toDateString() === new Date().toDateString())
          .reduce((s, e) => s + e.amount, 0),
      });
    }
    setRefreshing(false);
  }, [request]);

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?._id || userData?.role !== "deliveryPartner") return;
    const socket = getSocket();

    const handleConnect = () => {
      joinRoom("deliveryPartner", userData._id);
      fetchDashboardData();
    };

    if (socket.connected) handleConnect();
    else socket.once("connect", handleConnect);

    const onDeliveryNew = () => {
      playNotificationSound();
      toast("New order nearby!", { 
        icon: <Bell className="text-orange-500" />, 
        description: "Check Available tab for details",
        style: { background: "#1a1a2e", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" } 
      });
      fetchDashboardData();
    };

    const onDeliveryTaken = () => fetchDashboardData();

    socket.on("delivery:new", onDeliveryNew);
    socket.on("delivery:taken", onDeliveryTaken);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("delivery:new", onDeliveryNew);
      socket.off("delivery:taken", onDeliveryTaken);
      socket.off("connect", handleConnect);
    };
  }, [userData?._id, userData?.role, fetchDashboardData]);

  // ── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
    const t = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(t);
  }, [fetchDashboardData]);

  // ── Location ─────────────────────────────────────────────────────────────
  const updateLocation = useCallback(() => {
    if (!navigator.geolocation || !isOnline || userData?.role !== "deliveryPartner") return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        // 1. HTTP update (updates database)
        await api.patch("/api/delivery/location",
          { latitude: coords.latitude, longitude: coords.longitude });

        // 2. Socket emit (real-time broadcast to user)
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("deliveryPartner:locationUpdate", {
            deliveryPartnerId: userData?._id || userData?.id,
            latitude: coords.latitude,
            longitude: coords.longitude
          });
        }
      } catch (error) {
        // location update failed silently
      }
    }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
  }, [isOnline, userData?._id, userData?.id, userData?.role]);

  useEffect(() => {
    updateLocation();
    const t = setInterval(updateLocation, 30000);
    return () => clearInterval(t);
  }, [updateLocation]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleAvailability = async () => {
    setAvailabilityLoading(true);
    await request(
      {
        url: "/api/delivery/toggle-availability",
        method: "patch",
        data: { isAvailable: !isOnline }
      },
      {
        loadingMessage: "Updating status...",
        onSuccess: (data) => {
          const nextAvailability =
            data?.deliveryPartner?.isAvailable ?? data?.isAvailable ?? !isOnline;
          dispatch(setUserData({ ...userData, isAvailable: nextAvailability }));
          setIsOnline(nextAvailability);
        }
      }
    );
    setAvailabilityLoading(false);
  };

  const handleAcceptAssignment = async (id) => {
    const result = await request(
      {
        url: "/api/delivery/accept-assignment",
        method: "post",
        data: { assignmentId: id }
      },
      {
        loadingMessage: "Accepting delivery...",
        successMessage: "Assignment accepted! Go to shop.",
        onSuccess: () => {
          fetchDashboardData();
          setActiveTab("ongoing");
        }
      }
    );

    if (result?.error) {
      throw result.error;
    }
  };

  const handleMarkPicked = async (id) => {
    setActionLoading(id, true);
    await request(
      {
        url: "/api/delivery/mark-picked",
        method: "patch",
        data: { assignmentId: id }
      },
      {
        loadingMessage: "Marking as picked...",
        successMessage: "Order picked up! Navigate to customer.",
        onSuccess: fetchDashboardData
      }
    );
    setActionLoading(id, false);
  };

  const handleMarkDelivered = async (id) => {
    setActionLoading(id, true);
    await request(
      {
        url: "/api/delivery/mark-delivered",
        method: "patch",
        data: { assignmentId: id }
      },
      {
        loadingMessage: "Completing delivery...",
        successMessage: "Order delivered! Earnings updated.",
        onSuccess: fetchDashboardData
      }
    );
    setActionLoading(id, false);
  };

  const handleExpireCard = useCallback((id) => {
    setAvailableAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/signout");
      disconnectSocket();
      localStorage.clear();
      dispatch(clearCart());
      dispatch(setUserData(null));
      navigate("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const ongoing = useMemo(() => myAssignments.filter((a) => ["assigned", "picked", "delivering"].includes(a.assignmentStatus)), [myAssignments]);
  const completed = useMemo(() => myAssignments.filter((a) => ["delivered", "cancelled"].includes(a.assignmentStatus)), [myAssignments]);

  const tabData = { available: availableAssignments, ongoing, completed };
  const current = tabData[activeTab] || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d1a", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .tab-active { background: linear-gradient(135deg,rgba(249,115,22,0.2),rgba(236,72,153,0.2)); border-color: rgba(249,115,22,0.4); }
      `}</style>

      <div className="max-w-md mx-auto px-4 pb-24 pt-4 space-y-4">

        {/* ── Header ── */}
        <div className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg,#f97316,#ec4899)" }}>
                <Bike size={24} />
              </div>
              <div>
                <p className="font-black text-white text-base leading-tight">{userData?.fullName || "Partner"}</p>
                <p className="text-white/40 text-[11px] uppercase tracking-wider">Delivery Partner</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleToggleAvailability} disabled={availabilityLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                style={{
                  background: isOnline ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.08)",
                  boxShadow: isOnline ? "0 0 20px rgba(16,185,129,0.3)" : "none",
                }}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-white animate-pulse" : "bg-white/30")} />
                {availabilityLoading ? <Loader2 size={12} className="animate-spin" /> : isOnline ? "Online" : "Offline"}
              </button>
              <button onClick={handleLogout}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-red-400 hover:border-red-400/30 transition-colors text-xs">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Earnings strip */}
          <div className="grid grid-cols-3 border-t border-white/8">
            {[
              { label: "Today", value: earnings.today, icon: <IndianRupee size={12} /> },
              { label: "Total", value: earnings.total, icon: <Wallet size={12} /> },
              { label: "Trips", value: earnings.trips, icon: <Activity size={12} /> },
            ].map(({ label, value, icon }, i) => (
              <div key={i} className={cn("py-3 text-center", i < 2 && "border-r border-white/8")}>
                <p className="text-white font-black text-lg leading-tight flex items-center justify-center gap-0.5">
                  {icon} {value}
                </p>
                <p className="text-white/35 text-[10px] uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TABS).map(([key, label]) => {
            const count = tabData[key]?.length || 0;
            const isActive = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`rounded-xl px-3 py-2.5 text-left border transition-all ${
                  isActive ? "tab-active text-white" : "bg-white/4 border-white/8 text-white/50 hover:bg-white/8"
                }`}>
                <p className="text-[10px] uppercase tracking-widest font-bold">{label}</p>
                <p className="text-2xl font-black leading-tight">{count}</p>
              </button>
            );
          })}
        </div>

        {/* ── Refresh indicator ── */}
        {refreshing && (
          <div className="flex items-center gap-2 text-white/30 text-xs justify-center">
            <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            Syncing...
          </div>
        )}

        {/* ── Content ── */}
        {current.length === 0 && !refreshing && (
          <div className="rounded-2xl border border-white/8 bg-white/3 py-16 flex flex-col items-center gap-3">
            <span className="text-5xl opacity-30">
              {activeTab === "available" ? "🛵" : activeTab === "ongoing" ? "📦" : "✅"}
            </span>
            <p className="text-white/30 text-sm font-medium">
              {activeTab === "available" ? (isOnline ? "Waiting for orders..." : "Go online to receive orders") :
               activeTab === "ongoing" ? "No active deliveries" : "No completed trips yet"}
            </p>
            {activeTab === "available" && !isOnline && (
              <button onClick={handleToggleAvailability}
                className="mt-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white"
                style={{ background: "linear-gradient(135deg,#f97316,#ec4899)" }}>
                Go Online
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {activeTab === "available" && availableAssignments.map((a) => (
            <AvailableOrderCard
              key={a.id}
              assignment={a}
              onAccept={() => handleAcceptAssignment(a.id)}
              onExpire={handleExpireCard}
            />
          ))}

          {activeTab === "ongoing" && ongoing.map((a) => (
            <OngoingOrderCard
              key={a.id}
              assignment={a}
              onMarkPicked={() => handleMarkPicked(a.id)}
              onMarkDelivered={() => handleMarkDelivered(a.id)}
              loading={Boolean(actionLoadingById[a.id])}
            />
          ))}

          {activeTab === "completed" && completed.map((a) => (
            <CompletedOrderCard key={a.id} assignment={a} />
          ))}
        </div>

      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
