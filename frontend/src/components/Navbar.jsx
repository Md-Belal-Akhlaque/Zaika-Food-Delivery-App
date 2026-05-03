import React, { useState } from "react";
import { MapPin, Search, User, ShoppingCart, X, LogOut, Package } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { clearCart } from "../redux/cartSlice";
import api from "../hooks/useApi";
import { toast } from "sonner";
import { disconnectSocket } from "../config/socket";

const Navbar = () => {
  const [openProfile, setOpenProfile] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);

  const { userData, currentCity } = useSelector((state) => state.user);
  const totalCartCount = useSelector((state) => state.cart.summary.quantityTotal || 0);

  const dispatch = useDispatch();
  const navigate = useNavigate();

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
        <h1
          className="text-2xl md:text-3xl font-extrabold tracking-wide text-[#ff4d2d] cursor-pointer"
          onClick={() => navigate("/")}
        >
          Zai<span className="text-gray-800 italic">Ka</span>
        </h1>

        <div className="hidden md:flex items-center gap-4 w-[45%]">
          <div className="flex items-center gap-2 bg-white shadow-sm px-4 py-2 rounded-xl border border-gray-200">
            <MapPin size={20} className="text-[#ff4d2d]" />
            <span className="text-gray-700 font-medium truncate w-[80px]">
              {currentCity || "INDIA"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 w-full rounded-xl shadow-sm border border-gray-200 focus-within:shadow-lg transition">
            <Search size={20} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search your favourite dish..."
              className="w-full bg-transparent outline-none text-gray-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/my-orders")}
            className="hidden md:flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <Package size={22} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Orders</span>
          </button>

          <button onClick={() => setOpenSearch(true)} className="md:hidden">
            <Search size={26} className="text-gray-700" />
          </button>

          <button className="relative group" onClick={() => navigate("/cart")}>
            <ShoppingCart
              size={26}
              className="text-gray-700 group-hover:text-[#ff4d2d]"
            />
            <span className="absolute -top-2 -right-3 bg-[#ff4d2d] text-white text-xs px-[6px] py-[1px] rounded-full shadow-md">
              {totalCartCount}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setOpenProfile(!openProfile)}
              className="p-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 transition shadow-sm overflow-hidden w-10 h-10 flex items-center justify-center"
            >
              {userData?.profileImage ? (
                <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-gray-700" />
              )}
            </button>

            {openProfile && (
              <div className="absolute right-0 w-[220px] bg-white shadow-xl rounded-xl border border-gray-200 mt-2 p-3 animate-fadeIn">
                <div className="px-2 py-1 mb-2">
                  <p className="font-bold text-gray-800 truncate">{userData?.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                </div>

                <div className="h-px bg-gray-100 my-2" />

                <button
                  onClick={() => {
                    navigate("/my-orders");
                    setOpenProfile(false);
                  }}
                  className="w-full flex items-center gap-2 text-left py-2 px-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <Package size={18} />
                  My Orders
                </button>

                <button
                  onClick={() => {
                    navigate("/profile");
                    setOpenProfile(false);
                  }}
                  className="w-full flex items-center gap-2 text-left py-2 px-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <User size={18} />
                  Profile
                </button>

                <div className="h-px bg-gray-100 my-2" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-left py-2 px-2 rounded-lg hover:bg-red-50 text-red-500 font-semibold transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {openSearch && (
        <div className="fixed inset-0 bg-white z-[9999] p-5 animate-fadeIn flex flex-col gap-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-gray-700">Search</h2>
            <button onClick={() => setOpenSearch(false)} className="p-2">
              <X size={30} className="text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 px-4 py-3 rounded-xl border border-gray-300">
            <MapPin size={20} className="text-[#ff4d2d]" />
            <span className="text-gray-700 font-medium">{currentCity || "NOIDA"}</span>
          </div>

          <div className="flex items-center gap-3 bg-gray-100 p-4 rounded-xl border border-gray-300">
            <Search size={24} className="text-gray-600" />
            <input
              type="text"
              placeholder="Search your favourite dish..."
              className="w-full bg-transparent outline-none text-gray-700"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
