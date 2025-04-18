import React, { FC, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cog, Save, Trash, HardDrive, MemoryStick, Clock, Cloud, Upload, Download } from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Rclone Config Upload Component
const RcloneConfigUpload: FC = () => {
  const [configContent, setConfigContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current rclone config
  const { data: configData, isLoading: isConfigLoading, refetch } = useQuery({
    queryKey: ["/api/rclone/config"],
    queryFn: api.getRcloneConfig,
  });
  
  // Upload rclone config mutation
  const uploadConfigMutation = useMutation({
    mutationFn: api.uploadRcloneConfig,
    onSuccess: (data) => {
      toast({
        title: "Configuration Uploaded",
        description: data.message || "Rclone configuration has been uploaded successfully.",
      });
      // Refetch remotes and config data
      refetch();
      // Invalidate remotes list to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/rclone/remotes"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Update textarea content when config data is loaded
  useEffect(() => {
    if (configData?.configContent) {
      setConfigContent(configData.configContent);
    }
  }, [configData]);
  
  const handleUploadConfig = () => {
    if (!configContent.trim()) {
      toast({
        title: "Empty Configuration",
        description: "Please enter rclone configuration content.",
        variant: "destructive",
      });
      return;
    }
    
    uploadConfigMutation.mutate(configContent);
  };
  
  return (
    <div className="space-y-4">
      {isConfigLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading configuration...</span>
        </div>
      ) : (
        <>
          <Alert className="bg-blue-50 border-blue-200">
            <Cloud className="h-4 w-4" />
            <AlertTitle>Rclone Configuration</AlertTitle>
            <AlertDescription>
              Paste your rclone configuration below. This will overwrite any existing configuration.
            </AlertDescription>
          </Alert>
          
          <Textarea
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            placeholder="# Paste your rclone.conf content here
[remote]
type = drive
client_id = 
client_secret = 
token = "
            className="font-mono text-sm min-h-[200px]"
          />
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setConfigContent(configData?.configContent || "")}
              disabled={isConfigLoading || uploadConfigMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button 
              onClick={handleUploadConfig}
              disabled={isConfigLoading || uploadConfigMutation.isPending}
            >
              {uploadConfigMutation.isPending ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const SettingsPage: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [downloadPath, setDownloadPath] = useState("/downloads");
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState("3");
  const [autoUpload, setAutoUpload] = useState(false);
  const [defaultRemote, setDefaultRemote] = useState("");
  const { toast } = useToast();

  // Get storage information
  const { data: storageData, isLoading: isStorageLoading } = useQuery({
    queryKey: ["/api/system/storage"],
    queryFn: api.getStorageInfo,
  });

  // Get rclone remotes
  const { data: remotesData, isLoading: isRemotesLoading } = useQuery({
    queryKey: ["/api/rclone/remotes"],
    queryFn: api.getRcloneRemotes,
  });

  const handleSaveSettings = () => {
    // This would save the settings on the server - mocked for now
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  const handleClearDownloads = () => {
    if (confirm("Are you sure you want to clear all downloads? This cannot be undone.")) {
      toast({
        title: "Downloads cleared",
        description: "All downloads have been cleared successfully.",
      });
    }
  };

  // Calculate storage usage percentage
  const storagePercentage = storageData?.total
    ? Math.round((storageData.used / storageData.total) * 100)
    : 0;

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
                Settings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure application settings and preferences
              </p>
            </div>

            {/* Settings Tabs */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <Tabs defaultValue="general">
                <TabsList className="mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="storage">Storage</TabsTrigger>
                  <TabsTrigger value="rclone">Rclone</TabsTrigger>
                  <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle>General Settings</CardTitle>
                      <CardDescription>
                        Configure basic application settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="downloadPath">Default Download Location</Label>
                        <Input
                          id="downloadPath"
                          value={downloadPath}
                          onChange={(e) => setDownloadPath(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          Path where downloaded files will be saved
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxConcurrentDownloads">Max Concurrent Downloads</Label>
                        <Select
                          value={maxConcurrentDownloads}
                          onValueChange={setMaxConcurrentDownloads}
                        >
                          <SelectTrigger id="maxConcurrentDownloads">
                            <SelectValue placeholder="Select number" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Maximum number of downloads to run simultaneously
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="autoDownloadEpisodes">Auto-download new episodes</Label>
                          <p className="text-xs text-gray-500">
                            Automatically download new episodes for tracked series
                          </p>
                        </div>
                        <Switch id="autoDownloadEpisodes" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => {
                        setDownloadPath("/downloads");
                        setMaxConcurrentDownloads("3");
                      }}>
                        Reset to Default
                      </Button>
                      <Button onClick={handleSaveSettings}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                {/* Storage Settings */}
                <TabsContent value="storage">
                  <Card>
                    <CardHeader>
                      <CardTitle>Storage Settings</CardTitle>
                      <CardDescription>
                        Manage storage and downloaded files
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <Label>Storage Usage</Label>
                          <span className="text-sm font-medium">
                            {isStorageLoading ? (
                              <span className="text-gray-500">Loading...</span>
                            ) : (
                              `${formatBytes(storageData?.used || 0)} / ${formatBytes(storageData?.total || 0)}`
                            )}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${storagePercentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {isStorageLoading ? (
                            "Checking storage usage..."
                          ) : (
                            `${storagePercentage}% of storage space used`
                          )}
                        </p>
                      </div>

                      <Separator />

                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-3">Storage Maintenance</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Auto-delete after upload</Label>
                              <p className="text-xs text-gray-500">
                                Delete local files after successful upload to remote
                              </p>
                            </div>
                            <Switch checked={autoUpload} onCheckedChange={setAutoUpload} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="retentionDays">File Retention (days)</Label>
                              <p className="text-xs text-gray-500">
                                Keep downloaded files for this many days
                              </p>
                            </div>
                            <div className="w-20">
                              <Input
                                id="retentionDays"
                                type="number"
                                defaultValue="30"
                                min="1"
                                max="365"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          variant="destructive"
                          onClick={handleClearDownloads}
                          className="w-full"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Clear All Downloads
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          This will remove all downloaded files from your storage
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Rclone Settings */}
                <TabsContent value="rclone">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rclone Configuration</CardTitle>
                      <CardDescription>
                        Configure Rclone upload settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="defaultRemote">Default Remote</Label>
                        {isRemotesLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-500">Loading remotes...</span>
                          </div>
                        ) : remotesData?.remotes?.length ? (
                          <Select
                            value={defaultRemote}
                            onValueChange={setDefaultRemote}
                          >
                            <SelectTrigger id="defaultRemote">
                              <SelectValue placeholder="Select default remote" />
                            </SelectTrigger>
                            <SelectContent>
                              {remotesData.remotes.map((remote) => (
                                <SelectItem key={remote} value={remote}>
                                  {remote}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded-md">
                            No Rclone remotes found. Please configure Rclone first.
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Default remote for uploading content
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remotePath">Default Remote Path</Label>
                        <Input
                          id="remotePath"
                          defaultValue="/anime/"
                          placeholder="e.g., /anime/"
                        />
                        <p className="text-xs text-gray-500">
                          Default path on the remote where files will be uploaded
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Upload Options</Label>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="autoUpload">Auto-upload completed downloads</Label>
                            <p className="text-xs text-gray-500">
                              Automatically upload files when download completes
                            </p>
                          </div>
                          <Switch id="autoUpload" checked={autoUpload} onCheckedChange={setAutoUpload} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="uploadBandwidth">Upload Bandwidth Limit (KB/s)</Label>
                        <Input
                          id="uploadBandwidth"
                          type="number"
                          defaultValue="0"
                          min="0"
                          placeholder="0 for unlimited"
                        />
                        <p className="text-xs text-gray-500">
                          Limit upload bandwidth (0 = unlimited)
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Rclone Configuration File</Label>
                        <RcloneConfigUpload />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={handleSaveSettings}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Rclone Settings
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                {/* About */}
                <TabsContent value="about">
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                      <CardDescription>
                        Information about the application
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-4">
                        <h3 className="text-2xl font-bold text-primary">Wcofun.net Downloader</h3>
                        <p className="text-sm text-gray-500 mt-2">Version 1.0.0</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium mb-2">Features</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center">
                            <MemoryStick className="h-4 w-4 mr-2 text-primary" />
                            Download videos from Wcofun.net
                          </li>
                          <li className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-primary" />
                            Pause and resume downloads
                          </li>
                          <li className="flex items-center">
                            <HardDrive className="h-4 w-4 mr-2 text-primary" />
                            Organize downloads by series
                          </li>
                          <li className="flex items-center">
                            <Cloud className="h-4 w-4 mr-2 text-primary" />
                            Upload to Rclone remotes
                          </li>
                        </ul>
                      </div>

                      <Separator />

                      <div className="text-center text-sm text-gray-500">
                        <p>
                          Built with React, Express, and Node.js
                        </p>
                        <p className="mt-1">
                          © 2023 Wcofun Downloader
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
