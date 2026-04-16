import { configureStore } from '@reduxjs/toolkit'
import userSlice from "./userSlice";
import ownerSlice from "./ownerSlice";
import mapSlice from "./mapSlice";
import cartSlice from "./cartSlice";
import orderSlice from "./orderSlice";

export const store = configureStore({
  reducer: {
    user: userSlice,
    owner: ownerSlice,
    map: mapSlice,
    cart: cartSlice,
    order: orderSlice,
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

export default store;
