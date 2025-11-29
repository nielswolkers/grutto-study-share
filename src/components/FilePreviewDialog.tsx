import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

interface FilePreviewDialogProps {
  file: {
    id: string;
    filename: string;
    file_type: string;
    storage_url: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export const FilePreviewDialog = ({ file, open, onClose }: FilePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file && open) {
      loadPreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, open]);

  const loadPreview = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.storage_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
    } catch (error: any) {
      toast.error("Failed to load preview");
      console.error(error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !previewUrl) return;
    
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("File downloaded");
  };

  const isImage = file?.file_type.includes('image');
  const isPdf = file?.file_type.includes('pdf');
  const isText = file?.file_type.includes('text') || file?.filename.endsWith('.txt');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{file?.filename}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && previewUrl && (
            <>
              {isImage && (
                <img
                  src={previewUrl}
                  alt={file?.filename}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              )}

              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg border"
                  title={file?.filename}
                />
              )}

              {isText && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg border bg-card"
                  title={file?.filename}
                />
              )}

              {!isImage && !isPdf && !isText && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
