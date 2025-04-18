import { FC, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UrlInputProps {
  onFetchSuccess: (data: any) => void;
}

const UrlInput: FC<UrlInputProps> = ({ onFetchSuccess }) => {
  const [url, setUrl] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const { toast } = useToast();

  const fetchUrlMutation = useMutation({
    mutationFn: (params: { url: string, forceRefresh: boolean }) => 
      api.fetchUrl(params.url, params.forceRefresh),
    onSuccess: (data) => {
      onFetchSuccess(data);
      toast({
        title: "URL fetched successfully",
        description: `Found ${data.type === "series" ? "series" : "episode"}: ${
          data.series?.title || data.episode?.title
        }`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error fetching URL",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Add https:// if not present
    let fetchUrl = url;
    if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
      fetchUrl = `https://${fetchUrl}`;
    }

    fetchUrlMutation.mutate({ url: fetchUrl, forceRefresh });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-wrap items-start mb-3 md:flex-nowrap">
            <div className="flex-1 w-full mb-3 md:mb-0 md:mr-3">
              <Label htmlFor="wcofun-url" className="block text-sm font-medium text-gray-700">
                Wcofun.net URL
              </Label>
              <div className="mt-1">
                <Input
                  type="text"
                  id="wcofun-url"
                  placeholder="https://www.wcofun.net/anime/example-series"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={fetchUrlMutation.isPending}
                />
              </div>
            </div>
            <div className="flex items-end w-full space-x-2 md:w-auto">
              <Button 
                type="submit" 
                disabled={fetchUrlMutation.isPending || !url}
                className="inline-flex items-center"
              >
                {fetchUrlMutation.isPending ? (
                  <div className="w-5 h-5 mr-2 -ml-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-5 h-5 mr-2 -ml-1" />
                )}
                Fetch
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="force-refresh" 
              checked={forceRefresh}
              onCheckedChange={(checked) => setForceRefresh(checked === true)}
              disabled={fetchUrlMutation.isPending}
            />
            <Label 
              htmlFor="force-refresh" 
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              <div className="flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Force refresh (reload series and episodes from source)</span>
              </div>
            </Label>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UrlInput;
