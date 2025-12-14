import { createSlice } from "@reduxjs/toolkit";

//  Better localStorage hydration with fallback chain
const getSavedCart = () => {
  try {
    // Priority 1: User-specific cart
    const userCart = localStorage.getItem('cartItems_user');
    if (userCart) return JSON.parse(userCart);
    
    // Priority 2: Guest cart
    const guestCart = localStorage.getItem('cartItems_guest');
    if (guestCart) return JSON.parse(guestCart);
    
    // Priority 3: Last session
    const lastCart = localStorage.getItem('cartItems_last');
    if (lastCart) return JSON.parse(lastCart);
    
    return [];
  } catch {
    return [];
  }
};

const savedCart = getSavedCart();

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopsInMyCity: null,
    itemsInMyCity: null,
    cartItems: savedCart,
    savedAddresses: [], // Stores list of user addresses
    totalAmount:0,
    myOrders:null,

  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      //  Sync cart when user logs in
      if (action.payload?._id || action.payload?.id) {
        const userId = action.payload._id || action.payload.id;
        const userCart = localStorage.getItem(`cartItems_${userId}`);
        if (userCart) {
          try {
            state.cartItems = JSON.parse(userCart);
          } catch {
            // Keep current cart if parsing fails
          }
        }
      }
    },
    
    //  FIXED: addToCartItem with IMMEDIATE quantity update
    addToCartItem: (state, action) => {
      const payload = action.payload || {};
      const id = payload.id ?? payload._id;
      
      if (!id) return;
      
      const generateCartId = (item) => {
        const parts = [item.id || item._id];
        if (item.variants && item.variants.length) parts.push(JSON.stringify(item.variants));
        if (item.addons && item.addons.length) parts.push(JSON.stringify(item.addons));
        return parts.join('_');
      };

      const cartId = payload.cartId || generateCartId(payload);
      const qtyDelta = Number(payload.quantity ?? 1);
      const next = [];
      let found = false;
      
      for (const item of state.cartItems) {
        const itemCartId = item.cartId || generateCartId(item);

        if (itemCartId === cartId) {
          found = true;
          const updatedQty = Number(item.quantity || 0) + qtyDelta;
          if (updatedQty > 0) {
            next.push({ 
              ...item,
              cartId: itemCartId, 
              quantity: updatedQty,
              price: Number(item.price || payload.price || 0)
            });
          }
        } else {
           if (!item.cartId) item.cartId = itemCartId;
           next.push(item);
        }
      }
      
      // Add new item if not found
      if (!found && qtyDelta > 0) {
        next.push({
          id,
          cartId,
          name: payload.name || 'Item',
          price: Number(payload.price || 0),
          image: payload.image,
          foodType: payload.foodType,
          shop: payload.shop,
          category: payload.category,
          quantity: qtyDelta,
          variants: payload.variants || [],
          addons: payload.addons || []
        });
      }
      
      state.cartItems = next;
    },
    
    //  FIXED: decreaseCartItem with BETTER logic
    decreaseCartItem: (state, action) => {
      const id = action.payload?.id ?? action.payload?._id;
      const cartId = action.payload?.cartId;
      const qtyDelta = Number(action.payload?.quantity ?? 1);
      
      if (!id && !cartId) return;
      
      const next = state.cartItems
        .map((item) => {
          const itemCartId = item.cartId || (item.id || item._id); // Fallback for legacy
          const targetId = cartId || id;

          // If cartId provided, exact match. Else match by ID (careful with variants)
          const match = cartId ? itemCartId === cartId : (item.id === id || item._id === id);

          if (match) {
            const newQty = Math.max(0, Number(item.quantity || 0) - qtyDelta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => Number(item.quantity || 0) > 0);
      
      state.cartItems = next;
    },
    
    //  NEW: Clear cart completely
    clearCart: (state) => {
      state.cartItems = [];
    },
    
    //  NEW: Remove specific item
    removeCartItem: (state, action) => {
      const id = action.payload?.id ?? action.payload?._id;
      const cartId = action.payload?.cartId;

      if (!id && !cartId) return;
      
      state.cartItems = state.cartItems.filter(
        (item) => {
             if (cartId) return item.cartId !== cartId;
             return item.id !== id && item._id !== id;
        }
      );
    },

    // ADDRESS MANAGEMENT
    addAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    updateAddress: (state, action) => {
      const index = state.savedAddresses.findIndex(addr => addr.id === action.payload.id);
      if (index !== -1) {
        state.savedAddresses[index] = action.payload;
      }
    },
    deleteAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(addr => addr.id !== action.payload);
    },
    setSavedAddresses: (state, action) => {
      state.savedAddresses = action.payload;
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
    setShopsInMyCity: (state, action) => {
      state.shopsInMyCity = action.payload;
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload;
    },
    setCartItem: (state, action) => {
      state.cartItems = Array.isArray(action.payload) ? action.payload : []
    },
 //  CORRECT
// In your userSlice.js - FIXED setMyOrders reducer
setMyOrders: (state, action) => {
  // Handle both direct array and nested response object
  const orders = action.payload?.orders 
    ? action.payload.orders 
    : Array.isArray(action.payload) 
    ? action.payload 
    : [];
  
  state.myOrders = orders;
},
updateOrderStatus:(state,action) => {
  const {orderId,shopId,status} = action.payload;
  const order = state.myOrders.find(o=>o._id ==orderId)
  if(order){
    if(order.shopOrders && order.shopOrders.shop._id ==shopId)
      order.shopOrders.status = status;
  }
}

  },
});

export const {
  setUserData,
  setCurrentCity,
  setCurrentState,
  setCurrentAddress,
  setShopsInMyCity,
  setItemsInMyCity,
  setCartItem,
  addToCartItem,
  decreaseCartItem,
  clearCart,
  removeCartItem,
  addAddress,
  updateAddress,
  deleteAddress,
  setSavedAddresses,
  setMyOrders,
  updateOrderStatus
} = userSlice.actions;

export default userSlice.reducer;
