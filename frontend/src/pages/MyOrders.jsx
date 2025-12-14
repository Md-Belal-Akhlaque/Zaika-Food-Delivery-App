import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import OrderCard from '../components/OrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { FiChevronLeft } from "react-icons/fi";
import axios from 'axios';
import { serverURL } from '../App';
import { setMyOrders } from '../redux/userSlice';
import { HashLoader } from 'react-spinners';
import Swal from 'sweetalert2';

const MyOrders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData, myOrders } = useSelector(state => state.user);

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(false);

  /* ================= FETCH ORDERS ================= */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!myOrders || myOrders.length === 0) {
          setIsLoading(true);
        }

        const endpoint = userData?.role === 'owner'
          ? `${serverURL}/api/order/owner-orders`
          : `${serverURL}/api/order/my-orders`;

        const result = await axios.get(endpoint, {
          withCredentials: true
        });

        console.log("📦 Fetched orders:", result.data);
        dispatch(setMyOrders(result.data));
      } catch (err) {
        console.error("❌ Polling failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userData) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [dispatch, userData]);

  /* ================= FORMAT ORDERS ================= */
  useEffect(() => {
    console.log("🔍 Formatting orders, myOrders:", myOrders);
    console.log("🔍 User role:", userData?.role);

    if (!myOrders || !Array.isArray(myOrders)) {
      console.log("⚠️ myOrders not valid array");
      setOrders([]);
      return;
    }

    /* ================= OWNER VIEW ================= */
    if (userData?.role === "owner") {
      console.log("👤 Processing OWNER view");

      const formattedOwnerOrders = myOrders.flatMap(order => {
        if (!order.shopOrders || !Array.isArray(order.shopOrders)) {
          console.warn("⚠️ Order missing shopOrders:", order?._id);
          return [];
        }

        return order.shopOrders
          .filter(
            so =>
              so?.owner?._id === userData._id ||
              so?.owner === userData._id
          )
          .map(shopOrder => ({
            /* ===== IDS ===== */
            id: `${order._id}-${shopOrder._id}`,
            originalOrderId: order._id,
            shopOrderId: shopOrder._id,
            shopId: shopOrder.shop?._id || shopOrder.shop,

            /* ===== DATE ===== */
            createdAt: order.createdAt,
            orderTime: order.createdAt,
            date: order.createdAt,

            /* ===== DISPLAY ID ===== */
            orderId: (shopOrder._id || "")
              .toString()
              .slice(-6)
              .toUpperCase(),

            /* ===== SHOP ===== */
            shopName: shopOrder.shop?.name || "Unknown Shop",

            /* ===== CUSTOMER ===== */
            customerName:
              order.user?.fullName ||
              order.user?.name ||
              "Unknown Customer",
            customerPhone: order.user?.mobile || "N/A",

            /* ===== PAYMENT ===== */
            paymentMethod: order.paymentMethod,
            paymentMode:
              order.paymentMethod === "online" ? "ONLINE" : "COD",
            paymentStatus: order.paymentStatus,

            /* ===== STATUS ===== */
            status: shopOrder.status || "Pending",

            /* ===== PRICING (PER SHOP) ===== */
            totalAmount: Number(shopOrder.subtotal || 0),

            /* ===== DELIVERY ===== */
            orderType: "DELIVERY",
            deliveryAddress: order.deliveryAddress || { text: "Unknown" },

            /* ===== DELIVERY (ADD THIS) ===== */
            deliveryPartner: shopOrder.deliveryPartner || null,
            deliveryAssignmentId: shopOrder.deliveryAssignmentId || null,


            /* ===== ITEMS ===== */
            items: (shopOrder.shopOrderItems || []).map(it => ({
              id: it.item?._id || it._id,
              name: it.name || it.item?.name || "Item",
              price: Number(it.price || 0),
              quantity: it.quantity || 1,
              total: Number(it.price || 0) * (it.quantity || 1),
              image: it.item?.image || "/placeholder.png",
              variants: it.variants || [],
              addons: it.addons || [],
              specialInstructions: it.specialInstructions || ""
            }))
          }));
      });

      console.log("✅ Formatted owner orders:", formattedOwnerOrders);
      setOrders(formattedOwnerOrders);
      return;
    }

    /* ================= CUSTOMER VIEW ================= */
    console.log("👥 Processing CUSTOMER view");

    const formattedUserOrders = myOrders.flatMap(order => {
      if (!order.shopOrders || !Array.isArray(order.shopOrders)) {
        console.warn("⚠️ Order missing shopOrders:", order?._id);
        return [];
      }

      return order.shopOrders.map(shopOrder => ({
        /* ===== IDS ===== */
        id: `${order._id}-${shopOrder._id}`,
        originalOrderId: order._id,
        shopOrderId: shopOrder._id,
        shopId: shopOrder.shop?._id,

        /* ===== DATE (FIXED) ===== */
        createdAt: order.createdAt,
        orderTime: order.createdAt,
        date: order.createdAt,

        /* ===== SHOP ===== */
        restaurant: shopOrder.shop?.name || "Restaurant",

        /* ===== STATUS ===== */
        status: shopOrder.status || "Pending",

        /* ===== TOTAL (PER SHOP – CORRECT) ===== */
        totalAmount: Number(shopOrder.subtotal || 0),

        /* ===== ORDER LEVEL CHARGES ===== */
        itemsTotal: Number(order.itemsTotal || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        platformFee: Number(order.platformFee || 0),
        gst: Number(order.gst || 0),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,

        /* ===== PAYMENT ===== */
        paymentMode:
          order.paymentMethod === "online" ? "ONLINE" : "COD",

        /* ===== DELIVERY ===== */
        orderType: "DELIVERY",
        deliveryAddress: order.deliveryAddress,

        deliveryPartner: shopOrder.deliveryPartner || null,
        deliveryAssignmentId: shopOrder.deliveryAssignmentId || null,

        /* ===== ITEMS ===== */
        items: (shopOrder.shopOrderItems || []).map(it => ({
          id: it.item?._id || it._id,
          name: it.name || it.item?.name || "Item",
          price: Number(it.price || 0),
          quantity: it.quantity || 1,
          total: Number(it.price || 0) * (it.quantity || 1),
          image: it.item?.image || "/placeholder.png",
          variants: it.variants || [],
          addons: it.addons || [],
          specialInstructions: it.specialInstructions || ""
        }))
      }));
    });

    console.log("✅ Formatted user orders:", formattedUserOrders);
    setOrders(formattedUserOrders);
  }, [myOrders, userData]);



  /* ================= FILTER & SORT ================= */
  const filteredOrders = orders.filter(order => {
    // ✅ FIX: Use toLowerCase on both sides
    const matchesFilter = filter === 'all' ||
      (order.status || '').toLowerCase() === filter.toLowerCase();

    const matchesSearch =
      (order.restaurant || order.shopName || '')
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
    if (sortBy === 'total') {
      return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
    }
    return 0;
  });

  const statusFilters = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'delivered', label: 'Delivered', count: orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length },
    { id: 'out for delivery', label: 'Out for Delivery', count: orders.filter(o => (o.status || '').toLowerCase() === 'out for delivery').length },
    { id: 'preparing', label: 'Preparing', count: orders.filter(o => (o.status || '').toLowerCase() === 'preparing').length }
  ];

  /* ================= STATUS UPDATE ================= */
  const handleStatusUpdate = async (orderId, newStatus, prepTime, reason) => {
    try {
      const targetOrder = orders.find(o => o.orderId === orderId);
      if (!targetOrder) {
        console.error("❌ Order not found locally");
        Swal.fire({
          title: 'Error!',
          text: "Order not found",
          icon: 'error'
        });
        return;
      }

      console.log("📤 Updating status:", {
        orderId: targetOrder.originalOrderId,
        shopOrderId: targetOrder.shopOrderId,
        shopId: targetOrder.shopId,
        status: newStatus
      });

      const payload = {
        orderId: targetOrder.originalOrderId,
        shopOrderId: targetOrder.shopOrderId,
        status: newStatus,
      };

      if (prepTime) payload.prepTime = prepTime;
      if (reason) payload.cancellationReason = reason;

      // ✅ FIX: Correct endpoint
      const response = await axios.patch(
        `${serverURL}/api/order/update-status`,
        payload,
        { withCredentials: true }
      );

      console.log("✅ Update response:", response.data);

      // Optimistic update
      setOrders(prev => prev.map(o =>
        o.id === targetOrder.id ? { ...o, status: newStatus } : o
      ));

      // Success notification
      if (newStatus === 'Out for delivery' || newStatus === 'Delivered') {
        Swal.fire({
          title: 'Success!',
          text: `Order ${newStatus.toLowerCase()} successfully!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'Success!',
          text: `Order status updated to ${newStatus}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      }

    } catch (err) {
      console.error("❌ Failed to update status:", err);
      console.error("Error response:", err.response?.data);

      Swal.fire({
        title: 'Error!',
        text: err.response?.data?.message || "Failed to update status",
        icon: 'error'
      });
      throw err;
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <HashLoader color="#f97316" size={60} />
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed left-5 top-5 z-40 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-orange-200 shadow-lg hover:shadow-xl flex items-center justify-center text-[#ff4d2d] transition-all duration-300 hover:text-white hover:bg-[#ff4d2d]"
      >
        <FiChevronLeft size={28} />
      </button>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              My Orders
            </h1>
            <p className="text-gray-600 mt-1">Track, reorder, and manage your recent orders</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-lg">Filter by Status</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setFilter(status.id)}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 ${filter === status.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                >
                  {status.label} ({status.count})
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders by restaurant or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button
                onClick={() => setSortBy(sortBy === 'recent' ? 'total' : 'recent')}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl border border-gray-300 flex items-center justify-center gap-2 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === 'recent' ? 'Recent' : 'Highest'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-6xl mx-auto space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-4L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your filters or search for specific restaurants and order IDs.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) =>
            userData?.role === "user" ? (
              <OrderCard key={order.id} order={order} />
            ) : userData?.role === "owner" ? (
              <OwnerOrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onViewDetails={(id) => console.log("View details", id)}
              />
            ) : null
          )
        )}
      </div>
    </div>
  );
};

export default MyOrders;
