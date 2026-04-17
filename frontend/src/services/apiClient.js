// Read base URL from environment variable so it works in staging/prod.
const BASE_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:5000/api";


const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export const getStats = (start, end) =>
  apiFetch(`${BASE_URL}/stats?start=${start}&end=${end}`);

export const getPeakUsage = (start, end) =>
  apiFetch(`${BASE_URL}/peak-usage?start=${start}&end=${end}`);

export const getFaqs = (start, end) =>
  apiFetch(`${BASE_URL}/faqs?start=${start}&end=${end}`);

export const getUsers = () => apiFetch(`${BASE_URL}/users`);

export const deleteUser = (userId) =>
  apiFetch(`${BASE_URL}/users/${userId}`, { method: "DELETE" });

export const getUserChats = (userId) =>
  apiFetch(`${BASE_URL}/users/${userId}/chats`);

export const getChatMessages = (chatId) =>
  apiFetch(`${BASE_URL}/chats/${chatId}/messages`);
