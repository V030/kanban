import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { ChartEmptyIcon, InsightTrendIcon } from "../components/common/AppIcons";
import "../components/styles/Metrics.css";
import "../components/styles/SkeletonLoading.css";
import { getProjectMetrics, getProjects } from "../services/projectService";

// ── Chart helpers ────────────────────────────────────────────────

function CycleTimeTrendChart({ data = [], reference = null, stroke = "#4f46e5" }) {
  if (!data || !data.length) return null;

  const values = data.map((d) => Number(d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const W = 960;
  const H = 320;
  const padX = 56;
  const padTop = 30;
  const padBottom = 44;
  const chartW = W - padX * 2;
  const chartH = H - padTop - padBottom;

  const points = data.map((d, index) => {
    const value = Number(d.value || 0);
    const x = padX + (index / Math.max(data.length - 1, 1)) * chartW;
    const y = padTop + chartH * (1 - (value - min) / range);
    return { ...d, value, x, y };
  });

  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x} ${H - padBottom}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${points[points.length - 1].x} ${H - padBottom}`,
    "Z",
  ].join(" ");

  const referenceY =
    reference != null
      ? padTop + chartH * (1 - (Number(reference) - min) / range)
      : null;

  const ticks = [0.25, 0.5, 0.75].map((ratio) => ({
    ratio,
    y: padTop + chartH * ratio,
    label: `${((max - min) * (1 - ratio) + min).toFixed(0)}d`,
  }));

  return (
    <div className="cycle-chart-frame">
      <div className="cycle-chart-summary">
        <div className="cycle-summary-chip">
          <span className="cycle-summary-label">Average</span>
          <span className="cycle-summary-value">
            {reference == null ? "—" : `${Number(reference).toFixed(2)}d`}
          </span>
        </div>
        <div className="cycle-summary-chip">
          <span className="cycle-summary-label">Lowest</span>
          <span className="cycle-summary-value">{`${min.toFixed(2)}d`}</span>
        </div>
        <div className="cycle-summary-chip">
          <span className="cycle-summary-label">Highest</span>
          <span className="cycle-summary-value">{`${max.toFixed(2)}d`}</span>
        </div>
      </div>

      <div className="cycle-chart-viewport" aria-label="Cycle time trend chart">
        <svg
          className="cycle-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Cycle time trend"
        >
          <defs>
            <linearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="cycle-chart-grid">
            {ticks.map((tick) => (
              <g key={tick.y}>
                <line x1={padX} x2={W - padX} y1={tick.y} y2={tick.y} />
                <text x={padX - 12} y={tick.y + 5} textAnchor="end">
                  {tick.label}
                </text>
              </g>
            ))}
          </g>

          {referenceY != null && (
            <g className="cycle-chart-reference">
              <line x1={padX} x2={W - padX} y1={referenceY} y2={referenceY} />
              <text x={W - padX} y={referenceY - 8} textAnchor="end">
                Average
              </text>
            </g>
          )}

          <path className="cycle-chart-area" d={areaPath} fill="url(#cycleFill)" />
          <polyline
            className="cycle-chart-line"
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            points={linePath}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={point.name}>
              <circle cx={point.x} cy={point.y} r="5" fill={stroke} stroke="#fff" strokeWidth="3" />
              <text x={point.x} y={H - 14} textAnchor="middle" className="cycle-chart-label">
                {point.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
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
      <ChartEmptyIcon />
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
  const { projectId: routeProjectId } = useParams();
  const toast = useToast();
  const isMountedRef = useRef(true);

  const [projectId, setProjectId] = useState(routeProjectId || null);
  const [projectName, setProjectName] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
    }

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
        toast.showWarning("No project available");
        return;
      }
      const data = await getProjectMetrics(pid, windowDays);
      if (isMountedRef.current) setMetrics(data);
    } catch (err) {
      if (isMountedRef.current) toast.showError(err?.message || "Unable to load metrics");
    } finally {
      if (isMountedRef.current && !silent) setLoading(false);
    }
  }, [projectId, windowDays, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    loadMetrics();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadMetrics]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event?.detail || {};
      const payload = detail.payload || {};
      const type = String(detail.type || "").toLowerCase();

      if (!projectId) return;
      if (payload.projectId && String(payload.projectId) !== String(projectId)) return;

      const relevant = new Set([
        "task_assigned",
        "task_unassigned",
        "task_status_changed",
        "review_approved",
        "review_rejected",
      ]);
      if (!relevant.has(type)) return;
      loadMetrics({ silent: true });
    };

    window.addEventListener("notifications:push", handleRealtime);
    return () => window.removeEventListener("notifications:push", handleRealtime);
  }, [projectId, loadMetrics]);

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

  const cycleStats = useMemo(() => {
    if (!cycleData.length) return null;
    const values = cycleData.map((item) => Number(item.value || 0));
    return {
      latest: cycleData[cycleData.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: metrics?.avg_cycle_time_days,
    };
  }, [cycleData, metrics]);

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

  const reviewStats = useMemo(() => {
    const counts = recentReviews.reduce(
      (acc, review) => {
        const status = review.status || "pending";
        acc[status] = (acc[status] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { total: 0, approved: 0, rejected: 0, pending: 0 }
    );

    const approvalRate = counts.total > 0 ? Math.round((counts.approved / counts.total) * 100) : 0;
    const topReviewer = recentReviews[0];

    return { counts, approvalRate, topReviewer };
  }, [recentReviews]);

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
            <InsightTrendIcon />
          </div>
          <div>
            Performance Insight: Team efficiency improved by 12% this month. Great job keeping the WIP limits in check.
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
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
        <section className="metrics-panel cycle-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cycle Time Trend</h2>
              <div className="panel-sub">Average time from start to completion (days)</div>
            </div>
          </div>

          <div className="cycle-chart-shell">
            {cycleData.length === 0 ? (
              <EmptyChartState message="No cycle time data for the selected range." />
            ) : (
              <CycleTimeTrendChart
                data={cycleData}
                stroke="#4f46e5"
                reference={metrics?.avg_cycle_time_days}
              />
            )}

            {cycleStats && (
              <div className="cycle-stat-grid">
                <div className="cycle-stat-card">
                  <div className="cycle-stat-label">Latest</div>
                  <div className="cycle-stat-value">{`${Number(cycleStats.latest.value).toFixed(2)}d`}</div>
                  <div className="cycle-stat-meta">{cycleStats.latest.name}</div>
                </div>
                <div className="cycle-stat-card">
                  <div className="cycle-stat-label">Average</div>
                  <div className="cycle-stat-value">
                    {cycleStats.avg == null ? "—" : `${Number(cycleStats.avg).toFixed(2)}d`}
                  </div>
                  <div className="cycle-stat-meta">Across selected period</div>
                </div>
                <div className="cycle-stat-card">
                  <div className="cycle-stat-label">Range</div>
                  <div className="cycle-stat-value">{`${cycleStats.min.toFixed(2)}d - ${cycleStats.max.toFixed(2)}d`}</div>
                  <div className="cycle-stat-meta">Variation in the trend line</div>
                </div>
              </div>
            )}
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
        <section className="review-panel review-activity-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Review Activity</h2>
              <div className="panel-sub">Latest feedback and approvals on team tasks</div>
            </div>
            <button className="btn-tertiary" onClick={() => {}}>View all</button>
          </div>

          {recentReviews.length === 0 ? (
            <EmptyChartState message="No recent reviews" />
          ) : (
            <div className="review-activity-shell">
              <div className="review-activity-feed">
                <div className="review-activity-stats">
                  <div className="review-stat-card">
                    <div className="review-stat-label">Total reviews</div>
                    <div className="review-stat-value">{reviewStats.counts.total}</div>
                    <div className="review-stat-meta">In the selected period</div>
                  </div>
                  <div className="review-stat-card">
                    <div className="review-stat-label">Approval rate</div>
                    <div className="review-stat-value">{`${reviewStats.approvalRate}%`}</div>
                    <div className="review-stat-meta">Approved feedback entries</div>
                  </div>
                  <div className="review-stat-card">
                    <div className="review-stat-label">Latest reviewer</div>
                    <div className="review-stat-value">
                      {reviewStats.topReviewer ? reviewStats.topReviewer.reviewer_name : "—"}
                    </div>
                    <div className="review-stat-meta">
                      {reviewStats.topReviewer ? reviewStats.topReviewer.time : "No recent activity"}
                    </div>
                  </div>
                </div>

                <div className="review-activity-list">
                  {recentReviews.map((r, index) => {
                    const initials = (r.reviewer_name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("");

                    return (
                      <article key={r.id} className={`review-activity-item review-card-${r.status}`}>
                        <div className="review-activity-left">
                          <div className="avatar-sm">{initials}</div>
                          <div className="review-activity-copy">
                            <div className="review-activity-meta-row">
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
                        </div>

                        <div className="review-activity-index">
                          #{index + 1}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="review-activity-rail">
                <div className="review-rail-card">
                  <div className="review-rail-title">Status mix</div>
                  <div className="review-rail-bars">
                    {[
                      { key: "approved", label: "Approved", color: "#22c55e" },
                      { key: "pending", label: "Pending", color: "#f59e0b" },
                      { key: "rejected", label: "Rejected", color: "#ef4444" },
                    ].map((entry) => {
                      const value = reviewStats.counts[entry.key] || 0;
                      const pct = reviewStats.counts.total > 0 ? Math.round((value / reviewStats.counts.total) * 100) : 0;
                      return (
                        <div key={entry.key} className="review-rail-bar-row">
                          <div className="review-rail-bar-label">
                            <span className="review-rail-dot" style={{ background: entry.color }} />
                            <span>{entry.label}</span>
                          </div>
                          <div className="review-rail-bar-track">
                            <div
                              className="review-rail-bar-fill"
                              style={{ width: `${pct}%`, background: entry.color }}
                            />
                          </div>
                          <div className="review-rail-bar-value">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="review-rail-card review-rail-callout">
                  <div className="review-rail-title">Focus note</div>
                  <div className="review-rail-copy">
                    Recent feedback is weighted toward approvals. Keep using the same review cadence to
                    preserve the current throughput.
                  </div>
                </div>
              </aside>
            </div>
          )}
        </section>

    </section>
  );
}