import React, { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import CategoryCard from "./CategoryCard";
import FoodCard from "./FoodCard";
import { categories } from "../category";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import image1 from "../assets/image1.jpg";
import image2 from "../assets/image2.webp";
import image3 from "../assets/image3.jpg";
import image4 from "../assets/image4.avif";
import image5 from "../assets/image5.jpg";
import image6 from "../assets/image6.jpg";
import image7 from "../assets/image7.jpg";
import image8 from "../assets/image8.avif";
import image9 from "../assets/image9.jpg";
import image10 from "../assets/image10.avif";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Star, Clock } from "lucide-react";
import axios from "axios";
import { serverURL } from "../config";
import useGetItemsByCity from "../hooks/useGetItemsByCity";
import useHorizontalScroll from "../hooks/useHorizontalScroll";
import { setFilters } from "../redux/userSlice";

const UserDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentCity, itemsInMyCity, shopsInMyCity, filters } = useSelector((state) => state.user);

  // Use custom scroll hooks for categories and restaurants
  const categoryScroll = useHorizontalScroll(300);
  const restaurantScroll = useHorizontalScroll(300);

  const toggleFilter = (type) => {
    const newTypes = filters.shopType.includes(type)
      ? filters.shopType.filter(t => t !== type)
      : [...filters.shopType, type];
    dispatch(setFilters({ shopType: newTypes }));
  };

  const handleRatingFilter = (rating) => {
    dispatch(setFilters({ rating: filters.rating === rating ? 0 : rating }));
  };

  return (
    <div
      className="pt-[60px] w-full min-h-screen bg-linear-to-b from-orange-50 via-rose-50 to-white flex flex-col items-center bg-[#fff3e9]"
      style={{
        background: "linear-gradient(135deg, rgb(255,243,233), rgb(255,224,199))",
      }}
    >
      <Navbar />

      <div className="w-full max-w-7xl p-6 mt-4">
        {/* FILTERS BAR */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-orange-100 text-sm font-semibold text-gray-700">
            <SlidersHorizontal size={16} className="text-orange-500" />
            Filters
          </div>
          
          {['North Indian', 'Chinese', 'South Indian', 'Desserts', 'Fast Food'].map((type) => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.shopType.includes(type)
                  ? 'bg-[#ff4d2d] text-white shadow-lg shadow-orange-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
              }`}
            >
              {type}
            </button>
          ))}

          <div className="h-6 w-[1px] bg-gray-300 mx-2 hidden md:block" />

          <button
            onClick={() => dispatch(setFilters({ openOnly: !filters.openOnly }))}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.openOnly
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
            }`}
          >
            Open Now
          </button>

          <div className="flex items-center bg-white rounded-full border border-gray-200 px-2">
            {[4, 3].map((r) => (
              <button
                key={r}
                onClick={() => handleRatingFilter(r)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                  filters.rating === r ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {r}+ <Star size={14} fill={filters.rating === r ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-[#ff4d2d]">
            Inspiration for your first order
          </h1>
          <p className="text-gray-700 text-base md:text-lg">Popular categories to get you started</p>
        </div>

        {/* Category Section */}
        <div className="relative mt-4">
          {categoryScroll.showLeftButton && (
            <button
              onClick={() => categoryScroll.scroll("left")}
              className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur w-11 h-11 rounded-full items-center justify-center border border-orange-200 shadow-md hover:shadow-lg hover:bg-white transition"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {categoryScroll.showRightButton && (
            <button
              onClick={() => categoryScroll.scroll("right")}
              className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-[#ff4d2d] text-white shadow-md w-11 h-11 rounded-full items-center justify-center border border-orange-300 hover:bg-orange-500 transition"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Scroll Container */}
          <div
            id="catScroll"
            ref={categoryScroll.scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide pr-4 py-2"
          >
            {categories.map((cat, index) => (
              <div key={index} className="shrink-0">
                <CategoryCard data={cat} index={index} />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute top-0 left-0 h-full w-10 bg-linear-to-r from-orange-50" />
          <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-linear-to-l from-orange-50" />
        </div>

            {/* resturant near you */}
        <div>
          <div className="w-full max-w-7xl p-6 mt-10">
            <div className="flex flex-col gap-2 mb-4">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-slate-900 to-gray-700">
                Restaurants near you {currentCity ? `in ${currentCity}` : ""}
              </h2>
              <p className="text-gray-700 text-base md:text-lg">Top-rated places around you</p>
            </div>

            <div className="relative mt-2">
              {restaurantScroll.showLeftButton && (
                <button
                  onClick={() => restaurantScroll.scroll("left")}
                  className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur w-11 h-11 rounded-full items-center justify-center border border-orange-200 shadow-md hover:shadow-lg hover:bg-white transition"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {restaurantScroll.showRightButton && (
                <button
                  onClick={() => restaurantScroll.scroll("right")}
                  className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-[#ff4d2d] text-white shadow-md w-11 h-11 rounded-full items-center justify-center border border-orange-300 hover:bg-orange-500 transition"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              <div
                id="restScroll"
                ref={restaurantScroll.scrollRef}
                className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pr-6 py-1"
              >
                {shopsInMyCity && shopsInMyCity.length > 0 ? (
                  shopsInMyCity.map((r, i) => (
                    <div 
                      key={r._id || i} 
                      className="shrink-0 w-[270px] cursor-pointer"
                      onClick={() => navigate(`/shop/${r._id}/menu`)}
                    >
                      <div className="group bg-white rounded-2xl overflow-hidden shadow-2xl border border-orange-200 hover:shadow-[0_24px_60px_rgba(255,77,45,0.28)] transition-all duration-300 hover:scale-105">
                        <div className="relative h-40 w-full overflow-hidden">
                          <img
                            src={r.image}
                            alt={r.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                          />
                          <span className="absolute top-2 left-2 bg-white/80 text-[#ff4d2d] text-xs font-semibold px-2 py-1 rounded-full">
                            {r.cuisine || "Restaurant"}
                          </span>
                          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            ★ {r.rating ? r.rating.toFixed(1) : "New"} {r.ratingCount ? `(${r.ratingCount})` : ""}
                          </span>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-900 truncate">{r.name}</h3>
                            <span className="text-xs font-semibold text-gray-600">{r.distance || "Nearby"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock size={14} />
                              <span>{r.deliveryTime || 30} min</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              r.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {r.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">No restaurants found in your city.</div>
                )}
              </div>

              <div className="pointer-events-none absolute top-0 left-0 h-full w-10 bg-linear-to-r from-orange-50" />
              <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-linear-to-l from-orange-50" />
            </div>
          </div>
        </div>

        <div>
          <div className="w-full max-w-7xl p-6 mt-10">
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-slate-900 to-gray-700">
              Suggested Food Items 
            </h2>
            <p className="text-gray-700 text-base md:text-lg">Popular items near you</p>
          </div>

          <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {itemsInMyCity && itemsInMyCity.length > 0 ? (
              itemsInMyCity.map((r, i) => (
                <FoodCard key={r?._id || i} data={r} />
              ))
            ) : (
              <div className="text-sm text-gray-600">No items found in your city.</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
