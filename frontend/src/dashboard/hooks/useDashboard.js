import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getStats,
  getPeakUsage,
  getFaqs,
  getUsers,
} from "../../services/apiClient";

const formatIsoLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const today = new Date();
const startOfCurrentWeek = new Date(today);
const dayOfWeek = (today.getDay() + 6) % 7;
startOfCurrentWeek.setDate(today.getDate() - dayOfWeek);

export const DEFAULT_START = formatIsoLocalDate(startOfCurrentWeek);
export const DEFAULT_END = formatIsoLocalDate(today);

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
  const [peakUsageBucket, setPeakUsageBucket] = useState("day");

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

    setIsLoading(true);
    setChartData([]);

    debounceRef.current = setTimeout(async () => {
      try {
        setIsError(false);

        const [statsData, chartRes, faqRes] = await Promise.all([
          getStats(startDate, endDate),
          getPeakUsage(startDate, endDate, peakUsageBucket),
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
  }, [startDate, endDate, peakUsageBucket]);

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
  }, []);

  const showConversation = activeChatId !== null;
  const panelWidth =
    windowDimensions.width < 768
      ? windowDimensions.width
      : Math.min(450, windowDimensions.width * 0.45);

  // Keep pagination predictable: always show 10 users per page.
  const usersPerPage = 10;

  const totalUsers = userData.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / usersPerPage));

  const displayedUsers = useMemo(() => {
    const pageSlice = userData.slice(
      (currentPage - 1) * usersPerPage,
      currentPage * usersPerPage,
    );
    if (sortConfig.length === 0) return pageSlice;
    return [...pageSlice].sort((a, b) => {
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
  }, [sortConfig, userData, currentPage, usersPerPage]);

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
    peakUsageBucket,
    setPeakUsageBucket,
    DEFAULT_START,
    DEFAULT_END,
  };
}
