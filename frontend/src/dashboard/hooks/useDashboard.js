import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getStats,
  getPeakUsage,
  getFaqs,
  getUsers,
  deleteUser as apiDeleteUser,
} from "../../services/apiClient";

// Constants defined outside the hook so they're not recreated on every render
export const DEFAULT_START = "2026-01-01";
export const DEFAULT_END = "2026-03-01";

function parseDuration(str = "") {
  const minSec = str?.match(/(\d+)m\s*(\d+)s/);
  if (minSec) return parseInt(minSec[1]) * 60 + parseInt(minSec[2]);
  const minOnly = str?.match(/(\d+)m/);
  if (minOnly && !str.includes("s")) return parseInt(minOnly[1]) * 60;
  const secOnly = str?.match(/(\d+)s/);
  return secOnly ? parseInt(secOnly[1]) : 0;
}

export function useDashboard() {
  // Data States
  const [userData, setUserData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [faqData, setFaqData] = useState([]);

  // Added isError state (was destructured in Dashboard.jsx but never returned)
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Date Range States
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);

  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortConfig, setSortConfig] = useState([]);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  // Fetch users once on mount, independent of date range
  useEffect(() => {
    getUsers()
      .then((data) => setUserData(data))
      .catch((err) => console.error("Failed to fetch users:", err));
  }, []);

  // Debounce date changes so rapid input doesn't fire multiple requests
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    // Clear any pending fetch before scheduling a new one
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setIsError(false);

        // apiClient now returns parsed JSON directly — no .json() needed
        const [statsData, chartRes, faqRes] = await Promise.all([
          getStats(startDate, endDate),
          getPeakUsage(startDate, endDate),
          getFaqs(startDate, endDate),
        ]);

        setDashboardStats(statsData);
        setChartData(chartRes);
        setFaqData(faqRes);
      } catch (error) {
        console.error("Trouble fetching dashboard data:", error);
        setIsError(true); // actually set error state
      } finally {
        setIsLoading(false);
      }
    }, 350); // 350ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [startDate, endDate]);

  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setWindowWidth(window.innerWidth), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const openChat = useCallback((user) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    setActiveChatId(null);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setTimeout(() => {
      setSelectedUser(null);
      setActiveChatId(null);
    }, 600);
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      const active = prev.find((item) => item.key === key);
      if (active) return [{ key, dir: active.dir === "high" ? "low" : "high" }];
      return [{ key, dir: "high" }];
    });
    setCurrentPage(1);
  }, []);

  const showConversation = activeChatId !== null;
  const panelWidth =
    windowWidth < 768 ? windowWidth : Math.min(450, windowWidth * 0.45);
  const usersPerPage =
    windowWidth < 640
      ? 5
      : windowWidth < 1024
        ? 8
        : windowWidth < 1440
          ? 10
          : 15;

  const sortedData = useMemo(() => {
    if (sortConfig.length === 0) return userData;
    return [...userData].sort((a, b) => {
      for (let rule of sortConfig) {
        let aVal = 0,
          bVal = 0;
        if (rule.key === "rating") {
          aVal = a.rating;
          bVal = b.rating;
        } else if (rule.key === "convos") {
          aVal = parseInt(String(a.convos).replace(/,/g, "")) || 0;
          bVal = parseInt(String(b.convos).replace(/,/g, "")) || 0;
        } else if (rule.key === "avgDur") {
          aVal = parseDuration(a.avgDur);
          bVal = parseDuration(b.avgDur);
        }
        const diff = rule.dir === "high" ? bVal - aVal : aVal - bVal;
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }, [sortConfig, userData]);

  const totalUsers = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / usersPerPage));
  const displayedUsers = sortedData.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [usersPerPage]);

  useEffect(() => {
    document.body.style.overflow = isChatOpen ? "hidden" : "";
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isChatOpen) closeChat();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isChatOpen, closeChat]);

  const deleteUser = async (userId) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this user?")
    )
      return;
    try {
      await apiDeleteUser(userId);
      setUserData((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) closeChat();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete user. Please try again.");
    }
  };

  return {
    currentPage,
    setCurrentPage,
    isChatOpen,
    setIsChatOpen,
    activeChatId,
    setActiveChatId,
    selectedUser,
    setSelectedUser,
    openChat,
    closeChat,
    showConversation,
    panelWidth,
    usersPerPage,
    totalUsers,
    totalPages,
    displayedUsers,
    windowWidth,
    sortConfig,
    handleSort,
    dashboardStats,
    chartData,
    faqData,
    isLoading,
    isError, // now actually returned
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    deleteUser,
    DEFAULT_START,
    DEFAULT_END,
  };
}
