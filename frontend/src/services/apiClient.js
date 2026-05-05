// Read base URL from environment variable so it works in staging/prod.
const BASE_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:5000";

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export const getStats = (start, end) =>
  apiFetch(`${BASE_URL}/stats?start=${start}&end=${end}`);

export const getPeakUsage = (start, end, bucket) => {
  const params = new URLSearchParams({ start, end });
  if (bucket) params.set("bucket", bucket);
  return apiFetch(`${BASE_URL}/peak-usage?${params.toString()}`);
};

export const getFaqs = (start, end) =>
  apiFetch(`${BASE_URL}/faqs?start=${start}&end=${end}`);

export const getUsers = () => apiFetch(`${BASE_URL}/users`);

export const getUserConversations = (userId) =>
  apiFetch(`${BASE_URL}/users/${userId}/conversations`);

export const getConversationMessages = (conversationId) =>
  apiFetch(`${BASE_URL}/conversations/${conversationId}/messages`);

export const deleteConversation = (conversationId) =>
  apiFetch(`${BASE_URL}/conversations/${conversationId}`, { method: "DELETE" });

export const uploadFile = async (file, fileType, overwrite = false) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);
  if (overwrite) formData.append("confirm_reupload", "true");

  const res = await fetch(`${BASE_URL}/upload-file`, {
    method: "POST",
    body: formData,
  });
  // 409 means the file already exists — return a sentinel instead of throwing
  if (res.status === 409) return { file_exists: true };
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
};

export const translateTexts = async (texts, targetLang) => {
  const data = await apiFetch(`${BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, target_lang: targetLang }),
  });
  return data.translated;
};
