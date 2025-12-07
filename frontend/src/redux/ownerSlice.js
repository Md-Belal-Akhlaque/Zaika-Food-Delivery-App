import {createSlice} from '@reduxjs/toolkit';



const ownerSlice = createSlice({
    name:"owner",
    initialState:{
        myShopData:null,    //isme backend se success and shop data dono save hai to jo ki shopController ne createEditShop se bheja tha so access karne ke liye shop.data aisa kuch karna padega 
        
        
        myShopItems: null,     // isme shop owner ka item means menu list aayega  

    },
    reducers:{
        setMyShopData:(state,action)=>{
            state.myShopData = action.payload;
        },
        setMyShopItems:(state,action)=>{
            state.myShopItems = action.payload;
        }

    }
})

export const { setMyShopData ,setMyShopItems} =ownerSlice.actions;
export default ownerSlice.reducer;