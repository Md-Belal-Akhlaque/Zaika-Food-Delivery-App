import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import CartItemCard from "../components/CartItemCard";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { addItemToCart } from "../redux/cartSlice";
import { formatINR, getShopId, getShopName } from "../utility/cartPricing";

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart.cart);
  const summary = useSelector((state) => state.cart.summary);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const reorderItems = location.state?.reorderItems;
    if (!Array.isArray(reorderItems) || reorderItems.length === 0) return;
    if ((summary?.itemCount || 0) > 0) return;

    for (const item of reorderItems) {
      const itemId = item?.itemId || item?.id || item?._id || item?.item?._id || item?.item?.id;
      if (!itemId) continue;

      const quantity = Math.max(1, Number(item?.quantity || 1));
      const variants = Array.isArray(item?.variants) ? item.variants : [];
      const addons = Array.isArray(item?.addons) ? item.addons : [];

      dispatch(
        addItemToCart({
          itemId,
          name: item?.name || item?.item?.name || "Item",
          image: item?.image || item?.item?.image || "",
          basePrice: Number(item?.basePrice ?? item?.price ?? item?.item?.price ?? 0),
          discountPrice: Number(item?.discountPrice ?? item?.price ?? item?.item?.price ?? 0),
          variants,
          addons,
          selectedVariant: variants.length > 0 ? variants[0] : null,
          selectedAddons: addons,
          quantity,
          shopId: getShopId(item),
          shopName: getShopName(item) || item?.shopName || "Shop",
          foodType: item?.foodType || item?.type || item?.category || "",
        })
      );
    }
  }, [dispatch, location.state, summary?.itemCount]);

  const shops = Array.isArray(cart?.shops) ? cart.shops : [];
  const grandTotal = Number(cart?.grandTotal || 0);

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
      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-300">
            <Loader2 className="w-10 h-10 text-[#ff4d2d] animate-spin" />
            <span className="text-lg font-bold text-gray-800">Processing...</span>
          </div>
        </div>
      )}

      <Navbar />

      <div className="relative overflow-hidden min-h-screen">
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 top-24 w-72 h-72 rounded-full bg-[#ff4d2d]/5 blur-2xl" />

        <button
          onClick={() => navigate("/")}
          className="fixed left-6 top-24 z-50 w-12 h-12 rounded-2xl bg-white border border-orange-100 shadow-lg hover:shadow-xl flex items-center justify-center text-[#ff4d2d] transition-all duration-300 hover:scale-110 active:scale-95 group"
          disabled={isLoading}
        >
          <ChevronLeft size={28} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="pt-[100px] pb-24 px-4 md:px-10 w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-orange-100 rounded-2xl">
              <ShoppingBag className="text-[#ff4d2d] w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Your Cart</h2>
          </div>

          {shops.length === 0 ? (
            <div className="mt-10 bg-white border border-orange-100 rounded-3xl p-12 text-center flex flex-col items-center gap-6 shadow-xl transition-all hover:shadow-2xl">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={48} className="text-orange-200" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Your cart is empty</h3>
                <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
                  Looks like you have not added anything yet. Explore delicious meals and start your order.
                </p>
              </div>

              <button
                onClick={handleBrowseProducts}
                className="px-8 py-4 bg-[#ff4d2d] text-white rounded-2xl font-bold shadow-lg transition-all hover:bg-[#e84224] hover:scale-105 active:scale-95 flex items-center gap-2"
                disabled={isLoading}
              >
                Browse Delicious Food
                <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {shops.map((shop) => (
                <section key={shop.shopId} className="bg-white border border-orange-100 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4 border-b border-orange-50 pb-3">
                    <h3 className="text-lg font-black text-gray-900">{shop.shopName}</h3>
                    <span className="text-sm font-bold text-gray-700">Subtotal: {formatINR(shop.shopSubtotal)}</span>
                  </div>

                  <div className="space-y-4">
                    {(shop.items || []).map((item) => (
                      <CartItemCard key={item.cartItemId} item={item} shopId={shop.shopId} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {shops.length > 0 && (
            <div className="mt-10 space-y-6">
              <div className="bg-white border border-orange-100 rounded-3xl p-8 flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Grand Total</p>
                  <p className="text-lg font-medium text-gray-600">
                    {summary.quantityTotal} quantity across {summary.itemCount} cart line(s)
                  </p>
                </div>
                <div className="text-4xl font-black text-[#ff4d2d]">{formatINR(grandTotal)}</div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-5 rounded-2xl bg-[#ff4d2d] text-white text-xl font-black shadow-xl hover:bg-[#e84224] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight size={24} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
