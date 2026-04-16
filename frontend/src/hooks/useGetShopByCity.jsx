import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../config";
import { useDispatch, useSelector } from 'react-redux';

import { setShopsInMyCity } from '../redux/userSlice';

const useGetShopByCity = () => {
    const { currentCity, filters } = useSelector(state => state.user);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!currentCity) return;

        const fetchCityShop = async () => {
            try {
                // UTILIZES: shopType, rating, isOpen filters
                const params = new URLSearchParams();
                if (filters.shopType?.length) params.append("type", filters.shopType.join(","));
                if (filters.rating) params.append("rating", filters.rating);
                if (filters.openOnly) params.append("openOnly", "true");

                const url = `${serverURL}/api/shop/city/${encodeURIComponent(currentCity)}?${params.toString()}`;
                const result = await axios.get(url);
                
                dispatch(setShopsInMyCity(result.data.shops));
            } catch {
                // Ignore background fetch errors.
            }
        };
        fetchCityShop();
    }, [dispatch, currentCity, filters]);
}

export default useGetShopByCity
