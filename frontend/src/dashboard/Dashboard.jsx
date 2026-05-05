import {useState, useEffect, useMemo, useCallback, useRef} from "react";
import { Globe, ChevronDown, CalendarDays, AlertCircle, LogOut, X, UploadCloud, User, CircleUserRound, LucideUserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Datepicker } from "@ijavad805/react-datepicker";
import { useTranslation } from "react-i18next";
import {
  endOfMonth,
  endOfWeek,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import { useDashboard } from "./hooks/useDashboard";
import StatCards from "./sub_components/StatCards";
import PeakUsage from "./sub_components/PeakUsage";
import UsersTable from "./sub_components/UsersTable";
import ChatListPanel from "./sub_components/ChatListPanel";
import ChatConversation from "./sub_components/ChatConversation";
import UploadModal from "./sub_components/UploadModal";

const LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "ja", nativeLabel: "日本語" },
  { code: "cn", nativeLabel: "繁體中文" },
];

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
    totalUsers,
    totalPages,
    displayedUsers,
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
    setPeakUsageBucket,
    DEFAULT_START,
    DEFAULT_END,
  } = useDashboard();

  const pickerRef = useRef(null);
  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);
  const { i18n, t } = useTranslation();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isYearFilterOpen, setIsYearFilterOpen] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(startDate || DEFAULT_START);
  const [draftEndDate, setDraftEndDate] = useState(endDate || DEFAULT_END);
  const [draftYear, setDraftYear] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(null);
  const todayIso = new Date().toISOString().split("T")[0];
  // const todayDate = useMemo(() => new Date(`${todayIso}T00:00:00`), [todayIso]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const datePickerMinDate = useMemo(
    () => new Date(`${currentYear - 10}-01-01T00:00:00`),
    [currentYear],
  );
  const datePickerMinIso = useMemo(
    () => datePickerMinDate.toISOString().split("T")[0],
    [datePickerMinDate],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
        setIsYearFilterOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDatePickerOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftStartDate(startDate || DEFAULT_START);
       
      setDraftEndDate(endDate || DEFAULT_END);
    }
  }, [isDatePickerOpen, startDate, endDate, DEFAULT_START, DEFAULT_END]);

  const formatIsoDate = (value) => format(value, "yyyy-MM-dd");

  const yearFilterOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  const presetRanges = useMemo(() => {
    const now = new Date();
    const clampEndToToday = (dateValue) => {
      const isoValue = formatIsoDate(dateValue);
      return isoValue > todayIso ? todayIso : isoValue;
    };

    return {
      week: {
        label: t("dateFilter.thisWeek"),
        start: formatIsoDate(startOfWeek(now, { weekStartsOn: 1 })),
        end: clampEndToToday(endOfWeek(now, { weekStartsOn: 1 })),
      },
      month: {
        label: t("dateFilter.thisMonth"),
        start: formatIsoDate(startOfMonth(now)),
        end: clampEndToToday(endOfMonth(now)),
      },
      quarter: {
        label: t("dateFilter.quarterly"),
        start: formatIsoDate(subMonths(now, 3)),
        end: todayIso,
      },
    };
  }, [todayIso, t]);

  const getBucketByRange = useCallback((startIso, endIso) => {
    const from = parseISO(`${startIso}T00:00:00`);
    const to = parseISO(`${endIso}T00:00:00`);
    const daySpan = Math.max(0, differenceInCalendarDays(to, from));

    if (daySpan <= 7) return "day";
    if (daySpan <= 31) return "week";
    return "month";
  }, []);

  const formatDisplayDate = (value) => {
    if (!value) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  };

  // const parseIsoToDate = (value, fallbackValue) => {
  //   const parsedValue = value ? parseISO(value) : null;

  //   if (!parsedValue || Number.isNaN(parsedValue.getTime())) {
  //     return parseISO(`${fallbackValue}T00:00:00`);
  //   }

  //   return parsedValue;
  // };

  const toggleDatePicker = () => {
    if (isDatePickerOpen) {
      setIsDatePickerOpen(false);
      return;
    }

    setIsYearFilterOpen(false);
    setDraftStartDate(startDate || DEFAULT_START);
    setDraftEndDate(endDate || DEFAULT_END);
    setIsDatePickerOpen(true);
  };

  const toggleYearFilter = () => {
    if (isYearFilterOpen) {
      setIsYearFilterOpen(false);
      return;
    }

    setIsDatePickerOpen(false);
    setIsYearFilterOpen(true);
  };

  const handleApplyDateRange = () => {
    const normalizedStart = draftStartDate <= draftEndDate ? draftStartDate : draftEndDate;
    const normalizedEnd = draftEndDate >= draftStartDate ? draftEndDate : draftStartDate;
    const nextBucket = getBucketByRange(normalizedStart, normalizedEnd);

    if (
      normalizedStart === startDate
      && normalizedEnd === endDate
      && !isDatePickerOpen
    ) {
      return;
    }

    if (normalizedStart !== startDate) {
      setStartDate(normalizedStart);
    }
    if (normalizedEnd !== endDate) {
      setEndDate(normalizedEnd);
    }
    setSelectedYear(null);
    setPeakUsageBucket(nextBucket);
    if (isDatePickerOpen) {
      setIsDatePickerOpen(false);
    }
  };

  const handleApplyYearFilter = () => {
    const nextStartDate = `${draftYear}-01-01`;
    const nextEndDate = draftYear === currentYear ? todayIso : `${draftYear}-12-31`;

    if (nextStartDate !== startDate) {
      setStartDate(nextStartDate);
    }
    if (nextEndDate !== endDate) {
      setEndDate(nextEndDate);
    }

    setSelectedYear(draftYear);
    setPeakUsageBucket("month");
    setIsYearFilterOpen(false);
  };

  const handlePresetSelect = (presetKey) => {
    const preset = presetRanges[presetKey];

    if (!preset) return;

    const nextBucket =
      presetKey === "week"
        ? "day"
        : presetKey === "month"
          ? "week"
          : "month";

    if (
      preset.start === startDate
      && preset.end === endDate
      && !isDatePickerOpen
    ) {
      return;
    }

    if (preset.start !== startDate) {
      setStartDate(preset.start);
    }
    if (preset.end !== endDate) {
      setEndDate(preset.end);
    }
    setSelectedYear(null);
    setPeakUsageBucket(nextBucket);
    if (isDatePickerOpen) {
      setIsDatePickerOpen(false);
    }
    if (isYearFilterOpen) {
      setIsYearFilterOpen(false);
    }
  };

  const activePresetKey = useMemo(() => {
    const matchedPreset = Object.entries(presetRanges).find(([, preset]) => {
      return startDate === preset.start && endDate === preset.end;
    });

    return matchedPreset?.[0] || null;
  }, [endDate, presetRanges, startDate]);

  // Custom date range is "active" when no preset tab and no year filter is driving the range
  const isCustomDateActive = !activePresetKey && !selectedYear;

  const selectedPeriodLabel = useMemo(() => {
    if (activePresetKey === "week") return t("dateFilter.thisWeekLabel");
    if (activePresetKey === "month") return t("dateFilter.thisMonthLabel");
    if (activePresetKey === "quarter") return t("dateFilter.lastThreeMonths");
    if (selectedYear) return String(selectedYear);

    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }

    return t("dateFilter.selectedRange");
  }, [activePresetKey, selectedYear, startDate, endDate, t]);

  const peakUsageChartData = useMemo(() => {
    if (activePresetKey === "quarter" && chartData.length > 3) {
      return chartData.slice(-3);
    }
    return chartData;
  }, [activePresetKey, chartData]);

  //this auth uses localStorage which can be spoofed in devtools.
  //For production, validate a signed token server-side instead.
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  if (isLoading && (!dashboardStats || dashboardStats.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">
          {t("loading.dashboard")}
        </p>
      </div>
    );
  }

  if (isError && (!dashboardStats || dashboardStats.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-gray-700 font-semibold">
            {t("error.failedToLoad")}
          </p>
          <p className="text-gray-500 text-sm">
            {t("error.serverUnreachable")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 bg-[#007BC6] text-white text-sm font-semibold rounded-full"
          >
            {t("error.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#E7E9F0] fixed top-0 left-0 w-full h-16 sm:h-20 z-40">
        <div className="w-full h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0">
              <img
                src="/Tanuki-new 1.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-black text-sm sm:text-xl tracking-tight leading-tight truncate">
              {t("header.title")}
            </span>
          </div>

          {/* Language selector stays in header */}
          <div className="flex items-center gap-2 sm:gap-3 z-50">
            {/* Language dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen((prev) => !prev)}
                className="hidden sm:flex items-center justify-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm text-sm font-semibold text-black cursor-pointer brand-gradient-border-hover"
              >
                <Globe size={16} className="text-gray-500 icon-orbit" />
                <span className="tracking-wide">
                  {LANGUAGES.find((l) => l.code === i18n.language)?.nativeLabel ?? "English"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${isLangMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-[#E7E9F0] bg-white shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 fill-mode-both">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left ${
                        i18n.language === lang.code
                          ? "bg-[#EEF5FB] text-[#007BC6]"
                          : "text-[#1E3A5F] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Globe
                        size={14}
                        className={i18n.language === lang.code ? "text-[#007BC6]" : "text-gray-400"}
                      />
                      <span>{lang.nativeLabel}</span>
                      {i18n.language === lang.code && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-[#007BC6]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`relative w-10 h-10 rounded-full overflow-hidden cursor-pointer shrink-0 brand-gradient-border-hover transition-all ${
                  isUserMenuOpen ? "ring-2 ring-[#007BC6]/30" : ""
                }`}
                aria-label="User menu"
              >
                <LucideUserRound   className="object-cover text-center mx-auto"/>
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-48 rounded-2xl border border-[#E7E9F0] bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 fill-mode-both overflow-hidden z-50">
                  {/* User label */}
                  <div className="px-4 py-3 border-b border-[#E7E9F0]">
                    <p className="text-xs font-semibold text-[#1E3A5F] truncate">{t("header.admin")}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{t("header.manageAccount")}</p>
                  </div>

                  {/* Actions */}
                  <div className="p-1.5 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsUploadModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#1E3A5F] hover:bg-[#EEF5FB] transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#EEF5FB] flex items-center justify-center shrink-0">
                        <UploadCloud size={14} className="text-[#007BC6] icon-bounce" />
                      </div>
                      {t("header.uploadFile")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                        <LogOut size={14} className="text-rose-500 icon-logout" />
                      </div>
                      {t("header.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-3 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-10 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-black tracking-tight">
            {t("dashboard.performanceOverview")}
          </h1>
          <div className="relative z-50 w-full xl:w-auto" ref={pickerRef}>
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 rounded-2xl xl:rounded-full bg-white/90 p-1.5 shadow-sm ring-1 ring-[#E7E9F0] backdrop-blur-sm">
              {Object.entries(presetRanges).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold tracking-tight transition-colors sm:min-w-26 xl:min-w-30 sm:text-center ${
                    activePresetKey === key
                      ? "bg-[#EEF5FB] text-[#1E3A5F]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="relative">
                <button
                  type="button"
                  disabled={isDatePickerOpen}
                  onClick={toggleYearFilter}
                  className={`flex items-center justify-between rounded-full border px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors min-w-30 sm:min-w-34 xl:min-w-35.5 ${
                    isDatePickerOpen
                      ? "bg-white border-[#D7E4F1] text-[#94A3B8] cursor-not-allowed opacity-70"
                      : selectedYear
                        ? "bg-[#EEF5FB] border-[#C4DBF0] text-[#1E3A5F]"
                        : "bg-white border-[#D7E4F1] text-[#475569] hover:border-[#C9D7E5]"
                  }`}
                >
                  <span className="truncate text-left">{selectedYear || t("dateFilter.yearly")}</span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 ml-2 transition-transform ${
                      isDatePickerOpen ? "text-[#94A3B8]" : "text-gray-500"
                    } ${isYearFilterOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isYearFilterOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[#D7E4F1] bg-[#F9FCFF] p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                      {t("dateFilter.selectYear")}
                    </label>
                    <div className="relative">
                      <select
                        value={draftYear}
                        onChange={(e) => setDraftYear(Number(e.target.value))}
                        className="w-full appearance-none rounded-lg border border-[#D7E4F1] bg-white pl-2.5 pr-8 py-2 text-xs font-semibold text-[#44536A] outline-none"
                      >
                        {yearFilterOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleApplyYearFilter}
                        className="rounded-lg bg-[#007BC6] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B95E9]"
                      >
                        {t("dateFilter.apply")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isYearFilterOpen}
                onClick={toggleDatePicker}
                className={`flex w-full sm:w-auto items-center gap-2 sm:gap-3 rounded-full border px-3 sm:px-5 py-2 sm:py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors sm:min-w-56 xl:min-w-64 ${
                  isYearFilterOpen
                    ? "bg-white border-[#D7E4F1] cursor-not-allowed opacity-70"
                    : isCustomDateActive
                      ? "bg-[#EEF5FB] border-[#C4DBF0]"
                      : "bg-white border-[#D7E4F1] hover:border-[#C9D7E5]"
                }`}
              >
                <CalendarDays
                  size={18}
                  className={`${
                    isYearFilterOpen
                      ? "text-[#94A3B8]"
                      : isCustomDateActive
                        ? "text-[#007BC6] icon-wiggle"
                        : "text-gray-500 icon-wiggle"
                  }`}
                />
                <span
                  className={`truncate text-xs sm:text-sm font-semibold tracking-tight ${
                    isYearFilterOpen
                      ? "text-[#94A3B8]"
                      : isCustomDateActive
                        ? "text-[#1E3A5F]"
                        : "text-[#475569]"
                  }`}
                >
                  {formatDisplayDate(startDate || DEFAULT_START)}
                  <span className="mx-1.5 text-[#94A3B8]">-</span>
                  {formatDisplayDate(endDate || DEFAULT_END)}
                </span>
              </button>
            </div>

            {isDatePickerOpen && (
              <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-full md:w-78 max-w-[calc(100vw-2rem)] rounded-xl border border-[#D7E4F1] bg-[#F9FCFF] p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {t("dateFilter.from")}
                      </label>
                      <Datepicker
                        lang="en"
                        theme="blue"
                        modeTheme="light"
                        format="YYYY-MM-DD"
                        closeIcon={<X size={14} strokeWidth={2.25} />}
                        closeIconClasses="text-[#64748B] hover:text-[#334155]"
                        value={draftStartDate}
                        adjustPosition="left-bottom"
                        closeWhenSelectADay
                        disabledDate={(date) => {
                          const iso = date.locale("en").format("YYYY-MM-DD");
                          return iso > todayIso || iso < datePickerMinIso;
                        }}
                        onChange={(val) => {
                          const nextIso = val?.locale("en").format("YYYY-MM-DD");
                          if (!nextIso) return;
                          setDraftStartDate(nextIso);
                          if (nextIso > draftEndDate) {
                            setDraftEndDate(nextIso);
                          }
                        }}
                        input={(
                          <input
                            className="w-full rounded-lg border border-[#D7E4F1] bg-white px-2.5 py-2 text-xs font-semibold text-[#44536A] outline-none"
                            placeholder="YYYY-MM-DD"
                          />
                        )}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {t("dateFilter.to")}
                      </label>
                      <Datepicker
                        lang="en"
                        theme="blue"
                        modeTheme="light"
                        format="YYYY-MM-DD"
                        closeIcon={<X size={14} strokeWidth={2.25} />}
                        closeIconClasses="text-[#64748B] hover:text-[#334155]"
                        value={draftEndDate}
                        adjustPosition="right-bottom"
                        closeWhenSelectADay
                        disabledDate={(date) => {
                          const iso = date.locale("en").format("YYYY-MM-DD");
                          return iso > todayIso || iso < draftStartDate;
                        }}
                        onChange={(val) => {
                          const nextIso = val?.locale("en").format("YYYY-MM-DD");
                          if (!nextIso) return;
                          setDraftEndDate(nextIso);
                        }}
                        input={(
                          <input
                            className="w-full rounded-lg border border-[#D7E4F1] bg-white px-2.5 py-2 text-xs font-semibold text-[#44536A] outline-none"
                            placeholder="YYYY-MM-DD"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={handleApplyDateRange}
                      className="rounded-lg bg-[#007BC6] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B95E9]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {t("dateFilter.apply")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keep this row mounted to avoid layout shift while refreshing */}
        <div className="h-0 overflow-visible flex items-center">
          <div
            className={`flex items-center gap-2 text-xs text-[#007BC6] font-semibold transition-opacity duration-200 ${
              isLoading && dashboardStats.length > 0 ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#007BC6] inline-block" />
            {t("loading.refreshing")}
          </div>
        </div>

        <div className="delay-100 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
          <StatCards
            stats={dashboardStats}
            isLoading={isLoading && dashboardStats.length === 0}
          />
        </div>

        <div className="delay-200 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both">
          <PeakUsage
            chartData={peakUsageChartData}
            faqData={faqData}
            isLoading={isLoading && peakUsageChartData.length === 0}
            periodLabel={selectedPeriodLabel}
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
            isLoading={isUsersLoading}
          />
        </div>
      </main>

      {/* Chat overlays and panels */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-300"
        style={{
          opacity: isChatOpen ? 1 : 0,
          pointerEvents: isChatOpen ? "auto" : "none",
        }}
        onClick={closeChat}
      >
        <div
          className="relative w-full h-full rounded-none overflow-hidden border border-[#E7E9F0] bg-white shadow-2xl sm:h-[88vh] sm:max-h-225 sm:max-w-240 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full w-full md:hidden">
            {showConversation ? (
              <ChatConversation
                selectedUser={selectedUser}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                closeChat={closeChat}
              />
            ) : (
              <ChatListPanel
                selectedUser={selectedUser}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                closeChat={closeChat}
                showConversation={showConversation}
                isChatOpen={isChatOpen}
              />
            )}
          </div>

          <div className="hidden md:grid h-full w-full grid-cols-[50%_50%]">
            <div className="h-full border-r border-[#E7E9F0] overflow-hidden">
              <ChatListPanel
                selectedUser={selectedUser}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                closeChat={closeChat}
                showConversation={showConversation}
                isChatOpen={isChatOpen}
              />
            </div>
            <div className="h-full overflow-hidden">
              <ChatConversation
                selectedUser={selectedUser}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                closeChat={closeChat}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
        }}
      />
    </div>
  );
}
