import { pgTable, text, serial, timestamp, integer, date, real, json } from "drizzle-orm/pg-core";

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  faceDescriptor: json("face_descriptor").$type<number[]>(),
  photo: text("photo"),
  pinHash: text("pin_hash"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("Present"),
  method: text("method").notNull().default("manual"),
  matchConfidence: real("match_confidence"),
  checkInTime: timestamp("check_in_time", { withTimezone: true }).notNull().defaultNow(),
  date: date("date", { mode: "string" }).notNull(),
});

export const exportsTable = pgTable("exports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  format: text("format").notNull().default("xlsx"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  recordCount: integer("record_count").notNull().default(0),
});

export const visitorsTable = pgTable("visitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  companyName: text("company_name"),
  hostName: text("host_name"),
  signature: text("signature"),
  visitDate: date("visit_date", { mode: "string" }).notNull(),
  checkInTime: timestamp("check_in_time", { withTimezone: true }).notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetsTable = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const regularizationsTable = pgTable("regularizations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  requestedById: integer("requested_by_id"),
  requestedByName: text("requested_by_name"),
  reviewedById: integer("reviewed_by_id"),
  reviewedByName: text("reviewed_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Employee = typeof employeesTable.$inferSelect;
export type Attendance = typeof attendanceTable.$inferSelect;
export type Visitor = typeof visitorsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
