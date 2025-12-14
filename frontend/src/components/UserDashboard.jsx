import React, { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import CategoryCard from "./CategoryCard";
import FoodCard from "./FoodCard";
import { categories } from "../category";
import { useSelector } from "react-redux";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { serverURL } from "../App";
import useGetItemsByCity from "../hooks/useGetItemsByCity";

const UserDashboard = () => {
  const { currentCity, itemsInMyCity } = useSelector((state) => state.user);
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState("");
  const cateScrollRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  // Ensure fresh items are fetched when visiting dashboard
  useGetItemsByCity();

  // Function to update visibility of scroll buttons
  const updateButton = () => {
    const element = cateScrollRef.current;
    if (element) {
      setShowLeftButton(element.scrollLeft > 0);
      setShowRightButton(element.scrollLeft + element.clientWidth < element.scrollWidth);
    }
  };

  useEffect(() => {
    // Initial check
    updateButton();

    const element = cateScrollRef.current;

    if (!element) return;

    // Add scroll listener
    element.addEventListener("scroll", updateButton);

    // Add resize listener in case container resizes
    window.addEventListener("resize", updateButton);

    // Cleanup listeners on unmount
    return () => {
      element.removeEventListener("scroll", updateButton);
      window.removeEventListener("resize", updateButton);
    };
  }, []);

  const scrollHandler = (direction) => {
    const element = cateScrollRef.current;
    if (element) {
      element.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const restScrollLeft = () => {
    document.getElementById("restScroll")?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const restScrollRight = () => {
    document.getElementById("restScroll")?.scrollBy({ left: 300, behavior: "smooth" });
  };

  // const itemsScrollLeft = () => {
  //   document.getElementById("itemsScroll")?.scrollBy({ left: -300, behavior: "smooth" });
  // };

  // const itemsScrollRight = () => {
  //   document.getElementById("itemsScroll")?.scrollBy({ left: 300, behavior: "smooth" });
  // };

  const nearbyRestaurants = [
    { name: "Spice Villa", cuisine: "North Indian", image: image8, rating: 4.4, distance: "0.8 km" },
    { name: "Dragon Wok", cuisine: "Chinese", image: image9, rating: 4.2, distance: "1.1 km" },
    { name: "Pizza Hub", cuisine: "Pizza", image: image4, rating: 4.5, distance: "0.6 km" },
    { name: "Burger Shack", cuisine: "Fast Food", image: image10, rating: 4.1, distance: "1.5 km" },
    { name: "Sweet Tooth", cuisine: "Desserts", image: image3, rating: 4.7, distance: "1.0 km" },
    { name: "Dosa Corner", cuisine: "South Indian", image: image7, rating: 4.3, distance: "0.9 km" },
    { name: "Sandwich Stop", cuisine: "Snacks", image: image6, rating: 4.0, distance: "1.8 km" },
    { name: "Royal Thali", cuisine: "Main Course", image: image2, rating: 4.6, distance: "1.3 km" },
    { name: "Zaika House", cuisine: "North Indian", image: image5, rating: 4.5, distance: "0.7 km" },
    { name: "Café Aroma", cuisine: "Other", image: image1, rating: 4.1, distance: "1.9 km" },
  ];

  useEffect(() => {
    const fetchShops = async () => {
      if (!currentCity) return;
      try {
        setLoadingShops(true);
        setShopsError("");
        const res = await axios.get(`${serverURL}/api/shop/city/${encodeURIComponent(currentCity)}`);
        setShops(res.data?.shops || []);
      } catch (err) {
        setShopsError("Unable to load restaurants");
        console.log(err, err.message);
      } finally {
        setLoadingShops(false);
      }
    };
    fetchShops();
  }, [currentCity]);

  return (
    <div
      className="pt-[60px] w-full min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white flex flex-col items-center bg-[#fff3e9]"
      style={{
        background: "linear-gradient(135deg, rgb(255,243,233), rgb(255,224,199))",
      }}
    >
      <Navbar />

      <div className="w-full max-w-7xl p-6 mt-4">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-[#ff4d2d]">
            Inspiration for your first order
          </h1>
          <p className="text-gray-700 text-base md:text-lg">Popular categories to get you started</p>
        </div>

        {/* Category Section */}
        <div className="relative mt-4">
          {showLeftButton && (
            <button
              onClick={() => scrollHandler("left")}
              className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur w-11 h-11 rounded-full items-center justify-center border border-orange-200 shadow-md hover:shadow-lg hover:bg-white transition"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {showRightButton && (
            <button
              onClick={() => scrollHandler("right")}
              className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-[#ff4d2d] text-white shadow-md w-11 h-11 rounded-full items-center justify-center border border-orange-300 hover:bg-orange-500 transition"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Scroll Container */}
          <div
            id="catScroll"
            ref={cateScrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide pr-4 py-2"
          >
            {categories.map((cat, index) => (
              <div key={index} className="flex-shrink-0">
                <CategoryCard data={cat} index={index} />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-orange-50" />
          <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-orange-50" />
        </div>

            {/* resturant near you */}
        <div>
          <div className="w-full max-w-7xl p-6 mt-10">
            <div className="flex flex-col gap-2 mb-4">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-gray-700">
                Restaurants near you {currentCity ? `in ${currentCity}` : ""}
              </h2>
              <p className="text-gray-700 text-base md:text-lg">Top-rated places around you</p>
            </div>

            <div className="relative mt-2">
              <button
                onClick={restScrollLeft}
                className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur w-11 h-11 rounded-full items-center justify-center border border-orange-200 shadow-md hover:shadow-lg hover:bg-white transition"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                onClick={restScrollRight}
                className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-[#ff4d2d] text-white shadow-md w-11 h-11 rounded-full items-center justify-center border border-orange-300 hover:bg-orange-500 transition"
              >
                <ChevronRight size={22} />
              </button>

              <div
                id="restScroll"
                className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pr-6 py-1"
              >
                {(shops && shops.length > 0 ? shops : nearbyRestaurants).map((r, i) => (
                  <div key={i} className="flex-shrink-0 w-[270px]">
                    <div className="group bg-white rounded-2xl overflow-hidden shadow-2xl border border-orange-200 hover:shadow-[0_24px_60px_rgba(255,77,45,0.28)] transition-all duration-300">
                      <div className="relative h-40 w-full overflow-hidden">
                        <img
                          src={r.image}
                          alt={r.name || r?.name}
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
                          <h3 className="text-lg font-bold text-gray-900 truncate">{r.name || r?.name}</h3>
                          <span className="text-xs font-semibold text-gray-600">{r.distance || "Nearby"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Delivery • 25-35 min</span>
                          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                            Open
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {shopsError && (
                  <div className="text-sm text-red-600">{shopsError}</div>
                )}
                {loadingShops && (
                  <div className="text-sm text-gray-600">Loading restaurants…</div>
                )}
              </div>

              <div className="pointer-events-none absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-orange-50" />
              <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-orange-50" />
            </div>
          </div>
        </div>

        <div>
          <div className="w-full max-w-7xl p-6 mt-10">
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-gray-700">
              Suggested Food Items 
            </h2>
            <p className="text-gray-700 text-base md:text-lg">Top-rated places around you</p>
          </div>

          <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {(itemsInMyCity && itemsInMyCity.length > 0 ? itemsInMyCity : nearbyRestaurants).map((r, i) => (
              <FoodCard key={r?._id || i} data={r} />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
