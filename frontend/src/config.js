const rawApiUrl = import.meta.env.VITE_API_URL;
export const serverURL = typeof rawApiUrl === "string" ? rawApiUrl.trim() : "";
// If empty string, axios will use relative path which is proxied by Vite in dev
