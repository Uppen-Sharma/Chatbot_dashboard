import React from "react";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Users,
} from "lucide-react";
import { generatePages, formatDuration } from "../utils/helpers";
import { useTranslation } from "react-i18next";

function SortIcon({ col, sortConfig }) {
  const activeItem = sortConfig.find((item) => item.key === col);
  const state = activeItem ? activeItem.dir : null;

  return (
    <span className="inline-flex flex-col ml-1 gap-0">
      <ChevronUp
        size={13}
        className={`-mb-0.5 icon-nudge-u ${
          state === "high"
            ? "text-[#007BC6]"
            : "text-gray-900"
        }`}
      />
      <ChevronDown
        size={13}
        className={`icon-nudge-d ${
          state === "low"
            ? "text-[#007BC6]"
            : "text-gray-900"
        }`}
      />
    </span>
  );
}

function UsersTable({
  openChat,
  users,
  totalUsers,
  currentPage,
  setCurrentPage,
  totalPages,
  sortConfig,
  handleSort,
  isLoading,
}) {
  const pages = generatePages(currentPage, totalPages);
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#E7E9F0] gap-3">
        <h3 className="font-semibold text-black text-xl">{t("usersTable.title")}</h3>
      </div>

      <div className="overflow-x-auto hide-scrollbar">
        <table className="w-full table-fixed text-left text-sm border-collapse">
          <thead className="bg-gray-100 border-b border-[#E7E9F0] text-black text-sm font-bold">
            <tr>
              <th className="px-4 sm:px-6 py-2 text-left w-1/4 font-bold">
                {t("usersTable.fullName")}
              </th>
              <th className="px-4 sm:px-6 py-2 text-left w-1/4 font-bold">
                <button
                  onClick={() => handleSort("rating")}
                  aria-label="Sort by Rating"
                  className="flex items-center gap-0.5"
                >
                  {t("usersTable.rating")}
                  <SortIcon col="rating" sortConfig={sortConfig} />
                </button>
              </th>
              <th className="px-4 sm:px-6 py-2 text-left w-1/4 font-bold">
                {t("usersTable.conversations")}
              </th>
              <th className="px-4 sm:px-6 py-2 text-left w-1/4 font-bold">
                <button
                  onClick={() => handleSort("avgDur")}
                  aria-label="Sort by Average Duration"
                  className="flex items-center gap-0.5"
                >
                  {t("usersTable.avgDuration")}
                  <SortIcon col="avgDur" sortConfig={sortConfig} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E9F0]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-6 h-6 border-2 border-[#E7E9F0] border-t-[#007BC6] rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm font-semibold animate-pulse">
                      {t("loading.users")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-[#E7E9F0] p-3 rounded-full">
                      <Users size={16} className="text-[#94A3B8] icon-float" />
                    </div>
                    <p className="text-gray-500 text-sm font-normal">
                      {t("usersTable.noUsers")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => openChat(user)}
                >
                  <td className="px-3 sm:px-6 py-2">
                    <div className="font-semibold text-black text-base">
                      {user.name}
                    </div>
                    <div className="text-gray-500 text-sm mt-0.5 font-normal">
                      {user.handle}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-black text-base leading-none">
                        {user.rating}
                      </span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => {
                          const full = i < Math.floor(user.rating);
                          const fraction = !full && i === Math.floor(user.rating) ? user.rating % 1 : 0;
                          return (
                            <span key={i} className="relative inline-block w-4 h-4">
                              <Star size={16} className="fill-[#E7E9F0] text-[#E7E9F0]" />
                              {(full || fraction > 0) && (
                                <span
                                  className="absolute inset-0 overflow-hidden"
                                  style={{ width: full ? "100%" : `${fraction * 100}%` }}
                                >
                                  <Star size={16} className="fill-amber-400 text-amber-400" />
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <div className="font-semibold text-black text-base">
                        {user.convos}
                      </div>
                      <div className="text-gray-500 text-xs font-normal">
                        {t("usersTable.lastActive", { lastActive: user.lastActive })}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2">
                    <div className="flex flex-col gap-2.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* <div className="w-7 h-7 rounded-full bg-[#007BC6] flex items-center justify-center shrink-0">
                          <Clock3 size={14} className="text-white" />
                        </div> */}
                        <span className="font-semibold text-black text-base whitespace-nowrap">
                          {formatDuration(user.avgDur)}
                        </span>
                      </div>
                      <div className="w-28 sm:w-36 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0B95E9] rounded-full"
                          style={{ width: `${Math.max(4, user.progress)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalUsers > 10 && (
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7E9F0] bg-white">
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage((prev) => Math.max(1, prev - 1));
              }}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-500 border border-transparent rounded-full disabled:opacity-30 mr-2"
            >
              <ChevronLeft size={16} className="icon-nudge-l" /> {t("usersTable.prev")}
            </button>

            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar px-1">
              {pages.map((p, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    typeof p === "number" && setCurrentPage(p);
                  }}
                  className={`min-w-8 h-8 flex items-center justify-center text-sm rounded-full transition-all ${
                    p === currentPage
                      ? "bg-gray-100 text-gray-700 font-semibold"
                      : p === "..."
                        ? "text-gray-400 cursor-default"
                        : "text-gray-600 font-semibold"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              }}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-500 border border-transparent rounded-full disabled:opacity-30 ml-2"
            >
              {t("usersTable.next")} <ChevronRight size={16} className="icon-nudge-r" />
            </button>
          </div>
          <div className="text-xs text-gray-500 font-normal whitespace-nowrap">
            {t("usersTable.showing", { start: users.length, total: totalUsers })}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(UsersTable);
