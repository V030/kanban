import { pool } from "../config/db.js";

const METRICS_CACHE_TTL_MS = 5 * 60 * 1000;
const metricsCache = new Map();

function normalizeWindowDays(daysRaw) {
  const parsed = Number.parseInt(daysRaw, 10);
  if (Number.isNaN(parsed)) return 30;
  return Math.min(365, Math.max(7, parsed));
}

function getCacheKey(projectId, windowDays) {
  return `${projectId}:${windowDays}`;
}

function buildFallbackMetrics(windowDays) {
  return {
    window_days: windowDays,
    completion_rate: 0,
    avg_cycle_time_days: null,
    cycle_time_trend: [],
    overdue_count: 0,
    wip_count: 0,
    avg_review_time_days: null,
    approval_rejection_ratio: [],
    reviewer_activity: [],
    ownership: [],
    priority_load: [],
    generated_at: new Date().toISOString(),
    cached: false,
    degraded: true,
  };
}

const runMetricQuery = async (metricName, sql, params) => {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    const wrapped = new Error(`Metric query failed: ${metricName}`);
    wrapped.metricName = metricName;
    wrapped.sql = sql;
    wrapped.cause = error;
    throw wrapped;
  }
};

async function computeProjectMetrics(projectId, windowDays) {
  const params = [projectId, windowDays];

  const completionQ = `
    WITH base_tasks AS (
      SELECT t.id, tc.name AS category_name
      FROM tasks t
      JOIN tasks_categories tc ON tc.id = t.category_id
      WHERE tc.project_id = $1
        AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    )
    SELECT
      COUNT(*) FILTER (WHERE LOWER(category_name) = 'done')::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate
    FROM base_tasks
  `;

  const cycleQ = `
    SELECT AVG(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400.0) AS avg_cycle_time_days
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      AND LOWER(tc.name) = 'done'
  `;

  const trendQ = `
    SELECT
      to_char(date_trunc('week', t.created_at)::date, 'YYYY-MM-DD') AS week_start,
      AVG(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400.0) AS avg_cycle_days
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      AND LOWER(tc.name) = 'done'
    GROUP BY week_start
    ORDER BY week_start DESC
    LIMIT 12
  `;

  const overdueQ = `
    SELECT COUNT(*) AS overdue_count
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      AND t.target_date < CURRENT_DATE
      AND LOWER(tc.name) <> 'done'
  `;

  const wipQ = `
    SELECT COUNT(*) AS wip_count
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      AND LOWER(REPLACE(tc.name, '_', ' ')) = 'in progress'
  `;

  const avgReviewQ = `
    SELECT AVG(EXTRACT(EPOCH FROM (r.created_at - t.created_at)) / 86400.0) AS avg_review_time_days
    FROM reviews r
    JOIN tasks t ON t.id = r.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND r.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      AND LOWER(REPLACE(tc.name, '_', ' ')) IN ('done', 'todo', 'to do')
  `;

  const approvalRatioQ = `
    SELECT LOWER(COALESCE(r.action, 'unknown')) AS action, COUNT(*)::int AS count
    FROM reviews r
    JOIN tasks t ON t.id = r.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tc.project_id = $1
      AND r.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    GROUP BY LOWER(COALESCE(r.action, 'unknown'))
    ORDER BY action
  `;

  const reviewerActivityQ = `
    SELECT
      u.id AS reviewer_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS reviewer_name,
      COUNT(r.id)::int AS reviews_done
    FROM reviews r
    JOIN tasks t ON t.id = r.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN users u ON u.id = r.reviewer_id
    WHERE tc.project_id = $1
      AND r.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    GROUP BY u.id, reviewer_name
    ORDER BY reviews_done DESC, reviewer_name ASC
  `;

  const ownershipQ = `
    SELECT
      u.id AS assigned_user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS assignee_name,
      COUNT(t.id)::int AS task_count
    FROM task_assignees ta
    JOIN tasks t ON t.id = ta.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN users u ON u.id = ta.user_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    GROUP BY u.id, assignee_name
    ORDER BY task_count DESC, assignee_name ASC
  `;

  const priorityQ = `
    SELECT
      u.id AS assigned_user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS assignee_name,
      COUNT(*) FILTER (WHERE t.priority = 'critical')::int AS urgent_count,
      COUNT(*) FILTER (WHERE t.priority = 'low')::int AS low_count
    FROM task_assignees ta
    JOIN tasks t ON t.id = ta.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN users u ON u.id = ta.user_id
    WHERE tc.project_id = $1
      AND t.created_at >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    GROUP BY u.id, assignee_name
    ORDER BY assignee_name ASC
  `;

  const completionR = await runMetricQuery("completion_rate", completionQ, params);
  const cycleR = await runMetricQuery("avg_cycle_time_days", cycleQ, params);
  const trendR = await runMetricQuery("cycle_time_trend", trendQ, params);
  const overdueR = await runMetricQuery("overdue_count", overdueQ, params);
  const wipR = await runMetricQuery("wip_count", wipQ, params);
  const avgReviewR = await runMetricQuery("avg_review_time_days", avgReviewQ, params);
  const approvalRatioR = await runMetricQuery("approval_rejection_ratio", approvalRatioQ, params);
  const reviewerActivityR = await runMetricQuery("reviewer_activity", reviewerActivityQ, params);
  const ownershipR = await runMetricQuery("ownership_distribution", ownershipQ, params);
  const priorityR = await runMetricQuery("priority_load_balance", priorityQ, params);

  return {
    window_days: windowDays,
    completion_rate: Number(completionR.rows[0]?.completion_rate || 0),
    avg_cycle_time_days: cycleR.rows[0]?.avg_cycle_time_days == null ? null : Number(cycleR.rows[0].avg_cycle_time_days),
    cycle_time_trend: (trendR.rows || []).reverse().map((row) => ({
      week_start: row.week_start,
      avg_cycle_days: row.avg_cycle_days == null ? null : Number(row.avg_cycle_days),
    })),
    overdue_count: Number.parseInt(overdueR.rows[0]?.overdue_count || 0, 10),
    wip_count: Number.parseInt(wipR.rows[0]?.wip_count || 0, 10),
    avg_review_time_days: avgReviewR.rows[0]?.avg_review_time_days == null ? null : Number(avgReviewR.rows[0].avg_review_time_days),
    approval_rejection_ratio: approvalRatioR.rows || [],
    reviewer_activity: reviewerActivityR.rows || [],
    ownership: ownershipR.rows || [],
    priority_load: priorityR.rows || [],
    generated_at: new Date().toISOString(),
  };
}

