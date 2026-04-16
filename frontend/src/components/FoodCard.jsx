import React, { useMemo, useState } from "react";
import { Leaf, Drumstick, Plus, Minus, Bike, Ban, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Skeleton } from "./Skeleton";
import { addItemToCart, updateCartItemQty } from "../redux/cartSlice";
import {
  calculatePrice,
  formatINR,
  generateCartItemId,
  getCartItem,
  getShopId,
  getShopName,
  normalizeAddonList,
  normalizeVariantList,
} from "../utility/cartPricing";

const FoodCard = ({ data }) => {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart.cart);

  const [showModal, setShowModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [lastSelectedConfig, setLastSelectedConfig] = useState(null);

  const image =
    data?.image ||
    data?.imageUrl ||
    (Array.isArray(data?.images) ? data.images[0] : "");

  const itemId = String(data?.itemId || data?.id || data?._id || "");
  const shopId = getShopId(data);
  const shopName = getShopName(data) || "Shop";

  const name = data?.name || data?.title || "Food Item";
  const cuisine = data?.cuisine || data?.category || data?.foodType || "Food";
  const rating = Number(data?.rating || 0);
  const ratingCount = Number(data?.ratingCount || 0);

  const type = data?.foodType || data?.type || data?.category || "Item";
  const isVeg = String(type).toLowerCase() === "veg";

  const basePrice = Number(data?.price || 0);
  const discountPrice = Number(data?.discountPrice ?? basePrice);
  const hasDiscount = discountPrice < basePrice;

  const variants = useMemo(() => {
    let raw = data?.variants || [];
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    return normalizeVariantList(raw);
  }, [data?.variants]);

  const addons = useMemo(() => {
    let raw = data?.addons || [];
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    return normalizeAddonList(raw);
  }, [data?.addons]);

  const hasVariants = variants.length > 0;
  const hasAddons = addons.length > 0;
  const isCustomizable = hasVariants || hasAddons;

  const minVariantPrice = hasVariants
    ? Math.min(...variants.map((variant) => Number(variant.price || 0)))
    : 0;

  const priceToDisplay = hasVariants ? minVariantPrice : discountPrice;

  const isAvailable = data?.isActive !== false && data?.isAvailable !== false;
  const isDeliveryAvailable = data?.shop?.isDeliveryAvailable !== false;
  const canAddToCart = isAvailable && isDeliveryAvailable;

  const defaultCartItemId = generateCartItemId(itemId, null, []);
  const defaultCartItem = getCartItem(cart, shopId, defaultCartItemId);

  const allSameItemEntries = useMemo(() => {
    const targetShop = (cart?.shops || []).find((shop) => String(shop.shopId) === String(shopId));
    if (!targetShop) return [];
    return (targetShop.items || []).filter((item) => String(item.itemId) === String(itemId));
  }, [cart?.shops, itemId, shopId]);

  const trackedCustomItem = useMemo(() => {
    if (!isCustomizable) return null;

    if (lastSelectedConfig?.cartItemId) {
      const exact = getCartItem(cart, shopId, lastSelectedConfig.cartItemId);
      if (exact) return exact;
    }

    if (allSameItemEntries.length === 1) {
      return allSameItemEntries[0];
    }

    return null;
  }, [allSameItemEntries, cart, isCustomizable, lastSelectedConfig?.cartItemId, shopId]);

  const displayedCartItem = isCustomizable ? trackedCustomItem : defaultCartItem;
  const displayedQty = Number(displayedCartItem?.quantity || 0);
  const totalCustomQty = allSameItemEntries.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const openCustomizationModal = () => {
    if (!canAddToCart) {
      if (!isAvailable) toast.error("This item is currently out of stock");
      if (isAvailable && !isDeliveryAvailable) toast.error("Delivery is not available for this item");
      return;
    }

    setSelectedVariantId("");
    setSelectedAddonIds([]);
    setShowModal(true);
  };

  const addDirectItem = () => {
    if (!itemId) return;
    if (!canAddToCart) {
      if (!isAvailable) toast.error("This item is currently out of stock");
      if (isAvailable && !isDeliveryAvailable) toast.error("Delivery is not available for this item");
      return;
    }

    dispatch(
      addItemToCart({
        itemId,
        name,
        image,
        basePrice,
        discountPrice,
        selectedVariant: null,
        selectedAddons: [],
        variants: [],
        addons: [],
        quantity: 1,
        shopId,
        shopName,
        foodType: type,
      })
    );
  };

  const handleIncrease = () => {
    if (isCustomizable) {
      if (displayedCartItem?.cartItemId) {
        dispatch(
          updateCartItemQty({
            shopId,
            cartItemId: displayedCartItem.cartItemId,
            delta: 1,
          })
        );
        return;
      }

      openCustomizationModal();
      return;
    }

    if (displayedCartItem?.cartItemId) {
      dispatch(
        updateCartItemQty({
          shopId,
          cartItemId: displayedCartItem.cartItemId,
          delta: 1,
        })
      );
    } else {
      addDirectItem();
    }
  };

  const handleDecrease = () => {
    if (!displayedCartItem?.cartItemId) return;

    dispatch(
      updateCartItemQty({
        shopId,
        cartItemId: displayedCartItem.cartItemId,
        delta: -1,
      })
    );
  };

  const selectedVariant = variants.find((variant) => String(variant.id) === String(selectedVariantId)) || null;
  const selectedAddons = addons.filter((addon) => selectedAddonIds.includes(String(addon.id)));

  const modalPricing = calculatePrice({
    basePrice,
    discountPrice,
    variants,
    addons,
    selectedVariant,
    selectedAddons,
    quantity: 1,
  });

  const handleConfirmCustomAdd = () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Please select one variant first");
      return;
    }

    const cartItemId = generateCartItemId(itemId, selectedVariant, selectedAddons);

    dispatch(
      addItemToCart({
        itemId,
        name,
        image,
        basePrice,
        discountPrice,
        variants,
        addons,
        selectedVariant,
        selectedAddons,
        quantity: 1,
        shopId,
        shopName,
        foodType: type,
        cartItemId,
      })
    );

    setLastSelectedConfig({ cartItemId });
    setShowModal(false);
  };

  const toggleAddon = (addonId) => {
    const safeId = String(addonId);
    setSelectedAddonIds((prev) =>
      prev.includes(safeId) ? prev.filter((id) => id !== safeId) : [...prev, safeId]
    );
  };

  return (
    <>
      <div
        className={`group bg-white rounded-2xl overflow-hidden shadow-xl border transition-all duration-300 w-full scale-[0.99] hover:scale-[1] relative ${
          !isAvailable
            ? "border-red-300 opacity-70 grayscale"
            : !isDeliveryAvailable
            ? "border-orange-300"
            : "border-orange-200 hover:shadow-[0_20px_50px_rgba(255,77,45,0.25)]"
        }`}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        {showOverlay && !canAddToCart && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-not-allowed">
            <div className="bg-white rounded-lg p-6 text-center shadow-2xl transform transition-all duration-300 scale-100">
              {!isAvailable ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                    <Ban className="text-red-600 text-3xl" />
                  </div>
                  <p className="text-red-600 font-bold text-lg">Out of Stock</p>
                  <p className="text-gray-600 text-sm mt-1">This item is currently unavailable</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bike className="text-orange-600 text-3xl" />
                    <Ban className="text-red-600 text-2xl absolute -top-1 -right-1" />
                  </div>
                  <p className="text-orange-600 font-bold text-lg">Not for Delivery</p>
                  <p className="text-gray-600 text-sm mt-1">Pickup only - delivery not available</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="relative h-56 md:h-64 w-full overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className={`w-full h-full object-cover transition-transform duration-500 ${
                !isAvailable ? "grayscale" : "group-hover:scale-[1.08]"
              }`}
            />
          ) : (
            <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-600 text-sm">No Image</div>
          )}

          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            <span className="bg-white/80 text-[#ff4d2d] text-xs font-semibold px-2 py-1 rounded-full backdrop-blur">
              {cuisine}
            </span>
            {isCustomizable && (
              <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                Customizable
              </span>
            )}
          </div>

          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            * {rating > 0 ? rating.toFixed(1) : "New"} {ratingCount > 0 ? `(${ratingCount})` : ""}
          </span>

          <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            {isVeg ? <Leaf className="text-green-600" /> : <Drumstick className="text-red-600" />}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between h-40">
          <div>
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{name}</h3>
            <p className="text-gray-500 text-sm line-clamp-1">{cuisine}</p>
          </div>

          <div className="flex justify-between items-end mt-2 gap-2">
            <div className="flex flex-col leading-tight min-w-0">
              {hasVariants ? (
                <>
                  <span className="text-sm text-gray-500 font-semibold">Starting from</span>
                  <span className="text-xl font-extrabold text-[#ff4d2d]">{formatINR(priceToDisplay)}</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-extrabold text-[#ff4d2d]">{formatINR(priceToDisplay)}</span>
                  {hasDiscount && <span className="text-xs text-gray-400 line-through">{formatINR(basePrice)}</span>}
                </>
              )}
            </div>

            {displayedQty > 0 ? (
              <div className="flex items-center gap-2 bg-orange-50 rounded-lg p-1 border border-orange-200">
                <button
                  onClick={handleDecrease}
                  className="p-1 hover:bg-white rounded transition-colors text-orange-600"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-gray-800 min-w-[20px] text-center">{displayedQty}</span>
                <button
                  onClick={handleIncrease}
                  className="p-1 hover:bg-white rounded transition-colors text-orange-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={isCustomizable ? openCustomizationModal : addDirectItem}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg font-bold transition-all shadow-md ${
                  !canAddToCart
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-[#ff4d2d] text-white hover:bg-[#e63e1c] hover:shadow-lg"
                }`}
              >
                <Plus size={16} /> ADD
              </button>
            )}
          </div>

          {isCustomizable && totalCustomQty > 0 && !displayedQty && (
            <p className="text-xs text-indigo-600 font-semibold mt-1">{totalCustomQty} customized item(s) in cart</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />

          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="relative h-48">
              {image ? (
                <img src={image} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-600">No Image</div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {hasVariants && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-700 mb-3">Select Variant (Required)</h4>
                  <div className="space-y-2">
                    {variants.map((variant) => {
                      const checked = String(selectedVariantId) === String(variant.id);
                      return (
                        <label
                          key={variant.id || variant.name}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                            checked ? "bg-orange-50 border-orange-500" : "bg-gray-50 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`variant-${itemId}`}
                              checked={checked}
                              onChange={() => setSelectedVariantId(String(variant.id))}
                              className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-700">{variant.name}</span>
                          </div>
                          <span className="text-gray-900 font-bold">{formatINR(variant.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasAddons && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-3">Add-ons (Optional)</h4>
                  <div className="space-y-2">
                    {addons.map((addon) => {
                      const checked = selectedAddonIds.includes(String(addon.id));
                      return (
                        <label
                          key={addon.id || addon.name}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                            checked ? "bg-orange-50 border-orange-500" : "bg-gray-50 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAddon(addon.id)}
                              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-700">{addon.name}</span>
                          </div>
                          <span className="text-gray-900 font-bold">+{formatINR(addon.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-semibold">Total Price</span>
                <span className="text-xl font-bold text-gray-900">
                  {hasVariants && !selectedVariant ? "Select variant" : formatINR(modalPricing.finalSinglePrice)}
                </span>
              </div>

              <button
                onClick={handleConfirmCustomAdd}
                disabled={hasVariants && !selectedVariant}
                className="px-8 py-3 bg-[#ff4d2d] text-white font-bold rounded-xl shadow hover:bg-[#e84224] transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

export const FoodCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 w-full animate-pulse">
    <Skeleton className="h-56 md:h-64 w-full" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-1/3 rounded-lg" />
      </div>
    </div>
  </div>
);

export default FoodCard;
