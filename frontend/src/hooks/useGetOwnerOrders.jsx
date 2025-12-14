import React, { useEffect } from 'react';
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch } from 'react-redux';
import { setMyShopOrders } from '../redux/ownerSlice';

const useGetOwnerOrders = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/order/owner-orders`, { 
                    withCredentials: true 
                });
                if(result.data.success){
                    dispatch(setMyShopOrders(result.data.orders));
                }
            } catch (err) {
                console.error(" getOwnerOrders failed:", {
                    status: err.response?.status,
                    url: `${serverURL}/api/order/owner-orders`,
                    message: err.message
                });
            }
        };
        fetchOrders();
        
        // Optional: Poll every 30 seconds for new orders
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);

    }, [dispatch]);
};

export default useGetOwnerOrders;
