import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, HardDrive, Cloud, AlertCircle, CheckCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RcloneUploadPage: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [remotePath, setRemotePath] = useState("");
  const [selectedRemote, setSelectedRemote] = useState("");
  const [selectedDownloads, setSelectedDownloads] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all completed downloads
  const { data: downloadsData, isLoading: isDownloadsLoading } = useQuery({
    queryKey: ["/api/downloads/status/completed"],
    queryFn: () => api.getDownloadsByStatus("completed"),
  });

  // Get all rclone remotes
  const { data: remotesData, isLoading: isRemotesLoading } = useQuery({
    queryKey: ["/api/rclone/remotes"],
    queryFn: api.getRcloneRemotes,
    onError: () => {
      toast({
        title: "Error fetching remotes",
        description: "Rclone may not be installed or configured properly.",
        variant: "destructive",
      });
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: { downloadIds: number[]; remotePath: string }) =>
      api.uploadToRclone(data.downloadIds, data.remotePath),
    onSuccess: () => {
      toast({
        title: "Upload started",
        description: "Files are being uploaded to the remote.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
      // Clear selection after successful upload
      setSelectedDownloads([]);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `Error starting upload: ${error}`,
        variant: "destructive",
      });
    },
  });

  const completedDownloads = downloadsData?.downloads.filter(
    (d) => d.status === "completed"
  ) || [];

  const toggleDownloadSelection = (downloadId: number) => {
    setSelectedDownloads((prev) =>
      prev.includes(downloadId)
        ? prev.filter((id) => id !== downloadId)
        : [...prev, downloadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDownloads.length === completedDownloads.length) {
      setSelectedDownloads([]);
    } else {
      setSelectedDownloads(completedDownloads.map((d) => d.id));
    }
  };

  const handleUpload = () => {
    if (selectedDownloads.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRemote) {
      toast({
        title: "No remote selected",
        description: "Please select a remote destination.",
        variant: "destructive",
      });
      return;
    }

    const fullRemotePath = `${selectedRemote}${remotePath}`;
    uploadMutation.mutate({
      downloadIds: selectedDownloads,
      remotePath: fullRemotePath,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - only show on desktop or when mobileSidebarOpen is true */}
      <div className={`${mobileSidebarOpen ? "block" : "hidden"} md:flex md:flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation */}
        <TopNav toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-6">
            {/* Page Header */}
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate">
                Upload to Rclone
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload your downloaded videos to remote storage via Rclone
              </p>
            </div>

            {/* Rclone Upload Configuration */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Upload form */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Upload Configuration</CardTitle>
                    <CardDescription>Configure your upload settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isRemotesLoading ? (
                      <div className="flex justify-center my-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : remotesData?.remotes?.length ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="remote">Select Remote</Label>
                          <Select
                            value={selectedRemote}
                            onValueChange={setSelectedRemote}
                          >
                            <SelectTrigger id="remote">
                              <SelectValue placeholder="Select a remote" />
                            </SelectTrigger>
                            <SelectContent>
                              {remotesData.remotes.map((remote) => (
                                <SelectItem key={remote} value={remote}>
                                  {remote}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="path">Destination Path</Label>
                          <Input
                            id="path"
                            placeholder="Path (e.g., /anime/)"
                            value={remotePath}
                            onChange={(e) => setRemotePath(e.target.value)}
                          />
                        </div>

                        <div className="pt-4">
                          <Button 
                            className="w-full" 
                            onClick={handleUpload}
                            disabled={
                              selectedDownloads.length === 0 ||
                              !selectedRemote ||
                              uploadMutation.isPending
                            }
                          >
                            {uploadMutation.isPending ? (
                              <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Upload className="w-5 h-5 mr-2" />
                            )}
                            Upload Selected Files
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Rclone Not Configured</AlertTitle>
                        <AlertDescription>
                          Rclone is not available or no remotes are configured. Please install and configure Rclone first.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Available files for upload */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Available Files</CardTitle>
                      <CardDescription>
                        Select files to upload to remote storage
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={completedDownloads.length === 0}
                    >
                      {selectedDownloads.length === completedDownloads.length && completedDownloads.length > 0
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isDownloadsLoading ? (
                      <div className="flex justify-center my-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : completedDownloads.length === 0 ? (
                      <div className="text-center py-8">
                        <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No files available</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          You don't have any completed downloads available for upload.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {completedDownloads.map((download) => (
                          <div
                            key={download.id}
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`download-${download.id}`}
                                checked={selectedDownloads.includes(download.id)}
                                onCheckedChange={() => toggleDownloadSelection(download.id)}
                              />
                              <div>
                                <Label
                                  htmlFor={`download-${download.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {download.series?.title} - {download.episode?.title}
                                </Label>
                                <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                                  {download.filePath}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">
                                {formatBytes(download.totalSize || 0)}
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Completed
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Uploads</CardTitle>
                  <CardDescription>History of recently uploaded files</CardDescription>
                </CardHeader>
                <CardContent>
                  {isDownloadsLoading ? (
                    <div className="flex justify-center my-4">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : downloadsData?.downloads.filter(d => d.status === "uploaded").length === 0 ? (
                    <div className="text-center py-8">
                      <Cloud className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No uploads yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Start uploading files to see your upload history.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {downloadsData?.downloads
                        .filter(d => d.status === "uploaded")
                        .slice(0, 5)
                        .map((download) => (
                          <div
                            key={download.id}
                            className="flex items-center justify-between p-3 border rounded-md"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {download.series?.title} - {download.episode?.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {download.filePath}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-indigo-100 text-indigo-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Uploaded
                              </Badge>
                              <Badge variant="outline">
                                {formatBytes(download.totalSize || 0)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RcloneUploadPage;
