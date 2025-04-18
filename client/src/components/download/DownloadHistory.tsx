import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash, Upload, Minimize, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Download, Episode, Series } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";

interface DownloadHistoryProps {
  downloads: Array<Download & { episode?: Episode; series?: Series }>;
}

const DownloadHistory: FC<DownloadHistoryProps> = ({ downloads }) => {
  const [expanded, setExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 5;

  const uploadMutation = useMutation({
    mutationFn: (downloadId: number) => api.uploadToRclone([downloadId], "remote:anime/"),
    onSuccess: () => {
      toast({
        title: "Upload started",
        description: "File is being uploaded to Rclone remote",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `Failed to upload file: ${error}`,
        variant: "destructive",
      });
    },
  });

  const deleteDownloadMutation = useMutation({
    mutationFn: (downloadId: number) => api.controlDownload(downloadId, "cancel"),
    onSuccess: () => {
      toast({
        title: "Download deleted",
        description: "Download record has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: `Failed to delete download: ${error}`,
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleDelete = (downloadId: number) => {
    if (confirm("Are you sure you want to delete this download?")) {
      deleteDownloadMutation.mutate(downloadId);
    }
  };

  const handleUpload = (downloadId: number) => {
    uploadMutation.mutate(downloadId);
  };

  // Filter completed and error downloads
  const completedDownloads = downloads.filter(
    (d) => d.status === "completed" || d.status === "uploaded" || d.status === "error"
  );

  // Pagination
  const totalPages = Math.ceil(completedDownloads.length / itemsPerPage);
  const paginatedDownloads = completedDownloads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "uploaded":
        return <Badge className="bg-indigo-100 text-indigo-800">Uploaded</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Completed Downloads</h3>
        <Button variant="outline" size="sm" onClick={toggleExpanded}>
          {expanded ? <Minimize className="w-4 h-4 mr-1" /> : <MoreHorizontal className="w-4 h-4 mr-1" />}
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {expanded && (
        <>
          <div className="overflow-x-auto">
            {completedDownloads.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                No completed downloads yet
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Size
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Path
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDownloads.map((download) => (
                    <tr key={download.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {download.series?.title} - {download.episode?.title ? download.episode.title.split(" - ")[0] : ""}
                        </div>
                        <div className="text-sm text-gray-500">
                          {download.episode?.season && `Season ${download.episode.season}`}
                          {download.episode?.episodeNumber && ` Episode ${download.episode.episodeNumber}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatBytes(download.totalSize || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate max-w-[200px]">
                          {download.filePath || "Unknown path"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {download.completedAt 
                            ? new Date(download.completedAt).toLocaleDateString() 
                            : download.startedAt 
                              ? new Date(download.startedAt).toLocaleDateString()
                              : "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {download.completedAt 
                            ? new Date(download.completedAt).toLocaleTimeString() 
                            : download.startedAt 
                              ? new Date(download.startedAt).toLocaleTimeString()
                              : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(download.status)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {}}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <Pencil className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(download.id)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <Trash className="w-5 h-5" />
                          </Button>
                          {download.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpload(download.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Upload className="w-5 h-5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {completedDownloads.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, completedDownloads.length)}
                  </span>{" "}
                  of <span className="font-medium">{completedDownloads.length}</span> results
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DownloadHistory;
