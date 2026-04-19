import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    loading: true, // NEW: added for initial session check
    currentCity: null,
    currentState: null,
    currentAddress: null,
    currentPincode: null,
    shopsInMyCity: null,
    itemsInMyCity: null,
    savedAddresses: [],

    // Canonical order states
    userOrders: [],     // for customer
    ownerOrders: [],    // for shop owner

    // NEW: Search and Filters
    filters: {
      shopType: [],
      rating: 0,
      openOnly: false
    }
  },

  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { shopType: [], rating: 0, openOnly: false };
    },

    setUserData: (state, action) => {
      state.userData = action.payload;
      state.loading = false; // session check complete
    },

    addAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    updateAddress: (state, action) => {
      const index = state.savedAddresses.findIndex(addr => addr.id === action.payload.id);
      if (index !== -1) state.savedAddresses[index] = action.payload;
    },
    deleteAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(addr => addr.id !== action.payload);
    },
    setSavedAddresses: (state, action) => {
      // Ensure payload is always an array
      state.savedAddresses = Array.isArray(action.payload) ? action.payload : [];
    },

    setCurrentCity: (state, action) => {
      state.currentCity = action.payload;
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload;
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload;
    },
    setCurrentPincode: (state, action) => {
      state.currentPincode = action.payload;
    },
    setShopsInMyCity: (state, action) => {
      state.shopsInMyCity = action.payload;
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload;
    },

    //  CHATGPT CHANGE: Separate setter for USER
    setUserOrders: (state, action) => {
      state.userOrders = Array.isArray(action.payload) ? action.payload : [];
    },

    //  CHATGPT CHANGE: Separate setter for OWNER
    setOwnerOrders: (state, action) => {
      state.ownerOrders = Array.isArray(action.payload) ? action.payload : [];
    },

    //  CHATGPT CHANGE: Safe update for BOTH structures
    updateOrderStatus: (state, action) => {
      const { orderId, shopOrderId, status } = action.payload;

      //  USER FLOW
      const userOrder = state.userOrders?.find(o => o._id == orderId);
      if (userOrder) {
        const so = userOrder.shopOrders?.find(s => s._id == shopOrderId);
        if (so) so.status = status;
      }

      //  OWNER FLOW
      const ownerOrder = state.ownerOrders?.find(o => o._id == shopOrderId);
      if (ownerOrder) {
        ownerOrder.status = status;
      }
    }

  },
});

export const {
  setUserData,
  setCurrentCity,
  setCurrentState,
  setCurrentAddress,
  setCurrentPincode,
  setShopsInMyCity,
  setItemsInMyCity,
  addAddress,
  updateAddress,
  deleteAddress,
  setSavedAddresses,

  setUserOrders,      //  new
  setOwnerOrders,     //  new
  updateOrderStatus,
  setFilters,
  resetFilters

} = userSlice.actions;

export default userSlice.reducer;
