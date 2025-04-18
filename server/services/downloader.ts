import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { storage } from '../storage';
import { Download, Episode } from '@shared/schema';

// Map to track active downloads and their abort controllers
const activeDownloads = new Map<number, {
  abortController: AbortController,
  resumePosition: number,
  stream?: fs.WriteStream,
}>();

export class Downloader {
  private downloadsDirectory: string;

  constructor() {
    // Create downloads directory in project root
    this.downloadsDirectory = path.join(process.cwd(), 'downloads');
    this.ensureDirectoryExists(this.downloadsDirectory);
  }

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Start a download for an episode
   */
  async startDownload(downloadId: number): Promise<void> {
    try {
      const download = await storage.getDownload(downloadId);
      if (!download) {
        throw new Error(`Download with ID ${downloadId} not found`);
      }

      const episode = await storage.getEpisode(download.episodeId);
      if (!episode) {
        throw new Error(`Episode with ID ${download.episodeId} not found`);
      }

      if (!episode.downloadUrl) {
        throw new Error(`No download URL for episode with ID ${download.episodeId}`);
      }

      // Create directory structure
      const series = await storage.getSeries(episode.seriesId);
      if (!series) {
        throw new Error(`Series with ID ${episode.seriesId} not found`);
      }

      // Create directory path: downloads/series-name/season-x
      const seriesDir = path.join(this.downloadsDirectory, this.sanitizePathName(series.title));
      this.ensureDirectoryExists(seriesDir);

      const seasonDir = path.join(seriesDir, `season-${episode.season || 1}`);
      this.ensureDirectoryExists(seasonDir);

      // Create file name: episode-X.mp4
      const fileName = `episode-${episode.episodeNumber || 0}.mp4`;
      const filePath = path.join(seasonDir, fileName);

      // Update download with file path
      await storage.updateDownload(downloadId, {
        filePath,
        status: 'downloading',
        startedAt: new Date(),
      });

      // Start the download
      this.downloadFile(downloadId, episode, filePath);
    } catch (error) {
      console.error(`Error starting download ${downloadId}:`, error);
      await storage.updateDownload(downloadId, {
        status: 'error',
        error: `${error}`,
      });
    }
  }

  /**
   * Pause a download
   */
  async pauseDownload(downloadId: number): Promise<boolean> {
    const activeDownload = activeDownloads.get(downloadId);
    if (!activeDownload) {
      return false;
    }

    // Abort current request
    activeDownload.abortController.abort();
    
    // Close stream if it exists
    if (activeDownload.stream) {
      activeDownload.stream.close();
    }
    
    // Update download status
    await storage.updateDownload(downloadId, { status: 'paused' });
    
    return true;
  }

