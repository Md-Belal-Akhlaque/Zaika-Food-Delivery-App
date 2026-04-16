import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydrateCart } from "../redux/cartSlice";

const parseJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * useCartSync hook
 * - Hydrates cart from localStorage on auth/user changes
 * - Migrates legacy cart arrays to multi-shop cart structure
 * - Persists canonical cart structure
 */
const useCartSync = () => {
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const cart = useSelector((state) => state.cart.cart);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const userId = userData?._id || userData?.id;
    const cartV2UserKey = userId ? `cart_v2_${userId}` : null;
    const cartV2GuestKey = "cart_v2_guest";

    const legacyUserKey = userId ? `cartItems_${userId}` : null;
    const legacyGuestKey = "cartItems_guest";
    const veryLegacyKey = "cartItems";

    let hydratedPayload = { shops: [], grandTotal: 0 };

    if (cartV2UserKey) {
      const userV2 = parseJSON(localStorage.getItem(cartV2UserKey));
      if (userV2) {
        hydratedPayload = userV2;
      } else {
        const guestV2 = parseJSON(localStorage.getItem(cartV2GuestKey));
        if (guestV2) {
          hydratedPayload = guestV2;
          localStorage.setItem(cartV2UserKey, JSON.stringify(guestV2));
          localStorage.removeItem(cartV2GuestKey);
        } else {
          const legacyUser = parseJSON(localStorage.getItem(legacyUserKey));
          const legacyGuest = parseJSON(localStorage.getItem(legacyGuestKey));
          const veryLegacy = parseJSON(localStorage.getItem(veryLegacyKey));
          hydratedPayload = legacyUser || legacyGuest || veryLegacy || hydratedPayload;
        }
      }
    } else {
      const guestV2 = parseJSON(localStorage.getItem(cartV2GuestKey));
      if (guestV2) {
        hydratedPayload = guestV2;
      } else {
        const legacyGuest = parseJSON(localStorage.getItem(legacyGuestKey));
        const veryLegacy = parseJSON(localStorage.getItem(veryLegacyKey));
        hydratedPayload = legacyGuest || veryLegacy || hydratedPayload;
      }
    }

    dispatch(hydrateCart(hydratedPayload));
    setIsHydrated(true);

    if (localStorage.getItem(veryLegacyKey)) {
      localStorage.removeItem(veryLegacyKey);
    }
  }, [dispatch, userData]);

  useEffect(() => {
    if (!isHydrated) return;

    const userId = userData?._id || userData?.id;
    const key = userId ? `cart_v2_${userId}` : "cart_v2_guest";

    const hasItems = Array.isArray(cart?.shops) && cart.shops.some((shop) => (shop.items || []).length > 0);

    if (hasItems) {
      localStorage.setItem(key, JSON.stringify(cart));
      return;
    }

    if (userId) {
      localStorage.setItem(key, JSON.stringify({ shops: [], grandTotal: 0 }));
    } else {
      localStorage.removeItem(key);
    }
  }, [cart, isHydrated, userData]);
};

export default useCartSync;