async function getOrComputeMetrics(projectId, windowDays) {
  const key = getCacheKey(projectId, windowDays);
  const now = Date.now();
  const cached = metricsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return { ...cached.data, cached: true };
  }

  const data = await computeProjectMetrics(projectId, windowDays);
  metricsCache.set(key, {
    data,
    expiresAt: now + METRICS_CACHE_TTL_MS,
    projectId,
    windowDays,
  });

  return { ...data, cached: false };
}

setInterval(async () => {
  const entries = Array.from(metricsCache.entries());
  for (const [key, entry] of entries) {
    if (!entry?.projectId || !entry?.windowDays) continue;
    try {
      const data = await computeProjectMetrics(entry.projectId, entry.windowDays);
      metricsCache.set(key, {
        ...entry,
        data,
        expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
      });
    } catch (error) {
      console.error("Scheduled metrics cache refresh failed", {
        key,
        projectId: entry.projectId,
        windowDays: entry.windowDays,
        message: error?.message,
      });
    }
  }
}, METRICS_CACHE_TTL_MS).unref();

export async function getProjectMetrics(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { projectId } = req.params;
  if (!projectId) return res.status(400).json({ message: "projectId is required" });

  const windowDays = normalizeWindowDays(req.query?.days);

  try {
    const data = await getOrComputeMetrics(projectId, windowDays);
    return res.status(200).json(data);
  } catch (err) {
    const sourceError = err?.cause || err;
    const metricName = err?.metricName || "unknown_metric";

    console.error("Error fetching project metrics", {
      projectId,
      userId: req.user?.userId,
      metricName,
      windowDays,
      message: sourceError?.message,
      code: sourceError?.code,
      detail: sourceError?.detail,
      hint: sourceError?.hint,
      table: sourceError?.table,
      column: sourceError?.column,
      constraint: sourceError?.constraint,
      where: sourceError?.where,
      schema: sourceError?.schema,
      routine: sourceError?.routine,
      stack: sourceError?.stack,
    });

    const debugMessage = `Unable to fetch metrics: ${metricName} failed${sourceError?.message ? ` (${sourceError.message})` : ""}`;
    const message = process.env.NODE_ENV === "production" ? "Unable to fetch metrics" : debugMessage;
    return res.status(500).json({ message });
  }
}