  /**
   * Resume a download
   */
  async resumeDownload(downloadId: number): Promise<boolean> {
    try {
      const download = await storage.getDownload(downloadId);
      if (!download || download.status !== 'paused') {
        return false;
      }

      const episode = await storage.getEpisode(download.episodeId);
      if (!episode || !episode.downloadUrl) {
        return false;
      }

      // Update status
      await storage.updateDownload(downloadId, { status: 'downloading' });
      
      // Start download from where we left off
      this.downloadFile(downloadId, episode, download.filePath || '');
      
      return true;
    } catch (error) {
      console.error(`Error resuming download ${downloadId}:`, error);
      return false;
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: number): Promise<boolean> {
    const activeDownload = activeDownloads.get(downloadId);
    if (activeDownload) {
      // Abort current request
      activeDownload.abortController.abort();
      
      // Close stream if it exists
      if (activeDownload.stream) {
        activeDownload.stream.close();
      }
      
      // Remove from active downloads
      activeDownloads.delete(downloadId);
    }
    
    // Get download info
    const download = await storage.getDownload(downloadId);
    if (download && download.filePath && fs.existsSync(download.filePath)) {
      // Delete the partial file
      fs.unlinkSync(download.filePath);
    }
    
    // Update download status
    await storage.updateDownload(downloadId, { 
      status: 'cancelled',
      progress: 0,
      downloadedSize: 0
    });
    
    return true;
  }

  /**
   * Download a file with resume capability
   */
  private async downloadFile(downloadId: number, episode: Episode, filePath: string): Promise<void> {
    try {
      const download = await storage.getDownload(downloadId);
      if (!download) {
        throw new Error('Download not found');
      }
      
      // Create a new abort controller
      const abortController = new AbortController();
      
      // Get downloaded bytes so far (if resuming)
      let resumePosition = 0;
      if (download.status === 'paused' && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        resumePosition = stats.size;
      }
      
      // Store in active downloads map
      activeDownloads.set(downloadId, { 
        abortController, 
        resumePosition
      });

      // Create headers for range request if resuming
      const headers: Record<string, string> = {};
      if (resumePosition > 0) {
        headers['Range'] = `bytes=${resumePosition}-`;
      }

      // Fetch the file
      const response = await fetch(episode.downloadUrl!, { 
        headers,
        signal: abortController.signal 
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      // Get content length from headers
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const totalSize = resumePosition + contentLength;
      
      // Update total size in database if it's not set yet
      if (!download.totalSize) {
        await storage.updateDownload(downloadId, { totalSize });
      }

      // Create write stream to file
      const fileStream = fs.createWriteStream(filePath, { flags: resumePosition > 0 ? 'a' : 'w' });
      
      // Update active download with stream
      activeDownloads.set(downloadId, { 
        abortController, 
        resumePosition,
        stream: fileStream
      });

      // Track download progress
      let downloadedBytes = resumePosition;
      const startTime = Date.now();
      let lastUpdate = startTime;
      let lastBytes = downloadedBytes;

      // Create a reading stream from the response body
      const reader = response.body!.getReader();
      
      const processChunk = async ({ done, value }: { done: boolean, value?: Uint8Array }): Promise<void> => {
        if (done) {
          fileStream.end();
          activeDownloads.delete(downloadId);
          
          // Update download status to completed
          await storage.updateDownload(downloadId, {
            status: 'completed',
            progress: 100,
            downloadedSize: totalSize,
            completedAt: new Date(),
            speed: 0
          });
          
          return;
        }
        
        if (value) {
          // Write chunk to file
          fileStream.write(Buffer.from(value));
          
          // Update progress
          downloadedBytes += value.length;
          const progress = Math.floor((downloadedBytes / totalSize) * 100);
          
          // Calculate download speed (bytes per second)
          const now = Date.now();
          const timeDiff = now - lastUpdate;
          
          // Update speed every second
          if (timeDiff >= 1000) {
            const bytesDiff = downloadedBytes - lastBytes;
            const speed = Math.floor(bytesDiff / (timeDiff / 1000));
            
            // Update download in database
            await storage.updateDownload(downloadId, {
              progress,
              downloadedSize: downloadedBytes,
              speed
            });
            
            // Reset tracking variables
            lastUpdate = now;
            lastBytes = downloadedBytes;
          }
        }
        
        // Process next chunk
        return reader.read().then(processChunk);
      };
      
      // Start processing chunks
      reader.read().then(processChunk).catch(async (error) => {
        if (error.name === 'AbortError') {
          // Download was paused or cancelled
          fileStream.end();
          
          // Record current position for resuming later
          activeDownloads.set(downloadId, { 
            abortController, 
            resumePosition: downloadedBytes 
          });
        } else {
          // Unexpected error
          fileStream.end();
          activeDownloads.delete(downloadId);
          
          // Update download status to error
          await storage.updateDownload(downloadId, {
            status: 'error',
            error: `${error}`
          });
        }
      });
      
    } catch (error) {
      console.error(`Error downloading file for download ${downloadId}:`, error);
      activeDownloads.delete(downloadId);
      
      // Update download status to error
      await storage.updateDownload(downloadId, {
        status: 'error',
        error: `${error}`
      });
    }
  }

  /**
   * Sanitize a string to be used as a directory name
   */
  private sanitizePathName(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, '-') // Remove invalid file characters
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .toLowerCase();
  }
}

export const downloader = new Downloader();
