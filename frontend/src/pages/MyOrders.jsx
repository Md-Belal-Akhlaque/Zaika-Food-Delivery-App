import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowUpDown, ChevronLeft, ShoppingBag, Loader2, Calendar, MapPin, CreditCard, Clock } from 'lucide-react';
import OrderCard from '../components/OrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { useApi } from "../hooks/useApi";
import useSocket from "../hooks/useSocket";
import { toast } from "sonner";
import { cn } from "../utility/cn";
import Swal from 'sweetalert2';

// FIXED: Import correct Redux actions from userSlice
import { setUserOrders, setOwnerOrders } from '../redux/userSlice';

const MyOrders = () => {
  const { request } = useApi();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // FIXED: Use correct Redux state properties
  const { userData, userOrders, ownerOrders } = useSelector(state => state.user);
  const placedOrders = useSelector((state) => state.order.placedOrders);

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedOnceRef = useRef(false);
  const [ownerSocketShopId, setOwnerSocketShopId] = useState("");
  const ownerShopId = userData?.role === "owner"
    ? String(ownerSocketShopId || ownerOrders?.[0]?.shop?._id || ownerOrders?.[0]?.shop || "")
    : "";

  useEffect(() => {
    let active = true;
    const fetchOwnerShopId = async () => {
      if (userData?.role !== "owner") {
        setOwnerSocketShopId("");
        return;
      }
      const { data } = await request(
        { url: "/api/shop/me", method: "get" },
        { showToast: false }
      );
      const shopId = String(data?.shop?._id || "");
      if (active && shopId) {
        setOwnerSocketShopId(shopId);
      }
    };
    fetchOwnerShopId();
    return () => {
      active = false;
    };
  }, [request, userData?.role]);

  const fetchOrders = useCallback(async () => {
    try {
      if (!hasFetchedOnceRef.current) {
        setIsLoading(true);
      }

      const endpoint = userData?.role === 'owner'
        ? "/api/order/owner-orders"
        : "/api/order/my-orders";

      const { data } = await request({
        url: endpoint,
        method: "get"
      }, { showToast: false });

      if (data?.success) {
        if (userData?.role === 'owner') {
          dispatch(setOwnerOrders(data.shopOrders));
        } else {
          dispatch(setUserOrders(data.orders));
        }
        hasFetchedOnceRef.current = true;
      }
    } catch (err) {
      console.error("Polling failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, request, userData]);

  const { connected: isSocketConnected } = useSocket({
    autoConnect: Boolean(userData),
    role: userData?.role === "owner" ? (ownerShopId ? "shop" : null) : "user",
    roleId: userData?.role === "owner" ? ownerShopId : null,
    events: [
      { event: "order:statusUpdate", callback: fetchOrders },
      { event: "shopOrder:statusUpdate", callback: fetchOrders },
      { event: "shopOrder:cancelled", callback: fetchOrders },
      { event: "delivery:assigned", callback: fetchOrders },
      { event: "delivery:outForDelivery", callback: fetchOrders },
      { event: "delivery:delivered", callback: fetchOrders },
    ],
  });

  /* ================= FETCH ORDERS ================= */
  useEffect(() => {
    if (userData) {
      fetchOrders();
      if (!isSocketConnected) {
        const interval = setInterval(fetchOrders, 45000);
        return () => clearInterval(interval);
      }
    }
  }, [fetchOrders, isSocketConnected, userData]);

  /* ================= FORMAT ORDERS ================= */
  useEffect(() => {

    const dataSource = userData?.role === "owner" ? ownerOrders : userOrders;

    if (!dataSource || !Array.isArray(dataSource)) {
      setOrders([]);
      return;
    }

    /* ================= OWNER VIEW ================= */
    if (userData?.role === "owner") {

      // FIXED: Owner view maps shopOrders directly from dataSource
      const formattedOwnerOrders = dataSource.map(shopOrder => ({

        id: shopOrder._id,
        originalOrderId: shopOrder.order?._id,
        shopOrderId: shopOrder._id,
        shopId: shopOrder.shop?._id,

        createdAt: shopOrder.createdAt,
        orderTime: shopOrder.order?.createdAt || shopOrder.createdAt,
        date: shopOrder.order?.createdAt || shopOrder.createdAt,

        orderId: (shopOrder._id || "").toString().slice(-6).toUpperCase(),

        shopName: shopOrder.shop?.name || "Unknown Shop",

        customerName:
          shopOrder.order?.user?.fullName ||
          shopOrder.order?.user?.name ||
          shopOrder.order?.deliveryAddress?.name ||
          "Unknown Customer",

        customerPhone:
          shopOrder.order?.user?.mobile ||
          shopOrder.order?.deliveryAddress?.phone ||
          "N/A",

        paymentMethod: shopOrder.order?.paymentMethod,
        paymentMode: "COD",
        paymentStatus: shopOrder.order?.paymentStatus,

        status: shopOrder.status || "Pending",

        totalAmount: Number(shopOrder.subtotal || 0),
        subtotal: Number(shopOrder.subtotal || 0),
        commission: Number(shopOrder.commission || 0),
        shopEarning: Number(shopOrder.shopEarning || 0),
        riderEarning: Number(shopOrder.riderEarning || 0),

        orderType: "DELIVERY",
        deliveryAddress: shopOrder.order?.deliveryAddress || { text: "Unknown" },

        deliveryPartner:
          shopOrder.deliveryAssignment?.assignedDeliveryPartner || null,
        deliveryAssignment: shopOrder.deliveryAssignment || null,
        nearbyDeliveryPartnersCount:
          Number(shopOrder.deliveryAssignment?.nearbyDeliveryPartnersCount || 0),
        nearbyDeliveryPartnersMessage:
          shopOrder.deliveryAssignment?.nearbyDeliveryPartnersMessage ||
          "No delivery partners available nearby",

        // FIXED: Use 'items' field (not 'shopOrderItems') as per backend schema
        items: (shopOrder.items || []).map(it => ({
          id: it.item?._id || it._id,
          name: it.name || it.item?.name || "Item",
          price: Number(it.price || 0),
          quantity: it.quantity || 1,
          totalPrice: Number(it.totalPrice || it.lineTotal || 0),
          image: it.item?.image,
          variants: it.variants || [],
          addons: it.addons || [],
          specialInstructions: it.specialInstructions || ""
        }))
      }));

      setOrders(formattedOwnerOrders);
      return;
    }

    /* ================= CUSTOMER VIEW ================= */

    const formattedUserOrders = dataSource.map((order) => {
      const shops = (order.shopOrders || []).map((shopOrder) => ({
        shopOrderId: shopOrder._id,
        shopId: shopOrder.shop?._id,
        shopName: shopOrder.shop?.name || "Restaurant",
        status: shopOrder.status || "Pending",
        shopSubtotal: Number(shopOrder.subtotal || 0),
        items: (shopOrder.items || []).map((it) => ({
          id: it.item?._id || it._id,
          name: it.name || it.item?.name || "Item",
          price: Number(it.price || 0),
          quantity: it.quantity || 1,
          totalPrice: Number(it.totalPrice || it.lineTotal || 0),
          image: it.item?.image,
          selectedVariant: Array.isArray(it.variants) && it.variants.length > 0 ? it.variants[0] : null,
          selectedAddons: it.addons || [],
        })),
      }));

      const flattenedItems = shops.flatMap((shop) => shop.items || []);
      const firstAdvancedShopStatus =
        shops.find((shop) => String(shop?.status || "Pending") !== "Pending")?.status || null;
      const displayStatus =
        String(order?.orderStatus || "") === "Pending" && firstAdvancedShopStatus
          ? firstAdvancedShopStatus
          : (order.orderStatus || shops[0]?.status || "Pending");

      return {
        id: order._id,
        orderId: (order._id || "").toString().slice(-6).toUpperCase(),
        originalOrderId: order._id,
        createdAt: order.createdAt,
        orderTime: order.createdAt,
        date: order.createdAt,
        status: displayStatus,
        totalAmount: Number(order.totalAmount || 0),
        itemsTotal: Number(order.itemsTotal || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentMode: "COD",
        orderType: "DELIVERY",
        deliveryAddress: order.deliveryAddress,
        shops,
        items: flattenedItems,
      };
    });

    const localOrders = (placedOrders || []).map((order) => ({
      ...order,
      id: order.orderId,
      date: order.createdAt,
      orderTime: order.createdAt,
      totalAmount: Number(order.grandTotal || 0),
      itemsTotal: Number(order.itemTotal || order.itemsTotal || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      status: "Pending",
      paymentMode: "COD",
      items: (order.shops || []).flatMap((shop) => shop.items || []),
    }));

    // Prefer backend orders over local optimistic cache so status does not get stuck on "Pending".
    const byKey = new Map();
    const upsert = (order, source) => {
      const key = String(
        order?.originalOrderId || order?.id || order?.orderId || ""
      );
      if (!key) return;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { order, source });
        return;
      }

      // Backend response is the source of truth for status/payment updates.
      if (source === "server" && existing.source !== "server") {
        byKey.set(key, { order, source });
      }
    };

    formattedUserOrders.forEach((order) => upsert(order, "server"));
    localOrders.forEach((order) => upsert(order, "local"));

    const merged = Array.from(byKey.values()).map((entry) => entry.order);
    setOrders(merged);

  }, [userOrders, ownerOrders, userData, placedOrders]);

  /* ================= STATUS UPDATE ================= */
  // FIXED: Re-added status update handler with correct API endpoint

  const handleStatusUpdate = async (orderRef, newStatus, prepTime, reason) => {
    try {
      const refObject = typeof orderRef === "object" && orderRef !== null
        ? orderRef
        : { shopOrderId: orderRef };

      const shopOrderId = String(
        refObject.shopOrderId || refObject.orderId || ""
      );

      if (!shopOrderId) {
        console.error("❌ Missing shopOrderId for status update", { orderRef });
        Swal.fire({
          title: 'Error!',
          text: "Order ID is missing",
          icon: 'error'
        });
        return;
      }

      const payload = {
        shopOrderId,
        status: newStatus,
      };

      if (prepTime) payload.prepTime = prepTime;
      if (reason) payload.cancellationReason = reason;

      await request({
        url: "/api/order/update-status",
        method: "patch",
        data: payload
      }, {
        loadingMessage: "Updating order status...",
        successMessage: `Order status updated to ${newStatus}`,
        onSuccess: (data) => {
          const updatedAssignment = data?.shopOrder?.deliveryAssignment || null;
          // Optimistic UI update
          setOrders(prev =>
            prev.map(o =>
              String(o.shopOrderId || "") === shopOrderId
                ? {
                    ...o,
                    status: newStatus,
                    deliveryAssignment: updatedAssignment || o.deliveryAssignment
                  }
                : o
            )
          );
        }
      });

    } catch (err) {
      console.error("❌ Failed to update status:", err);
    }
  };

  const handleRebroadcast = async (orderRef) => {
    try {
      const shopOrderId =
        typeof orderRef === "string"
          ? orderRef
          : orderRef?.shopOrderId || orderRef?._id || null;

      if (!shopOrderId) {
        throw new Error("Missing order id for re-broadcast");
      }

      await request({
        url: "/api/order/rebroadcast",
        method: "patch",
        data: {
          shopOrderId
        }
      }, {
        loadingMessage: "Re-broadcasting order...",
        successMessage: "Order broadcasted successfully!",
        onSuccess: (data) => {
          const updatedAssignment = data?.assignment;
          if (updatedAssignment?._id) {
            setOrders((prev) =>
              prev.map((o) =>
                String(o.shopOrderId) === String(updatedAssignment.shopOrder || o.shopOrderId)
                  ? {
                      ...o,
                      deliveryAssignment: updatedAssignment
                    }
                  : o
              )
            );
          }
        }
      });

    } catch (err) {
      console.error("❌ Rebroadcast failed:", err);
    }
  };

  /* ================= FILTER & SORT ================= */

  // FIXED: Use exact string matching for status filtering
  const normalizeStatus = (s) => (s || "").toLowerCase().replace(/\s+/g, '');

  const filteredOrders = orders.filter(order => {

    const matchesFilter =
      filter === 'all' ||
      normalizeStatus(order.status) === normalizeStatus(filter);

    const matchesSearch =
      (order.restaurant || order.shopName || (order.shops || []).map((s) => s.shopName).join(" ") || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (order.items || []).some(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesFilter && matchesSearch;

  }).sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.date || b.orderTime || 0) - new Date(a.date || a.orderTime || 0);
    }
    if (sortBy === 'oldest') {
      return new Date(a.date || a.orderTime || 0) - new Date(b.date || b.orderTime || 0);
    }
    if (sortBy === 'price-high') {
      return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
    }
    if (sortBy === 'price-low') {
      return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
    }
    return 0;
  });

  // FIXED: Use exact status matching for filter counts
  const statusFilters = [
    { id: 'all', label: 'All Orders', count: orders.length },

    {
      id: 'delivered',
      label: 'Delivered',
      count: orders.filter(o => normalizeStatus(o.status) === 'delivered').length
    },

    {
      id: 'outfordelivery',
      label: 'Out for Delivery',
      // FIXED: Use exact match instead of .includes('out')
      count: orders.filter(o => normalizeStatus(o.status) === 'outfordelivery').length
    },

    {
      id: 'preparing',
      label: 'Preparing',
      // FIXED: Use exact match instead of .includes('preparing')
      count: orders.filter(o => normalizeStatus(o.status) === 'preparing').length
    }
  ];

  /* ================= UI SAME ================= */

  return (
    <div className="min-h-screen bg-[#fff9f6]">
      {/* ===== HEADER ===== */}
      <div className="fixed top-0 w-full z-50 backdrop-blur-lg bg-white/80 border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-10 h-[70px] md:h-[80px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/")}
              className="p-2 hover:bg-orange-50 rounded-xl transition-colors text-[#ff4d2d]"
            >
              <ChevronLeft size={28} />
            </button>
            <h1 className="text-xl md:text-2xl font-black text-gray-900">
              {userData?.role === 'owner' ? "Store Orders" : "My Orders"}
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="bg-orange-100 px-4 py-2 rounded-xl border border-orange-200">
              <span className="text-[#ff4d2d] font-bold">{filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-[90px] pb-24 px-4 md:px-10 max-w-7xl mx-auto">
        {/* ===== FILTERS & SEARCH ===== */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff4d2d] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by ID, restaurant or customer..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff4d2d] transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="lg:col-span-4 flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {['all', 'pending', 'preparing', 'delivered', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border shrink-0",
                  filter === f 
                    ? "bg-[#ff4d2d] text-white border-[#ff4d2d] shadow-lg shadow-orange-200" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:bg-orange-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex gap-2">
            <div className="relative flex-1 group">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none appearance-none cursor-pointer text-sm font-semibold text-gray-700 shadow-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Highest Price</option>
                <option value="price-low">Lowest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== ORDER LIST ===== */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-[#ff4d2d] animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Loading your orders...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              userData?.role === 'owner' 
                ? (
                  <OwnerOrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                    onRebroadcast={handleRebroadcast}
                  />
                )
                : <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-orange-100 rounded-3xl p-12 text-center flex flex-col items-center gap-6 shadow-xl max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center">
              <ShoppingBag size={48} className="text-orange-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">No orders found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {searchTerm || filter !== 'all' 
                  ? "We couldn't find any orders matching your filters. Try a different search term."
                  : "You haven't placed any orders yet. Start exploring delicious food around you!"}
              </p>
            </div>
            {!searchTerm && filter === 'all' && (
              <button 
                onClick={() => navigate("/")}
                className="px-8 py-4 bg-[#ff4d2d] text-white rounded-2xl font-bold shadow-lg hover:bg-[#e84224] transition-all hover:scale-105 active:scale-95"
              >
                Explore Restaurants
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
