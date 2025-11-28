import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FileSpreadsheet, Download, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { ShareDialog } from "./ShareDialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface FileListProps {
  userId: string;
  viewType: "recent" | "uploaded" | "shared";
  searchQuery: string;
  refreshTrigger: number;
}

interface FileData {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  storage_url: string;
  owner_id: string;
  profiles?: {
    username: string;
    display_name: string;
  };
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('word')) return <FileText className="w-5 h-5 text-file-word" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-file-excel" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileSpreadsheet className="w-5 h-5 text-file-powerpoint" />;
  if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-file-pdf" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
};

const getFileTypeLabel = (fileType: string) => {
  if (fileType.includes('word')) return 'Word';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Excel';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'PowerPoint';
  if (fileType.includes('pdf')) return 'PDF';
  return 'Document';
};

export const FileList = ({ userId, viewType, searchQuery, refreshTrigger }: FileListProps) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogFile, setShareDialogFile] = useState<FileData | null>(null);

  useEffect(() => {
    loadFiles();
  }, [userId, viewType, refreshTrigger]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      let query;

      if (viewType === "uploaded") {
        // User's own files
        query = supabase
          .from('files')
          .select('*')
          .eq('owner_id', userId)
          .order('upload_date', { ascending: false });
      } else if (viewType === "shared") {
        // Files shared with user
        query = supabase
          .from('file_shares')
          .select(`
            file_id,
            files!inner (
              id,
              filename,
              file_type,
              file_size,
              upload_date,
              storage_url,
              owner_id,
              profiles!files_owner_id_fkey (
                username,
                display_name
              )
            )
          `)
          .eq('shared_with_user_id', userId);

        const { data, error } = await query;
        if (error) throw error;

        // Transform shared files data
        const transformedFiles = data.map((item: any) => ({
          ...item.files,
          profiles: item.files.profiles,
        }));
        setFiles(transformedFiles);
        setLoading(false);
        return;
      } else {
        // Recent - combination of uploaded and shared
        const [ownFiles, sharedFiles] = await Promise.all([
          supabase
            .from('files')
            .select('*')
            .eq('owner_id', userId)
            .order('upload_date', { ascending: false })
            .limit(10),
          supabase
            .from('file_shares')
            .select(`
              file_id,
              files!inner (
                id,
                filename,
                file_type,
                file_size,
                upload_date,
                storage_url,
                owner_id,
                profiles!files_owner_id_fkey (
                  username,
                  display_name
                )
              )
            `)
            .eq('shared_with_user_id', userId)
            .limit(10),
        ]);

        if (ownFiles.error) throw ownFiles.error;
        if (sharedFiles.error) throw sharedFiles.error;

        const transformedShared = sharedFiles.data.map((item: any) => ({
          ...item.files,
          profiles: item.files.profiles,
        }));

        const combined = [...(ownFiles.data || []), ...transformedShared]
          .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
          .slice(0, 20);

        setFiles(combined);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast.error("Failed to load files");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileData) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.storage_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File downloaded");
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (file: FileData) => {
    if (!confirm(`Delete "${file.filename}"? This will remove it for everyone.`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_url]);

      if (storageError) throw storageError;

      // Delete from database (cascade will handle shares)
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast.success("File deleted successfully");
      loadFiles();
    } catch (error: any) {
      toast.error("Failed to delete file");
      console.error(error);
    }
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-1">No files found</p>
        <p className="text-sm text-muted-foreground">
          {searchQuery ? "Try a different search term" : "Upload your first file to get started"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
          >
            {getFileIcon(file.file_type)}
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-2 mt-1">
                {file.profiles && (
                  <span className="text-sm text-muted-foreground">
                    Bestanden van {file.profiles.display_name || file.profiles.username}
                  </span>
                )}
                {!file.profiles && (
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(file.upload_date), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            <Badge variant="secondary" className="hidden sm:flex">
              {getFileTypeLabel(file.file_type)}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex"
            >
              +3
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload(file)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                {file.owner_id === userId && (
                  <>
                    <DropdownMenuItem onClick={() => setShareDialogFile(file)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(file)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {shareDialogFile && (
        <ShareDialog
          file={shareDialogFile}
          open={!!shareDialogFile}
          onClose={() => setShareDialogFile(null)}
        />
      )}
    </>
  );
};
