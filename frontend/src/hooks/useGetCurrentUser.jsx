import React, { useEffect } from 'react'
import axios from 'axios';
import { serverURL } from "../App";
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';

const useGetCurrentUser = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const result = await axios.get(`${serverURL}/api/user/current`, { withCredentials: true })
                dispatch(setUserData(result.data));
            } catch (err) {
                console.log(err);
            }
        }
        fetchUser()
    }, [dispatch])
}

export default useGetCurrentUser
