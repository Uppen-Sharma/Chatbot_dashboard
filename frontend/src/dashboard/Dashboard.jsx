import React from "react";
import { Globe, ChevronDown, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useDashboard } from "./hooks/useDashboard";
import StatCards from "./sub_components/StatCards";
import PeakUsage from "./sub_components/PeakUsage";
import UsersTable from "./sub_components/UsersTable";
import ChatListPanel from "./sub_components/ChatListPanel";
import ChatConversation from "./sub_components/ChatConversation";

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    currentPage,
    setCurrentPage,
    isChatOpen,
    activeChatId,
    setActiveChatId,
    selectedUser,
    openChat,
    closeChat,
    showConversation,
    panelWidth,
    totalUsers,
    totalPages,
    displayedUsers,
    sortConfig,
    handleSort,
    dashboardStats,
    chartData,
    faqData,
    isLoading,
    isError,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    deleteUser,
    DEFAULT_START,
    DEFAULT_END,
  } = useDashboard();

  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [tempStart, setTempStart] = React.useState("");
  const [tempEnd, setTempEnd] = React.useState("");
  const pickerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        if (isPickerOpen) {
          const finalStart = tempStart || DEFAULT_START;
          const finalEnd = tempEnd || DEFAULT_END;
          setStartDate(finalStart);
          setEndDate(finalEnd);
          setIsPickerOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen, tempStart, tempEnd, setStartDate, setEndDate, DEFAULT_START, DEFAULT_END]);

  const handleOpenPicker = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsPickerOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const finalStart = tempStart || DEFAULT_START;
      const finalEnd = tempEnd || DEFAULT_END;
      setStartDate(finalStart);
      setEndDate(finalEnd);
      setIsPickerOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  if (isLoading && (!dashboardStats || dashboardStats.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">
          Loading your live dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#E7E9F0] fixed top-0 left-0 w-full h-20 z-40">
        <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 flex-shrink-0">
              <img
                src="/Tanuki-new 1.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-black text-4xl tracking-tight leading-none">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="hidden sm:flex items-center justify-center gap-2 bg-white px-5 py-2.5 border border-[#E7E9F0] rounded-full shadow-sm text-sm font-semibold text-black hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 cursor-pointer">
              <Globe size={16} className="text-gray-500" />
              <span className="tracking-wide">English</span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-white px-5 py-2.5 border border-[#E7E9F0] rounded-full shadow-sm text-sm font-semibold text-black hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 cursor-pointer tracking-wide"
            >
              Log out
            </button>
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#E7E9F0] hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 cursor-pointer flex-shrink-0">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-black tracking-tight">
            Performance Dashboard
          </h1>
          <div className="relative group z-50" ref={pickerRef}>
            <div 
              onClick={handleOpenPicker}
              className="bg-white px-5 py-2.5 rounded-full border border-[#E7E9F0] shadow-sm flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 cursor-pointer"
            >
              <CalendarDays
                size={16}
                className="text-gray-500 group-hover:text-[#007BC6] transition-colors"
              />
              <span className="text-gray-500 font-bold mb-0.5">:</span>
              <span className="text-xs font-semibold text-black tracking-wide">
                {startDate ? startDate.split("-").reverse().join("-") : ""} <span className="text-gray-500 mx-1">to</span> {endDate ? endDate.split("-").reverse().join("-") : ""}
              </span>
            </div>
            
            {isPickerOpen && (
              <div className="absolute left-0 w-full top-full mt-2 bg-white border border-[#E7E9F0] rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">From</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-sm font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 border border-[#E7E9F0] rounded-xl px-3 py-2 outline-none focus:border-[#007BC6] focus:ring-2 focus:ring-[#007BC6]/10 transition-all cursor-pointer w-full box-border"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">To</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-sm font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 border border-[#E7E9F0] rounded-xl px-3 py-2 outline-none focus:border-[#007BC6] focus:ring-2 focus:ring-[#007BC6]/10 transition-all cursor-pointer w-full box-border"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="delay-100 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
          <StatCards stats={dashboardStats} />
        </div>

        <div className="delay-200 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
          <PeakUsage
            chartData={chartData}
            faqData={faqData}
          />
        </div>

        <div className="delay-300 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
          <UsersTable
            openChat={openChat}
            users={displayedUsers}
            totalUsers={totalUsers}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            sortConfig={sortConfig}
            handleSort={handleSort}
            deleteUser={deleteUser}
          />
        </div>
      </main>

      {/* Chat overlays and panels */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        style={{
          opacity: isChatOpen ? 1 : 0,
          pointerEvents: isChatOpen ? "auto" : "none",
        }}
        onClick={closeChat}
      />

      <div
        className="fixed top-0 right-0 h-screen z-50 pointer-events-none flex flex-row"
        style={{
          width: `${panelWidth * 2}px`,
          transition: "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isChatOpen ? "-20px 0 50px rgba(0,0,0,0.1)" : "none",
          transform: !isChatOpen
            ? `translateX(${panelWidth * 2}px)`
            : showConversation
              ? "translateX(0px)"
              : `translateX(${panelWidth}px)`,
        }}
      >
        <div
          className="h-full shrink-0 bg-white shadow-2xl border-l border-[#E7E9F0] pointer-events-auto overflow-hidden"
          style={{ width: `${panelWidth}px` }}
        >
          <ChatListPanel
            selectedUser={selectedUser}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            closeChat={closeChat}
          />
        </div>
        <div
          className="h-full shrink-0 bg-white border-l border-[#E7E9F0] pointer-events-auto overflow-hidden"
          style={{
            width: `${panelWidth}px`,
            boxShadow: "-10px 0 15px -3px rgba(0,0,0,0.05)",
          }}
        >
          <ChatConversation
            selectedUser={selectedUser}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
          />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
        }}
      />
    </div>
  );
}
