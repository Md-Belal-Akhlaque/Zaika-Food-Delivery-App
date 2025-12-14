import React, { useState } from "react";
import { FaLeaf, FaDrumstickBite, FaPlus, FaMinus } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { addToCartItem, decreaseCartItem } from "../redux/userSlice";

const FoodCard = ({ data, onQuantityChange }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.user.cartItems);
  const [showModal, setShowModal] = useState(false);
  
  // Selection states
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const image = data?.image || data?.imageUrl || (Array.isArray(data?.images) ? data.images[0] : undefined);
  const name = data?.name || data?.title;
  const cuisine = data?.cuisine || data?.category || data?.foodType || "Food";
  const rating = data?.rating || 0;
  const ratingCount = data?.ratingCount || 0;
  const type = data?.foodType || data?.type || data?.category || "Item";
  const price = Number(data?.price || 0);
  const isVeg = String(type).toLowerCase() === "veg";
  
  const id = data?.id ?? data?._id;
  
  // Parse variants/addons if they are strings
  let variants = data?.variants || [];
  let addons = data?.addons || [];
  try { if (typeof variants === 'string') variants = JSON.parse(variants); } catch {}
  try { if (typeof addons === 'string') addons = JSON.parse(addons); } catch {}

  // Ensure they are arrays
  if (!Array.isArray(variants)) variants = [];
  if (!Array.isArray(addons)) addons = [];

  const hasOptions = variants.length > 0 || addons.length > 0;

  // Calculate quantity in cart
  // If hasOptions, we don't show quantity control on card (because multiple variants could be in cart)
  // Instead we show "Add" button which opens modal
  const cartItem = cartItems.find((item) => (item.id === id || item._id === id));
  const quantity = hasOptions ? 0 : (cartItem ? (cartItem.quantity || 0) : 0);

  const decrease = () => {
    if (quantity === 0 || !id) return;
    if (hasOptions) return; 
    
    if (onQuantityChange) onQuantityChange(quantity - 1, data);
    dispatch(decreaseCartItem({ id, quantity: 1 }));
  };

  const increase = () => {
    if (!id) return;
    
    if (hasOptions) {
        // Open modal instead of direct add
        setSelectedVariant(variants.length > 0 ? variants[0] : null);
        setSelectedAddons([]);
        setShowModal(true);
        return;
    }

    if (onQuantityChange) onQuantityChange(quantity + 1, data);
    dispatch(
      addToCartItem({
        id,
        name: name,
        price: price,
        image: image,
        foodType: type,
        shop: data?.shop,
        category: data?.category,
        quantity: 1,
      })
    );
  };

  const handleModalAdd = () => {
      let finalPrice = price;
      if (selectedVariant) {
          finalPrice = Number(selectedVariant.price);
      }
      
      const addonsPrice = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
      finalPrice += addonsPrice;

      dispatch(addToCartItem({
        id,
        name: name,
        price: finalPrice,
        image: image,
        foodType: type,
        shop: data?.shop,
        category: data?.category,
        quantity: 1,
        variants: selectedVariant ? [selectedVariant] : [],
        addons: selectedAddons
      }));
      setShowModal(false);
      // alert("Item added to cart");
  };

  const toggleAddon = (addon) => {
      const exists = selectedAddons.find(a => a.name === addon.name);
      if (exists) {
          setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
      } else {
          setSelectedAddons([...selectedAddons, addon]);
      }
  };

  return (
    <>
    <div className="group bg-white rounded-2xl overflow-hidden shadow-xl border border-orange-200 hover:shadow-[0_20px_50px_rgba(255,77,45,0.25)] transition-all duration-300 w-full scale-[0.99] hover:scale-[1]">
      {/* IMAGE */}
      <div className="relative h-56 md:h-64 w-full overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]" />
        ) : (
          <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-600 text-sm">No Image</div>
        )}
        <span className="absolute top-2 left-2 bg-white/80 text-[#ff4d2d] text-xs font-semibold px-2 py-1 rounded-full">{cuisine}</span>
        <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">★ {rating > 0 ? rating.toFixed(1) : "New"} {ratingCount > 0 ? `(${ratingCount})` : ""}</span>
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
          <span className="text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">25-35 min</span>

          {/* QUANTITY BUTTONS */}
          <div className="flex items-center gap-3">
             {!hasOptions && (
                <button onClick={decrease} className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${quantity === 0 ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed" : "border-orange-300 text-orange-600 bg-white hover:bg-orange-50 hover:shadow"}`}>
                  <FaMinus />
                </button>
             )}
            
            {hasOptions ? (
                <button onClick={increase} className="px-4 py-1.5 bg-[#ff4d2d] text-white font-bold rounded-full shadow hover:bg-[#e84224] transition text-sm">
                    ADD +
                </button>
            ) : (
                <>
                    <span className="text-lg font-bold text-gray-800 w-6 text-center">{quantity}</span>
                    <button onClick={increase} className="flex items-center justify-center w-9 h-9 rounded-full bg-[#ff4d2d] text-white shadow-lg hover:bg-[#e84224] hover:scale-110 transition-all duration-200">
                      <FaPlus />
                    </button>
                </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* MODAL */}
    {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-orange-50">
                    <h3 className="font-bold text-lg text-gray-800">Customize {name}</h3>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-orange-200 rounded-full transition">
                        <IoClose size={24} className="text-gray-600"/>
                    </button>
                </div>
                
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {variants.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-gray-700 mb-3">Select Variation</h4>
                            <div className="space-y-2">
                                {variants.map((v, i) => (
                                    <label key={i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-orange-500 transition ${selectedVariant?.name === v.name ? 'bg-orange-50 border-orange-500' : 'bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="variant" 
                                                checked={selectedVariant?.name === v.name}
                                                onChange={() => setSelectedVariant(v)}
                                                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="font-medium text-gray-700">{v.name}</span>
                                        </div>
                                        <span className="text-gray-900 font-bold">₹{v.price}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {addons.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-700 mb-3">Add-ons</h4>
                            <div className="space-y-2">
                                {addons.map((addon, i) => (
                                    <label key={i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-orange-500 transition ${selectedAddons.find(a => a.name === addon.name) ? 'bg-orange-50 border-orange-500' : 'bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={!!selectedAddons.find(a => a.name === addon.name)}
                                                onChange={() => toggleAddon(addon)}
                                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                            />
                                            <span className="font-medium text-gray-700">{addon.name}</span>
                                        </div>
                                        <span className="text-gray-900 font-bold">+₹{addon.price}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Total Price</span>
                        <span className="text-xl font-bold text-gray-900">
                        ₹{(() => {
                            let total = price;
                            // If variant selected, it overrides base price (usually)
                            // or adds to it? 
                            // Let's assume override if variants exist.
                            if (variants.length > 0 && selectedVariant) {
                                total = Number(selectedVariant.price);
                            } else {
                                total = price;
                            }
                            total += selectedAddons.reduce((s, a) => s + Number(a.price), 0);
                            return total;
                        })()}
                        </span>
                    </div>
                    <button 
                        onClick={handleModalAdd}
                        className="px-8 py-3 bg-[#ff4d2d] text-white font-bold rounded-xl shadow hover:bg-[#e84224] transition transform active:scale-95"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default FoodCard;
