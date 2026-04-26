import { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../config";
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';

const useGetCurrentUser = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchUser = async () => {
            let resolved = false;
            try {
                // ✅ Send token via Authorization header for cross-domain (Vercel → Render)
                const token = localStorage.getItem("token");

                const result = await axios.get(`${serverURL}/api/user/current`, {
                    withCredentials: true,
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                dispatch(setUserData(result.data.user));
                resolved = true;
            } catch {
                // session missing or expired
            } finally {
                if (!resolved) {
                    dispatch(setUserData(null));
                }
            }
        };

        fetchUser();
    }, [dispatch]);
};

export default useGetCurrentUser;