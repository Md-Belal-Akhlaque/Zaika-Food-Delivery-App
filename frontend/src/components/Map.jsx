import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { IoSearchOutline } from "react-icons/io5";
import { BiCurrentLocation } from "react-icons/bi";
import { FiMapPin } from "react-icons/fi";
import { setAddress, setLocation } from "../redux/mapSlice";

//  Recenter map when Redux location updates
function RecenterMap({ location }) {
    const map = useMap();

    useEffect(() => {
        if (location?.lat != null && location?.lon != null) {
            map.setView([location.lat, location.lon], 16, { animate: true });
        }
    }, [location, map]);

    return null;
}

const Map = () => {
    const [addressInput, setAddressInput] = useState("");
    const apiKey = import.meta.env.VITE_GEOAPIKEY;
    const { location, address } = useSelector((state) => state.map);
    const dispatch = useDispatch();

    //  Get address using lat/lon (Reverse Geocoding)
    const getAddressByLatLon = async (lat, lon) => {
        try {
            const { data } = await axios.get(
                `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`
            );

            const props = data?.features?.[0]?.properties;
            const formatted =
                props?.formatted ||
                props?.address_line1 ||
                props?.street ||
                "Unknown";

            dispatch(setAddress(formatted));
        } catch (err) {
            console.log("Reverse Geocode Error:", err);
        }
    };

    //  Get lat/lon using address (Forward Geocoding) - FIXED
    const getLatLngByAddress = async () => {
        if (!addressInput.trim()) {
            alert("Please enter an address");
            return;
        }

        try {
            const { data } = await axios.get(
                `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
                    addressInput
                )}&apiKey=${apiKey}`
            );

            // Extract lat/lon from response
            const result = data?.results?.[0] || data?.features?.[0]?.properties;

            if (result && result.lat && result.lon) {
                const lat = result.lat;
                const lon = result.lon;
                const formatted = result.formatted || addressInput;

                //  Update Redux state - this will trigger map recenter
                dispatch(setLocation({ lat, lon }));
                dispatch(setAddress(formatted));

                console.log(" Location found:", { lat, lon, formatted });
            } else {
                alert("Address not found. Please try another search.");
            }
        } catch (err) {
            console.error("Forward Geocode Error:", err);
            alert("Failed to search address. Please try again.");
        }
    };

    //  Marker drag handler
    const onDragEnd = async (e) => {
        const { lat, lng } = e.target.getLatLng();
        dispatch(setLocation({ lat, lon: lng }));
        getAddressByLatLon(lat, lng);
    };

    //  Get current location
    const getCurrentLocation = () => {
        const success = async (position) => {
            try {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                dispatch(setLocation({ lat, lon }));
                getAddressByLatLon(lat, lon);
            } catch (err) {
                console.error(err);
            }
        };

        const error = (err) => {
            if (err.code === 1) alert("Location permission denied ❌");
            if (err.code === 2) alert("Position unavailable 🔄");
            if (err.code === 3) alert("Request timeout ⏳");
            console.log("Location error:", err);
        };

        navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    };

    //  Sync Redux address to input field
    useEffect(() => {
        setAddressInput(address);
    }, [address]);

    // Prevent crash before location loads
    if (!location?.lat || !location?.lon) {
        return (
            <div className="h-64 flex items-center justify-center">
                Loading map...
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiMapPin className="text-orange-500" size={22} />
                    Location
                </h3>

                {/* SEARCH BAR */}
                <div className="flex gap-3 items-center">
                    <input
                        type="text"
                        className="flex-1 border border-orange-300 rounded-xl text-sm p-3 
                        bg-orange-50/30 placeholder-orange-400
                        hover:border-orange-400 focus:ring-1 focus:ring-orange-400
                        focus:border-orange-500 transition-all duration-200 truncate"
                        placeholder="Search address..."
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)} //  FIXED
                        onKeyDown={(e) => {
                            if (e.key === "Enter") getLatLngByAddress();
                        }}
                    />

                    {/* Search Button */}
                    <button
                        className="flex items-center justify-center w-10 h-10 rounded-xl
                        bg-gradient-to-tr from-orange-500 to-orange-400 text-white
                        shadow-md hover:scale-105 active:scale-95 transition-all"
                        onClick={getLatLngByAddress}
                    >
                        <IoSearchOutline size={20} />
                    </button>

                    {/* Current Location Button */}
                    <button
                        className="flex items-center justify-center w-10 h-10 rounded-xl
                        border border-orange-300 text-orange-500 bg-orange-50/40
                        hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600
                        hover:scale-105 active:scale-95 transition-all"
                        onClick={getCurrentLocation}
                    >
                        <BiCurrentLocation size={22} />
                    </button>
                </div>
            </div>

            {/* MAP */}
            <div className="rounded-xl border overflow-hidden">
                <div className="h-64 w-full">
                    <MapContainer
                        className="w-full h-full"
                        center={[location.lat, location.lon]}
                        zoom={15}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        <RecenterMap location={location} />

                        <Marker
                            draggable
                            eventHandlers={{ dragend: onDragEnd }}
                            position={[location.lat, location.lon]}
                        />
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default Map;
