const express = require("express");
const { z } = require("zod");
const { query, transaction } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();

const idParams = z.object({ params: z.object({ id: z.string().uuid() }) });
const taskBody = z.object({
  body: z.object({
    parentTaskId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    status: z.enum(["todo", "in_progress", "done", "cancelled"]).default("todo"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    deadline: z.string().datetime().nullable().optional(),
    position: z.coerce.number().int().default(0),
    tagIds: z.array(z.string().uuid()).optional()
  })
});

function mapTaskBody(body) {
  return {
    parent_task_id: body.parentTaskId || null,
    category_id: body.categoryId || null,
    title: body.title,
    description: body.description || null,
    status: body.status,
    priority: body.priority,
    deadline: body.deadline || null,
    completed_at: body.status === "done" ? new Date() : null,
    position: body.position
  };
}

async function ensureTaskOwner(taskId, userId) {
  const result = await query("SELECT id FROM tasks WHERE id = $1 AND user_id = $2", [taskId, userId]);
  if (!result.rowCount) throw new HttpError(404, "Task not found");
}

router.get("/", asyncHandler(async (req, res) => {
  const { status, priority, categoryId, search, from, to } = req.query;
  const filters = ["t.user_id = $1"];
  const params = [req.user.id];

  if (status) {
    params.push(status);
    filters.push(`t.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    filters.push(`t.priority = $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    filters.push(`t.category_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    filters.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
  }
  if (from) {
    params.push(from);
    filters.push(`t.deadline >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    filters.push(`t.deadline <= $${params.length}`);
  }

  const result = await query(
    `SELECT t.*, c.name AS category_name, c.color AS category_color,
      COALESCE(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color))
        FILTER (WHERE tg.id IS NOT NULL), '[]') AS tags
     FROM tasks t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN task_tags tt ON tt.task_id = t.id
     LEFT JOIN tags tg ON tg.id = tt.tag_id
     WHERE ${filters.join(" AND ")}
     GROUP BY t.id, c.id
     ORDER BY t.position ASC, t.deadline ASC NULLS LAST, t.created_at DESC`,
    params
  );

  res.json({ tasks: result.rows });
}));

router.post("/", validate(taskBody), asyncHandler(async (req, res) => {
  const values = mapTaskBody(req.body);
  const result = await transaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO tasks (user_id, parent_task_id, category_id, title, description, status, priority, deadline, completed_at, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.id, values.parent_task_id, values.category_id, values.title, values.description, values.status, values.priority, values.deadline, values.completed_at, values.position]
    );

    if (req.body.tagIds?.length) {
      await client.query(
        `INSERT INTO task_tags (task_id, tag_id)
         SELECT $1, id FROM tags WHERE user_id = $2 AND id = ANY($3::uuid[])`,
        [inserted.rows[0].id, req.user.id, req.body.tagIds]
      );
    }

    return inserted.rows[0];
  });

  res.status(201).json({ task: result });
}));

router.get("/:id", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT t.*, COALESCE(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color))
      FILTER (WHERE tg.id IS NOT NULL), '[]') AS tags
     FROM tasks t
     LEFT JOIN task_tags tt ON tt.task_id = t.id
     LEFT JOIN tags tg ON tg.id = tt.tag_id
     WHERE t.id = $1 AND t.user_id = $2
     GROUP BY t.id`,
    [req.params.id, req.user.id]
  );
  if (!result.rowCount) throw new HttpError(404, "Task not found");
  res.json({ task: result.rows[0] });
}));

router.patch("/:id", validate(idParams.merge(z.object({ body: taskBody.shape.body.partial() }))), asyncHandler(async (req, res) => {
  await ensureTaskOwner(req.params.id, req.user.id);
  const fields = {
    parent_task_id: req.body.parentTaskId,
    category_id: req.body.categoryId,
    title: req.body.title,
    description: req.body.description,
    status: req.body.status,
    priority: req.body.priority,
    deadline: req.body.deadline,
    position: req.body.position
  };

  if (req.body.status === "done") fields.completed_at = new Date();
  if (req.body.status && req.body.status !== "done") fields.completed_at = null;

  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  const result = await transaction(async (client) => {
    let updatedTask;
    if (updates.length) {
      const setSql = updates.map(([key], index) => `${key} = $${index + 3}`).join(", ");
      const updated = await client.query(
        `UPDATE tasks SET ${setSql} WHERE id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.id, ...updates.map(([, value]) => value)]
      );
      updatedTask = updated.rows[0];
    } else {
      const current = await client.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
      updatedTask = current.rows[0];
    }

    if (req.body.tagIds) {
      await client.query("DELETE FROM task_tags WHERE task_id = $1", [req.params.id]);
      if (req.body.tagIds.length) {
        await client.query(
          `INSERT INTO task_tags (task_id, tag_id)
           SELECT $1, id FROM tags WHERE user_id = $2 AND id = ANY($3::uuid[])`,
          [req.params.id, req.user.id, req.body.tagIds]
        );
      }
    }

    return updatedTask;
  });

  res.json({ task: result });
}));

router.delete("/:id", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Task not found");
  res.status(204).send();
}));

module.exports = router;
