import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import SignUp from "./pages/SignUp/SignUp";
import SignIn from "./pages/Login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import useGetCurrentUser from './hooks/useGetCurrentUser';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { setCartItem } from './redux/userSlice';
import useGetCity from './hooks/useGetCity';
import CreateEditShop from './pages/CreateEditShop';
import AddNewItem from './pages/AddNewItem';
import EditItem from './pages/EditItem';
import useGetShopByCity from './hooks/useGetShopByCity';
import useGetItemsByCity from './hooks/useGetItemsByCity';
import useGetMyOrders from './hooks/useGetMyOrders';
// import useUpdateLocation from "./hooks/useUpdateLocation";
import CartPage from "./pages/CartPage";
import CheckOut from "./pages/CheckOut";
import Payment from "./pages/Payment";
import MyOrders from "./pages/MyOrders";
import RateOrder from "./pages/RateOrder";
import TrackOrder from "./pages/TrackOrder";
//dispatch ka use karke state ke under data ko daala tha 
//selector ka use karke state ka slice dhundenge aur wo perticular state ho lekar show karenge
export const serverURL = "http://localhost:8000"


function App() {

  //ye custom hook hai jo dynamic and reuseable hai 
  const userData = useSelector(state => state.user.userData);
  const dispatch = useDispatch();
  // Hydrate cart BEFORE other effects dispatch
  // if(userData.user.role ==="deliveryPartner"){
  //   useUpdateLocation();
  // }
  useEffect(() => {
    try {
      const userId = userData?._id || userData?.id;
      const userKey = userId ? `cartItems_${userId}` : null;
      const guestKey = 'cartItems_guest';
      const legacyKey = 'cartItems';

      // Prefer user cart if available
      let data = [];
      if (userKey) {
        const userTxt = localStorage.getItem(userKey);
        if (userTxt) data = JSON.parse(userTxt);
        else {
          const guestTxt = localStorage.getItem(guestKey);
          if (guestTxt) {
            data = JSON.parse(guestTxt);
            localStorage.setItem(userKey, guestTxt);
            localStorage.removeItem(guestKey);
          } else {
            const legacyTxt = localStorage.getItem(legacyKey);
            if (legacyTxt) {
              data = JSON.parse(legacyTxt);
              localStorage.setItem(userKey, legacyTxt);
            }
          }
        }
      } else {
        const guestTxt = localStorage.getItem(guestKey);
        if (guestTxt) data = JSON.parse(guestTxt);
        else {
          const legacyTxt = localStorage.getItem(legacyKey);
          if (legacyTxt) {
            data = JSON.parse(legacyTxt);
            localStorage.setItem(guestKey, legacyTxt);
          }
        }
      }

      dispatch(setCartItem(Array.isArray(data) ? data : []));
      localStorage.removeItem('cartItems');
    } catch {
      dispatch(setCartItem([]));
    }
  }, [dispatch, userData]);

  // Other app effects
  useGetItemsByCity();
  useGetShopByCity();
  useGetCurrentUser();
  useGetCity();
  useGetMyOrders();
  

  return (
    <Routes>
      <Route path="/" element={userData ? <Home /> : <Navigate to="/signin" />} />
      <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
      <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />
      <Route path="/owner/create-shop" element={userData ? <CreateEditShop /> : <Navigate to="/signin" />} />
      <Route path="/owner/add-item" element={userData ? <AddNewItem /> : <Navigate to="/signin" />} />
      <Route path="/owner/edit-item/:itemId" element={userData ? <EditItem /> : <Navigate to="/signin" />} />
      <Route path ="/cart" element={userData ? <CartPage /> : <Navigate to="/signin" />} />
      <Route path ="/checkout" element={userData ? <CheckOut /> : <Navigate to="/signin" />} />
      <Route path ="/payment" element={userData ? <Payment /> : <Navigate to="/signin" />} />
      <Route path ="/my-orders" element={userData ? <MyOrders /> : <Navigate to="/signin" />} />
      <Route path ="/rate-order" element={userData ? <RateOrder /> : <Navigate to="/signin" />} />
      <Route path ="/track-order/:orderId" element={userData ? <TrackOrder /> : <Navigate to="/signin" />} />
    </Routes>
  );
}

export default App
