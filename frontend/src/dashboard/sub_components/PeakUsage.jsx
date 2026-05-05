import React, { useState } from "react";
import { BarChart2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

function PeakUsage({
  chartData = [],
  faqData = [],
  isLoading = false,
  periodLabel = "",
}) {
  const [hoveredData, setHoveredData] = useState(null);
  const { t } = useTranslation();
  const barsReady = !isLoading && chartData.length > 0;

  const peakPoint = chartData.reduce(
    (max, cur) =>
      ((cur.val1 || 0) + (cur.val2 || 0) + (cur.val3 || 0)) >
      ((max.val1 || 0) + (max.val2 || 0) + (max.val3 || 0))
        ? cur
        : max,
    chartData[0] || { label: "N/A" },
  );
  const peakTotal = Math.min(
    100,
    (peakPoint?.val1 || 0) + (peakPoint?.val2 || 0) + (peakPoint?.val3 || 0),
  );
  const peakTime = peakPoint.label;
  const count = chartData.length || 1;

  // Visual layout logic
  const slotPct = 100 / count;
  const barWidth = count <= 8 ? 32 : count <= 15 ? 24 : 16;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Peak Usage Chart */}
      <div className="bg-white lg:col-span-2 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col min-w-0 brand-gradient-border-hover">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="bg-[#E7E9F0] p-2 rounded-full shrink-0 flex items-center justify-center">
              <BarChart2 size={16} className="text-[#94A3B8] icon-bounce" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-black text-base leading-tight">
                {t("peakUsage.title")}
              </h3>
              <p className="text-gray-500 text-xs mt-1 wrap-break-word">
                {t("peakUsage.peakUsageAt")}{" "}
                <span className="font-semibold text-[#007BC6]">{peakTime}</span>{" "}
                - {t("peakUsage.considerScaling")}
              </p>
            </div>
          </div>

          {/* Legend / Tooltip info */}
          <div className="relative min-h-7.5 flex items-center justify-start sm:justify-end min-w-0 sm:min-w-62.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B95E9]" />
                <span className="text-gray-400">{t("peakUsage.legendUsage")}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#D5E8F6] bg-[#EDF6FD] px-2 py-1">
                <span className="text-[#007BC6]">{t("peakUsage.legendPeak")}</span>
                <span className="text-[#005A91]">{peakTime}</span>
              </div>
              <div className="border-l border-gray-300 h-3 ml-2" />
              <div className="text-black ml-2 tracking-widest normal-case">
                {periodLabel || chartData[0]?.viewType || "Selected Range"}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="w-full relative h-55 flex items-end">
          {/* Dashboard Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-7.5 pr-2 pointer-events-none z-0">
            {["100%", "75%", "50%", "25%", "0%"].map((label, i) => (
              <div key={i} className="flex items-center w-full gap-3">
                <span className="text-[10px] font-bold text-gray-400 w-8 text-right shrink-0">
                  {label}
                </span>
                <div className="flex-1 border-b border-dashed border-gray-200" />
              </div>
            ))}
          </div>

          {/* Layered Pills — show skeleton bars while loading */}
          <div className="relative h-full flex-1 ml-8 sm:ml-11 flex items-end justify-between px-2 sm:px-4 pb-7.5 z-10">
            {isLoading
              ? // Skeleton placeholder bars
                [...Array(7)].map((_, index) => (
                  <div
                    key={index}
                    className="relative h-full flex flex-col items-center justify-end"
                    style={{ width: `${100 / 7}%` }}
                  >
                    <div
                      className="absolute bottom-7.5 w-8 rounded-t-full bg-gray-100 animate-pulse"
                      style={{
                        height: `${40 + index * 8}%`,
                        maxHeight: "calc(100% - 30px)",
                      }}
                    />
                    <div className="absolute -bottom-7 w-full flex justify-center">
                      <span className="h-2 w-5 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              : chartData.map((data, index) => {
                  const totalH = Math.min(
                    100,
                    (data.val1 || 0) + (data.val2 || 0) + (data.val3 || 0),
                  );
                  const isPeak =
                    data.label === peakPoint.label && totalH === peakTotal;
                  const isNearLeftEdge = index <= 1;
                  const isNearRightEdge = index >= count - 2;

                  return (
                    <div
                      key={index}
                      className="relative h-full flex flex-col items-center justify-end group cursor-pointer"
                      style={{ width: `${slotPct}%` }}
                      onMouseEnter={() => setHoveredData(data)}
                      onMouseLeave={() => setHoveredData(null)}
                    >
                      {/* The Pill Stack */}
                      <div
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end justify-center"
                        style={{ width: barWidth, height: "calc(100% - 30px)" }}
                      >
                        {/* Tooltip above each hovered bar */}
                        {hoveredData === data && (
                          <div
                            className="absolute z-50 flex flex-col text-[10px] bg-white px-2.5 py-2 rounded-lg border border-[#E7E9F0] shadow-md pointer-events-none w-max"
                            style={{
                              bottom: `${totalH}%`,
                              marginBottom: "8px",
                              ...(isNearLeftEdge
                                ? { left: "0" }
                                : isNearRightEdge
                                  ? { right: "0" }
                                  : {
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                    }),
                            }}
                          >
                            <span className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1 text-center">
                              {data.hoverLabel || data.label}
                            </span>
                            <div className="flex items-center justify-between gap-4 mt-0.5">
                              <span className="text-gray-500 font-semibold">{t("peakUsage.legendUsage")}</span>
                              <span className="font-bold text-[#007BC6]">{totalH}%</span>
                            </div>
                          </div>
                        )}

                        {/* Single bar */}
                        <div
                          className={`absolute bottom-0 w-full rounded-t-full transition-all duration-500 ease-out ${
                            isPeak
                              ? "bg-[linear-gradient(180deg,#A7C9E0_0%,#38A0DE_48%,#007FC8_100%)]"
                              : "bg-[linear-gradient(180deg,#B2D2E7_0%,#49ABE4_48%,#0B95E9_100%)]"
                          }`}
                          style={{ height: `${totalH}%` }}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <div className="absolute -bottom-7 w-full flex justify-center">
                        <div className="flex items-center gap-1">
                          {isPeak && barsReady && (
                            <span className="text-[9px] font-black text-[#007BC6] leading-none">▲</span>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${isPeak ? "text-[#007BC6]" : "text-gray-400"}`}
                          >
                            {data.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* FAQ Panel */}
      <div className="relative lg:h-full w-full">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0 lg:h-full lg:absolute lg:inset-0 brand-gradient-border-hover">
          <div className="p-3 border-b border-[#E7E9F0] flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-black text-base">{t("peakUsage.faqTitle")}</h3>
            <div className="bg-[#E7E9F0] p-2 rounded-full flex items-center justify-center">
              <FileText size={16} className="text-[#94A3B8] icon-bounce" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-[#E7E9F0]">
         {faqData && faqData.length > 0 ? (
              faqData.map(({ question }, i) => (
                <div key={i} className="flex flex-col">
                  <div className="w-full px-6 py-3 flex items-center justify-between text-left">
                    <h4 className="font-semibold text-gray-700 text-sm pr-4 leading-relaxed">
                      {question}
                    </h4>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                {t("peakUsage.noFaq")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PeakUsage);
