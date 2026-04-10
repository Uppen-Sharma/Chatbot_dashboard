import React, { useState } from "react";
import { BarChart2, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function PeakUsage({ chartData = [], faqData = [] }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [hoveredData, setHoveredData] = useState(null);

  // DYNAMIC PEAK CALCULATION: Identify the highest load from chartData
  const peakPoint = chartData.reduce(
    (max, cur) => ((cur.val1 || 0) > (max.val1 || 0) ? cur : max),
    chartData[0] || { label: "N/A" },
  );
  const peakTime = peakPoint.label;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Peak Usage Chart */}
      <div className="bg-white lg:col-span-2 rounded-2xl p-5 border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col min-w-0 hover:shadow-xl hover:shadow-[#94A3B8]/10 transition-all duration-300 hover:border-[#94A3B8]/30">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
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

          {/* Legend / Dynamic Hover Tracker */}
          <div className="relative min-h-[30px] flex items-center justify-end min-w-[250px]">
            {hoveredData && (
              <div className="absolute right-0 -top-2 z-20 flex flex-col items-end gap-1.5 text-[10px] font-bold text-gray-700 bg-white px-4 py-2 rounded-xl border border-[#E7E9F0] shadow-md animate-in fade-in duration-200 pointer-events-none">
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
              <div className="border-l border-gray-300 h-3 ml-2"></div>
              <div className="text-black ml-2 tracking-widest">
                {chartData[0]?.viewType || "Daily View"}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full relative h-[220px] flex items-end">
          {/* Y-Axis Grid & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pb-[30px] pr-2 pointer-events-none z-0">
            {["100%", "75%", "50%", "25%", "0%"].map((label, i) => (
              <div key={i} className="flex items-center w-full gap-3">
                <span className="text-[10px] font-bold text-gray-500 w-8 text-right shrink-0">
                  {label}
                </span>
                <div className="flex-1 border-b border-dashed border-gray-300" />
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="relative h-full flex-1 flex flex-col justify-end ml-11 overflow-x-auto overflow-y-visible hide-scrollbar z-10">
            <div className="relative h-[190px] min-w-max flex items-end justify-start gap-4 sm:gap-6 px-4 pb-[30px]">
              {chartData.map((data, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center flex-shrink-0 transition-transform duration-200 hover:-translate-y-1 group relative cursor-pointer"
                  onMouseEnter={() => setHoveredData(data)}
                  onMouseLeave={() => setHoveredData(null)}
                >
                  {/* Overlapping Bars */}
                  <div className="relative w-5 md:w-6 h-[160px] flex items-end justify-center">
                    <div
                      className="absolute bottom-0 w-full bg-[#B3D7EE] rounded-t-full transition-[height] duration-500 ease-out min-h-[10px] md:min-h-[12px]"
                      style={{
                        height: `${Math.min(100, data.val1 + data.val2 + data.val3)}%`,
                      }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-[#0B95E9] rounded-t-full transition-[height] duration-500 ease-out delay-75 min-h-[10px] md:min-h-[12px]"
                      style={{
                        height: `${Math.min(100, data.val2 + data.val3)}%`,
                      }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-[#007BC6] rounded-t-full transition-[height] duration-500 ease-out delay-150 min-h-[10px] md:min-h-[12px]"
                      style={{ height: `${Math.min(100, data.val3)}%` }}
                    />
                  </div>

                  {/* X-Axis Label */}
                  <div className="absolute -bottom-7 w-full flex justify-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
                      {data.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Panel Wrapper */}
      <div className="relative lg:h-full w-full">
        <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-sm overflow-hidden flex flex-col min-w-0 hover:shadow-xl hover:shadow-[#94A3B8]/10 transition-all duration-300 hover:border-[#94A3B8]/30 lg:h-full lg:absolute lg:inset-0">
          <div className="p-4 border-b border-[#E7E9F0] flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-black text-base">FAQ</h3>
            <div className="bg-[#E7E9F0] p-2 rounded-full flex items-center justify-center">
              <FileText size={16} className="text-[#94A3B8]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#E7E9F0] hide-scrollbar">
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
                      {items &&
                        items.map((item, j) => (
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
