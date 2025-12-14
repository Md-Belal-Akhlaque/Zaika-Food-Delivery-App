import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch } from 'react-redux';

import { setMyShopData } from '../redux/ownerSlice';

const useGetMyShop = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchShop = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/shop/me`, { withCredentials: true })
                dispatch(setMyShopData(result.data));
                console.log("myshop",result.data);
            } catch (err) {
                console.log("getmyShop err - ",err);
            }
        };
        fetchShop();
    }, [dispatch]);
}

export default useGetMyShop
