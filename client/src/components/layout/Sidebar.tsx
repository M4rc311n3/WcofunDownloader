import { FC } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DownloadCloud, Home, Box, Upload, Settings } from "lucide-react";
import { formatBytes } from "@/lib/utils";

const Sidebar: FC = () => {
  const [location] = useLocation();

  // Get active downloads count
  const { data: downloadsData } = useQuery({
    queryKey: ["/api/downloads"],
    queryFn: api.getAllDownloads,
  });

  // Get storage information
  const { data: storageData } = useQuery({
    queryKey: ["/api/system/storage"],
    queryFn: api.getStorageInfo,
  });

  const activeDownloads = downloadsData?.downloads.filter(
    (download) => download.status === "downloading" || download.status === "queued"
  ).length || 0;

  // Calculate storage usage
  let storagePercentage = 0;
  let usedStorage = "0 B";
  let totalStorage = "0 B";

  if (storageData && storageData.total > 0) {
    storagePercentage = (storageData.used / storageData.total) * 100;
    usedStorage = formatBytes(storageData.used);
    totalStorage = formatBytes(storageData.total);
  }

  const navItems = [
    { name: "Home", path: "/", icon: <Home className="w-5 h-5 mr-3" /> },
    { name: "Downloads", path: "/downloads", icon: <DownloadCloud className="w-5 h-5 mr-3" /> },
    { name: "Series Library", path: "/library", icon: <Box className="w-5 h-5 mr-3" /> },
    { name: "Upload to Rclone", path: "/upload", icon: <Upload className="w-5 h-5 mr-3" /> },
    { name: "Settings", path: "/settings", icon: <Settings className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-primary">Wcofun Downloader</h1>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              location === item.path
                ? "bg-primary-50 text-primary"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Download Stats */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Storage</span>
          <span className="text-sm font-medium text-gray-900">
            {usedStorage} / {totalStorage}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full"
            style={{ width: `${storagePercentage}%` }}
          ></div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Active downloads: <span className="font-medium text-gray-900">{activeDownloads}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
