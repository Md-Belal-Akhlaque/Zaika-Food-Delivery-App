import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import SignUp from "./pages/SignUp/SignUp";
import SignIn from "./pages/Login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import { useSelector } from 'react-redux';
import { Skeleton } from './components/Skeleton';
import CreateEditShop from './pages/CreateEditShop';
import AddNewItem from './pages/AddNewItem';
import EditItem from './pages/EditItem';
import CartPage from "./pages/CartPage";
import CheckOut from "./pages/CheckOut";
import Payment from "./pages/Payment";
import MyOrders from "./pages/MyOrders";
import RateOrder from "./pages/RateOrder";
import TrackOrder from "./pages/TrackOrder";
import ShopMenuPage from "./pages/ShopMenuPage";
import OwnerMenuList from "./pages/OwnerMenuList";
import OwnerItemView from "./pages/OwnerItemView";
import OwnerPayments from "./pages/OwnerPayments";
import Profile from "./pages/Profile";

function App() {
  const { userData, loading } = useSelector(state => state.user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="w-64 h-64 rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={userData ? <Home /> : <Navigate to="/signin" />} />
        <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
        <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/profile" element={userData ? <Profile /> : <Navigate to="/signin" />} />
        <Route path="/owner/create-shop" element={userData?.role === 'owner' ? <CreateEditShop /> : <Navigate to="/signin" />} />
        <Route path="/owner/add-item" element={userData?.role === 'owner' ? <AddNewItem /> : <Navigate to="/signin" />} />
        <Route path="/owner/edit-item/:itemId" element={userData?.role === 'owner' ? <EditItem /> : <Navigate to="/signin" />} />
        <Route path ="/cart" element={userData ? <CartPage /> : <Navigate to="/signin" />} />
        <Route path ="/checkout" element={userData ? <CheckOut /> : <Navigate to="/signin" />} />
        <Route path ="/payment" element={userData ? <Payment /> : <Navigate to="/signin" />} />
        <Route path ="/my-orders" element={userData ? <MyOrders /> : <Navigate to="/signin" />} />
        <Route path ="/rate-order" element={userData ? <RateOrder /> : <Navigate to="/signin" />} />
        <Route path ="/track-order/:orderId" element={userData ? <TrackOrder /> : <Navigate to="/signin" />} />
        <Route path="/shop/:shopId/menu" element={userData ? <ShopMenuPage /> : <Navigate to="/signin" />} />
        <Route path="/owner/menu-list" element={userData?.role === 'owner' ? <OwnerMenuList /> : <Navigate to="/signin" />} />
        <Route path="/owner/view-item/:itemId" element={userData?.role === 'owner' ? <OwnerItemView /> : <Navigate to="/signin" />} />
        <Route path="/owner/payments" element={userData?.role === 'owner' ? <OwnerPayments /> : <Navigate to="/signin" />} />
      </Routes>
  );
}

export default App;
