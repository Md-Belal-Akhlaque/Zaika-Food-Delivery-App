import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch, useSelector } from 'react-redux';

import { setShopsInMyCity } from '../redux/userSlice';

const useGetShopByCity = () => {
    const {currentCity} = useSelector(state=>state.user);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!currentCity) return;
        const fetchCityShop = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/shop/city/${encodeURIComponent(currentCity)}`)
                dispatch(setShopsInMyCity(result.data.shops));
                console.log("shops in city: " , result.data.shops);
            } catch (err) {
                console.log("getmyShopByCity err - ",err);
            }
        };
        fetchCityShop();
    }, [dispatch,currentCity]);
}

export default useGetShopByCity
