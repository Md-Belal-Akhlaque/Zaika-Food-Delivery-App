import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch, useSelector } from 'react-redux';

import { setItemsInMyCity } from "../redux/userSlice"

const useGetItemsByCity = () => {
    const {currentCity} = useSelector(state=>state.user);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!currentCity) return;
        const fetchCityItems = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/item/by-city/${encodeURIComponent(currentCity)}`)
                console.log("shopByCity",result.data);
                dispatch(setItemsInMyCity(result.data.items));
            } catch (err) {
                console.log("getmyItemByCity err - ",err);
            }
        };
        fetchCityItems();
    }, [dispatch,currentCity]);
}

export default useGetItemsByCity

