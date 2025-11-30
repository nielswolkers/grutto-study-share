import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Bell, LogOut, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { FolderDialog } from "@/components/FolderDialog";
import { FolderCard } from "@/components/FolderCard";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { authHelpers } from "@/lib/supabase";
import gruttoLogo from "@/assets/grutto-logo.png";

const Files = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeView, setActiveView] = useState<"recent" | "shared" | "favorites">("recent");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [folders, setFolders] = useState<any[]>([]);
  const [folderFileCounts, setFolderFileCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
        loadFolders(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
        loadFolders(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const loadFolders = async (userId: string) => {
    try {
      const { data: foldersData, error } = await supabase
        .from('folders')
        .select('*')
        .eq('owner_id', userId)
        .order('name');

      if (error) throw error;

      setFolders(foldersData || []);

      // Load file counts for each folder
      const counts: Record<string, number> = {};
      for (const folder of foldersData || []) {
        const { count } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folder.id);
        counts[folder.id] = count || 0;
      }
      setFolderFileCounts(counts);
    } catch (error) {
      console.error("Failed to load folders:", error);
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

  const handleNotificationsOpen = () => {
    setShowNotifications(true);
    if (user) loadUnreadCount(user.id);
  };

  const handleFolderCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    if (user) loadFolders(user.id);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Top Bar with Tabs and Actions */}
        <div className="mb-8 flex items-center justify-between gap-4">
          {/* View Tabs */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveView("recent")}
              className={`text-base font-medium pb-2 border-b-2 transition-colors ${
                activeView === "recent" 
                  ? "border-foreground text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveView("shared")}
              className={`text-base font-medium pb-2 border-b-2 transition-colors ${
                activeView === "shared" 
                  ? "border-foreground text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Gedeeld
            </button>
            <button
              onClick={() => setActiveView("favorites")}
              className={`text-base font-medium pb-2 border-b-2 transition-colors ${
                activeView === "favorites" 
                  ? "border-foreground text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Favorieten
            </button>
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
                className="pl-10 h-11 rounded-lg bg-secondary/30 border-0 focus-visible:ring-1"
              />
            </div>

            {/* Folder Creation */}
            <Button
              onClick={() => setShowFolderDialog(true)}
              className="rounded-lg gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FolderPlus className="w-4 h-4" />
              Voeg map toe
            </Button>

            {/* Upload */}
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-lg gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="w-4 h-4" />
              Importeer
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11"
              onClick={handleNotificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-6 p-6 bg-card rounded-2xl shadow-sm border">
            <FileUpload userId={user.id} onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Folders Section */}
        {activeView === "recent" && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-5">Mappen</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  fileCount={folderFileCounts[folder.id] || 0}
                  onUpdate={() => loadFolders(user.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Files Section with Sort */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Bestanden</h2>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sorteren:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "date")}
              className="h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="name">Naam (A-Z)</option>
              <option value="date">Datum</option>
            </select>
          </div>
        </div>

        <FileList 
          userId={user.id} 
          viewType={activeView}
          searchQuery={searchQuery}
          refreshTrigger={refreshTrigger}
          sortBy={sortBy}
          fileTypeFilter={fileTypeFilter}
          onFavoritesChange={() => {}}
        />
      </main>

      {/* Dialogs */}
      <FolderDialog
        open={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        onSuccess={handleFolderCreated}
        userId={user.id}
      />

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user.id}
      />
    </div>
  );
};

export default Files;
