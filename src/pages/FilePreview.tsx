import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, ArrowLeft, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const FilePreview = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const isOfficeFile = (fileType: string) => {
    return fileType?.includes('word') || 
           fileType?.includes('document') ||
           fileType?.includes('excel') || 
           fileType?.includes('spreadsheet') ||
           fileType?.includes('powerpoint') || 
           fileType?.includes('presentation');
  };

  useEffect(() => {
    loadFile();
    return () => {
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileId]);

  const loadFile = async () => {
    if (!fileId) return;
    
    setLoading(true);
    try {
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileError) throw fileError;
      setFile(fileData);
      setNewFileName(fileData.filename);

      // For Office files, get a signed URL for the online viewer
      if (isOfficeFile(fileData.file_type)) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('user-files')
          .createSignedUrl(fileData.storage_url, 3600); // 1 hour expiry

        if (signedError) throw signedError;
        setSignedUrl(signedData.signedUrl);
        setPreviewUrl(signedData.signedUrl);
      } else {
        // Download file for preview (images, PDFs)
        const { data, error } = await supabase.storage
          .from('user-files')
          .download(fileData.storage_url);

        if (error) throw error;
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      }
    } catch (error: any) {
      toast.error("Kon bestand niet laden");
      console.error(error);
      navigate(-1);
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
    toast.success("Bestand gedownload");
  };

  const handleRename = async () => {
    if (!file || !newFileName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ filename: newFileName.trim() })
        .eq('id', file.id);

      if (error) throw error;

      setFile({ ...file, filename: newFileName.trim() });
      setIsEditingName(false);
      toast.success("Bestandsnaam gewijzigd");
    } catch (error: any) {
      toast.error("Kon bestandsnaam niet wijzigen");
      console.error(error);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const isImage = file?.file_type?.includes('image');
  const isPdf = file?.file_type?.includes('pdf');
  const isWord = file?.file_type?.includes('word') || file?.file_type?.includes('document');
  const isExcel = file?.file_type?.includes('excel') || file?.file_type?.includes('spreadsheet');
  const isPowerPoint = file?.file_type?.includes('powerpoint') || file?.file_type?.includes('presentation');
  const isOfficeDocument = isWord || isExcel || isPowerPoint;

  return (
    <div className="min-h-screen bg-white flex flex-col">{/* White background for preview */}
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGoBack}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="h-9 rounded-full"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleRename} className="rounded-full">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                  setNewFileName(file.filename);
                  setIsEditingName(false);
                }} className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-semibold truncate">{file?.filename}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 rounded-full"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="default"
            onClick={handleDownload}
            className="rounded-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Downloaden
          </Button>
        </div>
      </header>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && previewUrl && (
          <div className="max-w-7xl mx-auto">
            {isImage && (
              <img
                src={previewUrl}
                alt={file?.filename}
                className="max-w-full h-auto mx-auto rounded-2xl shadow-lg"
              />
            )}

            {isPdf && (
              <iframe
                src={previewUrl}
                className="w-full h-[calc(100vh-200px)] rounded-2xl border shadow-lg"
                title={file?.filename}
              />
            )}

            {isOfficeDocument && signedUrl && (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
                className="w-full h-[calc(100vh-200px)] rounded-2xl border shadow-lg bg-white"
                title={file?.filename}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;