/**
 * SECURITY (OWASP A03 — Injection): All database access uses Neon parameterized queries / tagged templates.
 * Never concatenate untrusted input into SQL strings.
 */
const { neon } = require("@neondatabase/serverless");
const TABLE_NAME = "complaints_portal";
const CUSTOMERS_TABLE = "portal_customers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL);

const ensureTable = async () => {
  await sql(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id SERIAL PRIMARY KEY,
      ref_number VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(15),
      category VARCHAR(50) NOT NULL,
      subject VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(10) DEFAULT 'Medium',
      status VARCHAR(20) DEFAULT 'Open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`ALTER TABLE complaints_portal ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(80)`);
  await sql(`ALTER TABLE complaints_portal ADD COLUMN IF NOT EXISTS attachment_base64 TEXT`);

  await sql(`
    UPDATE ${TABLE_NAME}
    SET ref_number = 'CMP-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(md5(random()::text), 1, 6))
    WHERE ref_number IS NULL
  `);

  await sql(`CREATE UNIQUE INDEX IF NOT EXISTS complaints_portal_ref_number_uindex ON ${TABLE_NAME}(ref_number)`);

  await sql(`
    CREATE TABLE IF NOT EXISTS ${CUSTOMERS_TABLE} (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/** List/detail columns without large attachment_base64 (used for admin list & insights). */
const LIST_COLUMNS = `id, ref_number, name, email, phone, category, subject, description, priority, status, created_at, updated_at, attachment_mime`;

const findCustomerByEmail = async (email) => {
  const em = normalizeEmail(email);
  const rows = await sql`SELECT * FROM portal_customers WHERE email = ${em}`;
  return rows[0] || null;
};

const createCustomer = async ({ email, passwordHash, displayName }) => {
  const em = normalizeEmail(email);
  const name = String(displayName).trim().slice(0, 100);
  const rows = await sql`
    INSERT INTO portal_customers (email, password_hash, display_name)
    VALUES (${em}, ${passwordHash}, ${name})
    RETURNING id, email, display_name, created_at
  `;
  return rows[0];
};

const getComplaintsByCustomerEmail = async (email) => {
  const em = normalizeEmail(email);
  return sql(`SELECT ${LIST_COLUMNS} FROM ${TABLE_NAME} WHERE lower(email) = lower($1) ORDER BY created_at DESC`, [em]);
};

const getAdminInsights = async () => {
  const byCategory = await sql`
    SELECT category, COUNT(*)::int AS count
    FROM complaints_portal
    GROUP BY category
    ORDER BY count DESC
  `;
  const byStatus = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM complaints_portal
    GROUP BY status
    ORDER BY count DESC
  `;
  const byPriority = await sql`
    SELECT priority, COUNT(*)::int AS count
    FROM complaints_portal
    GROUP BY priority
    ORDER BY count DESC
  `;
  const [{ count: submissionsLast7Days }] = await sql`
    SELECT COUNT(*)::int AS count FROM complaints_portal
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `;
  const [{ count: highPriorityOpen }] = await sql`
    SELECT COUNT(*)::int AS count FROM complaints_portal
    WHERE priority = 'High' AND status <> 'Resolved'
  `;
  const [{ hours: avgResolvedHours }] = await sql`
    SELECT COALESCE(
      ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0)::numeric, 1),
      0
    )::float AS hours
    FROM complaints_portal
    WHERE status = 'Resolved'
  `;
  const recentActivity = await sql`
    SELECT id, ref_number, name, email, category, subject, priority, status, created_at, attachment_mime
    FROM complaints_portal
    ORDER BY created_at DESC
    LIMIT 10
  `;
  return {
    byCategory,
    byStatus,
    byPriority,
    submissionsLast7Days,
    highPriorityOpen,
    avgResolvedHours,
    recentActivity
  };
};

const generateRefNumber = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Array.from({ length: 6 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
      Math.floor(Math.random() * 36)
    )
  ).join("");
  return `CMP-${y}${m}${d}-${rand}`;
};

const insertComplaint = async (data) => {
  const refNumber = generateRefNumber();
  const mime = data.attachment_mime != null ? data.attachment_mime : null;
  const b64 = data.attachment_base64 != null ? data.attachment_base64 : null;
  const rows = await sql`
    INSERT INTO complaints_portal
      (ref_number, name, email, phone, category, subject, description, priority, attachment_mime, attachment_base64)
    VALUES
      (${refNumber}, ${data.name}, ${data.email}, ${data.phone}, ${data.category}, ${data.subject}, ${data.description}, ${data.priority}, ${mime}, ${b64})
    RETURNING *
  `;
  return rows[0];
};

const getAllComplaints = async (filters = {}) => {
  let query = `SELECT ${LIST_COLUMNS} FROM ${TABLE_NAME} WHERE 1=1`;
  const values = [];

  if (filters.category) {
    values.push(filters.category);
    query += ` AND category = $${values.length}`;
  }
  if (filters.status) {
    values.push(filters.status);
    query += ` AND status = $${values.length}`;
  }
  if (filters.priority) {
    values.push(filters.priority);
    query += ` AND priority = $${values.length}`;
  }
  query += " ORDER BY created_at DESC";

  return sql(query, values);
};

const getComplaintById = async (id) => {
  const rows = await sql(`SELECT * FROM ${TABLE_NAME} WHERE id = $1`, [id]);
  return rows[0] || null;
};

const getComplaintByRef = async (ref) => {
  const rows = await sql(`SELECT * FROM ${TABLE_NAME} WHERE ref_number = $1`, [ref]);
  return rows[0] || null;
};

const updateComplaintStatus = async (id, status) => {
  const rows = await sql(
    `UPDATE ${TABLE_NAME} SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${LIST_COLUMNS}`,
    [status, id]
  );
  return rows[0] || null;
};

const deleteComplaint = async (id) => {
  const rows = await sql(`DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
};

const getStats = async () => {
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status != 'Resolved')::int AS open,
      COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE priority = 'High')::int AS high_priority
    FROM complaints_portal
  `;
  return row;
};

module.exports = {
  ensureTable,
  insertComplaint,
  getAllComplaints,
  getComplaintById,
  getComplaintByRef,
  updateComplaintStatus,
  deleteComplaint,
  getStats,
  findCustomerByEmail,
  createCustomer,
  getComplaintsByCustomerEmail,
  getAdminInsights,
  normalizeEmail
};
