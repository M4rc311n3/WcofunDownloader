import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pause, Play, X, Minimize, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { api } from "@/lib/api";
import { Episode, Series, Download } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatBytes, formatTimeRemaining } from "@/lib/utils";

interface CurrentDownloadsProps {
  downloads: Array<Download & { episode?: Episode; series?: Series }>;
}

const CurrentDownloads: FC<CurrentDownloadsProps> = ({ downloads }) => {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const controlDownloadMutation = useMutation({
    mutationFn: ({ downloadId, action }: { downloadId: number; action: "pause" | "resume" | "cancel" }) =>
      api.controlDownload(downloadId, action),
    onSuccess: (data, variables) => {
      const actionText = variables.action === "pause" ? "paused" : variables.action === "resume" ? "resumed" : "cancelled";
      toast({
        title: `Download ${actionText}`,
        description: `Successfully ${actionText} the download`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error, variables) => {
      toast({
        title: "Action failed",
        description: `Failed to ${variables.action} download: ${error}`,
        variant: "destructive",
      });
    },
  });

  const uploadAllMutation = useMutation({
    mutationFn: (downloadIds: number[]) => 
      api.uploadToRclone(downloadIds, "remote:anime/"), // Default remote path
    onSuccess: () => {
      toast({
        title: "Upload started",
        description: "Files are being uploaded to Rclone remote",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `Failed to upload files: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handlePauseResume = (download: Download) => {
    const action = download.status === "downloading" ? "pause" : "resume";
    controlDownloadMutation.mutate({ downloadId: download.id, action });
  };

  const handleCancel = (downloadId: number) => {
    controlDownloadMutation.mutate({ downloadId, action: "cancel" });
  };

  const handleUploadAll = () => {
    const completedDownloads = downloads
      .filter(d => d.status === "completed")
      .map(d => d.id);

    if (completedDownloads.length === 0) {
      toast({
        title: "No completed downloads",
        description: "There are no completed downloads to upload",
        variant: "destructive",
      });
      return;
    }

    uploadAllMutation.mutate(completedDownloads);
  };

  // Overall progress
  const activeDownloads = downloads.filter(d => d.status === "downloading" || d.status === "queued");
  const totalSize = activeDownloads.reduce((sum, d) => sum + (d.totalSize || 0), 0);
  const downloadedSize = activeDownloads.reduce((sum, d) => sum + (d.downloadedSize || 0), 0);
  const overallProgress = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0;

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handlePauseAll = () => {
    const downloading = downloads.filter(d => d.status === "downloading").map(d => d.id);
    downloading.forEach(id => {
      controlDownloadMutation.mutate({ downloadId: id, action: "pause" });
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Active Downloads</h3>
        <Button variant="outline" size="sm" onClick={toggleExpanded}>
          {expanded ? <Minimize className="w-4 h-4 mr-1" /> : <MoreHorizontal className="w-4 h-4 mr-1" />}
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {expanded && (
        <div className="divide-y divide-gray-200">
          {activeDownloads.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              No active downloads at the moment
            </div>
          ) : (
            activeDownloads.map((download) => (
              <div key={download.id} className="px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {download.series?.title} - {download.episode?.title}
                    </h4>
                    <p className="text-xs text-gray-500">{download.filePath}</p>
                  </div>
                  <div className="flex items-center mt-2 space-x-2 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePauseResume(download)}
                      disabled={controlDownloadMutation.isPending}
                      className="p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {download.status === "downloading" ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(download.id)}
                      disabled={controlDownloadMutation.isPending}
                      className="p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {formatBytes(download.downloadedSize || 0)} / {formatBytes(download.totalSize || 0)} ({download.progress || 0}%)
                    </span>
                    <span>
                      {download.speed ? `${formatBytes(download.speed)}/s` : "0 B/s"} - 
                      {download.speed && download.totalSize && download.downloadedSize
                        ? ` ${formatTimeRemaining(download.totalSize - download.downloadedSize, download.speed)}`
                        : " calculating..."}
                    </span>
                  </div>
                  <ProgressBar progress={download.progress || 0} />
                </div>
              </div>
            ))
          )}

          <div className="px-4 py-3 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-2 sm:mb-0">
                <span className="text-sm font-medium text-gray-900 mr-2">Overall Progress:</span>
                <div className="flex items-center">
                  <div className="w-32 h-2 mr-2 bg-gray-200 rounded-full sm:w-40">
                    <div
                      className="h-2 bg-emerald-500 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{overallProgress}%</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseAll}
                  disabled={activeDownloads.length === 0 || controlDownloadMutation.isPending}
                >
                  <Pause className="w-4 h-4 mr-2 -ml-1" />
                  Pause All
                </Button>
                <Button
                  onClick={handleUploadAll}
                  disabled={!downloads.some(d => d.status === "completed") || uploadAllMutation.isPending}
                >
                  <UploadCloud className="w-4 h-4 mr-2 -ml-1" />
                  Upload All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CurrentDownloads;
