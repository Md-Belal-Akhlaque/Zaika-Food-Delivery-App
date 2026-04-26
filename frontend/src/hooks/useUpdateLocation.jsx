import { useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { serverURL } from "../config";

function useUpdateLocation() {
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const updateLocation = async (lat, lon) => {
      try {
        await axios.patch(
          `${serverURL}/api/user/update-location`,
          { lat, lon },
          {
            withCredentials: true,
          }
        );
      } catch {
        // Ignore silent location update failures.
      }
    };

    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
      (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        updateLocation(lat, lon);
      },
      () => {
        // Ignore geolocation stream errors in background watcher.
      }
    );
  }, [userData]);
}

export default useUpdateLocation;
