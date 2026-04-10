import React from "react";
import { Zap, Eye, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";

const ICON_MAP = {
  Zap: Zap,
  Eye: Eye,
  Lightbulb: Lightbulb,
};

export default function StatCards({ stats = [] }) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((card, i) => {
        const IconComponent = ICON_MAP[card.iconName] || Lightbulb;

        return (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-[#94A3B8]/10 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 hover:border-[#94A3B8]/50 group"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-900 font-semibold text-base">
                {card.title}
              </span>
              <div className="bg-[#E7E9F0] p-2 rounded-full group-hover:bg-[#E7E9F0]/80 transition-colors flex items-center justify-center">
                <IconComponent size={16} className="text-[#94A3B8]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-auto">
              <h2 className="text-2xl font-bold text-black leading-none tracking-tight">
                {card.value}
                {card.subValue && (
                  <span className="text-slate-400 font-normal text-sm ml-1">
                    {card.subValue}
                  </span>
                )}
              </h2>

              {card.trend ? (
                <div className="flex items-center gap-1.5 ml-1">
                  <div
                    className={`flex items-center gap-0.5 ${card.up ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {card.up ? (
                      <TrendingUp size={12} strokeWidth={2} />
                    ) : (
                      <TrendingDown size={12} strokeWidth={2} />
                    )}
                    <span className="text-xs font-normal">
                      {card.trend.split(" ")[0]}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs font-normal">
                    {card.trend.split(" ").slice(1).join(" ")}
                  </span>
                </div>
              ) : card.badge ? (
                // --- NEW: Dynamic Color Badges for Handover Rate ---
                <div className="flex items-center gap-2 ml-2 px-2.5 py-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      card.badge === "Good"
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : card.badge === "Bad"
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    }`}
                  ></div>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-gray-600">
                    {card.badge}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
