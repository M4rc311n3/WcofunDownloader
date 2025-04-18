import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Clock, CheckCircle, Info } from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import CurrentDownloads from "@/components/download/CurrentDownloads";
import DownloadHistory from "@/components/download/DownloadHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

const DownloadsPage: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: downloadsData, isLoading: isDownloadsLoading } = useQuery({
    queryKey: ["/api/downloads"],
    queryFn: api.getAllDownloads,
  });

  const activeDownloads = downloadsData?.downloads.filter(
    (d) => d.status === "downloading" || d.status === "queued" || d.status === "paused"
  ) || [];

  const completedDownloads = downloadsData?.downloads.filter(
    (d) => d.status === "completed" || d.status === "uploaded"
  ) || [];

  const failedDownloads = downloadsData?.downloads.filter(
    (d) => d.status === "error" || d.status === "cancelled"
  ) || [];

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
            {/* Main Content Header */}
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate">
                Downloads
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your downloaded and active downloads
              </p>
            </div>

            {/* Download Stats */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <Download className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Downloads</p>
                      <p className="text-2xl font-bold">{activeDownloads.length}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Completed</p>
                      <p className="text-2xl font-bold">{completedDownloads.length}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Info className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Failed</p>
                      <p className="text-2xl font-bold">{failedDownloads.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Download Tabs */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <Tabs defaultValue="active">
                <TabsList className="mb-4">
                  <TabsTrigger value="active" className="relative">
                    Active
                    {activeDownloads.length > 0 && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-white">
                        {activeDownloads.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  {!isDownloadsLoading && (
                    <CurrentDownloads downloads={activeDownloads} />
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  {!isDownloadsLoading && (
                    <DownloadHistory downloads={completedDownloads} />
                  )}
                </TabsContent>

                <TabsContent value="failed">
                  {!isDownloadsLoading && (
                    <DownloadHistory downloads={failedDownloads} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DownloadsPage;
