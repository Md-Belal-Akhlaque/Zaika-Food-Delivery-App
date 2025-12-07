import React from 'react';
import { useSelector } from 'react-redux';
import useGetCurrentUser from '../../hooks/useGetCurrentUser';
import UserDashboard from '../../components/UserDashboard';
import OwnerDashboard from '../../components/OwnerDashboard';
import DeliveryPartnerDashboard from '../../components/DeliveryPartnerDashboard';
import Navbar from '../../components/Navbar';

const Home = () => {
  useGetCurrentUser();

  //redux 
  const { userData } = useSelector(state => state.user);

  return (
    <div>

      {userData?.role === "user" && <UserDashboard />}
      {userData?.role === "owner" && <OwnerDashboard />}
      {userData?.role === "deliveryPartner" && <DeliveryPartnerDashboard />}
      
    </div>
  );
};

export default Home;
