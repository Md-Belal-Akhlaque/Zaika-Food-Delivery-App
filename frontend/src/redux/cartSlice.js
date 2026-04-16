import { createSlice } from "@reduxjs/toolkit";
import {
  buildCartFromLegacyItems,
  buildCartItemSnapshot,
  calculateCartTotals,
  flattenCartShops,
  generateCartItemId,
} from "../utility/cartPricing";

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const getInitialState = () => {
  const cart = calculateCartTotals([]);
  return {
    cart: {
      shops: cart.shops,
      grandTotal: cart.grandTotal,
    },
    flatItems: [],
    summary: {
      itemCount: 0,
      quantityTotal: 0,
      itemsTotal: 0,
    },
    hydrated: false,
  };
};

const assignDerivedState = (state, nextCart) => {
  const normalized = calculateCartTotals(nextCart?.shops || []);

  state.cart = {
    shops: normalized.shops,
    grandTotal: normalized.grandTotal,
  };

  state.flatItems = flattenCartShops(state.cart);
  state.summary = {
    itemCount: normalized.itemCount,
    quantityTotal: normalized.quantityTotal,
    itemsTotal: normalized.grandTotal,
  };
};

const buildNormalizedCart = (payload) => {
  if (Array.isArray(payload?.shops)) {
    const normalized = calculateCartTotals(payload.shops);
    return { shops: normalized.shops, grandTotal: normalized.grandTotal };
  }

  if (Array.isArray(payload)) {
    const migrated = buildCartFromLegacyItems(payload);
    return { shops: migrated.shops, grandTotal: migrated.grandTotal };
  }

  return { shops: [], grandTotal: 0 };
};

const cartSlice = createSlice({
  name: "cart",
  initialState: getInitialState(),
  reducers: {
    hydrateCart: (state, action) => {
      const nextCart = buildNormalizedCart(action.payload);
      assignDerivedState(state, nextCart);
      state.hydrated = true;
    },

    replaceCart: (state, action) => {
      const nextCart = buildNormalizedCart(action.payload);
      assignDerivedState(state, nextCart);
    },

    setCartFromLegacy: (state, action) => {
      const migrated = buildCartFromLegacyItems(action.payload || []);
      assignDerivedState(state, migrated);
    },

    addItemToCart: (state, action) => {
      const payload = action.payload || {};
      const itemId = payload.itemId || payload.id || payload._id;
      if (!itemId) return;

      const shopId = String(payload.shopId || payload.shop?._id || payload.shop?.id || "unknown-shop");
      const shopName = payload.shopName || payload.shop?.name || payload.shop?.title || "Shop";
      const selectedVariant = payload.selectedVariant || null;
      const selectedAddons = payload.selectedAddons || [];
      const cartItemId =
        payload.cartItemId ||
        generateCartItemId(itemId, selectedVariant, selectedAddons);
      const qtyDelta = Math.max(1, Number(payload.quantity || 1));

      const shops = [...(state.cart?.shops || [])];
      let shopIndex = shops.findIndex((shop) => String(shop.shopId) === shopId);

      if (shopIndex === -1) {
        shops.push({ shopId, shopName, items: [], shopSubtotal: 0 });
        shopIndex = shops.length - 1;
      }

      const targetShop = { ...shops[shopIndex], items: [...(shops[shopIndex].items || [])] };
      const existingIndex = targetShop.items.findIndex((item) => String(item.cartItemId) === String(cartItemId));

      if (existingIndex >= 0) {
        const existing = targetShop.items[existingIndex];
        const nextQuantity = Math.max(1, Number(existing.quantity || 1) + qtyDelta);
        const finalSinglePrice = Number(existing?.priceBreakdown?.finalSinglePrice || 0);
        targetShop.items[existingIndex] = {
          ...existing,
          quantity: nextQuantity,
          totalPrice: round2(finalSinglePrice * nextQuantity),
        };
      } else {
        targetShop.items.push(
          buildCartItemSnapshot(
            {
              ...payload,
              itemId,
              shopId,
              shopName,
            },
            {
              selectedVariant,
              selectedAddons,
              quantity: qtyDelta,
              cartItemId,
            }
          )
        );
      }

      shops[shopIndex] = targetShop;
      assignDerivedState(state, { shops });
    },

    updateCartItemQty: (state, action) => {
      const { shopId, cartItemId, quantity, delta } = action.payload || {};
      if (!shopId || !cartItemId) return;

      const shops = [...(state.cart?.shops || [])];
      const shopIndex = shops.findIndex((shop) => String(shop.shopId) === String(shopId));
      if (shopIndex === -1) return;

      const targetShop = { ...shops[shopIndex], items: [...(shops[shopIndex].items || [])] };
      const itemIndex = targetShop.items.findIndex((item) => String(item.cartItemId) === String(cartItemId));
      if (itemIndex === -1) return;

      const currentItem = targetShop.items[itemIndex];
      const currentQty = Number(currentItem.quantity || 1);
      const nextQty = quantity != null ? Number(quantity) : currentQty + Number(delta || 0);

      if (!Number.isFinite(nextQty) || nextQty <= 0) {
        targetShop.items.splice(itemIndex, 1);
      } else {
        const safeQty = Math.floor(nextQty);
        const finalSinglePrice = Number(currentItem?.priceBreakdown?.finalSinglePrice || 0);
        targetShop.items[itemIndex] = {
          ...currentItem,
          quantity: safeQty,
          totalPrice: round2(finalSinglePrice * safeQty),
        };
      }

      if (targetShop.items.length === 0) {
        shops.splice(shopIndex, 1);
      } else {
        shops[shopIndex] = targetShop;
      }

      assignDerivedState(state, { shops });
    },

    removeCartItem: (state, action) => {
      const { shopId, cartItemId } = action.payload || {};
      if (!shopId || !cartItemId) return;

      const shops = (state.cart?.shops || [])
        .map((shop) => {
          if (String(shop.shopId) !== String(shopId)) return shop;
          return {
            ...shop,
            items: (shop.items || []).filter((item) => String(item.cartItemId) !== String(cartItemId)),
          };
        })
        .filter((shop) => (shop.items || []).length > 0);

      assignDerivedState(state, { shops });
    },

    clearCart: (state) => {
      assignDerivedState(state, { shops: [] });
    },
  },
});

export const {
  hydrateCart,
  replaceCart,
  setCartFromLegacy,
  addItemToCart,
  updateCartItemQty,
  removeCartItem,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
