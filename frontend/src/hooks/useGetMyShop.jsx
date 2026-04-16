import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../config";
import { useDispatch } from 'react-redux';

import { setMyShopData } from '../redux/ownerSlice';

const useGetMyShop = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchShop = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/shop/me`, { withCredentials: true })
                if (result?.data?.success && result?.data?.shop) {
                    dispatch(setMyShopData(result.data));
                } else {
                    dispatch(setMyShopData(null));
                }
            } catch (err) {
                if (err?.response?.status === 404) {
                    dispatch(setMyShopData(null));
                    return;
                }
                dispatch(setMyShopData(null));
            }
        };
        fetchShop();
    }, [dispatch]);
}

export default useGetMyShop
