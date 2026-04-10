const BASE_URL = "http://localhost:5000/api";

export const getStats = (start, end) => fetch(`${BASE_URL}/stats?start=${start}&end=${end}`);
export const getPeakUsage = (start, end) => fetch(`${BASE_URL}/peak-usage?start=${start}&end=${end}`);
export const getFaqs = (start, end) => fetch(`${BASE_URL}/faqs?start=${start}&end=${end}`);
export const getUsers = () => fetch(`${BASE_URL}/users`);
export const deleteUser = (userId) => fetch(`${BASE_URL}/users/${userId}`, { method: 'DELETE' });
export const getUserChats = (userId) => fetch(`${BASE_URL}/users/${userId}/chats`);
export const getChatMessages = (chatId) => fetch(`${BASE_URL}/chats/${chatId}/messages`);
