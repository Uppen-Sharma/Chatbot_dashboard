import React, { useState, useEffect, useRef, memo } from "react";
import { X, MessageSquare, ChevronLeft } from "lucide-react";
import { parseBold } from "../utils/helpers";
import { getConversationMessages } from "../../services/apiClient";
import { useTranslation } from "react-i18next";

// Memoized message bubble
const MessageBubble = memo(({ message, delayClass = "" }) => (
  <div
    className={`flex message-onload ${delayClass} ${message.type === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[92%] sm:max-w-[85%] px-3 sm:px-4 py-2.5 rounded-2xl text-[15px] sm:text-base leading-relaxed whitespace-pre-line wrap-break-word shadow-sm border ${
        message.type === "user"
          ? "bg-[#007BC6] text-white border-[#007BC6] rounded-br-sm"
          : "bg-[#E7E9F0] border-[#E7E9F0] text-gray-800 rounded-bl-sm"
      }`}
    >
      {parseBold(message.text)}
    </div>
  </div>
));

MessageBubble.displayName = "MessageBubble";

export default function ChatConversation({
  selectedUser,
  activeChatId,
  setActiveChatId,
  closeChat,
}) {
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Separate error state for message loading
  const [fetchError, setFetchError] = useState(false);
  const { t } = useTranslation();


  useEffect(() => {
    if (!activeChatId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
     
    setFetchError(false);
     
    setMessages([]);

    getConversationMessages(activeChatId)
      .then((data) => {
        setMessages(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Could not load messages", error);
        setFetchError(true);
        setIsLoading(false);
      });
  }, [activeChatId]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (activeChatId && bottomRef.current && !isLoading) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChatId, isLoading]);

  if (!activeChatId) {
    return (
      <div className="hidden md:flex h-full bg-white items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <div className="bg-[#E7E9F0] p-4 rounded-full inline-flex items-center justify-center mb-3">
            <MessageSquare size={22} className="text-[#94A3B8]" />
          </div>
          <p className="text-gray-700 font-semibold text-sm">{t("chat.selectChat")}</p>
          <p className="text-gray-500 text-xs mt-1">{t("chat.chooseChat")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative panel-onload">
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#E7E9F0] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveChatId(null)}
            className="md:hidden p-1.5 rounded-full text-gray-400 border border-transparent"
            aria-label="Back to chats"
          >
            <ChevronLeft size={18} className="icon-nudge-l" />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-black text-base">
              {selectedUser?.name || "Unknown User"}
            </span>
            <span className="text-xs text-gray-500">
              {selectedUser?.handle || "@user"}
            </span>
          </div>
        </div>
        <button
          onClick={closeChat}
          className="p-1.5 rounded-full text-gray-400 border border-transparent hover-soft"
          aria-label="Close conversation"
        >
          <X size={18} className="icon-wiggle" />
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 px-3 sm:px-4 py-3 overflow-y-auto flex flex-col gap-3 bg-white">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-gray-500 font-normal text-sm">
            {t("loading.chats")}
          </div>
        ) : fetchError ? (
          // Distinct error state
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="bg-red-50 p-4 rounded-full">
              <MessageSquare size={22} className="text-red-300 icon-float" />
            </div>
            <p className="text-red-400 text-sm font-normal">
              {t("chat.loadError")}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="bg-[#E7E9F0] p-4 rounded-full">
              <MessageSquare size={22} className="text-[#94A3B8] icon-float" />
            </div>
            <p className="text-gray-500 text-sm font-normal">
              {t("chat.noChats")}
            </p>
          </div>
        ) : (
          // Use memoized MessageBubble component
          messages.map((m, idx) => {
            const delayClass =
              idx % 4 === 0
                ? ""
                : idx % 4 === 1
                  ? "delay-50"
                  : idx % 4 === 2
                    ? "delay-100"
                    : "delay-150";

            return <MessageBubble key={m.id} message={m} delayClass={delayClass} />;
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
