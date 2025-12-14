// useGetCity.jsx

import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentCity,
  setCurrentState,
  setCurrentAddress
} from "../redux/userSlice";
import { setLocation, setAddress } from "../redux/mapSlice";

const useGetCity = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const apiKey = import.meta.env.VITE_GEOAPIKEY;

  useEffect(() => {
    if (!apiKey || !userData) return;

    // 🟢 SUCCESS HANDLER
    const onSuccess = async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const { data } = await axios.get(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`
        );

        const props = data?.features?.[0]?.properties || {};

        const city =
          props.city || props.town || props.village || props.county || "Unknown City";

        const state = props.state || "Unknown State";

        const address =
          props.formatted || props.address_line1 || props.street || "Unknown Address";

        // Update Redux
        dispatch(setCurrentCity(city));
        dispatch(setCurrentState(state));
        dispatch(setCurrentAddress(address));

        dispatch(setLocation({ lat, lon }));
        dispatch(setAddress(address));

        console.log("📍 GPS City:", city);
      } catch (err) {
        console.log("❌ Reverse Geo API Error:", err);
      }
    };

    // 🔄 FALLBACK: IP BASED LOCATION
    const fetchIPLocation = async () => {
      try {
        console.log("🌐 Using IP-based location fallback...");

        const { data } = await axios.get("https://ipapi.co/json/");

        const city = data.city || "Unknown City";
        const state = data.region || "Unknown State";
        const address = `${data.city}, ${data.region}, ${data.country_name}`;

        dispatch(setCurrentCity(city));
        dispatch(setCurrentState(state));
        dispatch(setCurrentAddress(address));

        dispatch(setLocation({ lat: data.latitude, lon: data.longitude }));
        dispatch(setAddress(address));

        console.log("📍 IP Location Used:", city);
      } catch (err) {
        console.log("❌ IP Location Failed:", err);
      }
    };

    // 🔴 ERROR HANDLER
    const onError = (err) => {
      console.warn(`⚠️ Location Error (${err.code}): ${err.message}`);

      switch (err.code) {
        case 1:
          console.log("❌ User denied location");
          break;
        case 2:
          console.log("🔄 Position unavailable");
          break;
        case 3:
          console.log("⏳ GPS Timeout");
          break;
        default:
          console.log("❌ Unknown location error");
      }

      // Fallback always
      fetchIPLocation();
    };

    // 📌 REQUEST GEOLOCATION
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false, // Faster, avoids timeout
      timeout: 20000,            // Increased timeout
      maximumAge: 5000,
    });
  }, [userData, apiKey, dispatch]);
};

export default useGetCity;
