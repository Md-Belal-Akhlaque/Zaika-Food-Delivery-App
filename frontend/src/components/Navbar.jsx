import React, { useState } from "react";
import { FaLocationDot } from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";
import { HiOutlineUser } from "react-icons/hi";
import { BsCart3 } from "react-icons/bs";
import { MdOutlineRestaurantMenu } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData , setCartItem } from "../redux/userSlice";
import axios from "axios";
import { serverURL } from '../App'

const Navbar = () => {
  const [openProfile, setOpenProfile] = useState(false);
  const [openSearch, setOpenSearch] = useState(false); // mobile search popup

  const { userData, currentCity} = useSelector((state) => state.user);
  const totalCartCount = useSelector((state) =>
    state.user.cartItems.reduce((sum, item) => sum + item.quantity, 0)
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

        {/* LEFT : BRAND */}
        <h1
          className="text-2xl md:text-3xl font-extrabold tracking-wide text-[#ff4d2d] cursor-pointer"
          onClick={() => navigate("/")}
        >
          Zaika <span className="text-gray-800 italic">King</span>
        </h1>

        {/* CENTER (desktop) */}
        <div className="hidden md:flex items-center gap-4 w-[45%]">
          <div className="flex items-center gap-2 bg-white shadow-sm px-4 py-2 rounded-xl border border-gray-200">
            <FaLocationDot size={20} className="text-[#ff4d2d]" />
            <span className="text-gray-700 font-medium truncate w-[80px]">
              {currentCity || "INDIA"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 w-full rounded-xl shadow-sm border border-gray-200 focus-within:shadow-lg transition">
            <FiSearch size={20} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search your favourite dish..."
              className="w-full bg-transparent outline-none text-gray-700"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-6">

          {/* Orders (desktop) */}
          <button
            onClick={() => navigate("/my-orders")}
            className="hidden md:flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow border border-gray-200 hover:bg-gray-100"
          >
            <MdOutlineRestaurantMenu size={22} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Orders</span>
          </button>

          {/* Search icon (mobile) */}
          <button
            onClick={() => setOpenSearch(true)}
            className="md:hidden"
          >
            <FiSearch size={26} className="text-gray-700" />
          </button>

          {/* Cart */}
          <button className="relative group" onClick={() => navigate("/cart")}>
            <BsCart3
              size={26}
              className="text-gray-700 group-hover:text-[#ff4d2d]"
            />
            <span className="absolute -top-2 -right-3 bg-[#ff4d2d] text-white text-xs px-[6px] py-[1px] rounded-full shadow-md">
              {totalCartCount || 0}
            </span>
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setOpenProfile(!openProfile)}
              className="p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 transition shadow-sm"
            >
              <HiOutlineUser size={28} className="text-gray-700" />
            </button>

            {openProfile && (
              <div className="absolute right-0 w-[200px] bg-white shadow-xl rounded-xl border border-gray-200 mt-2 p-3 animate-fadeIn">
                <p className="font-semibold text-gray-700">
                  {userData.fullName}
                </p>
                <p className="text-sm text-gray-500 mb-3">{userData.email}</p>

                {/* Orders moved inside dropdown for mobile */}
                <button
                  onClick={() => {
                    navigate("/orders");
                    setOpenProfile(false);
                  }}
                  className="md:hidden w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100"
                >
                  My Orders
                </button>

                <button
                  onClick={() => {
                    navigate("/profile");
                    setOpenProfile(false);
                  }}
                  className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100"
                >
                  Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100 text-red-500 font-semibold"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MOBILE SEARCH POPUP */}
      {openSearch && (
        <div className="fixed inset-0 bg-white z-[9999] p-5 animate-fadeIn flex flex-col gap-4">

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-gray-700">Search</h2>
            <button onClick={() => setOpenSearch(false)} className="p-2">
              <IoClose size={30} className="text-gray-600" />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-3 rounded-xl border border-gray-300">
            <FaLocationDot size={20} className="text-[#ff4d2d]" />
            <span className="text-gray-700 font-medium">
              {currentCity || "NOIDA"}
            </span>
          </div>

          {/* Search input */}
          <div className="flex items-center gap-3 bg-gray-100 p-4 rounded-xl border border-gray-300">
            <FiSearch size={24} className="text-gray-600" />
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
