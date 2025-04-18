import {
  users,
  series,
  episodes,
  downloads,
  type User,
  type InsertUser,
  type Series,
  type InsertSeries,
  type Episode,
  type InsertEpisode,
  type Download,
  type InsertDownload,
} from "@shared/schema";

// CRUD interface for our application
export interface IStorage {
  // User methods (keeping from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Series methods
  getSeries(id: number): Promise<Series | undefined>;
  getSeriesBySourceUrl(url: string): Promise<Series | undefined>;
  getAllSeries(): Promise<Series[]>;
  createSeries(series: InsertSeries): Promise<Series>;
  updateSeries(id: number, data: Partial<InsertSeries>): Promise<Series | undefined>;
  deleteSeries(id: number): Promise<boolean>;

  // Episode methods
  getEpisode(id: number): Promise<Episode | undefined>;
  getEpisodesBySeriesId(seriesId: number): Promise<Episode[]>;
  getEpisodeBySourceUrl(url: string): Promise<Episode | undefined>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  updateEpisode(id: number, data: Partial<Episode>): Promise<Episode | undefined>;
  deleteEpisode(id: number): Promise<boolean>;

  // Download methods
  getDownload(id: number): Promise<Download | undefined>;
  getDownloadsByStatus(status: string): Promise<Download[]>;
  getAllDownloads(): Promise<Download[]>;
  createDownload(download: InsertDownload): Promise<Download>;
  updateDownload(id: number, data: Partial<Download>): Promise<Download | undefined>;
  deleteDownload(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private seriesMap: Map<number, Series>;
  private episodesMap: Map<number, Episode>;
  private downloadsMap: Map<number, Download>;
  
  // IDs for auto-increment
  userCurrentId: number;
  seriesCurrentId: number;
  episodeCurrentId: number;
  downloadCurrentId: number;

  constructor() {
    this.users = new Map();
    this.seriesMap = new Map();
    this.episodesMap = new Map();
    this.downloadsMap = new Map();
    
    this.userCurrentId = 1;
    this.seriesCurrentId = 1;
    this.episodeCurrentId = 1;
    this.downloadCurrentId = 1;
  }

  // User methods implementation
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Series methods implementation
  async getSeries(id: number): Promise<Series | undefined> {
    return this.seriesMap.get(id);
  }

  async getSeriesBySourceUrl(url: string): Promise<Series | undefined> {
    return Array.from(this.seriesMap.values()).find(
      (series) => series.sourceUrl === url,
    );
  }

  async getAllSeries(): Promise<Series[]> {
    return Array.from(this.seriesMap.values());
  }

  async createSeries(insertSeries: InsertSeries): Promise<Series> {
    const id = this.seriesCurrentId++;
    const now = new Date();
    const series: Series = { 
      id, 
      title: insertSeries.title,
      description: insertSeries.description || null,
      totalEpisodes: insertSeries.totalEpisodes || null,
      imageUrl: insertSeries.imageUrl || null,
      sourceUrl: insertSeries.sourceUrl,
      createdAt: now
    };
    this.seriesMap.set(id, series);
    return series;
  }

  async updateSeries(id: number, data: Partial<InsertSeries>): Promise<Series | undefined> {
    const series = this.seriesMap.get(id);
    if (!series) return undefined;
    
    const updatedSeries: Series = { 
      ...series,
      title: data.title !== undefined ? data.title : series.title,
      description: data.description !== undefined ? (data.description || null) : series.description,
      totalEpisodes: data.totalEpisodes !== undefined ? (data.totalEpisodes || null) : series.totalEpisodes,
      imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : series.imageUrl,
      sourceUrl: data.sourceUrl !== undefined ? data.sourceUrl : series.sourceUrl
    };
    
    this.seriesMap.set(id, updatedSeries);
    return updatedSeries;
  }

  async deleteSeries(id: number): Promise<boolean> {
    return this.seriesMap.delete(id);
  }

  // Episode methods implementation
  async getEpisode(id: number): Promise<Episode | undefined> {
    return this.episodesMap.get(id);
  }

  async getEpisodesBySeriesId(seriesId: number): Promise<Episode[]> {
    return Array.from(this.episodesMap.values()).filter(
      (episode) => episode.seriesId === seriesId,
    );
  }

  async getEpisodeBySourceUrl(url: string): Promise<Episode | undefined> {
    return Array.from(this.episodesMap.values()).find(
      (episode) => episode.sourceUrl === url,
    );
  }

  async createEpisode(insertEpisode: InsertEpisode): Promise<Episode> {
    const id = this.episodeCurrentId++;
    const now = new Date();
    const episode: Episode = { 
      id,
      title: insertEpisode.title,
      sourceUrl: insertEpisode.sourceUrl,
      seriesId: insertEpisode.seriesId,
      episodeNumber: insertEpisode.episodeNumber || null,
      season: insertEpisode.season || null,
      duration: insertEpisode.duration || null,
      downloadUrl: insertEpisode.downloadUrl || null,
      createdAt: now
    };
    this.episodesMap.set(id, episode);
    return episode;
  }

  async updateEpisode(id: number, data: Partial<Episode>): Promise<Episode | undefined> {
    const episode = this.episodesMap.get(id);
    if (!episode) return undefined;
    
    const updatedEpisode = { ...episode, ...data };
    this.episodesMap.set(id, updatedEpisode);
    
    return updatedEpisode;
  }

  async deleteEpisode(id: number): Promise<boolean> {
    return this.episodesMap.delete(id);
  }

  // Download methods implementation
  async getDownload(id: number): Promise<Download | undefined> {
    return this.downloadsMap.get(id);
  }

  async getDownloadsByStatus(status: string): Promise<Download[]> {
    return Array.from(this.downloadsMap.values()).filter(
      (download) => download.status === status,
    );
  }

  async getAllDownloads(): Promise<Download[]> {
    return Array.from(this.downloadsMap.values());
  }

  async createDownload(insertDownload: InsertDownload): Promise<Download> {
    const id = this.downloadCurrentId++;
    const now = new Date();
    const download: Download = { 
      id, 
      episodeId: insertDownload.episodeId,
      status: "queued", 
      progress: 0,
      totalSize: null,
      downloadedSize: 0,
      speed: null,
      filePath: insertDownload.filePath || null,
      error: null,
      startedAt: null,
      completedAt: null,
      createdAt: now
    };
    this.downloadsMap.set(id, download);
    return download;
  }

  async updateDownload(id: number, data: Partial<Download>): Promise<Download | undefined> {
    const download = this.downloadsMap.get(id);
    if (!download) return undefined;
    
    const updatedDownload = { ...download, ...data };
    this.downloadsMap.set(id, updatedDownload);
    
    return updatedDownload;
  }

  async deleteDownload(id: number): Promise<boolean> {
    return this.downloadsMap.delete(id);
  }
}

export const storage = new MemStorage();
