import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { setAddress, setLocation } from "../redux/mapSlice";
// ADDED: Import user slice actions to sync city/state/address
import { setCurrentCity, setCurrentState, setCurrentAddress, setCurrentPincode } from "../redux/userSlice";

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
    const [searching, setSearching] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [geoErrorMessage, setGeoErrorMessage] = useState("");
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
            // ADDED: Extract city, state, and postcode from geocoding response
            const city = props?.city || props?.town || props?.village || props?.county || "";
            const state = props?.state || "";
            const postcode = props?.postcode || "";
            const formatted =
                props?.formatted ||
                props?.address_line1 ||
                props?.street ||
                "Unknown";

            dispatch(setAddress(formatted));       // existing - map slice
            // ADDED: Update user slice with city, state, postcode, and address for form auto-fill
            dispatch(setCurrentCity(city));
            dispatch(setCurrentState(state));
            dispatch(setCurrentAddress(formatted));
            dispatch(setCurrentPincode(postcode));
        } catch (err) {
            console.error(" Geocoding failed:", err);
        }
    };

    //  Detect current location
    const handleDetectLocation = () => {
        setDetecting(true);
        setGeoErrorMessage("");

        const requestCurrentPosition = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    dispatch(setLocation({ lat: latitude, lon: longitude }));
                    getAddressByLatLon(latitude, longitude);
                    setDetecting(false);
                },
                (err) => {
                    console.error(" Geolocation error:", err);
                    let message = "Unable to detect your location.";
                    if (err?.code === 1) {
                        message = "Location permission denied. Please allow location access in browser site settings.";
                    } else if (err?.code === 2) {
                        message = "Current location unavailable. Please try again.";
                    } else if (err?.code === 3) {
                        message = "Location request timed out. Please retry.";
                    }
                    setGeoErrorMessage(message);
                    toast.error(message);
                    setDetecting(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 5000,
                }
            );
        };

        if (navigator.geolocation) {
            if (navigator.permissions?.query) {
                navigator.permissions
                    .query({ name: "geolocation" })
                    .then((permissionStatus) => {
                        if (permissionStatus.state === "denied") {
                            const blockedMsg =
                                "Location access is blocked. Browser settings me is site ke liye location 'Allow' karo.";
                            setGeoErrorMessage(blockedMsg);
                            toast.error(blockedMsg, { duration: 6000 });
                        }
                        requestCurrentPosition();
                    })
                    .catch(() => requestCurrentPosition());
            } else {
                requestCurrentPosition();
            }
        } else {
            const msg = "Geolocation not supported by your browser.";
            setGeoErrorMessage(msg);
            toast.error(msg);
            setDetecting(false);
        }
    };

    //  Search address (Forward Geocoding)
    const handleSearchAddress = async () => {
        if (!addressInput.trim()) return;
        setSearching(true);

        try {
            const { data } = await axios.get(
                `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`
            );

            if (data.features.length > 0) {
                const { lat, lon, formatted } = data.features[0].properties;
                const result = data.features[0].properties;
                dispatch(setLocation({ lat, lon }));
                dispatch(setAddress(formatted));
                
                const props = data?.features?.[0]?.properties || result;
                const city = props?.city || props?.town || props?.village || props?.county || "";
                const state = props?.state || "";
                const postcode = props?.postcode || "";
                dispatch(setCurrentCity(city));
                dispatch(setCurrentState(state));
                dispatch(setCurrentAddress(formatted));
                dispatch(setCurrentPincode(postcode));

            } else {
                alert("Address not found. Please try again.");
            }
        } catch (err) {
            console.error(" Search failed:", err);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border border-gray-100 group">
            
            {/* SEARCH BOX */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-2">
                <div className="relative flex-1 group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-orange-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search your street or building..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm text-gray-800"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
                    />
                    {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" size={18} />}
                </div>

                <button
                    onClick={handleDetectLocation}
                    disabled={detecting}
                    className="p-3.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl text-orange-500 hover:bg-orange-500 hover:text-white transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                    title="Detect My Location"
                >
                    {detecting ? <Loader2 size={22} className="animate-spin" /> : <Navigation size={22} />}
                </button>
            </div>

            {/* MAP CONTAINER */}
            <MapContainer
                center={[location?.lat || 28.6139, location?.lon || 77.209]}
                zoom={16}
                className="w-full h-full z-0"
                zoomControl={false} // Disable default zoom control
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap location={location} />

                {/* DRAGGABLE MARKER */}
                {location?.lat && (
                    <Marker
                        position={[location.lat, location.lon]}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                const { lat, lng } = e.target.getLatLng();
                                dispatch(setLocation({ lat, lon: lng }));
                                getAddressByLatLon(lat, lng);
                            },
                        }}
                    />
                )}
            </MapContainer>

            {/* ADDRESS INFO BAR */}
            {address && (
                <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm border border-gray-100 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                        <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Selected Location</p>
                        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed">
                            {address}
                        </p>
                    </div>
                </div>
            )}

            {/* GEO ERROR BAR */}
            {geoErrorMessage && (
                <div className="absolute bottom-4 left-4 right-4 z-[1001] bg-red-50 border border-red-200 p-3 rounded-xl shadow-md flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-red-700">{geoErrorMessage}</p>
                </div>
            )}
        </div>
    );
};

export default Map;
