import { pgTable, varchar, index, serial, timestamp, uniqueIndex, boolean, integer, foreignKey, unique, text, doublePrecision, pgEnum, customType, primaryKey } from "drizzle-orm/pg-core";
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const projectstatus = pgEnum("projectstatus", ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]);
export const projecttype = pgEnum("projecttype", ["DEVELOPED_BY_MACS", "SUPPORTED_BY_MACS", "MEMBER_SHOWCASE"]);

export const alembicVersion = pgTable("alembic_version", {
  versionNum: varchar("version_num", { length: 32 }).notNull(),
}, (table) => [primaryKey({ name: "alembic_version_pkc", columns: [table.versionNum] })]);

export const assets = pgTable("assets", {
  id: serial().primaryKey().notNull(),
  filename: varchar().notNull(),
  contentType: varchar("content_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (table) => [
  index("ix_assets_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
]);

export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  email: varchar().notNull(),
  fullName: varchar("full_name").notNull(),
  hashedPassword: varchar("hashed_password").notNull(),
  role: varchar().default("moderator").notNull(),
  status: varchar().default("pending").notNull(),
  isActive: boolean("is_active"),
  failedLoginAttempts: integer("failed_login_attempts"),
  lastLogin: timestamp("last_login", { withTimezone: true, mode: "string" }),
  lastFailedLogin: timestamp("last_failed_login", { withTimezone: true, mode: "string" }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  uniqueIndex("ix_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
  index("ix_users_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
]);

export const members = pgTable("members", {
  id: serial().primaryKey().notNull(),
  fullName: varchar("full_name").notNull(),
  profileImage: varchar("profile_image"),
  isActive: boolean("is_active"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("ix_members_full_name").using("btree", table.fullName.asc().nullsLast().op("text_ops")),
  index("ix_members_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
  foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "members_user_id_fkey"
  }),
]);

export const projectMembers = pgTable("project_members", {
  id: serial().primaryKey().notNull(),
  projectId: integer("project_id").notNull(),
  memberId: integer("member_id").notNull(),
  role: varchar(),
  contributionCount: integer("contribution_count"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (table) => [
  index("ix_project_members_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
  index("ix_project_members_member_id").using("btree", table.memberId.asc().nullsLast().op("int4_ops")),
  index("ix_project_members_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
  foreignKey({
      columns: [table.memberId],
      foreignColumns: [members.id],
      name: "project_members_member_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_members_project_id_fkey"
  }).onDelete("cascade"),
]);

export const projects = pgTable("projects", {
  id: serial().primaryKey().notNull(),
  title: varchar().notNull(),
  slug: varchar().notNull(),
  description: varchar(),
  content: text(),
  imageUrl: varchar("image_url"),
  technologies: varchar(),
  githubUrl: varchar("github_url"),
  liveUrl: varchar("live_url"),
  status: projectstatus(),
  categoryId: integer("category_id"),
  createdBy: integer("created_by").notNull(),
  teamMembers: varchar("team_members"),
  isActive: boolean("is_active"),
  isDeleted: boolean("is_deleted"),
  isFeatured: boolean("is_featured"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  startedAt: timestamp("started_at", { mode: "string" }),
  completedAt: timestamp("completed_at", { mode: "string" }),
  projectType: projecttype("project_type").notNull(),
}, (table) => [
  index("ix_projects_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
  foreignKey({
      columns: [table.categoryId],
      foreignColumns: [projectCategories.id],
      name: "projects_category_id_fkey"
  }),
  foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "projects_created_by_fkey"
  }),
  unique("projects_slug_key").on(table.slug),
]);

export const projectCategories = pgTable("project_categories", {
  id: serial().primaryKey().notNull(),
  name: varchar().notNull(),
  description: varchar(),
  icon: varchar(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("ix_project_categories_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
]);

export const sponsors = pgTable("sponsors", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  imageUrl: varchar("image_url", { length: 500 }),
  category: varchar({ length: 100 }).notNull(),
  discountInfo: text("discount_info"),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  address: text(),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  isFeatured: boolean("is_featured").default(false),
}, (table) => [
  index("ix_sponsors_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
  index("ix_sponsors_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
  index("ix_sponsors_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const eventCategories = pgTable("event_categories", {
  id: serial().primaryKey().notNull(),
  name: varchar().notNull(),
  description: varchar(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("ix_event_categories_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
]);

export const events = pgTable("events", {
  id: serial().primaryKey().notNull(),
  title: varchar().notNull(),
  slug: varchar().notNull(),
  description: varchar(),
  content: text(),
  imageUrl: varchar("image_url"),
  location: varchar(),
  startTime: timestamp("start_time", { mode: "string" }).notNull(),
  endTime: timestamp("end_time", { mode: "string" }),
  categoryId: integer("category_id"),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active"),
  isDeleted: boolean("is_deleted"),
  isFeatured: boolean("is_featured"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  registrationLink: varchar("registration_link"),
  directionsLink: varchar("directions_link"),
}, (table) => [
  index("ix_events_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
  foreignKey({
      columns: [table.categoryId],
      foreignColumns: [eventCategories.id],
      name: "events_category_id_fkey"
  }),
  foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "events_created_by_fkey"
  }),
  unique("events_slug_key").on(table.slug),
]);
