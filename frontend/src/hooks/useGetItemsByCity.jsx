import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../config";
import { useDispatch, useSelector } from 'react-redux';

import { setItemsInMyCity } from "../redux/userSlice"

const useGetItemsByCity = () => {
    const {currentCity} = useSelector(state=>state.user);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!currentCity) return;
        const fetchCityItems = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/item/by-city/${encodeURIComponent(currentCity)}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                    }
                })
                dispatch(setItemsInMyCity(result.data.items));
            } catch {
                // Ignore background fetch errors.
            }
        };
        fetchCityItems();
    }, [dispatch,currentCity]);
}

export default useGetItemsByCity
