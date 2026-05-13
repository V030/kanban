import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "../components/styles/Metrics.css";
import "../components/styles/SkeletonLoading.css";
import { getProjectMetrics, getProjects } from "../services/projectService";

// ── Chart helpers ────────────────────────────────────────────────

function SimpleLineChart({ data = [], height = 240, stroke = "#4f46e5", reference = null }) {
  if (!data || !data.length) return null;
  const values = data.map((d) => Number(d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const W = 800, H = 240, padX = 28, padY = 20;

  const pts = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (W - padX * 2);
    const y = padY + (H - padY * 2) * (1 - (Number(d.value || 0) - min) / (max - min || 1));
    return [x, y];
  });

  const polyline = pts.map((p) => p.join(",")).join(" ");
  const area = [
    `M ${pts[0][0]} ${H}`,
    ...pts.map((p) => `L ${p[0]} ${p[1]}`),
    `L ${pts[pts.length - 1][0]} ${H}`,
    "Z",
  ].join(" ");

  const refY =
    reference != null
      ? padY + (H - padY * 2) * (1 - (Number(reference) - min) / (max - min || 1))
      : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Cycle time line chart"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line
          key={i}
          x1={padX} x2={W - padX}
          y1={padY + (H - padY * 2) * g}
          y2={padY + (H - padY * 2) * g}
          stroke="#e2e8f0"
          strokeDasharray="4 6"
        />
      ))}

      {/* Reference line */}
      {refY != null && (
        <line
          x1={padX} x2={W - padX}
          y1={refY} y2={refY}
          stroke="#94a3b8"
          strokeDasharray="6 5"
          strokeWidth="1.5"
        />
      )}

      {/* Area fill */}
      <path d={area} fill="url(#lineGrad)" />

      {/* Line */}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        points={polyline}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={stroke} stroke="#fff" strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        const x = padX + (i / Math.max(data.length - 1, 1)) * (W - padX * 2);
        return (
          <text
            key={i}
            x={x}
            y={H - 4}
            textAnchor="middle"
            fontSize="18"
            fill="#94a3b8"
            fontFamily="DM Sans, system-ui, sans-serif"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

function SimpleHorizontalBars({ data = [], color = "#4f46e5" }) {
  const totalMax = data.reduce((acc, r) => Math.max(acc, Number(r.value || 0)), 0) || 1;

  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }

  return (
    <div className="simple-bars">
      {data.map((r, idx) => (
        <div key={idx} className="simple-bar-item">
          <div className="simple-bar-row-top">
            <div className="simple-bar-avatar">{getInitials(r.name)}</div>
            <div className="simple-bar-label">{r.name}</div>
            <div className="simple-bar-val">{r.value} tasks</div>
          </div>
          <div className="simple-bar-row-bottom">
            <div className="simple-bar-track">
              <div
                className="simple-bar-fill"
                style={{
                  width: `${(Number(r.value || 0) / totalMax) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end   = { x: cx + r * Math.cos(endAngle),   y: cy + r * Math.sin(endAngle)   };
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function SimpleDonutChart({ data = [], size = 200, strokeWidth = 24 }) {
  const total = data.reduce((sum, d) => sum + Number(d.value || 0), 0);
  if (total <= 0) return null;

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  let start = -Math.PI / 2;

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Priority donut">
        <circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
        {data.map((slice, idx) => {
          const val = Number(slice.value || 0);
          if (val <= 0) return null;
          const angle = (val / total) * Math.PI * 2;
          const end = start + angle;
          const path = describeArc(center, center, radius, start, end);
          start = end;
          return (
            <path
              key={`${slice.name}-${idx}`}
              d={path}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
        <text x={center} y={center - 6} textAnchor="middle" className="donut-total-label">
          Total
        </text>
        <text x={center} y={center + 20} textAnchor="middle" className="donut-total-value">
          {total}
        </text>
      </svg>

      <div className="donut-legend">
        {data.map((slice) => {
          const val = Number(slice.value || 0);
          const pct = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
          return (
            <div key={slice.name} className="donut-legend-row">
              <span className="donut-swatch" style={{ background: slice.color }} />
              <span className="donut-name">{slice.name}</span>
              <span className="donut-val">{val}</span>
              <span className="donut-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyChartState({ message = "No data available" }) {
  return (
    <div className="empty-state chart-empty">
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
        <rect x="1" y="6" width="38" height="18" rx="3" fill="#f1f5f9" />
        <path d="M6 15h5v2H6zM14 11h5v2h-5zM23 9h5v2h-5z" fill="#cbd5e1" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function KpiCard({ title, value, trend, trendTone = "neutral", meta }) {
  return (
    <div className="kpi-card kpi-elevated">
      <div className="kpi-top">
        <div className="kpi-title">{title}</div>
        <div className={`kpi-trend badge-${trendTone}`}>{trend}</div>
      </div>
      <div className="kpi-value-large">{value}</div>
      {meta && <div className="kpi-meta">{meta}</div>}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function Metrics() {
  const location = useLocation();
  const isMountedRef = useRef(true);

  const [projectId, setProjectId] = useState(location.state?.project?.id || null);
  const [projectName, setProjectName] = useState(location.state?.project?.name || "");
  const [windowDays, setWindowDays] = useState(30);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let pid = projectId;
      if (!pid) {
        const projectData = await getProjects();
        pid = projectData.projects?.[0]?.id;
        if (pid) {
          setProjectId(pid);
          setProjectName(projectData.projects?.[0]?.name || "");
        }
      }
      if (!pid) {
        setError("No project available");
        return;
      }
      const data = await getProjectMetrics(pid, windowDays);
      if (isMountedRef.current) setMetrics(data);
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || "Unable to load metrics");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [projectId, windowDays]);

  useEffect(() => {
    isMountedRef.current = true;
    loadMetrics();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadMetrics]);

  const kpis = useMemo(() => {
    const completion = Number(metrics?.completion_rate || 0);
    const wip = Number(metrics?.wip_count || 0);
    const overdue = Number(metrics?.overdue_count || 0);
    return { completion: `${completion.toFixed(0)}%`, completionValue: completion, wip, overdue };
  }, [metrics]);

  const cycleData = useMemo(() => {
    const raw = metrics?.cycle_time_trend || [];
    return raw.map((d, i) => ({
      name: d.label || d.day || `D${i + 1}`,
      value: Number(d.avg_cycle_days ?? d.value ?? 0),
    }));
  }, [metrics]);

  const ownership = useMemo(() => {
    return (metrics?.ownership || []).map((r) => ({
      name: r.assignee_name || r.name || "Unknown",
      value: Number(r.task_count || r.count || 0),
    }));
  }, [metrics]);

  const priorityData = useMemo(() => {
    const rows = metrics?.priority_load || [];
    const high = rows.reduce((s, r) => s + Number(r.urgent_count || 0), 0);
    const low  = rows.reduce((s, r) => s + Number(r.low_count  || 0), 0);
    const ownedTotal = (metrics?.ownership || []).reduce((s, r) => s + Number(r.task_count || 0), 0);
    const other = Math.max(ownedTotal - high - low, 0);
    return [
      { name: "Urgent", value: high,  color: "#ef4444" },
      { name: "Other",  value: other, color: "#f59e0b" },
      { name: "Low",    value: low,   color: "#22c55e" },
    ];
  }, [metrics]);

  const recentReviews = useMemo(() => {
    if (metrics?.recent_reviews?.length) return metrics.recent_reviews.slice(0, 3);
    return (metrics?.reviewer_activity || []).slice(0, 3).map((a, i) => ({
      id: a.reviewer_id || `r${i}`,
      reviewer_name: a.reviewer_name || a.name || "Reviewer",
      time: a.last_review_time_ago || (a.last_seen ? `${a.last_seen} ago` : "1h ago"),
      comment: a.sample_comment || "Reviewed task and left feedback.",
      status: a.recent_status || (i === 0 ? "approved" : i === 1 ? "rejected" : "pending"),
    }));
  }, [metrics]);

  return (
    <section className="page-shell metrics-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="metrics-header">
        <div className="metrics-title-row">
          <div>
            <h1 className="metrics-title">Metrics &amp; Analytics</h1>
            {projectName ? <p className="metrics-project-name">{projectName}</p> : null}
          </div>
          <div className="metrics-actions">
            <label className="metrics-filter-label" htmlFor="window-select">Period</label>
            <select
              id="window-select"
              className="metrics-filter"
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              type="button"
              className="metrics-refresh-btn"
              onClick={loadMetrics}
              disabled={loading}
              aria-label="Refresh metrics"
              title="Refresh metrics"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="insight-banner">
          <div className="insight-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l6-6 4 4 8-8" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            Performance Insight: Team efficiency improved by 12% this month. Great job keeping the WIP limits in check.
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="metrics-body">

        {/* KPI cards */}
        <div className="kpi-row">
          <KpiCard
            title="Completion Rate"
            value={kpis.completion}
            trend="+5%"
            trendTone={kpis.completionValue >= 75 ? "positive" : "neutral"}
            meta="Team completed planned tasks this month"
          />
          <KpiCard
            title="Work In Progress"
            value={kpis.wip}
            trend="-2"
            trendTone="positive"
            meta="Currently active tasks across the board"
          />
          <KpiCard
            title="Overdue Tasks"
            value={kpis.overdue}
            trend="+1"
            trendTone={kpis.overdue > 0 ? "critical" : "positive"}
            meta="Tasks that missed their target completion date"
          />
        </div>

        {/* Cycle time */}
        <section className="metrics-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cycle Time Trend</h2>
              <div className="panel-sub">Average time from start to completion (days)</div>
            </div>
          </div>

          <div className="cycle-panel-body">
            <div className="chart-area">
              {cycleData.length === 0 ? (
                <EmptyChartState message="No cycle time data for the selected range." />
              ) : (
                <SimpleLineChart
                  data={cycleData}
                  height={240}
                  stroke="#4f46e5"
                  reference={metrics?.avg_cycle_time_days}
                />
              )}
            </div>

            <div className="chart-stat-col">
              <div className="stat-block">
                <div className="stat-label">Average</div>
                <div className="stat-value">
                  {metrics?.avg_cycle_time_days == null
                    ? "—"
                    : `${Number(metrics.avg_cycle_time_days).toFixed(2)}d`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ownership + Priority */}
        <div className="metrics-grid">
          <div className="metrics-card">
            <h3>Task Ownership</h3>
            <p className="metrics-card-subtitle">Current distribution of active tasks</p>
            {ownership.length === 0 ? (
              <EmptyChartState message="No ownership data" />
            ) : (
              <SimpleHorizontalBars data={ownership} color="#4f46e5" />
            )}
          </div>

          <div className="metrics-card">
            <h3>Priority Load Balance</h3>
            <p className="metrics-card-subtitle">Breakdown of tasks by priority level</p>
            {priorityData.every((d) => Number(d.value || 0) === 0) ? (
              <EmptyChartState message="No priority data" />
            ) : (
              <SimpleDonutChart data={priorityData} size={200} strokeWidth={24} />
            )}
          </div>
        </div>

        {/* Reviews */}
        <section className="review-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Review Activity</h2>
              <div className="panel-sub">Latest feedback and approvals on team tasks</div>
            </div>
            <button className="btn-tertiary" onClick={() => {}}>View all</button>
          </div>

          <div className="review-cards">
            {recentReviews.length === 0 ? (
              <EmptyChartState message="No recent reviews" />
            ) : (
              recentReviews.map((r) => (
                <div key={r.id} className={`review-card review-card-${r.status}`}>
                  <div className="review-card-top">
                    <div className="avatar-sm">
                      {(r.reviewer_name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="reviewer-name">{r.reviewer_name}</div>
                      <div className="review-time">{r.time}</div>
                    </div>
                    <div className={`review-badge badge-${r.status}`}>
                      {r.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="review-comment">{r.comment}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}