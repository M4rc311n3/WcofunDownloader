import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

const execAsync = promisify(exec);

export class RcloneService {
  private rcloneConfigPath: string;

  constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.rcloneConfigPath = path.join(homeDir, '.config', 'rclone', 'rclone.conf');
    
    // Ensure config directory exists
    const configDir = path.dirname(this.rcloneConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * Check if rclone is installed and configured
   */
  async isRcloneAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('rclone version');
      return stdout.includes('rclone');
    } catch (error) {
      console.error('Error checking rclone availability:', error);
      return false;
    }
  }

  /**
   * Get list of configured remotes
   */
  async getRemotes(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('rclone listremotes');
      return stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (error) {
      console.error('Error listing rclone remotes:', error);
      return [];
    }
  }

  /**
   * Upload a file to a remote destination
   */
  async uploadFile(downloadId: number, remotePath: string): Promise<boolean> {
    try {
      const download = await storage.getDownload(downloadId);
      if (!download || download.status !== 'completed' || !download.filePath) {
        throw new Error(`Download ${downloadId} is not available for upload`);
      }

      // Make sure file exists
      if (!fs.existsSync(download.filePath)) {
        throw new Error(`File not found: ${download.filePath}`);
      }

      // Get local directory and filename
      const localFilePath = download.filePath;
      const fileName = path.basename(localFilePath);

      // Build remote path
      const fullRemotePath = `${remotePath}/${fileName}`;

      // Execute rclone command to copy the file
      const { stdout, stderr } = await execAsync(`rclone copy "${localFilePath}" "${fullRemotePath}" --progress`);

      if (stderr && !stderr.includes('Transferred:')) {
        throw new Error(`Rclone error: ${stderr}`);
      }

      // Update download status
      await storage.updateDownload(downloadId, {
        status: 'uploaded'
      });

      return true;
    } catch (error) {
      console.error(`Error uploading file for download ${downloadId}:`, error);
      return false;
    }
  }

  /**
   * Upload multiple files to a remote destination
   */
  async uploadMultipleFiles(downloadIds: number[], remotePath: string): Promise<{ [key: number]: boolean }> {
    const results: { [key: number]: boolean } = {};
    
    for (const downloadId of downloadIds) {
      results[downloadId] = await this.uploadFile(downloadId, remotePath);
    }
    
    return results;
  }

  /**
   * Upload rclone config data
   */
  async uploadConfig(configContent: string): Promise<boolean> {
    try {
      // Validate config format (basic check)
      if (!configContent.includes('[') || !configContent.includes(']')) {
        throw new Error('Invalid rclone config format');
      }

      // Backup existing config if it exists
      if (fs.existsSync(this.rcloneConfigPath)) {
        const backupPath = `${this.rcloneConfigPath}.backup-${Date.now()}`;
        fs.copyFileSync(this.rcloneConfigPath, backupPath);
        console.log(`Backed up existing rclone config to ${backupPath}`);
      }

      // Write the new config
      fs.writeFileSync(this.rcloneConfigPath, configContent);
      
      // Verify the config works
      try {
        await execAsync('rclone listremotes');
        return true;
      } catch (error) {
        // If verification fails, restore from backup if available
        const backups = fs.readdirSync(path.dirname(this.rcloneConfigPath))
          .filter(file => file.startsWith(path.basename(this.rcloneConfigPath) + '.backup-'))
          .sort()
          .reverse();
          
        if (backups.length > 0) {
          const latestBackup = path.join(path.dirname(this.rcloneConfigPath), backups[0]);
          fs.copyFileSync(latestBackup, this.rcloneConfigPath);
          console.log(`Restored rclone config from ${latestBackup}`);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error uploading rclone config:', error);
      return false;
    }
  }

  /**
   * Get current rclone config content
   */
  async getConfigContent(): Promise<string | null> {
    try {
      if (fs.existsSync(this.rcloneConfigPath)) {
        return fs.readFileSync(this.rcloneConfigPath, 'utf8');
      }
      return '';
    } catch (error) {
      console.error('Error getting rclone config:', error);
      return null;
    }
  }
}

export const rcloneService = new RcloneService();
