const { readDB, formatNum } = require("../utils/db");

const getStats = (req, res) => {
  const { start, end } = req.query;
  const db = readDB();
  const metrics = db.dailyMetrics || [];

  const filtered = metrics.filter((m) => {
    if (!start || !end) return true;
    return m.date >= start && m.date <= end;
  });

  const sumActive = filtered.reduce((acc, m) => acc + (m.activeUsers || 0), 0);
  const sumTotalUsers = 15; // Fixed based on dataset
  const sumConvos = filtered.reduce(
    (acc, m) => acc + (m.conversations || 0),
    0,
  );
  const sumHandovers = filtered.reduce((acc, m) => acc + (m.handovers || 0), 0);

  const engagementRate = Math.round(
    (sumActive / (sumTotalUsers * Math.max(1, filtered.length))) * 100,
  );
  const handoverRate = Math.round(
    (sumHandovers / Math.max(1, sumConvos)) * 100,
  );

  let handoverBadge = "Good";
  if (handoverRate > 25) handoverBadge = "Bad";
  else if (handoverRate >= 15) handoverBadge = "Moderate";

  res.json([
    {
      title: "Active Users",
      value: formatNum(sumActive),
      subValue: `/ ${formatNum(sumTotalUsers * Math.max(1, filtered.length))}`,
      trend: `${engagementRate}% Engagement Rate`,
      up: engagementRate >= 30,
      iconName: "Zap",
    },
    {
      title: "Total Conversations",
      value: formatNum(sumConvos),
      trend: start && end ? "Selected Period" : "All Time",
      up: true,
      iconName: "Eye",
    },
    {
      title: "Handover Rate",
      value: `${handoverRate}%`,
      badge: handoverBadge,
      iconName: "Lightbulb",
    },
  ]);
};

const getPeakUsage = (req, res) => {
  const { start, end } = req.query;
  const db = readDB();
  const metrics = db.dailyMetrics || [];

  const filtered = metrics.filter((m) => {
    if (!start || !end) return true;
    return m.date >= start && m.date <= end;
  });

  let grouped = [];
  let diffDays = filtered.length;

  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }

  if (diffDays <= 1) {
    // Single day → hourly breakdown
    const hourly = filtered[0]?.hourlyDistribution || [];
    grouped = hourly.map((h) => ({
      ...h,
      viewType: "Hourly View",
      hoverLabel: `Hourly - ${h.label}`,
    }));
  } else if (diffDays <= 14) {
    // Up to 2 weeks → show every day individually
    grouped = filtered.map((m, i) => {
      const dateStr = new Date(m.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return {
        label: new Date(m.date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        ...m.usageDistribution,
        viewType: "Daily View",
        hoverLabel: `Day ${i + 1} - ${dateStr}`,
      };
    });
  } else if (diffDays <= 84) {
    // 15–84 days (up to ~3 months) → Group by strict 7-day weeks
    const CHUNK = 7;
    for (let i = 0; i < filtered.length; i += CHUNK) {
      const chunk = filtered.slice(i, i + CHUNK);
      const low = Math.round(
        chunk.reduce((a, c) => a + (c.usageDistribution.low || 0), 0) /
          chunk.length,
      );
      const med = Math.round(
        chunk.reduce((a, c) => a + (c.usageDistribution.medium || 0), 0) /
          chunk.length,
      );
      const high = Math.round(
        chunk.reduce((a, c) => a + (c.usageDistribution.high || 0), 0) /
          chunk.length,
      );

      const fromDate = new Date(chunk[0].date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const toDate = new Date(chunk[chunk.length - 1].date).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" },
      );
      const weekNum = Math.floor(i / CHUNK) + 1;

      grouped.push({
        label: `W${weekNum}`, // Short label "W1", "W2" for the axis
        low,
        medium: med,
        high,
        viewType: "Weekly View",
        hoverLabel: `Week ${weekNum}: ${fromDate} – ${toDate} (${chunk.length} days)`,
      });
    }
  } else if (diffDays <= 730) {
    // 85–730 days (up to 2 years) → monthly grouping
    const months = {};
    filtered.forEach((m) => {
      const monthDesc = new Date(m.date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const month = new Date(m.date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!months[month])
        months[month] = {
          low: 0,
          med: 0,
          high: 0,
          count: 0,
          hoverLabel: monthDesc,
        };
      months[month].low += m.usageDistribution.low || 0;
      months[month].med += m.usageDistribution.medium || 0;
      months[month].high += m.usageDistribution.high || 0;
      months[month].count++;
    });
    grouped = Object.keys(months).map((m) => ({
      label: m,
      low: Math.round(months[m].low / months[m].count),
      medium: Math.round(months[m].med / months[m].count),
      high: Math.round(months[m].high / months[m].count),
      viewType: "Monthly View",
      hoverLabel: `Month of ${months[m].hoverLabel}`,
    }));
  } else {
    // > 730 days → yearly grouping
    const years = {};
    filtered.forEach((m) => {
      const year = new Date(m.date).getFullYear().toString();
      if (!years[year]) years[year] = { low: 0, med: 0, high: 0, count: 0 };
      years[year].low += m.usageDistribution.low || 0;
      years[year].med += m.usageDistribution.medium || 0;
      years[year].high += m.usageDistribution.high || 0;
      years[year].count++;
    });
    grouped = Object.keys(years).map((y) => ({
      label: y,
      low: Math.round(years[y].low / years[y].count),
      medium: Math.round(years[y].med / years[y].count),
      high: Math.round(years[y].high / years[y].count),
      viewType: "Yearly View",
      hoverLabel: `Year of ${y}`,
    }));
  }

  const chartData = grouped.map((g) => ({
    label: g.label,
    val1: g.low,
    val2: g.medium,
    val3: g.high,
    viewType: g.viewType,
    hoverLabel: g.hoverLabel,
  }));

  res.json(chartData);
};

const getFaqs = (req, res) => {
  const { start, end } = req.query;
  const db = readDB();
  let faqs = db.faqs || [];

  if (start && end) {
    const diffDays = Math.round((new Date(end) - new Date(start)) / 86400000);
    if (diffDays > 730 && db.faqsYearly) {
      faqs = db.faqsYearly;
    } else if (diffDays > 14 && db.faqsMonthly) {
      faqs = db.faqsMonthly;
    }
  }

  res.json(faqs);
};

module.exports = {
  getStats,
  getPeakUsage,
  getFaqs,
};
