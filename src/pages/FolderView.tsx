import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Search, Bell, LogOut, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { FolderDialog } from "@/components/FolderDialog";
import { authHelpers } from "@/lib/supabase";
import { formatRelativeDate } from "@/lib/dateUtils";
import gruttoLogo from "@/assets/grutto-logo.png";

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

const FolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [folder, setFolder] = useState<any>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadFolder();
        loadFiles();
        loadUnreadCount(session.user.id);
      }
    });
  }, [navigate, folderId, refreshTrigger]);

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
      navigate("/files");
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

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [searchQuery]);

  const loadUnreadCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read_status', false);
      
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authHelpers.signOut();
    if (error) {
      toast.error("Fout bij uitloggen");
    } else {
      toast.success("Succesvol uitgelogd");
      navigate("/auth");
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success("Bestand geüpload!");
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
              onClick={() => navigate("/files")}
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
          <div className="mb-6 p-6 bg-card rounded-2xl shadow-sm border">
            <FileUpload 
              userId={user.id} 
              onUploadComplete={handleUploadComplete} 
              folderId={folderId} 
            />
          </div>
        )}

        {/* Files List */}
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
                onClick={() => navigate(`/preview/${file.id}`)}
                className="flex items-center gap-4 p-4 bg-card rounded-2xl border hover:border-primary transition-all cursor-pointer hover:shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <span>{formatRelativeDate(file.upload_date)}</span>
                  </div>
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
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        userId={user.id}
        parentFolderId={folderId}
      />

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user.id}
      />
    </div>
  );
};

export default FolderView;
