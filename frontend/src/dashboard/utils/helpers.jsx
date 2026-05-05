import React from 'react';

// Generates dynamic array for pagination buttons (e.g., 1, ..., 4, 5, 6, ..., 99)
export const generatePages = (currentPage, totalPages) => {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }
  return pages;
};

// Converts raw duration strings like "182m 55s" or "45m" to compact timer text.
// Examples: "2m 25s", "45m", "3h 02m".
export const formatDuration = (str = "") => {
  const minSec = str?.match(/(\d+)m\s*(\d+)s/);
  const minOnly = str?.match(/(\d+)m/);
  const secOnly = str?.match(/(\d+)s/);

  let totalSeconds = 0;
  if (minSec) {
    totalSeconds = parseInt(minSec[1]) * 60 + parseInt(minSec[2]);
  } else if (minOnly) {
    totalSeconds = parseInt(minOnly[1]) * 60;
  } else if (secOnly) {
    totalSeconds = parseInt(secOnly[1]);
  } else {
    return str;
  }

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, "0")}m`;
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
};

// Lightweight markdown parser for bold text conversion
export const parseBold = (str) => {
  if (!str) return null;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};
