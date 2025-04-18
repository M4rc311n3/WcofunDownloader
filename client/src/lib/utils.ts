import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format remaining time in a human-readable way
 */
export function formatTimeRemaining(bytesRemaining: number, speed: number): string {
  if (speed <= 0) return "calculating...";

  const seconds = Math.ceil(bytesRemaining / speed);
  
  if (seconds < 60) {
    return `${seconds}s remaining`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')} remaining`;
  }
}

/**
 * Get a color based on the status of a download
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-500";
    case "downloading":
      return "text-blue-500";
    case "paused":
      return "text-yellow-500";
    case "error":
      return "text-red-500";
    case "queued":
      return "text-gray-500";
    case "uploaded":
      return "text-indigo-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Truncate a string to a certain length and add ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Sanitize a string to be used as a directory name
 */
export function sanitizePathName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid file characters
    .replace(/\s+/g, "-")           // Replace spaces with hyphens
    .toLowerCase();
}
