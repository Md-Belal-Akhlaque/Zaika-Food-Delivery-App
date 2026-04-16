import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  placedOrders: [],
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    addPlacedOrder: (state, action) => {
      if (!action.payload) return;
      state.placedOrders.unshift(action.payload);
    },
    setPlacedOrders: (state, action) => {
      state.placedOrders = Array.isArray(action.payload) ? action.payload : [];
    },
    clearPlacedOrders: (state) => {
      state.placedOrders = [];
    },
  },
});

export const { addPlacedOrder, setPlacedOrders, clearPlacedOrders } = orderSlice.actions;

export default orderSlice.reducer;
