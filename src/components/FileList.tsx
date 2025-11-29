import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FileSpreadsheet, Download, Share2, Trash2, MoreHorizontal, Folder, Image } from "lucide-react";
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
import { nl } from "date-fns/locale";

interface FileListProps {
  userId: string;
  viewType: "recent" | "uploaded" | "shared" | "folder";
  searchQuery: string;
  refreshTrigger: number;
  folderId?: string;
}

interface FileData {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  storage_url: string;
  owner_id: string;
  folder_id?: string | null;
  profiles?: {
    username: string;
    display_name: string;
  };
}

interface FolderData {
  id: string;
  name: string;
  color: string;
  created_at: string;
  fileCount?: number;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <Image className="w-5 h-5 text-primary" />;
  if (fileType.includes('word')) return <FileText className="w-5 h-5 text-file-word" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-file-excel" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileSpreadsheet className="w-5 h-5 text-file-powerpoint" />;
  if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-file-pdf" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
};

const getFileTypeLabel = (fileType: string) => {
  if (fileType.includes('image')) return 'AFBEELDING';
  if (fileType.includes('word')) return 'WORD';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'EXCEL';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'POWERPOINT';
  if (fileType.includes('pdf')) return 'PDF';
  return 'DOCUMENT';
};

export const FileList = ({ userId, viewType, searchQuery, refreshTrigger, folderId }: FileListProps) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogFile, setShareDialogFile] = useState<FileData | null>(null);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
    if (viewType === "uploaded") {
      loadFolders();
    }
  }, [userId, viewType, refreshTrigger, folderId]);

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get file counts for each folder
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder) => {
          const { count } = await supabase
            .from('files')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);
          
          return { ...folder, fileCount: count || 0 };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      let query;

      if (viewType === "folder") {
        query = supabase
          .from('files')
          .select('*')
          .eq('folder_id', folderId!)
          .order('upload_date', { ascending: false });
      } else if (viewType === "uploaded") {
        query = supabase
          .from('files')
          .select('*')
          .eq('owner_id', userId)
          .is('folder_id', null)
          .order('upload_date', { ascending: false });
      } else if (viewType === "shared") {
        const { data, error } = await supabase
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
              folder_id
            )
          `)
          .eq('shared_with_user_id', userId);

        if (error) throw error;

        const fileOwnerIds = [...new Set(data.map((item: any) => item.files.owner_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', fileOwnerIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const transformedFiles = data.map((item: any) => ({
          ...item.files,
          profiles: profileMap.get(item.files.owner_id),
        }));
        
        setFiles(filterFiles(transformedFiles));
        setLoading(false);
        return;
      } else {
        const [ownFiles, sharedFilesData] = await Promise.all([
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
                folder_id
              )
            `)
            .eq('shared_with_user_id', userId)
            .limit(10),
        ]);

        if (ownFiles.error) throw ownFiles.error;
        if (sharedFilesData.error) throw sharedFilesData.error;

        const fileOwnerIds = [...new Set(sharedFilesData.data.map((item: any) => item.files.owner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', fileOwnerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const sharedFiles = sharedFilesData.data.map((item: any) => ({
          ...item.files,
          profiles: profileMap.get(item.files.owner_id),
        }));

        const allFiles = [...ownFiles.data, ...sharedFiles]
          .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
          .slice(0, 20);
        
        setFiles(filterFiles(allFiles));
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      setFiles(filterFiles(data || []));
    } catch (error: any) {
      toast.error("Kon bestanden niet laden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = (fileList: FileData[]) => {
    if (!searchQuery) return fileList;
    
    const query = searchQuery.toLowerCase();
    return fileList.filter(file => 
      file.filename.toLowerCase().includes(query) ||
      getFileTypeLabel(file.file_type).toLowerCase().includes(query) ||
      file.profiles?.username?.toLowerCase().includes(query) ||
      file.profiles?.display_name?.toLowerCase().includes(query)
    );
  };

  const handleFileClick = (file: FileData) => {
    navigate(`/preview/${file.id}`);
  };

  const handleFileDoubleClick = (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isOfficeFile = 
      file.file_type.includes('word') ||
      file.file_type.includes('excel') ||
      file.file_type.includes('spreadsheet') ||
      file.file_type.includes('powerpoint') ||
      file.file_type.includes('presentation');

    if (isOfficeFile) {
      handleDownload(file);
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
      
      toast.success("Bestand gedownload");
    } catch (error: any) {
      toast.error("Download mislukt");
      console.error(error);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("Bestand verwijderd");
    } catch (error: any) {
      toast.error("Kon bestand niet verwijderen");
      console.error(error);
    }
  };

  const handleDragStart = (fileId: string) => {
    setDraggedFile(fileId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnFolder = async (folderId: string) => {
    if (!draggedFile) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .eq('id', draggedFile);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== draggedFile));
      toast.success("Bestand verplaatst naar map");
      loadFolders();
    } catch (error: any) {
      toast.error("Kon bestand niet verplaatsen");
      console.error(error);
    } finally {
      setDraggedFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Folders */}
      {viewType === "uploaded" && folders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Mappen</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => navigate(`/folder/${folder.id}`)}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnFolder(folder.id);
                }}
                className="p-4 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: folder.color }}
              >
                <Folder className="w-8 h-8 mb-2" />
                <p className="font-medium text-sm truncate">{folder.name}</p>
                <p className="text-xs opacity-75">{folder.fileCount} bestand(en)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length === 0 && folders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Geen bestanden gevonden</p>
        </div>
      ) : (
        <>
          {files.length > 0 && (
            <>
              {viewType === "uploaded" && folders.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mt-6 mb-3">Bestanden</h3>
              )}
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() => handleDragStart(file.id)}
                    onClick={() => handleFileClick(file)}
                    onDoubleClick={(e) => handleFileDoubleClick(file, e)}
                    className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:border-primary transition-all cursor-pointer"
                  >
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(file.upload_date), { addSuffix: true, locale: nl })}</span>
                        {file.profiles && (
                          <>
                            <span>•</span>
                            <span>{file.profiles.display_name || file.profiles.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {getFileTypeLabel(file.file_type)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}>
                          <Download className="w-4 h-4 mr-2" />
                          Downloaden
                        </DropdownMenuItem>
                        {file.owner_id === userId && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setShareDialogFile(file);
                            }}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Delen
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {shareDialogFile && (
        <ShareDialog
          file={shareDialogFile}
          open={!!shareDialogFile}
          onClose={() => setShareDialogFile(null)}
        />
      )}
    </div>
  );
};
