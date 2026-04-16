import {createSlice} from '@reduxjs/toolkit';



const ownerSlice = createSlice({
    name:"owner",
    initialState:{
        myShopData:null,    //isme backend se success and shop data dono save hai to jo ki shopController ne createEditShop se bheja tha so access karne ke liye shop.data aisa kuch karna padega 
        
        
        myShopItems: null,     // isme shop owner ka item means menu list aayega  
        myShopOrders: [], // New: Store shop orders
    },
    reducers:{
        setMyShopData:(state,action)=>{
            state.myShopData = action.payload;
        },
        setMyShopItems:(state,action)=>{
            state.myShopItems = action.payload;
        },
        setMyShopOrders:(state,action)=>{
            state.myShopOrders = action.payload;
        },
        // Update a single item's availability in the shop data
        toggleItemAvailability: (state, action) => {
            const { itemId, isAvailable } = action.payload;
            if (state.myShopData?.shop?.items) {
                const item = state.myShopData.shop.items.find(i => i._id === itemId);
                if (item) {
                    item.isAvailable = isAvailable;
                }
            }
        },
        // Remove an item from the shop data
        deleteItemFromShop: (state, action) => {
            const itemId = action.payload;
            if (state.myShopData?.shop?.items) {
                state.myShopData.shop.items = state.myShopData.shop.items.filter(i => i._id !== itemId);
            }
        }
    }
})

export const { setMyShopData ,setMyShopItems, setMyShopOrders, toggleItemAvailability, deleteItemFromShop} =ownerSlice.actions;
export default ownerSlice.reducer;