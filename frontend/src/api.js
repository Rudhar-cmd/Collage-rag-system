// Use the same backend for authentication, chat, and syllabus requests.
const configuredUrl = import.meta.env.VITE_API_URL?.trim();
export const API_URL = (configuredUrl || (import.meta.env.DEV ? "http://127.0.0.1:8003" : "")).replace(/\/+$/, "");

export function authErrorMessage(error, fallback) {
  const message = error.response?.data?.error;
  if (typeof message === "string") return message;
  if (!error.response) {
    return "Unable to reach the server. Please wait a moment and try again.";
  }
  return fallback;
}
