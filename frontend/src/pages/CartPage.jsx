import React, { useState } from "react";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import CartItemCard from "../components/CartItemCard";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

const CartPage = () => {
  const navigate = useNavigate();
  const cartItems = useSelector((state) => state.user.cartItems);

  const [isLoading, setIsLoading] = useState(false);

  const subtotal = cartItems.reduce(
    (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0),
    0
  );

  const handleBrowseProducts = () => {
    setIsLoading(true);
    navigate("/");
  };

  const handleCheckout = () => {
    setIsLoading(true);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#fff9f6] relative">
      {/* full-page loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-lg border border-orange-100">
            <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-gray-800">
              Preparing ...
            </span>
          </div>
        </div>
      )}

      <Navbar />

      <div className="relative overflow-hidden">
        {/* decorative background */}
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 top-24 w-72 h-72 rounded-full bg-[#ff4d2d]/5 blur-2xl" />

        {/* fixed back button */}
        <button
          onClick={() => {
            setIsLoading(true);
            navigate("/");
          }}
          className="fixed left-4 top-4 z-50 w-12 h-12 rounded-full bg-white/70 backdrop-blur-md border border-orange-200 shadow-lg hover:shadow-xl flex items-center justify-center text-[#ff4d2d] text-2xl font-bold transition-all duration-300 disabled:opacity-60"
          disabled={isLoading}
        >
          <FiChevronLeft size={28} />
        </button>

        <div className="pt-[80px] px-4 md:px-10 w-full max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center">Your Cart</h2>

          {/* empty state */}
          {cartItems.length === 0 ? (
            <div className="mt-6 bg-white border border-orange-200 rounded-2xl p-8 text-center flex flex-col items-center gap-4 shadow transition-shadow hover:shadow-[0_18px_45px_rgba(255,77,45,0.18)]">
              <h3 className="text-xl font-bold text-gray-900">
                Your cart is empty
              </h3>

              <p className="text-gray-700 text-sm md:text-base max-w-sm">
                Looks like you haven’t added anything yet. Explore delicious meals and start your order!
              </p>

              <button
                onClick={handleBrowseProducts}
                className="px-6 py-3 bg-[#ff4d2d] text-white rounded-xl font-semibold shadow-md transition-all hover:bg-[#e84224] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d2d] focus-visible:ring-offset-2 active:scale-[.98] disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Browse Products"
                )}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-1">
              {cartItems.map((item, idx) => (
                <CartItemCard key={(item.id ?? item._id) || idx} item={item} />
              ))}
            </div>
          )}

          {/* footer subtotal + checkout */}
          {cartItems.length > 0 && (
            <>
              <div className="mt-8 bg-white border border-orange-200 rounded-2xl p-6 flex items-center justify-between shadow">
                <div className="text-lg font-semibold text-gray-800">
                  Subtotal
                </div>
                <div className="text-xl font-bold text-orange-700">
                  ₹{subtotal}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCheckout}
                  className="px-6 py-3 rounded-xl bg-[#ff4d2d] text-white font-semibold shadow hover:bg-[#e84224] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d2d] focus-visible:ring-offset-2 active:scale-[.98] disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Checkout"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
