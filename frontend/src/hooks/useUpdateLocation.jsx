import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverURL } from "../App";

function useUpdateLocation() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const updateLocation = async (lat, lon) => {
      try {
        const result = await axios.patch(
          `${serverURL}/api/user/update-location`,
          { lat, lon },
          {
            withCredentials: true, 
          }
        );

        console.log("Location updated → ", result.data);
      } catch (error) {
        console.log("Location update error → ", error.response?.data || error);
      }
    };

    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
      (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;

        updateLocation(lat, lon);
      },
      (err) => {
        console.error("Geo error:", err);
      }
    );
  }, [userData]);
}

export default useUpdateLocation;
