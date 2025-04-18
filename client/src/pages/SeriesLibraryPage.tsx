import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Library, Download, Clock, Search, Filter } from "lucide-react";
import { api, FetchUrlResponse } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/download/ProgressBar";
import { useToast } from "@/hooks/use-toast";
import { Series } from "@shared/schema";
import { truncateString } from "@/lib/utils";

const SeriesLibraryPage: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: seriesData, isLoading: isSeriesLoading } = useQuery({
    queryKey: ["/api/series"],
    queryFn: api.getAllSeries,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter series based on search query
  const filteredSeries = seriesData?.series?.filter((series) =>
    series.title.toLowerCase().includes(searchQuery.toLowerCase())
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
        <TopNav 
          toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
          onSearch={handleSearch}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-6">
            {/* Main Content Header */}
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate">
                    Series Library
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Browse and manage your anime series collection
                  </p>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <Input
                      type="search"
                      placeholder="Search series"
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Series Grid */}
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              {isSeriesLoading ? (
                <div className="flex justify-center my-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredSeries.length === 0 ? (
                <div className="text-center my-8 p-8 bg-white rounded-lg shadow-sm">
                  <Library className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No series found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery 
                      ? "Try searching with a different term"
                      : "Start by downloading a series from the home page"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredSeries.map((series) => (
                    <SeriesCard key={series.id} series={series} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

interface SeriesCardProps {
  series: Series;
}

const SeriesCard: FC<SeriesCardProps> = ({ series }) => {
  const { toast } = useToast();

  const { data: seriesWithEpisodes } = useQuery({
    queryKey: [`/api/series/${series.id}`],
    queryFn: () => api.getSeriesWithEpisodes(series.id),
  });

  const handleViewDetails = () => {
    // In a more complex app, navigate to series detail page
    toast({
      title: "Series details",
      description: `Viewing details for ${series.title}`,
    });
  };

  const handleDownloadSeries = () => {
    api.startDownload("series", series.id)
      .then(() => {
        toast({
          title: "Download started",
          description: `Started downloading ${series.title}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Download error",
          description: `Failed to start download: ${error}`,
          variant: "destructive",
        });
      });
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-gray-200">
        {series.imageUrl ? (
          <img
            src={series.imageUrl}
            alt={series.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-200">
            <Library className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{series.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-500 mb-3">
          {truncateString(series.description || "No description available", 100)}
        </p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-500">
            Episodes: {series.totalEpisodes || seriesWithEpisodes?.episodes.length || 0}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button variant="default" size="sm" onClick={handleDownloadSeries}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeriesLibraryPage;
