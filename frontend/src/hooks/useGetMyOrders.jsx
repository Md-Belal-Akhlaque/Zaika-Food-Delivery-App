import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch } from 'react-redux';
import { setMyOrders } from '../redux/userSlice';

const useGetMyOrders = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/order/my-orders`, { 
                    withCredentials: true 
                });
                dispatch(setMyOrders(result.data));
            } catch (err) {
                console.error(" getMyOrders failed:", {
                    status: err.response?.status,
                    url: `${serverURL}/api/order/my-orders`,
                    message: err.message
                });
            }
        };
        fetchOrder();
    }, [dispatch]);
}

export default useGetMyOrders;
