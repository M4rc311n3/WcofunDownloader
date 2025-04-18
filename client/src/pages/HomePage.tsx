import { FC, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Upload } from "lucide-react";
import { api, FetchUrlResponse } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import UrlInput from "@/components/download/UrlInput";
import SeriesInfo from "@/components/download/SeriesInfo";
import EpisodesList from "@/components/download/EpisodesList";
import CurrentDownloads from "@/components/download/CurrentDownloads";
import DownloadHistory from "@/components/download/DownloadHistory";
import { Button } from "@/components/ui/button";

const HomePage: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [fetchedData, setFetchedData] = useState<FetchUrlResponse | null>(null);
  const [showEpisodesList, setShowEpisodesList] = useState(false);

  const { data: downloadsData, isLoading: isDownloadsLoading } = useQuery({
    queryKey: ["/api/downloads"],
    queryFn: api.getAllDownloads,
  });

  // Reset episode list when fetched data changes
  useEffect(() => {
    if (fetchedData) {
      setShowEpisodesList(fetchedData.type === "series");
    }
  }, [fetchedData]);

  const handleFetchSuccess = (data: FetchUrlResponse) => {
    setFetchedData(data);
  };

  const handleSelectEpisodes = () => {
    setShowEpisodesList(true);
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
            {/* Main Content Header */}
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              <div className="pb-4 border-b border-gray-200 md:flex md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate">
                    Video Downloader
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Enter a Wcofun.net URL to download videos</p>
                </div>
                {/* Rclone upload button removed - access via sidebar only */}
              </div>
            </div>

            {/* URL Input */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              <UrlInput onFetchSuccess={handleFetchSuccess} />
            </div>

            {/* Series Information (if a series URL was fetched) */}
            {fetchedData?.series && (
              <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
                <SeriesInfo
                  series={fetchedData.series}
                  episodes={fetchedData.episodes || []}
                  onSelectEpisodes={handleSelectEpisodes}
                />
              </div>
            )}

            {/* Episodes List (if a series URL was fetched and showEpisodesList is true) */}
            {fetchedData?.series && showEpisodesList && fetchedData.episodes && (
              <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
                <EpisodesList episodes={fetchedData.episodes} seriesId={fetchedData.series.id} />
              </div>
            )}

            {/* Current Downloads */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              {!isDownloadsLoading && downloadsData && (
                <CurrentDownloads
                  downloads={downloadsData.downloads.filter(
                    (d) => d.status === "downloading" || d.status === "queued" || d.status === "paused"
                  )}
                />
              )}
            </div>

            {/* Download History */}
            <div className="px-4 mx-auto mt-6 max-w-7xl sm:px-6 md:px-8">
              {!isDownloadsLoading && downloadsData && (
                <DownloadHistory
                  downloads={downloadsData.downloads.filter(
                    (d) => d.status === "completed" || d.status === "error" || d.status === "uploaded"
                  )}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
