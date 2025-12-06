import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Search, FolderPlus, FileText, Image, FileSpreadsheet, MoreHorizontal, Download, Copy, Edit2, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FolderDialog } from "@/components/FolderDialog";
import { FolderCard } from "@/components/FolderCard";
import { ShareDialog } from "@/components/ShareDialog";
import { formatRelativeDate } from "@/lib/dateUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import shareIcon from "@/assets/share-icon.png";

interface FileData {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  storage_url: string;
  owner_id: string;
  folder_id?: string | null;
  is_favorite?: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <Image className="w-5 h-5" />;
  if (fileType.includes('word')) return <FileText className="w-5 h-5 text-blue-600" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileSpreadsheet className="w-5 h-5 text-orange-600" />;
  if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
};

const FolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [folder, setFolder] = useState<any>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [subfolders, setSubfolders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareDialogFile, setShareDialogFile] = useState<FileData | null>(null);
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (error) throw error;
      setFolder(data);
    } catch (error) {
      toast.error("Kon map niet laden");
      navigate(-1);
    }
  };

  const loadFiles = async () => {
    if (!folderId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('folder_id', folderId)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      
      let filtered = data || [];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(file => 
          file.filename.toLowerCase().includes(query)
        );
      }
      
      setFiles(filtered);
    } catch (error) {
      toast.error("Kon bestanden niet laden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubfolders = async (userId: string) => {
    if (!folderId || !userId) return;
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('owner_id', userId)
        .eq('parent_folder_id', folderId)
        .order('name');

      if (error) throw error;

      // Load file counts for each subfolder
      const counts: Record<string, number> = {};
      for (const subfolder of data || []) {
        const { count } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', subfolder.id);
        counts[subfolder.id] = count || 0;
      }

      const foldersWithCounts = (data || []).map((subfolder) => ({
        ...subfolder,
        fileCount: counts[subfolder.id] || 0,
      }));

      setSubfolders(foldersWithCounts);
    } catch (error) {
      console.error('Kon submappen niet laden', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadFolder();
        loadFiles();
        loadSubfolders(session.user.id);
      }
    });
  }, [navigate, folderId, refreshTrigger]);

  useEffect(() => {
    if (user && folderId) {
      loadFiles();
    }
  }, [searchQuery]);

  const handleUploadComplete = () => {
    setShowUpload(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success("Bestand geüpload!");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleDownload = async (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDuplicate = async (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.storage_url);

      if (error) throw error;

      const newFileName = `${file.filename.split('.')[0]} (kopie).${file.filename.split('.').pop()}`;
      const newFilePath = `${user?.id}/${Date.now()}_${newFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(newFilePath, data, {
          contentType: file.file_type,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('files')
        .insert({
          filename: newFileName,
          file_type: file.file_type,
          file_size: file.file_size,
          storage_url: newFilePath,
          owner_id: user?.id,
          folder_id: folderId,
        });

      if (insertError) throw insertError;

      toast.success("Kopie gemaakt");
      loadFiles();
    } catch (error: any) {
      toast.error("Kon kopie niet maken");
      console.error(error);
    }
  };

  const handleDelete = async (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('id', file.id);

      if (error) throw error;

      // Create notification for file deletion
      await supabase.from('notifications').insert({
        type: 'file_deleted',
        message: `Bestand "${file.filename}" is naar de prullenbak verplaatst`,
        recipient_id: user?.id,
        sender_id: user?.id,
        file_id: file.id,
      });

      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success("Bestand naar prullenbak verplaatst");
    } catch (error: any) {
      toast.error("Kon bestand niet verwijderen");
      console.error(error);
    }
  };

  const toggleFavorite = async (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newFavoriteState = !file.is_favorite;
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, is_favorite: newFavoriteState } : f
    ));
    
    toast.success(newFavoriteState ? "Toegevoegd aan favorieten" : "Uit favorieten verwijderd");
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_favorite: newFavoriteState })
        .eq('id', file.id);

      if (error) throw error;
    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, is_favorite: file.is_favorite } : f
      ));
      toast.error("Kon favoriet niet bijwerken");
      console.error(error);
    }
  };

  const handleDragStart = (fileId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('application/grutto-file-id', fileId);
  };

  if (!user || !folder) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="w-full px-10 py-8">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGoBack}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <h1 className="text-2xl font-semibold">{folder.name}</h1>
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-full bg-secondary border-0 focus-visible:ring-1"
              />
            </div>

            {/* Folder Creation */}
            <Button
              onClick={() => setShowFolderDialog(true)}
              className="rounded-full gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary-hover px-5"
            >
              <FolderPlus className="w-4 h-4" />
              Voeg map toe
            </Button>

            {/* Upload */}
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-full gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary-hover px-5"
            >
              <Upload className="w-4 h-4" />
              Importeer
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-6 p-6 bg-card rounded-2xl shadow-sm border border-border/60">
            <FileUpload 
              userId={user.id} 
              onUploadComplete={handleUploadComplete} 
              folderId={folderId} 
            />
          </div>
        )}

        {/* Subfolders Section */}
        {subfolders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[0.8rem] font-semibold mb-4 text-muted-foreground">Mappen</h2>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {subfolders.map((subfolder) => (
                <FolderCard
                  key={subfolder.id}
                  folder={subfolder}
                  fileCount={subfolder.fileCount || 0}
                  onUpdate={() => {
                    loadSubfolders(user.id);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Files List */}
        <h2 className="text-[0.8rem] font-semibold mb-4 text-muted-foreground">Bestanden</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen bestanden in deze map</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(file.id, e)}
                onClick={() => navigate(`/preview/${file.id}`)}
                onMouseEnter={() => setHoveredFileId(file.id)}
                onMouseLeave={() => setHoveredFileId(null)}
                className="group flex items-center gap-4 p-4 bg-card rounded-2xl border hover:border-primary transition-all cursor-pointer hover:shadow-sm"
              >
                {/* File Icon */}
                <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-xl">
                  {getFileIcon(file.file_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <span>{formatRelativeDate(file.upload_date)}</span>
                  </div>
                </div>

                {/* Hover Actions */}
                <div className={`flex items-center gap-2 transition-opacity ${hoveredFileId === file.id ? 'opacity-100' : 'opacity-0'}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareDialogFile(file);
                    }}
                  >
                    <img src={shareIcon} alt="Delen" className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full ${file.is_favorite ? 'text-yellow-500' : ''}`}
                    onClick={(e) => toggleFavorite(file, e)}
                  >
                    <Star className={`w-4 h-4 ${file.is_favorite ? 'fill-yellow-500' : ''}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem onClick={(e) => handleDownload(file, e)} className="rounded-lg">
                        <Download className="w-4 h-4 mr-2" />
                        Downloaden
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDuplicate(file, e)} className="rounded-lg">
                        <Copy className="w-4 h-4 mr-2" />
                        Kopie maken
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setShareDialogFile(file);
                      }} className="rounded-lg">
                        <img src={shareIcon} alt="Delen" className="w-4 h-4 mr-2" />
                        Delen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => toggleFavorite(file, e)} className="rounded-lg">
                        <Star className="w-4 h-4 mr-2" />
                        {file.is_favorite ? 'Uit favorieten' : 'Toevoegen aan favorieten'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(file, e)} 
                        className="text-destructive focus:text-destructive rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <FolderDialog
        open={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          loadSubfolders(user.id);
        }}
        userId={user.id}
        parentFolderId={folderId}
      />

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

export default FolderView;