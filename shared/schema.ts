import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication (keeping from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Series schema
export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  totalEpisodes: integer("total_episodes"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSeriesSchema = createInsertSchema(series).omit({
  id: true,
  createdAt: true,
});

export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Series = typeof series.$inferSelect;

// Episode schema
export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id").notNull(),
  title: text("title").notNull(),
  episodeNumber: integer("episode_number"),
  season: integer("season"),
  duration: text("duration"),
  sourceUrl: text("source_url").notNull().unique(),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEpisodeSchema = createInsertSchema(episodes).omit({
  id: true,
  createdAt: true,
});

export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Episode = typeof episodes.$inferSelect;

// Download schema
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id").notNull(),
  status: text("status").notNull().default("queued"), // queued, downloading, paused, completed, error, uploaded
  progress: integer("progress").default(0),
  totalSize: integer("total_size"),
  downloadedSize: integer("downloaded_size").default(0),
  speed: integer("speed"),
  filePath: text("file_path"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  createdAt: true,
});

export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloads.$inferSelect;

// URL Fetch Schema
export const urlFetchSchema = z.object({
  url: z.string().url("Please provide a valid Wcofun.net URL"),
  forceRefresh: z.boolean().optional(),
});

// Download Request Schema
export const downloadRequestSchema = z.object({
  type: z.enum(["episode", "series"]),
  id: z.number(),
  downloadPath: z.string().optional(),
});

// Rclone Upload Schema
export const rcloneUploadSchema = z.object({
  downloadIds: z.array(z.number()),
  remotePath: z.string(),
});

// Rclone Config Schema
export const rcloneConfigSchema = z.object({
  configContent: z.string().min(1, "Configuration content is required"),
});

// Download Control Schema
export const downloadControlSchema = z.object({
  downloadId: z.number(),
  action: z.enum(["pause", "resume", "cancel"]),
});
