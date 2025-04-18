import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DownloadModal from "./DownloadModal";
import { api } from "@/lib/api";
import { Series, Episode } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SeriesInfoProps {
  series: Series;
  episodes: Episode[];
  onSelectEpisodes?: () => void;
}

const SeriesInfo: FC<SeriesInfoProps> = ({ series, episodes, onSelectEpisodes }) => {
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadSeriesMutation = useMutation({
    mutationFn: (downloadPath: string) => api.startDownload("series", series.id, downloadPath),
    onSuccess: () => {
      toast({
        title: "Download started",
        description: `Started downloading ${series.title}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Download error",
        description: `Failed to start download: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleDownloadAll = () => {
    setShowModal(true);
  };

  const handleStartDownload = (downloadPath: string) => {
    downloadSeriesMutation.mutate(downloadPath);
    setShowModal(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row">
            <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              {series.imageUrl ? (
                <img
                  src={series.imageUrl}
                  alt={series.title}
                  className="object-cover w-32 h-48 rounded-md shadow-sm md:w-40 md:h-60"
                />
              ) : (
                <div className="flex items-center justify-center w-32 h-48 bg-gray-200 rounded-md shadow-sm md:w-40 md:h-60">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{series.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Total Episodes: {series.totalEpisodes || episodes.length}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">{series.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button onClick={handleDownloadAll} disabled={downloadSeriesMutation.isPending}>
                    {downloadSeriesMutation.isPending ? (
                      <div className="w-5 h-5 mr-2 -ml-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Download className="w-5 h-5 mr-2 -ml-1" />
                    )}
                    Download All Episodes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onSelectEpisodes}
                    className="text-primary-700 bg-primary-100 hover:bg-primary-200"
                  >
                    <List className="w-5 h-5 mr-2 -ml-1" />
                    Select Episodes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DownloadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleStartDownload}
        series={series}
        totalEpisodes={episodes.length}
      />
    </>
  );
};

export default SeriesInfo;
