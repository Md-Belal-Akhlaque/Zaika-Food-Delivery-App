import React from "react";
import OwnerNavbar from "./OwnerNavbar";
import useGetMyShop from "../hooks/useGetMyShop";
import { useSelector } from "react-redux";
import { FaUtensils } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom'
import { FaPlus } from "react-icons/fa";
import OwnerItemCard from "./OwnerItemCard";

const OwnerDashboard = () => {
  useGetMyShop();

  const { myShopData } = useSelector((state) => state.owner);
  const navigate = useNavigate();

  const handleAddItem = () => {
    navigate("/owner/add-item");
  }


  return (
    <>
      <OwnerNavbar />

      {/* content ko navbar ke neeche push karo */}
      <div className="pt-[50px] px-4 md:px-10 w-full min-h-screen bg-[#fff9f6] flex flex-col items-center">

        {!myShopData && (

          <div className="w-full max-w-3xl mt-6 sm:mt-10">
            <div className="relative overflow-hidden bg-white border border-orange-100 shadow-[0_18px_45px_rgba(255,77,45,0.18)] rounded-2xl p-6 sm:p-8">
              {/* subtle top gradient strip */}
              <div className="absolute inset-x-0 -top-10 h-24 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
                {/* Icon + badge */}
                <div className="flex flex-col items-center sm:items-start gap-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#fff3ef] border border-[#ff4d2d]/20 shadow-sm">
                    <FaUtensils size={30} className="text-[#ff4d2d]" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-[11px] font-semibold text-green-700 border border-green-100 uppercase tracking-wide">
                    New partner onboarding
                  </span>
                </div>

                {/* Text content */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-gray-900 mb-2">
                    Welcome,&nbsp;
                    <span className="text-[#ff4d2d]">
                      {myShopData?.fullName || " Owner"}
                    </span>
                    !
                  </h1>

                  <p className="text-gray-600 text-sm sm:text-base mb-3">
                    List your restaurant on Zaika and start receiving online
                    orders from thousands of hungry customers in your city.
                  </p>

                  <p className="text-gray-500 text-xs sm:text-sm mb-5">
                    Set up your restaurant profile, add your best‑selling dishes,
                    and go live in just a few minutes. You control menu, pricing,
                    timings and order management from this panel.
                  </p>

                  {/* Steps + CTA */}
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
                          // first step of onboarding
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

              {/* bottom info strip */}
              <div className="mt-5 pt-3 border-t border-dashed border-orange-100 flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] sm:text-xs text-gray-500">
                <span>• No setup fee, start for free.</span>
                <span>• Real‑time order dashboard for your staff.</span>
                <span>• Transparent commission on each completed order.</span>
              </div>
            </div>
          </div>
        )}

        {/* Shop Name and address */}
        {myShopData && (
          <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden 
                  border border-orange-200/80 hover:shadow-2xl transition-all duration-300 
                  w-full max-w-4xl mx-auto mt-10">

            {/* Header */}
            <div className="w-full bg-gradient-to-r from-orange-400 to-[#ff4d2d] p-6 text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
                Welcome Back {" "}
                <span className="italic text-black/90">
                  {myShopData.shop?.name.toUpperCase()}
                </span>
              </h1>
            </div>

            {/* Shop Image */}
            <div className="relative">
              {myShopData.shop?.image && (
                <>
                  <img
                    src={myShopData.shop.image}
                    alt={`${myShopData.shop?.name} Image`}
                    className="w-full h-56 object-cover"
                  />

                </>
              )}
            </div>

            {/* edit button */}
            <div className="flex justify-center py-6">
              <button
                onClick={() => navigate("/owner/create-shop")}
                className="px-8 py-3 bg-[#ff4d2d] text-white font-semibold rounded-xl shadow-md 
                   hover:bg-[#e84224] hover:shadow-lg transition-all duration-200"
              >
                Edit Shop
              </button>
            </div>
          </div>
        )}

        {/* add  items*/}


        {/* render the OnwerItem card in dashboard */}
        {myShopData?.shop?.items.length > 0 ?

          (<div className="flex flex-col py-4 md:flex-wrap w-full max-w-3xl mx-auto">{myShopData?.shop?.items.map((item, index) => (

            <OwnerItemCard key={index} item={item} />

          ))}</div>)

          :

          (<div className="bg-white shadow-lg rounded-xl overflow-hidden border border-orange-200 
    hover:shadow-2xl transition-all duration-300 w-full max-w-3xl relative mt-10">

            {myShopData?.shop?.items.length == 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4">

                {/* Icon Circle */}
                <button
                  onClick={handleAddItem}
                  className="w-24 h-24 flex items-center justify-center rounded-full 
             bg-orange-100 border border-orange-300 shadow-inner mb-6
             hover:bg-orange-200 transition"
                >
                  <FaPlus className="text-[#ff4d2d] text-5xl cursor-pointer" />
                </button>

                {/* Text */}
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  No Items Added Yet
                </h2>

                <p className="text-gray-500 text-center max-w-sm mb-6">
                  Start by adding your first food item.
                  It will show up on your shop page instantly!
                </p>

                {/* Button */}
                {/* <button
                onClick={() => navigate("/add-item")}
                className="px-8 py-3 bg-[#ff4d2d] text-white font-semibold 
        rounded-xl shadow-md hover:bg-[#e84224] active:scale-95 
        transition-all duration-200 flex items-center gap-2"
              >
                Add New Item
              </button> */}
              </div>
            )}
          </div>)}

      </div>
      {/* {console.log("myShopItems in shopitem:", myShopItems)} this is null everything is in shopData */}


    </>
  );
};

export default OwnerDashboard;
