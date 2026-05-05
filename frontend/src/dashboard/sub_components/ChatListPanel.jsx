import React, { useState, useEffect } from "react";
import { X, ChevronRight, Trash2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getUserConversations, deleteConversation } from "../../services/apiClient";

export default function ChatListPanel({
  selectedUser,
  activeChatId,
  setActiveChatId,
  closeChat,
  showConversation,
  isChatOpen,
}) {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Track fetch errors separately so we can show a distinct message
  const [fetchError, setFetchError] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [confirmingChatId, setConfirmingChatId] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!selectedUser) return;

    setIsLoading(true);
    setFetchError(false);
    setChats([]);

    getUserConversations(selectedUser.id)
      .then((data) => {
        setChats(data);
        const isDesktop = window.innerWidth >= 768;
        setActiveChatId(isDesktop && data.length > 0 ? data[0].id : null);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load chats:", err);
        setFetchError(true);
        setIsLoading(false);
      });
  }, [selectedUser, setActiveChatId]);

  useEffect(() => {
    if (!isChatOpen) {
      setConfirmingChatId(null);
    }
  }, [isChatOpen]);

  const handleDeleteChat = async (chatId) => {
    try {
      setDeletingChatId(chatId);
      await deleteConversation(chatId);

      setChats((prev) => {
        const nextChats = prev.filter((chat) => chat.id !== chatId);

        setActiveChatId((currentId) => {
          if (currentId !== chatId) return currentId;
          return nextChats.length > 0 ? nextChats[0].id : null;
        });

        return nextChats;
      });
      setConfirmingChatId(null);
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setConfirmingChatId(null);
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#E7E9F0] shrink-0">
        <span className="font-semibold text-black text-base">{t("chat.header")}</span>
        {!showConversation && (
          <button
            onClick={closeChat}
            className="p-1.5 rounded-full text-gray-400 border border-transparent"
            aria-label="Close chat panel"
          >
            <X size={18} className="icon-wiggle" />
          </button>
        )}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto overflow-x-visible"
        onClick={() => setConfirmingChatId(null)}
      >
        {isLoading ? (
          <div className="p-5 text-center text-gray-500 text-sm font-normal">
            {t("loading.chats")}
          </div>
        ) : fetchError ? (
          // Distinct error state vs empty state
          <div className="p-5 text-center text-red-400 text-sm font-normal">
            {t("error.couldNotLoadChats")}
          </div>
        ) : chats.length === 0 ? (
          <div className="p-5 text-center text-gray-500 text-sm font-normal">
            {t("chat.noChats")}
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`group w-full text-left px-4 py-3 border-b border-[#E7E9F0] flex items-center justify-between gap-3 transition-colors duration-100 ${
                activeChatId === chat.id
                  ? "bg-[#B3D7EE]/20"
                  : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-normal text-black mb-1 truncate">
                  {chat.title}
                </p>
                <p className="text-xs text-gray-500">
                  {chat.lastMessageAt
                    ? new Date(chat.lastMessageAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : t("chat.noMessages")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmingChatId((prev) => (prev === chat.id ? null : chat.id));
                    }}
                    disabled={deletingChatId === chat.id}
                    className={`p-1.5 rounded-full transition-colors disabled:opacity-40 ${
                      confirmingChatId === chat.id ? "text-red-500" : "text-gray-400 hover:text-red-500"
                    }`}
                    aria-label={`Delete chat ${chat.title}`}
                  >
                    <Trash2 size={16} className="icon-wiggle" />
                  </button>

                  {confirmingChatId === chat.id && (
                    <div
                      className="absolute right-0 top-full mt-2 z-40 w-64 sm:w-72 whitespace-normal rounded-xl border border-red-100 bg-white p-3 text-left shadow-lg shadow-red-100/40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs leading-snug text-gray-600 whitespace-normal pr-1">
                          {t("chat.deletePrompt")}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingChatId(null)}
                          className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                        >
                          {t("chat.cancel")}
                        </button>
                        <button
                          type="button"
                          disabled={deletingChatId === chat.id}
                          onClick={() => handleDeleteChat(chat.id)}
                          className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                        >
                          {deletingChatId === chat.id ? t("chat.deleting") : t("chat.delete")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={`p-1.5 rounded-full transition-opacity ${
                    activeChatId === chat.id
                      ? "bg-[#B3D7EE]/40 text-[#007BC6]"
                      : "text-gray-400 opacity-100"
                  }`}
                >
                  <ChevronRight size={18} className="icon-nudge-r" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
