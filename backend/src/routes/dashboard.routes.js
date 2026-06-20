const express = require("express");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/overview", asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [tasks, habits, focus, upcoming, overdue] = await Promise.all([
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'done' AND completed_at::date = CURRENT_DATE) AS tasks_done_today,
         COUNT(*) FILTER (WHERE status <> 'done' AND deadline::date = CURRENT_DATE) AS tasks_due_today,
         COUNT(*) FILTER (WHERE status <> 'done') AS tasks_open
       FROM tasks WHERE user_id = $1`,
      [userId]
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE hl.is_completed = TRUE) AS habits_done_today,
         COUNT(h.id) AS active_habits
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.log_date = CURRENT_DATE
       WHERE h.user_id = $1 AND h.is_active = TRUE`,
      [userId]
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed' AND type = 'work' AND started_at::date = CURRENT_DATE) AS pomodoros_today,
         COALESCE(SUM(COALESCE(actual_duration, planned_duration)) FILTER (WHERE status = 'completed' AND type = 'work' AND started_at::date = CURRENT_DATE), 0) AS focus_minutes_today
       FROM focus_sessions WHERE user_id = $1`,
      [userId]
    ),
    query(
      `SELECT id, title, deadline, priority, status
       FROM tasks
       WHERE user_id = $1 AND status <> 'done' AND deadline >= NOW()
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    ),
    query(
      `SELECT id, title, deadline, priority, status
       FROM tasks
       WHERE user_id = $1 AND status <> 'done' AND deadline < NOW()
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    )
  ]);

  const score = Math.min(
    100,
    Number(tasks.rows[0].tasks_done_today || 0) * 12 +
      Number(habits.rows[0].habits_done_today || 0) * 8 +
      Number(focus.rows[0].pomodoros_today || 0) * 10
  );

  res.json({
    overview: {
      ...tasks.rows[0],
      ...habits.rows[0],
      ...focus.rows[0],
      focus_score: score
    },
    upcomingTasks: upcoming.rows,
    overdueTasks: overdue.rows
  });
}));

router.get("/weekly", asyncHandler(async (req, res) => {
  const result = await query(
    `WITH days AS (
       SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
     ),
     task_counts AS (
       SELECT completed_at::date AS day, COUNT(*) AS completed_tasks
       FROM tasks
       WHERE user_id = $1 AND status = 'done' AND completed_at::date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY completed_at::date
     ),
     focus_counts AS (
       SELECT started_at::date AS day,
         COUNT(*) AS pomodoros,
         COALESCE(SUM(COALESCE(actual_duration, planned_duration)), 0) AS focus_minutes
       FROM focus_sessions
       WHERE user_id = $1
         AND status = 'completed'
         AND type = 'work'
         AND started_at::date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY started_at::date
     )
     SELECT d.day,
       COALESCE(tc.completed_tasks, 0) AS completed_tasks,
       COALESCE(fc.pomodoros, 0) AS pomodoros,
       COALESCE(fc.focus_minutes, 0) AS focus_minutes
     FROM days d
     LEFT JOIN task_counts tc ON tc.day = d.day
     LEFT JOIN focus_counts fc ON fc.day = d.day
     ORDER BY d.day ASC`,
    [req.user.id]
  );
  res.json({ days: result.rows });
}));

module.exports = router;
