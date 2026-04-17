import React, { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";

import { getUserChats } from "../../services/apiClient";

export default function ChatListPanel({
  selectedUser,
  activeChatId,
  setActiveChatId,
  closeChat,
}) {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Track fetch errors separately so we can show a distinct message
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!selectedUser) return;

    setIsLoading(true);
    setFetchError(false);
    setChats([]);

    getUserChats(selectedUser.id)
      .then((data) => {
        setChats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load chats:", err);
        setFetchError(true);
        setIsLoading(false);
      });
  }, [selectedUser]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-[#E7E9F0] shrink-0">
        <span className="font-semibold text-black text-base">Chats</span>
        <button
          onClick={closeChat}
          className="p-1.5 rounded-full text-gray-400 border border-transparent hover:text-black hover:bg-white hover:shadow-md hover:border-[#94A3B8]/30 hover:-translate-y-0.5 transition-all duration-300"
          aria-label="Close chat panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Sub Header - User info */}
      <div className="px-5 py-4 border-b border-[#E7E9F0] shrink-0 bg-gray-100">
        <div className="flex flex-col">
          <div className="font-semibold text-black mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {selectedUser ? selectedUser.name : "Unknown User"}
          </div>
          <div className="text-gray-500 text-sm">
            {selectedUser?.handle || "@user"}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 text-center text-gray-500 text-sm font-normal">
            Loading chats...
          </div>
        ) : fetchError ? (
          // Distinct error state vs empty state
          <div className="p-5 text-center text-red-400 text-sm font-normal">
            Could not load chats. Please try again.
          </div>
        ) : chats.length === 0 ? (
          <div className="p-5 text-center text-gray-500 text-sm font-normal">
            No recent chats found.
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`group w-full text-left px-5 py-6 border-b border-[#E7E9F0] flex items-center justify-between gap-3 transition-colors duration-100 ${
                activeChatId === chat.id
                  ? "bg-[#B3D7EE]/20"
                  : "hover:bg-gray-50"
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
                    : "No messages yet"}
                </p>
              </div>
              <div
                className={`p-1.5 rounded-full transition-opacity ${
                  activeChatId === chat.id
                    ? "bg-[#B3D7EE]/40 text-[#007BC6]"
                    : "text-gray-400 opacity-0 group-hover:opacity-100"
                }`}
              >
                <ChevronRight size={18} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
