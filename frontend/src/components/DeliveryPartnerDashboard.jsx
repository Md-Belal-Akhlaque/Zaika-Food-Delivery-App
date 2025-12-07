import React, { useState } from "react";
import axios from 'axios'
import { FaMotorcycle } from "react-icons/fa6";
import { MdDeliveryDining, MdOutlineCheckCircle, MdOutlinePayments } from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import { HiOutlineUser } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData, setCartItem } from "../redux/userSlice";
import { serverURL } from "../App";


const DeliveryPartnerDashboard = () => {

  const[openProfile,setOpenProfile] = useState(false);
  const{userData} =useSelector(state=>state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
    <div className="w-full h-[80px] flex items-center justify-between px-5 fixed top-0 z-[9999] bg-[#fff9f6] shadow-md">

      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <FaMotorcycle size={30} className="text-[#ff4d2d]" />
        <h1 className="text-2xl font-bold text-[#ff4d2d]">Delivery Panel</h1>
      </div>

      {/* Middle: Delivery Controls */}
      <div className="hidden md:flex items-center gap-8 text-gray-700 text-lg font-medium">
        <button className="hover:text-[#ff4d2d] flex items-center gap-2">
          <MdDeliveryDining size={22} /> Ongoing
        </button>

        <button className="hover:text-[#ff4d2d] flex items-center gap-2">
          <MdOutlineCheckCircle size={22} /> Completed
        </button>

        <button className="hover:text-[#ff4d2d] flex items-center gap-2">
          <MdOutlinePayments size={22} /> Earnings
        </button>
      </div>

      {/* Right: Profile */}
    
      <div className="relative">
        <button
          onClick={() => setOpenProfile(!openProfile)}
          className="p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 transition shadow-sm"
        >
          {/* this will give the first initial of fullName */}
          {/* {userData?.fullName.slice(0,1)} */} 
          <HiOutlineUser
            size={28}
            className="text-gray-700 hover:text-[#ff4d2d]"
          />
        </button>

        {/* DROPDOWN MENU */}
        {openProfile && (
          <div className="absolute right-0 w-[200px] bg-white shadow-xl rounded-xl border border-gray-200 mt-2 p-3 z-[999] animate-fadeIn">
            <p className="font-semibold text-gray-700">
              {userData.fullName}
            </p>
            <br />
            <p className="text-sm text-gray-500 mb-3">{userData.email}</p>

            <button
              onClick={() => navigate("/profile")}
              className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100 transition"
            >
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-100 transition text-red-500 font-semibold"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard
