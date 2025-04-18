import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scraper } from "./services/scraper";
import { downloader } from "./services/downloader";
import { rcloneService } from "./services/rclone";
import { 
  urlFetchSchema,
  downloadRequestSchema,
  downloadControlSchema,
  rcloneUploadSchema,
  rcloneConfigSchema
} from "@shared/schema";
import { ZodError } from "zod";
import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to handle parsing errors
  app.use((err: Error, req: Request, res: Response, next: Function) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    next(err);
  });

  // API Routes
  // Fetch and parse a Wcofun URL
  app.post("/api/fetch-url", async (req, res) => {
    try {
      const { url } = urlFetchSchema.parse(req.body);
      console.log(`[Fetch URL Request] URL: ${url}`);
      
      // Determine if this is a series or episode URL
      const { type, url: normalizedUrl } = scraper.determineUrlType(url);
      console.log(`[Fetch URL] Detected type: ${type}, Normalized URL: ${normalizedUrl}`);
      
      if (type === 'series') {
        // Check if we already have this series
        let series = await storage.getSeriesBySourceUrl(normalizedUrl);
        console.log(`[Fetch URL] Series exists in storage: ${!!series}`);
        let forceRefresh = req.body.forceRefresh === true;
        
        // Get the HTML content regardless of whether the series exists
        // We need it for new series and for refreshing existing ones
        console.log(`[Fetch URL] Fetching series page from: ${normalizedUrl}`);
        const html = await scraper.getSourceHtml(normalizedUrl);
        
        if (!series) {
          // Create new series
          const seriesData = scraper.parseSeriesInfo(html, normalizedUrl);
          console.log(`[Fetch URL] Parsed series: ${seriesData.title}, Episodes: ${seriesData.totalEpisodes}`);
          series = await storage.createSeries(seriesData);
        } else if (forceRefresh) {
          // Update existing series if force refresh is requested
          console.log(`[Fetch URL] Force refreshing series metadata`);
          const updatedData = scraper.parseSeriesInfo(html, normalizedUrl);
          series = await storage.updateSeries(series.id, updatedData);
          console.log(`[Fetch URL] Updated series metadata`);
        }
        
        // Make sure we have a valid series object
        if (!series) {
          return res.status(500).json({ message: "Failed to create or retrieve series" });
        }
        
        // Get current episodes
        let episodes = await storage.getEpisodesBySeriesId(series.id);
        
        // If we don't have episodes or force refresh is requested, parse and create them
        if (episodes.length === 0 || forceRefresh) {
          // If force refresh, remove old episodes
          if (forceRefresh && episodes.length > 0) {
            console.log(`[Fetch URL] Force refresh requested, removing old episodes`);
            for (const episode of episodes) {
              await storage.deleteEpisode(episode.id);
            }
          }
        
          // Parse episode list and create episodes
          console.log(`[Fetch URL] Parsing episode list for seriesId: ${series.id}`);
          const parsedEpisodes = scraper.parseEpisodeList(html, series.id);
          console.log(`[Fetch URL] Found ${parsedEpisodes.length} episodes to create`);
          
          for (const episodeData of parsedEpisodes) {
            await storage.createEpisode(episodeData);
          }
          
          // Refresh episodes list
          episodes = await storage.getEpisodesBySeriesId(series.id);
        }
        
        console.log(`[Fetch URL] Retrieved ${episodes.length} episodes for series ${series.id}`);
        
        return res.json({ type, series, episodes });
      } else {
        // Check if we already have this episode
        let episode = await storage.getEpisodeBySourceUrl(normalizedUrl);
        
        if (!episode) {
          // Fetch and parse episode page
          const html = await scraper.getSourceHtml(normalizedUrl);
          
          // Try to extract series info if available
          let seriesId: number;
          
          // Extract series URL if possible
          const $ = cheerio.load(html);
          const seriesLink = $('.category a').attr('href');
          
          if (seriesLink) {
            const seriesUrl = seriesLink.startsWith('http') ? seriesLink : `https://www.wcofun.net${seriesLink}`;
            let series = await storage.getSeriesBySourceUrl(seriesUrl);
            
            if (!series) {
              // Fetch and parse series page
              const seriesHtml = await scraper.getSourceHtml(seriesUrl);
              const seriesData = scraper.parseSeriesInfo(seriesHtml, seriesUrl);
              series = await storage.createSeries(seriesData);
            }
            
            seriesId = series.id;
          } else {
            // Create a temporary series for this episode
            const title = $('.video-title').text().trim();
            const seriesTitle = title.split(' - ')[0] || 'Unknown Series';
            
            const series = await storage.createSeries({
              title: seriesTitle,
              description: '',
              totalEpisodes: 1,
              imageUrl: '',
              sourceUrl: normalizedUrl // Use episode URL as series URL
            });
            
            seriesId = series.id;
          }
          
          // Parse episode details
          const title = $('.video-title').text().trim();
          let downloadUrl = await scraper.parseEpisodePage(html);
          
          // Validate the download URL before saving
          if (downloadUrl && !scraper.isValidVideoUrl(downloadUrl)) {
            console.log(`[Fetch URL] Invalid download URL found: ${downloadUrl}, setting to empty`);
            downloadUrl = '';
          }
          
          // Create episode
          episode = await storage.createEpisode({
            seriesId,
            title,
            episodeNumber: 1, // Default
            season: 1, // Default
            duration: '',
            sourceUrl: normalizedUrl,
            downloadUrl
          });
        }
        
        // Get series for this episode
        const series = await storage.getSeries(episode.seriesId);
        
        return res.json({ type, episode, series });
      }
    } catch (error: any) {
      console.error('Error fetching URL:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid URL format", errors: error.errors });
      }
      return res.status(500).json({ message: `Error fetching URL: ${error.message}` });
    }
  });

  // Start a download
  app.post("/api/downloads", async (req, res) => {
    try {
      const { type, id, downloadPath } = downloadRequestSchema.parse(req.body);
      
      if (type === 'episode') {
        // Download a single episode
        const episode = await storage.getEpisode(id);
        if (!episode) {
          return res.status(404).json({ message: "Episode not found" });
        }
        
        // Make sure we have a download URL
        if (!episode.downloadUrl) {
          // Try to get the download URL
          const html = await scraper.getSourceHtml(episode.sourceUrl);
          const downloadUrl = await scraper.parseEpisodePage(html);
          
          if (!downloadUrl) {
            return res.status(400).json({ message: "Could not extract download URL for this episode" });
          }
          
          // Update the episode with the download URL
          await storage.updateEpisode(episode.id, { downloadUrl });
          episode.downloadUrl = downloadUrl;
        }
        
        // Create download record
        const download = await storage.createDownload({
          episodeId: episode.id,
          status: "queued",
          filePath: downloadPath ? path.join(downloadPath, `episode-${episode.episodeNumber}.mp4`) : undefined
        });
        
        // Start download process
        downloader.startDownload(download.id);
        
        return res.json({ download });
      } else {
        // Download entire series
        const series = await storage.getSeries(id);
        if (!series) {
          return res.status(404).json({ message: "Series not found" });
        }
        
        // Get all episodes for this series
        const episodes = await storage.getEpisodesBySeriesId(series.id);
        if (episodes.length === 0) {
          return res.status(404).json({ message: "No episodes found for this series" });
        }
        
        // Create download records for each episode
        const downloads = [];
        
        for (const episode of episodes) {
          // Make sure we have a download URL
          if (!episode.downloadUrl) {
            try {
              // Try to get the download URL
              const html = await scraper.getSourceHtml(episode.sourceUrl);
              const downloadUrl = await scraper.parseEpisodePage(html);
              
              // Validate the URL is a proper video URL
              if (downloadUrl && scraper.isValidVideoUrl(downloadUrl)) {
                // Update the episode with the download URL
                await storage.updateEpisode(episode.id, { downloadUrl });
                episode.downloadUrl = downloadUrl;
                console.log(`[Download] Updated episode ${episode.id} with valid download URL: ${downloadUrl}`);
              } else {
                console.log(`[Download] Skipping invalid download URL for episode ${episode.id}: ${downloadUrl || 'empty URL'}`);
              }
            } catch (error) {
              console.error(`Error getting download URL for episode ${episode.id}:`, error);
              // Continue with next episode
              continue;
            }
          }
          
          if (episode.downloadUrl) {
            // Create download record
            const download = await storage.createDownload({
              episodeId: episode.id,
              status: "queued",
              filePath: downloadPath ? 
                path.join(downloadPath, `season-${episode.season}`, `episode-${episode.episodeNumber}.mp4`) : 
                undefined
            });
            
            downloads.push(download);
            
            // Start download process (with a small delay to prevent hammering the server)
            setTimeout(() => {
              downloader.startDownload(download.id);
            }, downloads.length * 500);
          }
        }
        
        return res.json({ downloads });
      }
    } catch (error: any) {
      console.error('Error starting download:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid download request", errors: error.errors });
      }
      return res.status(500).json({ message: `Error starting download: ${error.message}` });
    }
  });

  // Control downloads (pause, resume, cancel)
  app.post("/api/downloads/control", async (req, res) => {
    try {
      const { downloadId, action } = downloadControlSchema.parse(req.body);
      
      const download = await storage.getDownload(downloadId);
      if (!download) {
        return res.status(404).json({ message: "Download not found" });
      }
      
      let success = false;
      
      switch (action) {
        case 'pause':
          success = await downloader.pauseDownload(downloadId);
          break;
        case 'resume':
          success = await downloader.resumeDownload(downloadId);
          break;
        case 'cancel':
          success = await downloader.cancelDownload(downloadId);
          break;
      }
      
      if (success) {
        const updatedDownload = await storage.getDownload(downloadId);
        return res.json({ download: updatedDownload });
      } else {
        return res.status(400).json({ message: `Could not ${action} download ${downloadId}` });
      }
    } catch (error: any) {
      console.error('Error controlling download:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid control request", errors: error.errors });
      }
      return res.status(500).json({ message: `Error controlling download: ${error.message}` });
    }
  });

  // Get all downloads
  app.get("/api/downloads", async (req, res) => {
    try {
      const downloads = await storage.getAllDownloads();
      
      // Get episode details for each download
      const downloadsWithDetails = await Promise.all(
        downloads.map(async (download) => {
          const episode = await storage.getEpisode(download.episodeId);
          const series = episode ? await storage.getSeries(episode.seriesId) : undefined;
          
          return {
            ...download,
            episode,
            series
          };
        })
      );
      
      return res.json({ downloads: downloadsWithDetails });
    } catch (error: any) {
      console.error('Error getting downloads:', error);
      return res.status(500).json({ message: `Error getting downloads: ${error.message}` });
    }
  });

  // Get downloads by status
  app.get("/api/downloads/status/:status", async (req, res) => {
    try {
      const { status } = req.params;
      const downloads = await storage.getDownloadsByStatus(status);
      
      // Get episode details for each download
      const downloadsWithDetails = await Promise.all(
        downloads.map(async (download) => {
          const episode = await storage.getEpisode(download.episodeId);
          const series = episode ? await storage.getSeries(episode.seriesId) : undefined;
          
          return {
            ...download,
            episode,
            series
          };
        })
      );
      
      return res.json({ downloads: downloadsWithDetails });
    } catch (error: any) {
      console.error('Error getting downloads by status:', error);
      return res.status(500).json({ message: `Error getting downloads: ${error.message}` });
    }
  });

  // Get all series
  app.get("/api/series", async (req, res) => {
    try {
      const allSeries = await storage.getAllSeries();
      return res.json({ series: allSeries });
    } catch (error: any) {
      console.error('Error getting series:', error);
      return res.status(500).json({ message: `Error getting series: ${error.message}` });
    }
  });

  // Get series by ID with episodes
  app.get("/api/series/:id", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const series = await storage.getSeries(seriesId);
      
      if (!series) {
        return res.status(404).json({ message: "Series not found" });
      }
      
      const episodes = await storage.getEpisodesBySeriesId(seriesId);
      
      return res.json({ series, episodes });
    } catch (error: any) {
      console.error('Error getting series:', error);
      return res.status(500).json({ message: `Error getting series: ${error.message}` });
    }
  });

  // Rclone remotes endpoint
  app.get("/api/rclone/remotes", async (req, res) => {
    try {
      const isAvailable = await rcloneService.isRcloneAvailable();
      if (!isAvailable) {
        return res.status(400).json({ message: "Rclone is not available on this system" });
      }
      
      const remotes = await rcloneService.getRemotes();
      return res.json({ remotes });
    } catch (error: any) {
      console.error('Error getting rclone remotes:', error);
      return res.status(500).json({ message: `Error getting rclone remotes: ${error.message}` });
    }
  });

  // Upload to rclone remote
  app.post("/api/rclone/upload", async (req, res) => {
    try {
      const { downloadIds, remotePath } = rcloneUploadSchema.parse(req.body);
      
      const isAvailable = await rcloneService.isRcloneAvailable();
      if (!isAvailable) {
        return res.status(400).json({ message: "Rclone is not available on this system" });
      }
      
      const results = await rcloneService.uploadMultipleFiles(downloadIds, remotePath);
      
      return res.json({ results });
    } catch (error: any) {
      console.error('Error uploading to rclone:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid upload request", errors: error.errors });
      }
      return res.status(500).json({ message: `Error uploading to rclone: ${error.message}` });
    }
  });
  
  // Get rclone config
  app.get("/api/rclone/config", async (req, res) => {
    try {
      const isAvailable = await rcloneService.isRcloneAvailable();
      if (!isAvailable) {
        return res.status(400).json({ message: "Rclone is not available on this system" });
      }
      
      const configContent = await rcloneService.getConfigContent();
      return res.json({ configContent });
    } catch (error: any) {
      console.error('Error getting rclone config:', error);
      return res.status(500).json({ message: `Error getting rclone config: ${error.message}` });
    }
  });
  
  // Upload rclone config
  app.post("/api/rclone/config", async (req, res) => {
    try {
      const { configContent } = rcloneConfigSchema.parse(req.body);
      
      const isAvailable = await rcloneService.isRcloneAvailable();
      if (!isAvailable) {
        return res.status(400).json({ message: "Rclone is not available on this system" });
      }
      
      const success = await rcloneService.uploadConfig(configContent);
      
      if (success) {
        return res.json({ success: true, message: "Configuration uploaded successfully" });
      } else {
        return res.status(400).json({ message: "Failed to upload rclone configuration" });
      }
    } catch (error: any) {
      console.error('Error uploading rclone config:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid config format", errors: error.errors });
      }
      return res.status(500).json({ message: `Error uploading rclone config: ${error.message}` });
    }
  });

  // Get available storage space
  app.get("/api/system/storage", async (req, res) => {
    try {
      const downloadsDir = path.join(process.cwd(), 'downloads');
      
      // Ensure downloads directory exists
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
      
      // Use df command on Linux to get disk space
      const { stdout } = await execAsync(`df -k "${downloadsDir}"`);
      const lines = stdout.trim().split('\n');
      const parts = lines[1].split(/\s+/);
      
      const totalSize = parseInt(parts[1]) * 1024; // Convert KB to bytes
      const usedSize = parseInt(parts[2]) * 1024;
      const availableSize = parseInt(parts[3]) * 1024;
      
      return res.json({
        total: totalSize,
        used: usedSize,
        available: availableSize,
        downloadsDir
      });
    } catch (error: any) {
      console.error('Error getting storage info:', error);
      
      // Fallback for non-Linux systems or if df fails
      return res.json({
        total: 0,
        used: 0,
        available: 0,
        downloadsDir: path.join(process.cwd(), 'downloads'),
        error: `Could not get storage information: ${error.message}`
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
