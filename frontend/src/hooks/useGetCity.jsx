import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
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

        dispatch(setCurrentCity(city));
        dispatch(setCurrentState(state));
        dispatch(setCurrentAddress(address));
        dispatch(setLocation({ lat, lon }));
        dispatch(setAddress(address));
      } catch {
        // Silent fallback; user-facing errors are handled in toasts.
      }
    };

    const fetchIPLocation = async () => {
      try {
        const { data } = await axios.get("https://ipapi.co/json/");

        const city = data.city || "Unknown City";
        const state = data.region || "Unknown State";
        const address = `${data.city}, ${data.region}, ${data.country_name}`;

        dispatch(setCurrentCity(city));
        dispatch(setCurrentState(state));
        dispatch(setCurrentAddress(address));
        dispatch(setLocation({ lat: data.latitude, lon: data.longitude }));
        dispatch(setAddress(address));
      } catch {
        // Silent fallback failure.
      }
    };

    const onError = (err) => {
      switch (err.code) {
        case 1:
          toast.error(
            "Location permission denied. Please allow location in browser site settings to use GPS.",
            { duration: 5000 }
          );
          break;
        case 2:
          toast.error("Unable to detect current location. Using approximate location.");
          break;
        case 3:
          toast.error("Location request timed out. Using approximate location.");
          break;
        default:
          toast.error("Location access failed. Using approximate location.");
      }

      fetchIPLocation();
    };

    const requestGeoLocation = () => {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 5000,
      });
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          if (permissionStatus.state === "denied") {
            toast.error(
              "Location access is blocked in browser settings. Enable it to allow GPS prompt again.",
              { duration: 6000 }
            );
          }
          requestGeoLocation();
        })
        .catch(() => {
          requestGeoLocation();
        });
      return;
    }

    requestGeoLocation();
  }, [userData, apiKey, dispatch]);
};

export default useGetCity;
