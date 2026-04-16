import React, { useState } from "react";
import { BarChart2, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function PeakUsage({ chartData = [], faqData = [] }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [hoveredData, setHoveredData] = useState(null);

  const peakPoint = chartData.reduce(
    (max, cur) => ((cur.val3 || 0) > (max.val3 || 0) ? cur : max),
    chartData[0] || { label: "N/A" },
  );
  const peakTime = peakPoint.label;
  const count = chartData.length || 1;

  // Visual layout logic
  const slotPct = 100 / count;
  const barWidth = count <= 8 ? 32 : count <= 15 ? 24 : 16;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Peak Usage Chart */}
      <div className="bg-white lg:col-span-2 rounded-2xl p-5 border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col min-w-0 hover:shadow-xl hover:shadow-[#94A3B8]/10 transition-all duration-300 hover:border-[#94A3B8]/30">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-[#E7E9F0] p-2 rounded-full shrink-0 flex items-center justify-center">
              <BarChart2 size={16} className="text-[#94A3B8]" />
            </div>
            <div>
              <h3 className="font-semibold text-black text-base leading-tight">
                Peak Usage Time
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Peak usage at{" "}
                <span className="font-semibold text-[#007BC6]">{peakTime}</span>{" "}
                - consider scaling support
              </p>
            </div>
          </div>

          {/* Legend / Tooltip info */}
          <div className="relative min-h-[30px] flex items-center justify-end min-w-[250px]">
            {hoveredData && (
              <div className="absolute right-0 -top-2 z-20 flex flex-col items-end gap-1.5 text-[10px] font-bold text-gray-700 bg-white px-4 py-2 rounded-xl border border-[#E7E9F0] shadow-md pointer-events-none transition-all duration-200">
                <span className="text-gray-900 text-[11px] whitespace-normal leading-tight w-full text-right">
                  {hoveredData.hoverLabel || hoveredData.label}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#007BC6]" /> High:{" "}
                    {hoveredData.val3}%
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0B95E9]" /> Med:{" "}
                    {hoveredData.val2}%
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#B3D7EE]" /> Low:{" "}
                    {hoveredData.val1}%
                  </div>
                </div>
              </div>
            )}
            <div
              className={`flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-wide transition-opacity duration-200 ${hoveredData ? "opacity-0" : "opacity-100"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B3D7EE]" /> Low
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B95E9]" /> Med
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#007BC6]" /> High
              </div>
              <div className="border-l border-gray-300 h-3 ml-2" />
              <div className="text-black ml-2 tracking-widest">
                {chartData[0]?.viewType || "Daily View"}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="w-full relative h-[220px] flex items-end">
          {/* Dashboard Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-[30px] pr-2 pointer-events-none z-0">
            {["100%", "75%", "50%", "25%", "0%"].map((label, i) => (
              <div key={i} className="flex items-center w-full gap-3">
                <span className="text-[10px] font-bold text-gray-400 w-8 text-right shrink-0">
                  {label}
                </span>
                <div className="flex-1 border-b border-dashed border-gray-200" />
              </div>
            ))}
          </div>

          {/* Layered Pills */}
          <div className="relative h-full flex-1 ml-11 flex items-end justify-between px-4 pb-[30px] z-10">
            {chartData.map((data, index) => {
              const isPeak =
                data.val3 === peakPoint.val3 && data.label === peakPoint.label;

              // Layered heights based on cumulative stacking
              const totalH = Math.min(
                100,
                (data.val1 || 0) + (data.val2 || 0) + (data.val3 || 0),
              );
              const medH = Math.min(100, (data.val2 || 0) + (data.val3 || 0));
              const highH = Math.min(100, data.val3 || 0);

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
                    className="relative flex items-end justify-center transition-transform duration-300 group-hover:-translate-y-1"
                    style={{ width: barWidth, height: "100%" }}
                  >
                    {/* Peak Glow */}
                    {isPeak && (
                      <div
                        className="absolute w-2 h-2 rounded-full bg-[#007BC6] animate-pulse z-20"
                        style={{ bottom: `${totalH}%`, marginBottom: 8 }}
                      />
                    )}

                    {/* Back layer */}
                    <div
                      className="absolute bottom-0 w-full bg-[#B3D7EE] rounded-t-full transition-all duration-500 ease-out shadow-sm"
                      style={{ height: `${totalH}%` }}
                    />
                    {/* Middle layer */}
                    <div
                      className="absolute bottom-0 w-full bg-[#0B95E9] rounded-t-full transition-all duration-500 ease-out delay-75 shadow-sm"
                      style={{ height: `${medH}%` }}
                    />
                    {/* Front layer */}
                    <div
                      className="absolute bottom-0 w-full bg-[#007BC6] rounded-t-full transition-all duration-500 ease-out delay-150 shadow-sm"
                      style={{ height: `${highH}%` }}
                    />
                  </div>

                  {/* X-Axis Label */}
                  <div className="absolute -bottom-7 w-full flex justify-center">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${isPeak ? "text-[#007BC6]" : "text-gray-400"}`}
                    >
                      {data.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Panel */}
      <div className="relative lg:h-full w-full">
        <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col min-w-0 hover:shadow-xl hover:shadow-[#94A3B8]/10 transition-all duration-300 hover:border-[#94A3B8]/30 lg:h-full lg:absolute lg:inset-0">
          <div className="p-4 border-b border-[#E7E9F0] flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-black text-base">FAQ</h3>
            <div className="bg-[#E7E9F0] p-2 rounded-full flex items-center justify-center">
              <FileText size={16} className="text-[#94A3B8]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-[#E7E9F0]">
            {faqData && faqData.length > 0 ? (
              faqData.map(({ title, items }, i) => (
                <div key={i} className="flex flex-col">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <h4 className="font-semibold text-black text-sm pr-4">
                      {title}
                    </h4>
                    {openIndex === i ? (
                      <ChevronUp size={18} className="text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown
                        size={18}
                        className="text-gray-500 shrink-0"
                      />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    <ul className="px-6 pb-5 space-y-3 text-xs text-gray-600 font-normal">
                      {items?.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <span className="w-1 h-1 bg-gray-500 rounded-full mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No FAQs available right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
