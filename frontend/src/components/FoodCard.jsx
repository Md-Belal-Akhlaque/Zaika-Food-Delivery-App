import React from "react";
import { FaLeaf, FaDrumstickBite, FaPlus, FaMinus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { addToCartItem, decreaseCartItem } from "../redux/userSlice";

const FoodCard = ({ data, onQuantityChange }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.user.cartItems);

  const image = data?.image || data?.imageUrl || (Array.isArray(data?.images) ? data.images[0] : undefined);
  const name = data?.name || data?.title;
  const cuisine = data?.cuisine || data?.category || data?.foodType || "Food";
  const rating = typeof data?.rating === "object" ? data?.rating?.average ?? 0 : data?.rating ?? 4.3;
  const type = data?.foodType || data?.type || data?.category || "Item";
  const price = data?.price;
  const isVeg = String(type).toLowerCase() === "veg";
  
  const id = data?.id ?? data?._id;
  const cartItem = cartItems.find((item) => (item.id === id || item._id === id));
  const quantity = cartItem ? (cartItem.quantity || 0) : 0;

  const decrease = () => {
    if (quantity === 0 || !id) return;
    if (onQuantityChange) onQuantityChange(quantity - 1, data);
    dispatch(decreaseCartItem({ id, quantity: 1 }));
  };

  const increase = () => {
    if (!id) return;
    if (onQuantityChange) onQuantityChange(quantity + 1, data);
    dispatch(
      addToCartItem({
        id,
        name: name,
        price: data?.price,
        image: image,
        foodType: type,
        shop: data?.shop,
        category: data?.category,
        quantity: 1,
      })
    );
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-xl border border-orange-200 hover:shadow-[0_20px_50px_rgba(255,77,45,0.25)] transition-all duration-300 w-full scale-[0.99] hover:scale-[1]">
      
      {/* IMAGE */}
      <div className="relative h-56 md:h-64 w-full overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
          />
        ) : (
          <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-600 text-sm">
            No Image
          </div>
        )}

        <span className="absolute top-2 left-2 bg-white/80 text-[#ff4d2d] text-xs font-semibold px-2 py-1 rounded-full">
          {cuisine}
        </span>

        <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
          ★ {rating}
        </span>

        <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
          {isVeg ? <FaLeaf className="text-green-600" /> : <FaDrumstickBite className="text-red-600" />}
        </span>
      </div>

      {/* TEXT SECTION */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 truncate px-2">{name}</h3>
          <span className="text-sm font-bold text-gray-900">₹ {price}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
            25-35 min
          </span>

          {/* QUANTITY BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={decrease}
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                quantity === 0
                  ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "border-orange-300 text-orange-600 bg-white hover:bg-orange-50 hover:shadow"
              }`}
            >
              <FaMinus />
            </button>

            <span className="min-w-[32px] text-center font-semibold">{quantity}</span>

            <button
              onClick={increase}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-orange-300 text-white bg-[#ff4d2d] hover:bg-orange-500 hover:shadow transition-all duration-200"
            >
              <FaPlus />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
