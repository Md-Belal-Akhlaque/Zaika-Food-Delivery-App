import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../config";
import { useDispatch, useSelector } from 'react-redux'; // FIXED: Added useSelector import
import { setUserOrders } from '../redux/userSlice';

const useGetMyOrders = () => {
    const dispatch = useDispatch();
    const userData = useSelector(state => state.user.userData); // FIXED: Added userData selector

    useEffect(() => {
        if (!userData) return; // FIXED: Don't fetch orders before login

        const fetchOrder = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/order/my-orders`, { 
                    withCredentials: true,
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                    }
                });
                
                dispatch(setUserOrders(result.data.orders));
            } catch (err) {
                console.error(" getMyOrders failed:", {
                    status: err.response?.status,
                    url: `${serverURL}/api/order/my-orders`,
                    message: err.message
                });
            }
        };
        fetchOrder();
    }, [dispatch, userData]); // FIXED: Added userData to dependency array
}

export default useGetMyOrders;
