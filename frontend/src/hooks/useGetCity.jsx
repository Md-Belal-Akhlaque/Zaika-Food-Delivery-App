import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentCity,
  setCurrentState,
  setCurrentAddress
} from "../redux/userSlice";
import {setLocation , setAddress} from "../redux/mapSlice";

const useGetCity = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const apiKey = import.meta.env.VITE_GEOAPIKEY;

  useEffect(() => {
    if (!apiKey || !userData) return;

    const success = async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // console.log("LAT / LON =>", lat, lon);

        const { data } = await axios.get(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`
        );

        const props = data?.features?.[0]?.properties;

        const city = props?.city || props?.town || props?.village;
        const state = props?.state;
        const address =
          props?.formatted ||
          props?.address_line1 ||
          props?.street ||
          "Unknown";

        dispatch(setCurrentCity(city));
        dispatch(setCurrentState(state));
        dispatch(setCurrentAddress(address));
          // these below will be used in mapSlice 
        dispatch(setLocation({ lat, lon }));
        dispatch(setAddress(address));

        

        console.log("CITY ===> ", city);
        console.log("STATE ===> ", state);
        console.log("ADDRESS ===> ", address);
      } catch (err) {
        console.log("API ERROR =>", err);
      }
    };

    const error = (err) => {
      if (err.code === 1) console.log("User denied location ❌");
      if (err.code === 2) console.log("Position unavailable 🔄");
      if (err.code === 3) console.log("Request timeout ⏳");

      console.log("location err - ", err);
    };

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  }, [userData, apiKey, dispatch]);
};

export default useGetCity;
