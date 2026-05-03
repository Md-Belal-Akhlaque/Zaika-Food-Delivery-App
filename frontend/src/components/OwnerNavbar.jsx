import React, { useState } from "react";
import { Store, BookOpen, CreditCard, ClipboardList, User as UserIcon, LogOut, Plus, List, Settings } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { clearCart } from "../redux/cartSlice";
import api from "../hooks/useApi";
import { toast } from "sonner";
import { cn } from "../utility/cn";
import { disconnectSocket } from "../config/socket";

const OwnerNavbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { myShopData, myShopOrders = [] } = useSelector((state) => state.owner);
  const { userData } = useSelector((state) => state.user);
  const activeOrdersCount = Array.isArray(myShopOrders)
    ? myShopOrders.filter((so) =>
        !["Delivered", "Cancelled"].includes(String(so?.status || ""))
      ).length
    : 0;

  const [openMenuDropdown, setOpenMenuDropdown] = useState(false);
  const [openProfileDropdown, setOpenProfileDropdown] = useState(false);

  // close dropdowns on route change
  const handleLogout = async () => {
    try {
      await api.post("/api/auth/signout");
      disconnectSocket();
      localStorage.clear();
      dispatch(clearCart());
      dispatch(setUserData(null)); 
      toast.success("Logged out successfully");
      navigate("/signin");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="fixed top-0 w-full h-[70px] md:h-[80px] z-[999] backdrop-blur-lg bg-white/80 shadow-md border-b border-white/30">
      <div className="flex items-center justify-between px-4 md:px-10 h-full">
        {/* Left: Brand / Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <Store size={26} className="text-[#ff4d2d]" />
          <div className="flex flex-col leading-tight">
            <span className="text-xl md:text-2xl font-extrabold tracking-wide text-[#ff4d2d]">
              Shop <span className="text-gray-800 italic">Owner</span>
            </span>
            <span className="text-[11px] text-gray-500">
              Restaurant Panel
            </span>
          </div>
        </div>

        {/* Middle: Main nav (desktop) */}
        <div className="hidden md:flex items-center gap-4 text-gray-700 text-sm font-medium">
          {/* Orders */}
          <button
            onClick={() => navigate("/my-orders")}
            className="relative flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <ClipboardList size={18} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Orders</span>
            <span className="absolute -top-2 -right-3 bg-[#ff4d2d] text-white text-[11px] px-[6px] py-[1px] rounded-full shadow-md">
              {activeOrdersCount}
            </span>
          </button>

          {/* Menu management dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
              onClick={() => setOpenMenuDropdown((prev) => !prev)}
            >
              <BookOpen size={20} className="text-gray-700" />
              <span className="text-gray-700 font-medium">Menu</span>
            </button>

            {openMenuDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-xl border border-gray-200 py-2 text-sm animate-fadeIn">
                <p className="px-3 pb-2 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
                  Menu Management
                </p>

                <button
                  onClick={() => navigate("/owner/add-item")}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add new item
                </button>
                <button
                  onClick={() => navigate("/owner/menu-list")}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                >
                  <List size={16} />
                  Menu list
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/owner/payments")}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <CreditCard size={18} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Payments</span>
          </button>
        </div>

        {/* Right: Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenProfileDropdown((prev) => !prev)}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100 transition"
          >
            <UserIcon size={20} className="text-[#ff4d2d]" />
            <span className="hidden md:inline font-bold text-gray-800">
              {userData?.fullName?.split(" ")[0] || "Owner"}
            </span>
          </button>

          {openProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white shadow-2xl rounded-2xl border border-gray-100 py-3 text-sm animate-fadeIn overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-50 mb-2">
                <p className="font-bold text-gray-900 text-[15px]">
                  {userData?.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userData?.email}
                </p>
              </div>

              <button
                onClick={() => {
                  navigate("/owner/settings");
                  setOpenProfileDropdown(false);
                }}
                className="w-full flex items-center gap-3 py-2.5 px-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <Settings size={18} />
                Store Settings
              </button>

              <div className="h-px bg-gray-50 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2.5 px-4 text-red-500 font-semibold hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                Logout Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerNavbar;

