import React from "react";
import { Zap, Eye, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslate } from "../hooks/useTranslate";

const ICON_MAP = {
  Zap: Zap,
  Eye: Eye,
  Lightbulb: Lightbulb,
};

// Skeleton card for initial load
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-sm flex flex-col justify-between h-[110px]">
      <div className="flex justify-between items-start">
        <div className="h-4 w-28 bg-gray-100 rounded-full animate-pulse" />
        <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <div className="h-7 w-20 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-4 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function StatCard({ card, isTranslating }) {
  const IconComponent = ICON_MAP[card.iconName] || Lightbulb;
  const displayValue = card?.value ?? "0";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col justify-between brand-gradient-border-hover">
      <div className="flex justify-between items-start mb-4">
        <span
          className={`text-gray-900 font-semibold text-base transition-opacity duration-300 ${isTranslating ? "opacity-40" : "opacity-100"}`}
        >
          {card.title}
        </span>
        <div className="bg-[#E7E9F0] p-2 rounded-full flex items-center justify-center">
          <IconComponent size={16} className="text-[#94A3B8] icon-bounce" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-auto">
        <h2 className="text-2xl font-bold text-black leading-none tracking-tight tabular-nums">
          {displayValue}
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
                <TrendingUp size={12} strokeWidth={2} className="icon-bounce" />
              ) : (
                <TrendingDown size={12} strokeWidth={2} className="icon-bounce" />
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
          <div className="flex items-center gap-2 ml-2 px-2.5 py-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                card.badge === "Good"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : card.badge === "Bad"
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              }`}
            />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-gray-600">
              {card.badge}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCards({ stats = [], isLoading = false }) {
  // Collect all translatable strings from every card in a flat array.
  // Order: [title0, trend0, title1, trend1, ...]
  // Trends may be null/undefined — we send an empty string as a placeholder
  // so the array length stays predictable, then ignore empty results.
  const sourceTexts = stats.flatMap((c) => [c.title ?? "", c.trend ?? ""]);
  const { translated, isTranslating } = useTranslate(sourceTexts);

  // Re-assemble translated stats: pair up [title, trend] for each card.
  const translatedStats = stats.map((card, i) => ({
    ...card,
    title: translated[i * 2] || card.title,
    trend: card.trend ? translated[i * 2 + 1] || card.trend : card.trend,
  }));

  // Show skeleton placeholders while fetching for the first time
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!stats || stats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {translatedStats.map((card, i) => (
        <StatCard key={card.title || i} card={card} isTranslating={isTranslating} />
      ))}
    </div>
  );
}

export default React.memo(StatCards);
