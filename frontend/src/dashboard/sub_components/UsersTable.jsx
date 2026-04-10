import React from "react";
import {
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Users,
} from "lucide-react";
import { generatePages } from "../utils/helpers";

export default function UsersTable({
  openChat,
  users,
  totalUsers,
  currentPage,
  setCurrentPage,
  totalPages,
  sortConfig,
  handleSort,
  deleteUser,
}) {
  const pages = generatePages(currentPage, totalPages);

  const SortIcon = ({ col }) => {
    const activeItem = sortConfig.find((item) => item.key === col);
    const state = activeItem ? activeItem.dir : null;

    return (
      <span className="inline-flex flex-col ml-1 gap-0 group-hover:opacity-100 transition-opacity">
        <ChevronUp
          size={13}
          className={`-mb-0.5 transition-colors ${
            state === "high"
              ? "text-[#007BC6]"
              : "text-gray-900 group-hover:text-[#007BC6]/40"
          }`}
        />
        <ChevronDown
          size={13}
          className={`transition-colors ${
            state === "low"
              ? "text-[#007BC6]"
              : "text-gray-900 group-hover:text-[#007BC6]/40"
          }`}
        />
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:shadow-[#94A3B8]/10 transition-all duration-300 hover:border-[#94A3B8]/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#E7E9F0] gap-3">
        <h3 className="font-semibold text-black text-xl">Your Users</h3>
      </div>

      <div className="overflow-x-auto hide-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="bg-gray-100 border-b border-[#E7E9F0] text-black text-sm font-bold">
            <tr>
              <th className="px-6 py-2 text-left w-[25%] font-bold">
                Full Name
              </th>
              <th className="px-6 py-2 text-left w-[18%] font-bold">
                <button
                  onClick={() => handleSort("rating")}
                  aria-label="Sort by Rating"
                  className="flex items-center gap-0.5 transition-colors group"
                >
                  Rating
                  <SortIcon col="rating" />
                </button>
              </th>
              <th className="px-6 py-2 text-left w-[22%] font-bold">
                Conversations
              </th>
              <th className="px-6 py-2 text-left w-[25%] font-bold">
                <button
                  onClick={() => handleSort("avgDur")}
                  aria-label="Sort by Average Duration"
                  className="flex items-center gap-0.5 transition-colors group"
                >
                  Avg Duration
                  <SortIcon col="avgDur" />
                </button>
              </th>
              <th className="px-6 py-2 text-center w-[10%] font-bold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E9F0]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-[#E7E9F0] p-3 rounded-full">
                      <Users size={16} className="text-[#94A3B8]" />
                    </div>
                    <p className="text-gray-500 text-sm font-normal">
                      No users found matching your criteria.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition cursor-pointer group"
                  onClick={() => openChat(user)}
                >
                  <td className="px-6 py-2 transition-colors">
                    <div className="font-normal text-black text-base">
                      {user.name}
                    </div>
                    <div className="text-gray-500 text-sm mt-0.5 font-normal">
                      {user.handle}
                    </div>
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-normal text-black text-sm leading-none">
                        {user.rating}
                      </span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < user.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-[#E7E9F0] text-[#E7E9F0]"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <div className="font-normal text-black text-sm">
                        {user.convos}
                      </div>
                      <div className="text-gray-500 text-xs font-normal">
                        Last Active {user.lastActive}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-[#F1F5F9] rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-[#007BC6] rounded-full"
                          style={{ width: `${user.progress}%` }}
                        />
                      </div>
                      <span className="font-normal text-gray-500 text-sm whitespace-nowrap">
                        {user.avgDur}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <button
                        aria-label={`Delete ${user.name}`}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-full hover:shadow-xl hover:shadow-red-500/10 hover:-translate-y-1 transition-all duration-300 hover:border-red-200 border border-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUser(user.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7E9F0] bg-white">
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentPage((prev) => Math.max(1, prev - 1));
            }}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-500 border border-transparent hover:text-black hover:bg-white rounded-full hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:border-transparent disabled:hover:-translate-y-0 mr-2"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar px-1">
            {pages.map((p, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  typeof p === "number" && setCurrentPage(p);
                }}
                className={`min-w-[32px] h-8 flex items-center justify-center text-sm rounded-full transition-all ${
                  p === currentPage
                    ? "bg-[#B3D7EE]/50 text-[#007BC6] font-extrabold shadow-sm"
                    : p === "..."
                      ? "text-gray-400 cursor-default"
                      : "text-gray-600 hover:bg-gray-100 font-semibold"
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
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-500 border border-transparent hover:text-black hover:bg-white rounded-full hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 transition-all duration-300 hover:border-[#94A3B8]/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:border-transparent disabled:hover:-translate-y-0 ml-2"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-xs text-gray-500 font-normal whitespace-nowrap">
          Showing {users.length} of {totalUsers} results
        </div>
      </div>
    </div>
  );
}
