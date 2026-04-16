import React from "react";
import OwnerNavbar from "./OwnerNavbar";
import useGetMyShop from "../hooks/useGetMyShop";
import useGetOwnerOrders from "../hooks/useGetOwnerOrders";
import { useSelector, useDispatch } from "react-redux";
import { setMyShopData } from "../redux/ownerSlice";
import { Utensils, Plus, Store, ShoppingBag, Clock, IndianRupee, MapPin, Star, Settings, ChevronRight, CheckCircle2, XCircle, AlertCircle, Package, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OwnerItemCard from "./OwnerItemCard";
import OwnerOrderCard from "./OwnerOrderCard";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { cn } from "../utility/cn";
import { Skeleton } from "./Skeleton";

const OwnerDashboard = () => {
  const dispatch = useDispatch();
  const { request } = useApi();
  useGetMyShop();
  useGetOwnerOrders();

  const { myShopData = null, myShopOrders = [] } = useSelector(
    (state) => state.owner
  );
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const shop = myShopData?.shop ?? null; // safe alias

  const handleAddItem = () => {
    navigate("/owner/add-item");
  };

  const handleToggleOpen = async () => {
    if (!shop?._id) return toast.error("Shop data not ready");
    
    await request(
      {
        url: `/api/shop/${shop._id}/open`,
        method: "patch",
      },
      {
        loadingMessage: "Toggling shop status...",
        onSuccess: (data) => {
          const updatedShop = { ...shop, isOpen: data.isOpen };
          dispatch(setMyShopData({ ...myShopData, shop: updatedShop }));
        },
      }
    );
  };

  const handleToggleDelivery = async () => {
    if (!shop?._id) return toast.error("Shop data not ready");
    
    await request(
      {
        url: `/api/shop/${shop._id}/delivery`,
        method: "patch",
      },
      {
        loadingMessage: "Toggling delivery status...",
        onSuccess: (data) => {
          const updatedShop = {
            ...shop,
            isDeliveryAvailable: data.isDeliveryAvailable,
          };
          dispatch(setMyShopData({ ...myShopData, shop: updatedShop }));
        },
      }
    );
  };

  // FIXED: Added onStatusUpdate handler with correct API endpoint and field names
  const handleStatusUpdate = async (shopOrderId, status, prepTime, rejectionReason) => {
    const result = await request(
      {
        url: "/api/order/update-status",
        method: "patch",
        data: { shopOrderId, status },
      },
      {
        loadingMessage: `Updating status to ${status}...`,
        successMessage: `Order status updated to ${status}`,
        onSuccess: () => {
          // Instead of reload, we could ideally update Redux state, 
          // but for now keeping the reload to ensure fresh data
          window.location.reload();
        }
      }
    );
    return result.data;
  };

  const ownerOrders = Array.isArray(myShopOrders) ? myShopOrders : [];
  const pendingOrders = ownerOrders.filter((so) => so?.status === "Pending").length;
  const ongoingOrders = ownerOrders.filter((so) =>
    ["Accepted", "Preparing", "Ready", "OutForDelivery"].includes(String(so?.status || ""))
  ).length;
  const totalRevenue = ownerOrders.reduce((acc, so) => {
    const explicitShopEarning = Number(so?.shopEarning);
    if (Number.isFinite(explicitShopEarning)) {
      return acc + explicitShopEarning;
    }
    const subtotal = Number(so?.subtotal || 0);
    const commission = Number(so?.commission || 0);
    return acc + Math.max(0, subtotal - commission);
  }, 0);
  const formattedTotalRevenue = Number(totalRevenue || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const items = Array.isArray(shop?.items) ? shop.items : [];

  return (
    <>
      <OwnerNavbar />

      <div className="pt-[50px] px-4 md:px-10 w-full min-h-screen bg-[#fff9f6] flex flex-col items-center">
        {!myShopData && (
          <div className="w-full max-w-3xl mt-6 sm:mt-10">
            <div className="relative overflow-hidden bg-white border border-orange-100 shadow-[0_18px_45px_rgba(255,77,45,0.18)] rounded-2xl p-6 sm:p-8">
              <div className="absolute inset-x-0 -top-10 h-24 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
                <div className="flex flex-col items-center sm:items-start gap-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#fff3ef] border border-[#ff4d2d]/20 shadow-sm">
                    <Utensils size={30} className="text-[#ff4d2d]" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-[11px] font-semibold text-green-700 border border-green-100 uppercase tracking-wide">
                    New partner onboarding
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-gray-900 mb-2">
                    Welcome,&nbsp;
                    <span className="text-[#ff4d2d]">
                      {myShopData?.fullName ?? " Owner"}
                    </span>
                    !
                  </h1>

                  <p className="text-gray-600 text-sm sm:text-base mb-3">
                    List your restaurant on Zaika and start receiving online
                    orders from thousands of hungry customers in your city.
                  </p>

                  <p className="text-gray-500 text-xs sm:text-sm mb-5">
                    Set up your restaurant profile, add your best-selling dishes,
                    and go live in just a few minutes. You control menu, pricing,
                    timings and order management from this panel.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-1 text-xs sm:text-sm text-gray-600">
                      <p className="font-semibold text-gray-800">
                        Get started in 3 simple steps:
                      </p>
                      <p>1. Complete your restaurant details.</p>
                      <p>2. Add categories and menu items.</p>
                      <p>3. Set opening hours & go live.</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <button
                        onClick={() => {
                          navigate("/owner/create-shop");
                        }}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#ff4d2d] text-white text-sm font-semibold shadow-md hover:bg-[#e84224] transition-colors cursor-pointer"
                      >
                        Create your restaurant
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = "/owner/help";
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                      >
                        Need help? View onboarding guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-dashed border-orange-100 flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] sm:text-xs text-gray-500">
                <span>• No setup fee, start for free.</span>
                <span>• Real-time order dashboard for your staff.</span>
                <span>• Transparent commission on each completed order.</span>
              </div>
            </div>
          </div>
        )}

        {myShopData && (
          <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-orange-200/80 hover:shadow-2xl transition-all duration-300 w-full max-w-4xl mx-auto mt-10">
            <div className="w-full bg-gradient-to-r from-orange-400 to-[#ff4d2d] p-6 text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
                Welcome Back{" "}
                <span className="italic text-black/90">
                  {shop?.name ? shop.name.toUpperCase() : "Your Shop"}
                </span>
              </h1>
            </div>

            <div className="flex flex-col md:flex-row">
              {shop?.image && (
                <div className="w-full md:w-1/2 h-64 relative group">
                  <img
                    src={shop.image}
                    alt={`${shop?.name || "shop"} Image`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />
                  {shop?.shopType && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-xs font-bold uppercase tracking-wider text-gray-800">
                      {Array.isArray(shop.shopType)
                        ? shop.shopType.join(", ")
                        : shop.shopType}
                    </div>
                  )}
                </div>
              )}

              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-white">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                      Pending
                    </p>
                    <p className="text-3xl font-extrabold text-gray-800 mt-1">
                      {pendingOrders}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                      Ongoing
                    </p>
                    <p className="text-3xl font-extrabold text-gray-800 mt-1">
                      {ongoingOrders}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center overflow-hidden">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wide">
                      Revenue
                    </p>
                    <p className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1 truncate">
                      ₹{formattedTotalRevenue}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      Accepting Orders
                    </span>
                    <button
                      onClick={handleToggleOpen}
                      disabled={!shop?._id}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm transition-all ${
                        shop?.isOpen
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-red-500 text-white hover:bg-red-600"
                      } ${!shop?._id ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {shop?.isOpen ? "OPEN" : "CLOSED"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      Delivery
                    </span>
                    <button
                      onClick={handleToggleDelivery}
                      disabled={!shop?._id}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm transition-all ${
                        shop?.isDeliveryAvailable
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-red-500 text-white hover:bg-red-600"
                      } ${!shop?._id ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {shop?.isDeliveryAvailable ? "ON" : "OFF"}
                    </button>
                  </div>

                  <button
                    onClick={() => navigate("/owner/create-shop")}
                    className="w-full py-3 mt-2 bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
                  >
                    Edit Shop Details
                  </button>
                  
                  <button
                    onClick={() => navigate("/owner/menu-list")}
                    className="w-full py-3 mt-2 bg-orange-500 text-white font-semibold rounded-xl shadow-lg hover:bg-orange-600 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Utensils size={18} />
                    Manage Full Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Section - commented out in original, leaving as-is */}

        {/* Items list */}
        {items.length > 0 ? (
          <div className="flex flex-col py-4 md:flex-wrap w-full max-w-3xl mx-auto">
            {items.map((item) => (
              <OwnerItemCard key={item._id || item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-orange-200 hover:shadow-2xl transition-all duration-300 w-full max-w-3xl relative mt-10">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <button
                  onClick={handleAddItem}
                  className="w-24 h-24 flex items-center justify-center rounded-full bg-orange-100 border border-orange-300 shadow-inner mb-6 hover:bg-orange-200 transition"
                >
                  <Plus className="text-[#ff4d2d] text-5xl cursor-pointer" />
                </button>

                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  No Items Added Yet
                </h2>

                <p className="text-gray-500 text-center max-w-sm mb-6">
                  Start by adding your first food item. It will show up on your
                  shop page instantly!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OwnerDashboard;


                {/* Button */}
                {/* <button
                onClick={() => navigate("/add-item")}
                className="px-8 py-3 bg-[#ff4d2d] text-white font-semibold 
        rounded-xl shadow-md hover:bg-[#e84224] active:scale-95 
        transition-all duration-200 flex items-center gap-2"
              >
                Add New Item
              </button> */}