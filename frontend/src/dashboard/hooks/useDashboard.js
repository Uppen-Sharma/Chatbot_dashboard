import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getStats,
  getPeakUsage,
  getFaqs,
  getUsers,
  deleteUser as apiDeleteUser,
} from "../../services/apiClient";

// Constants defined outside the hook so they're not recreated on every render
// Dynamic defaults: Jan 1 of this year → today (YTD range)
export const DEFAULT_START = `${new Date().getFullYear()}-01-01`;
export const DEFAULT_END = new Date().toISOString().split("T")[0];

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

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  // Date Range States
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);

  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortConfig, setSortConfig] = useState([]);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  // Fetch users once on mount, independent of date range
  useEffect(() => {
    setIsUsersLoading(true);
    getUsers()
      .then((data) => setUserData(data))
      .catch((err) => console.error("Failed to fetch users:", err))
      .finally(() => setIsUsersLoading(false));
  }, []);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    let isCancelled = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setIsError(false);

        const [statsData, chartRes, faqRes] = await Promise.all([
          getStats(startDate, endDate),
          getPeakUsage(startDate, endDate),
          getFaqs(startDate, endDate),
        ]);

        if (!isCancelled) {
          setDashboardStats(statsData);
          setChartData(chartRes);
          setFaqData(faqRes);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Trouble fetching dashboard data:", error);
          setIsError(true);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [startDate, endDate]);

  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
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
    windowDimensions.width < 768
      ? windowDimensions.width
      : Math.min(450, windowDimensions.width * 0.45);

  // Dynamically calculate table rows based on available vertical screen real estate.
  // The dashboard top elements (header, date picker, charts) consume roughly ~550px.
  // Each table row takes ~60px. We enforce a minimum of 5 rows for mobile/tablets.
  const usersPerPage = Math.max(
    5,
    Math.floor((windowDimensions.height - 550) / 60)
  );

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
    windowDimensions,
    sortConfig,
    handleSort,
    dashboardStats,
    chartData,
    faqData,
    isLoading,
    isUsersLoading,
    isError,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    deleteUser,
    DEFAULT_START,
    DEFAULT_END,
  };
}
