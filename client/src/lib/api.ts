import { apiRequest } from "./queryClient";
import { 
  Series, 
  Episode,
  Download,
  downloadRequestSchema, 
  urlFetchSchema,
  downloadControlSchema,
  rcloneUploadSchema,
  rcloneConfigSchema
} from "@shared/schema";

// Types for API responses
export interface FetchUrlResponse {
  type: 'series' | 'episode';
  series?: Series;
  episodes?: Episode[];
  episode?: Episode;
}

export interface DownloadResponse {
  download?: Download;
  downloads?: Download[];
}

export interface DownloadsWithDetailsResponse {
  downloads: Array<Download & {
    episode?: Episode;
    series?: Series;
  }>;
}

export interface SeriesResponse {
  series: Series[];
}

export interface SeriesWithEpisodesResponse {
  series: Series;
  episodes: Episode[];
}

export interface RcloneRemotesResponse {
  remotes: string[];
}

export interface RcloneUploadResponse {
  results: { [key: number]: boolean };
}

export interface StorageInfoResponse {
  total: number;
  used: number;
  available: number;
  downloadsDir: string;
  error?: string;
}

// API functions
export const api = {
  // Fetch and parse a Wcofun.net URL
  fetchUrl: async (url: string, forceRefresh: boolean = false): Promise<FetchUrlResponse> => {
    const parsedData = urlFetchSchema.parse({ url, forceRefresh });
    const response = await apiRequest('POST', '/api/fetch-url', parsedData);
    return await response.json();
  },

  // Start a download for an episode or series
  startDownload: async (type: 'episode' | 'series', id: number, downloadPath?: string): Promise<DownloadResponse> => {
    const parsedData = downloadRequestSchema.parse({ type, id, downloadPath });
    const response = await apiRequest('POST', '/api/downloads', parsedData);
    return await response.json();
  },

  // Control downloads (pause, resume, cancel)
  controlDownload: async (downloadId: number, action: 'pause' | 'resume' | 'cancel'): Promise<{ download: Download }> => {
    const parsedData = downloadControlSchema.parse({ downloadId, action });
    const response = await apiRequest('POST', '/api/downloads/control', parsedData);
    return await response.json();
  },

  // Get all downloads
  getAllDownloads: async (): Promise<DownloadsWithDetailsResponse> => {
    const response = await apiRequest('GET', '/api/downloads');
    return await response.json();
  },

  // Get downloads by status
  getDownloadsByStatus: async (status: string): Promise<DownloadsWithDetailsResponse> => {
    const response = await apiRequest('GET', `/api/downloads/status/${status}`);
    return await response.json();
  },

  // Get all series
  getAllSeries: async (): Promise<SeriesResponse> => {
    const response = await apiRequest('GET', '/api/series');
    return await response.json();
  },

  // Get series by ID with episodes
  getSeriesWithEpisodes: async (id: number): Promise<SeriesWithEpisodesResponse> => {
    const response = await apiRequest('GET', `/api/series/${id}`);
    return await response.json();
  },

  // Get Rclone remotes
  getRcloneRemotes: async (): Promise<RcloneRemotesResponse> => {
    const response = await apiRequest('GET', '/api/rclone/remotes');
    return await response.json();
  },

  // Upload files to Rclone remote
  uploadToRclone: async (downloadIds: number[], remotePath: string): Promise<RcloneUploadResponse> => {
    const parsedData = rcloneUploadSchema.parse({ downloadIds, remotePath });
    const response = await apiRequest('POST', '/api/rclone/upload', parsedData);
    return await response.json();
  },
  
  // Get Rclone configuration
  getRcloneConfig: async (): Promise<{ configContent: string | null }> => {
    const response = await apiRequest('GET', '/api/rclone/config');
    return await response.json();
  },
  
  // Upload Rclone configuration
  uploadRcloneConfig: async (configContent: string): Promise<{ success: boolean, message: string }> => {
    const parsedData = rcloneConfigSchema.parse({ configContent });
    const response = await apiRequest('POST', '/api/rclone/config', parsedData);
    return await response.json();
  },

  // Get storage information
  getStorageInfo: async (): Promise<StorageInfoResponse> => {
    const response = await apiRequest('GET', '/api/system/storage');
    return await response.json();
  }
};
