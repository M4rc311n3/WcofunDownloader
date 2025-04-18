import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Episode } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface EpisodesListProps {
  episodes: Episode[];
  seriesId: number;
}

const EpisodesList: FC<EpisodesListProps> = ({ episodes, seriesId }) => {
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [expanded, setExpanded] = useState(true);
  const [visibleEpisodes, setVisibleEpisodes] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadEpisodeMutation = useMutation({
    mutationFn: (episodeId: number) => api.startDownload("episode", episodeId),
    onSuccess: (data, episodeId) => {
      const episode = episodes.find((e) => e.id === episodeId);
      toast({
        title: "Download started",
        description: `Started downloading ${episode?.title || "episode"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error, episodeId) => {
      const episode = episodes.find((e) => e.id === episodeId);
      toast({
        title: "Download error",
        description: `Failed to download ${episode?.title || "episode"}: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleDownload = (episodeId: number) => {
    downloadEpisodeMutation.mutate(episodeId);
  };

  // Sort episodes based on selected order
  const sortedEpisodes = [...episodes].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return (b.episodeNumber || 0) - (a.episodeNumber || 0);
      case "oldest":
        return (a.episodeNumber || 0) - (b.episodeNumber || 0);
      case "a-z":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Limit the number of visible episodes
  const displayedEpisodes = sortedEpisodes.slice(0, visibleEpisodes);
  const hasMoreEpisodes = visibleEpisodes < sortedEpisodes.length;

  const handleShowMore = () => {
    setVisibleEpisodes((prev) => prev + 10);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Episodes</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="a-z">A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={toggleExpanded} className="ml-2 h-8">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-gray-200">
          {displayedEpisodes.map((episode) => (
            <div key={episode.id} className="flex flex-col px-4 py-3 md:flex-row md:items-center">
              <div className="flex flex-1 md:items-center">
                <div className="flex-shrink-0 hidden mr-4 md:block">
                  {/* No image available for episodes, using placeholder */}
                  <div className="flex items-center justify-center w-20 h-12 bg-gray-200 rounded">
                    <span className="text-xs text-gray-500">No Image</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {episode.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Season {episode.season || 1} • Episode {episode.episodeNumber || "?"} {episode.duration ? `• ${episode.duration}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 md:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(episode.id)}
                  disabled={downloadEpisodeMutation.isPending}
                  className="text-xs text-primary-700 bg-primary-100 hover:bg-primary-200"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ))}

          {hasMoreEpisodes && (
            <div className="px-4 py-3 text-center">
              <Button variant="link" onClick={handleShowMore} className="text-sm font-medium text-primary hover:text-primary-600">
                Show more episodes
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default EpisodesList;
