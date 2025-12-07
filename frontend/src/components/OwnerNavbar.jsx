import React, { useState } from "react";
import axios from "axios";
import { FaStore } from "react-icons/fa6";
import { MdOutlineMenuBook, MdOutlinePayments } from "react-icons/md";
import { FaClipboardList, FaUserCircle } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {serverURL}from '../App'
import { setUserData, setCartItem } from "../redux/userSlice";
import { useDispatch } from "react-redux";

const OwnerNavbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { myShopData } = useSelector((state) => state.owner);
  const { userData } = useSelector((state) => state.user);

  const [openMenuDropdown, setOpenMenuDropdown] = useState(false);
  const [openProfileDropdown, setOpenProfileDropdown] = useState(false);

  // close dropdowns on route change
  const handleLogout = async () => {
        try {
          await axios.post(`${serverURL}/api/auth/signout`, {}, { withCredentials: true });
          localStorage.clear();
          dispatch(setCartItem([]));
          dispatch(setUserData(null)); 
          navigate("/signin");
        } catch (error) {
          throw new Error(error);
        }
  };

  return (
    <div className="fixed top-0 w-full h-[70px] md:h-[80px] z-[999] backdrop-blur-lg bg-white/80 shadow-md border-b border-white/30">
      <div className="flex items-center justify-between px-4 md:px-10 h-full">
        {/* Left: Brand / Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/OwnerDashboard")}
        >
          <FaStore size={26} className="text-[#ff4d2d]" />
          <div className="flex flex-col leading-tight">
            <span className="text-xl md:text-2xl font-extrabold tracking-wide text-[#ff4d2d]">
              Zaika <span className="text-gray-800 italic">Owner</span>
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
            onClick={() => navigate("/owner/orders")}
            className="relative flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <FaClipboardList size={18} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Orders</span>
            <span className="absolute -top-2 -right-3 bg-[#ff4d2d] text-white text-[11px] px-[6px] py-[1px] rounded-full shadow-md">
              {myShopData?.pendingOrdersCount || 0}
            </span>
          </button>

          {/* Menu management dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
              onClick={() => setOpenMenuDropdown((prev) => !prev)}
            >
              <MdOutlineMenuBook size={20} className="text-gray-700" />
              <span className="text-gray-700 font-medium">Menu</span>
            </button>

            {openMenuDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-xl border border-gray-200 py-2 text-sm animate-fadeIn">
                <p className="px-3 pb-2 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
                  Menu Management
                </p>

                <button
                  onClick={() => navigate("/owner/add-item")}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50"
                >
                  Add new item
                </button>
                <button
                  onClick={() => navigate("/owner/menu-list")}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50"
                >
                  Menu list
                </button>
                <button
                  onClick={() => navigate("/owner/categories")}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50"
                >
                  Categories
                </button>
              </div>
            )}
          </div>

          {/* Earnings / payments */}
          <button
            onClick={() => navigate("/owner/earnings")}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <MdOutlinePayments size={20} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Earnings</span>
          </button>
        </div>

        {/* Right: Profile dropdown */}
        <div className="relative">
          <button
            className="p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 transition shadow-sm flex items-center gap-2"
            onClick={() => setOpenProfileDropdown((prev) => !prev)}
          >
            <FaUserCircle size={28} className="text-gray-700" />
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-gray-800 max-w-[140px] truncate">
                {userData?.fullName.slice(0,1) || "Owner"}
              </span>
              <span className="text-[11px] text-gray-500 max-w-[140px] truncate">
                {myShopData?.shopName || "Your restaurant"}
              </span>
            </div>
          </button>

          {openProfileDropdown && (
            <div className="absolute right-0 w-60 bg-white shadow-xl rounded-xl border border-gray-200 mt-2 py-2 px-3 text-sm animate-fadeIn">
              <div className="pb-2 border-b border-gray-100 mb-2">
                <p className="font-semibold text-gray-800">
                  {userData?.fullName || "Owner"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userData?.email || "owner@example.com"}
                </p>
              </div>

              <button
                onClick={() => navigate("/owner/profile")}
                className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100"
              >
                Profile
              </button>
              <button
                onClick={() => navigate("/owner/settings")}
                className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100"
              >
                Settings
              </button>
              <button
                onClick={() => navigate("/owner/subscription")}
                className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100"
              >
                Subscription & billing
              </button>

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100 text-red-500 font-semibold text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerNavbar;
