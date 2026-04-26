import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { serverURL } from "../config";

const api = axios.create({
  baseURL: serverURL,
  withCredentials: true,
});

// ✅ Automatically attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (config, options = {}) => {
    const {
      showToast = true,
      successMessage,
      errorMessage,
      onSuccess,
      onError,
    } = options;

    setLoading(true);
    setError(null);

    let toastId;
    if (showToast && (config.method !== "get" || options.loadingMessage)) {
      toastId = toast.loading(options.loadingMessage || "Processing...");
    }

    try {
      const response = await api(config);
      const data = response.data;

      if (data.success !== false) {
        if (showToast && toastId) {
          toast.success(successMessage || data.message || "Action successful", { id: toastId });
        } else if (showToast && config.method !== "get") {
          toast.success(successMessage || data.message || "Action successful");
        }

        if (onSuccess) onSuccess(data);
        return { data, error: null };
      } else {
        throw new Error(data.message || "Action failed");
      }
    } catch (err) {
      const isNetworkError =
        err?.code === "ERR_NETWORK" ||
        (!err?.response && /network error/i.test(String(err?.message || "")));
      const backendUrlHint =
        serverURL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const networkErrorMessage = `Cannot reach backend (${backendUrlHint}). Please start backend and verify port/env settings.`;

      const msg =
        errorMessage ||
        err.response?.data?.message ||
        (isNetworkError ? networkErrorMessage : err.message) ||
        "Something went wrong. Please try again.";

      setError(msg);

      if (showToast) {
        if (toastId) {
          toast.error(msg, { id: toastId });
        } else {
          toast.error(msg);
        }
      }

      if (onError) onError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};

export default api;