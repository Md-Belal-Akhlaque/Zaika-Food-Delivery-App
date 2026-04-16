import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApi } from "../hooks/useApi";
import useSocket from "../hooks/useSocket";

const TRACK_STEPS = ["Placed", "Preparing", "Ready", "OutForDelivery", "Delivered"];

const getTimelineStatus = (order) => {
  const orderStatus = order?.orderStatus;
  const shopStatuses = Array.isArray(order?.shopOrders)
    ? order.shopOrders.map((shopOrder) => shopOrder?.status).filter(Boolean)
    : [];

  if (orderStatus === "Delivered" || shopStatuses.every((status) => status === "Delivered")) {
    return "Delivered";
  }

  if (orderStatus === "OutForDelivery" || shopStatuses.some((status) => status === "OutForDelivery")) {
    return "OutForDelivery";
  }

  if (
    orderStatus === "AllReady" ||
    (shopStatuses.length > 0 && shopStatuses.every((status) => ["Ready", "OutForDelivery", "Delivered"].includes(status)))
  ) {
    return "Ready";
  }

  if (orderStatus === "Processing" || shopStatuses.some((status) => ["Accepted", "Preparing"].includes(status))) {
    return "Preparing";
  }

  return "Placed";
};

const TrackOrder = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { request } = useApi();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollingRef = useRef(null);
  const inFlightRef = useRef(false);

  const timelineStatus = useMemo(() => getTimelineStatus(order), [order]);
  const delivered = timelineStatus === "Delivered";

  const fetchOrder = useCallback(async () => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;

    try {
      const result = await request(
        {
          url: `/api/order/${orderId}`,
          method: "get",
        },
        { showToast: false }
      );

      if (result?.error || !result?.data?.success) {
        setError(result?.error?.response?.data?.message || "Unable to load order tracking.");
        setLoading(false);
        return null;
      }

      const nextOrder = result.data.order;
      setOrder(nextOrder);
      setError("");
      setLoading(false);
      return nextOrder;
    } finally {
      inFlightRef.current = false;
    }
  }, [orderId, request]);

  const { connected: isSocketConnected } = useSocket({
    role: "user",
    events: [
      {
        event: "order:statusUpdate",
        callback: (payload) => {
          if (String(payload?.orderId || "") === String(orderId)) {
            fetchOrder();
          }
        },
      },
      {
        event: "shopOrder:statusUpdate",
        callback: () => {
          fetchOrder();
        },
      },
      {
        event: "delivery:assigned",
        callback: () => {
          fetchOrder();
        },
      },
      {
        event: "delivery:outForDelivery",
        callback: () => {
          fetchOrder();
        },
      },
      {
        event: "delivery:delivered",
        callback: () => {
          fetchOrder();
        },
      },
    ],
  });

  useEffect(() => {
    let cancelled = false;

    const clearPolling = () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const tick = async () => {
      const nextOrder = await fetchOrder();
      if (cancelled) return;

      if (!isSocketConnected && nextOrder && getTimelineStatus(nextOrder) !== "Delivered") {
        pollingRef.current = setTimeout(tick, 15000);
      } else {
        clearPolling();
      }
    };

    tick();

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [fetchOrder, isSocketConnected]);

  const activeIndex = TRACK_STEPS.indexOf(timelineStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#ff4d2d] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600">Loading order tracking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fff9f6] p-4 md:p-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#ff4d2d]"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-red-100 p-6">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle size={18} />
            <h2 className="font-black">Tracking unavailable</h2>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#ff4d2d]"
        >
          <ChevronLeft size={18} /> Back
        </button>

        <div className="bg-white border border-orange-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Order Tracking</p>
              <h1 className="text-xl font-black text-gray-900">Order #{String(order?._id || "").slice(-6).toUpperCase()}</h1>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-widest">
              {timelineStatus}
            </span>
          </div>

          <div className="space-y-4">
            {TRACK_STEPS.map((step, index) => {
              const completed = index <= activeIndex;
              const current = index === activeIndex;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {completed ? <CheckCircle2 size={16} /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${current ? "text-gray-900" : "text-gray-600"}`}>{step}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100">
            {delivered ? (
              <p className="text-emerald-600 text-sm font-bold">Order delivered successfully. Polling stopped.</p>
            ) : (
              <p className="text-gray-500 text-sm font-medium">
                {isSocketConnected ? "Live updates enabled via socket." : "Socket offline: polling every 15 seconds."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
