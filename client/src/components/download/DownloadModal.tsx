import { FC, useState } from "react";
import { Cloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Series } from "@shared/schema";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (downloadPath: string) => void;
  series: Series;
  totalEpisodes: number;
}

const DownloadModal: FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  series,
  totalEpisodes,
}) => {
  const [downloadOption, setDownloadOption] = useState("all");
  const [downloadPath, setDownloadPath] = useState(sanitizePathName(series.title));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(downloadPath);
  };

  // Function to sanitize file path name
  function sanitizePathName(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid file characters
      .replace(/\s+/g, "-")           // Replace spaces with hyphens
      .toLowerCase();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Download Series</DialogTitle>
            <DialogDescription>
              You are about to download the complete series "{series.title}" ({totalEpisodes} episodes).
              This may take a significant amount of time and storage space. Would you like to proceed?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <RadioGroup value={downloadOption} onValueChange={setDownloadOption}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="downloadOption1" />
                <Label htmlFor="downloadOption1">Download all episodes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="seasons" id="downloadOption2" />
                <Label htmlFor="downloadOption2">Download selected seasons</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="downloadOption3" />
                <Label htmlFor="downloadOption3">Custom selection</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="downloadPath">Download Location</Label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  /downloads/
                </span>
                <Input
                  id="downloadPath"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  className="rounded-none rounded-r-md"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Cloud className="mr-2 h-4 w-4" />
              Start Download
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
