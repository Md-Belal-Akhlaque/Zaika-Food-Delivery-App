import { useEffect } from 'react'
import api from '../hooks/useApi';
import { useDispatch } from 'react-redux';
import { setMyShopData } from '../redux/ownerSlice';

const useGetMyShop = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchShop = async () => {
            try {
                //  Using api instance — automatically sends Authorization header
                const result = await api.get(`/api/shop/me`);
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

export default useGetMyShop;