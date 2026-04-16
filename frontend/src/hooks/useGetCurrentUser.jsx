import React, { useEffect } from 'react'
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
                const result = await axios.get(`${serverURL}/api/user/current`, { withCredentials: true })
                
                dispatch(setUserData(result.data.user));
                resolved = true;
            } catch {
            } finally {
                // Ensure app exits initial skeleton even when session is missing/expired.
                if (!resolved) {
                    dispatch(setUserData(null));
                }
            }
        }
        fetchUser()
    }, [dispatch])
}

export default useGetCurrentUser
