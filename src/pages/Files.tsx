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
      {/* Logo */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <img src={gruttoLogo} alt="Grutto" className="h-10" />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Top Bar with Tabs and Actions */}
        <div className="mb-6 flex items-center justify-between gap-4 h-14">
          {/* View Tabs */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeView === "recent" ? "default" : "ghost"}
              onClick={() => setActiveView("recent")}
              className="rounded-full px-6"
            >
              Recent
            </Button>
            <Button
              variant={activeView === "shared" ? "default" : "ghost"}
              onClick={() => setActiveView("shared")}
              className="rounded-full px-6"
            >
              Gedeeld
            </Button>
            <Button
              variant={activeView === "favorites" ? "default" : "ghost"}
              onClick={() => setActiveView("favorites")}
              className="rounded-full px-6"
            >
              Favorieten
            </Button>
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-full bg-secondary/50 border-0"
              />
            </div>

            {/* Folder Creation */}
            <Button
              variant="outline"
              onClick={() => setShowFolderDialog(true)}
              className="rounded-full gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Voeg map toe
            </Button>

            {/* Upload */}
            <Button
              variant="outline"
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-full gap-2"
            >
              <Upload className="w-4 h-4" />
              Importeer
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
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
        {activeView === "recent" && folders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold mb-4">Mappen</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Bestanden</h2>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sorteren:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "date")}
              className="h-8 px-3 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
