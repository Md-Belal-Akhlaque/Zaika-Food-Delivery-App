import { configureStore } from '@reduxjs/toolkit'
import userSlice from "./userSlice";
import ownerSlice from "./ownerSlice";
import mapSlice from "./mapSlice";

export const store = configureStore({
  reducer: {
    user: userSlice,
    owner: ownerSlice,
    map: mapSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['user/setItemsInMyCity', 'user/setShopsInMyCity'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.items', 'payload.shops'],
        // Ignore these paths in the state
        ignoredPaths: ['user.itemsInMyCity', 'user.shopsInMyCity'],
        // Increase the warning threshold to 100ms
        warnAfter: 100,
      },
    }),
});

// IMMEDIATE + DEBOUNCED localStorage sync
let saveTimeout;
store.subscribe(() => {
  const state = store.getState();
  const cart = state.user.cartItems || [];
  const userId = state.user.userData?._id || state.user.userData?.id;
  
  // Clear previous timeout
  clearTimeout(saveTimeout);
  
  // Save immediately + debounce for performance
  saveTimeout = setTimeout(() => {
    localStorage.setItem('cartItems_last', JSON.stringify(cart));
    if (userId) {
      localStorage.setItem(`cartItems_${userId}`, JSON.stringify(cart));
    } else {
      localStorage.setItem('cartItems_guest', JSON.stringify(cart));
    }
    console.log('🛒 Cart saved to localStorage:', cart.length, 'items');
  }, 100); // 100ms debounce
});

export default store;
