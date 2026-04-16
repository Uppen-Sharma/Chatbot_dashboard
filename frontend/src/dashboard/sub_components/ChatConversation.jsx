import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, MessageSquare } from "lucide-react";
import { parseBold } from "../utils/helpers";
import { getChatMessages } from "../../services/apiClient";

// Memoized message bubble so parseBold doesn't re-run on unrelated re-renders
const MessageBubble = React.memo(({ message }) => (
  <div
    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-base leading-relaxed whitespace-pre-line shadow-sm border ${
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
}) {
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Separate error state for message loading
  const [fetchError, setFetchError] = useState(false);

  // apiClient now returns parsed JSON directly — no .json() call needed
  useEffect(() => {
    if (!activeChatId) return;

    setIsLoading(true);
    setFetchError(false);
    setMessages([]);

    getChatMessages(activeChatId)
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

  if (!activeChatId) return null;

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between px-5 h-20 border-b border-[#E7E9F0] shrink-0">
        <span className="font-semibold text-black text-base">Conversation</span>
        <button
          onClick={() => setActiveChatId(null)}
          className="p-1.5 rounded-full text-gray-400 border border-transparent hover:text-black hover:bg-white hover:shadow-md hover:border-[#94A3B8]/30 hover:-translate-y-0.5 transition-all duration-300"
          aria-label="Close conversation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 px-6 pb-10 overflow-y-auto flex flex-col gap-6 bg-white pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-gray-500 font-normal text-sm">
            Loading conversation...
          </div>
        ) : fetchError ? (
          // Distinct error state
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="bg-red-50 p-4 rounded-full">
              <MessageSquare size={22} className="text-red-300" />
            </div>
            <p className="text-red-400 text-sm font-normal">
              Could not load messages. Please try again.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="bg-[#E7E9F0] p-4 rounded-full">
              <MessageSquare size={22} className="text-[#94A3B8]" />
            </div>
            <p className="text-gray-500 text-sm font-normal">
              No messages in this conversation yet.
            </p>
          </div>
        ) : (
          // Use memoized MessageBubble component
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
