import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Bell, LogOut, FolderPlus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { FolderDialog } from "@/components/FolderDialog";
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
  const [hasFavorites, setHasFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
        checkFavorites(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
        checkFavorites(session.user.id);
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

  const checkFavorites = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('is_favorite', true);
      
      setHasFavorites((count || 0) > 0);
    } catch (error) {
      console.error("Failed to check favorites:", error);
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
    if (user) checkFavorites(user.id);
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
        {/* Top Bar with Tabs and Actions - Increased height */}
        <div className="mb-6 flex items-center justify-between gap-4 h-16">
          {/* View Tabs */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeView === "recent" ? "default" : "ghost"}
              onClick={() => setActiveView("recent")}
              className="rounded-full"
            >
              Recent
            </Button>
            <Button
              variant={activeView === "shared" ? "default" : "ghost"}
              onClick={() => setActiveView("shared")}
              className="rounded-full"
            >
              Gedeeld
            </Button>
            {hasFavorites && (
              <Button
                variant={activeView === "favorites" ? "default" : "ghost"}
                onClick={() => setActiveView("favorites")}
                className="rounded-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Favorieten
              </Button>
            )}
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-full bg-secondary border-0"
              />
            </div>

            {/* Folder Creation */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFolderDialog(true)}
              className="rounded-full"
            >
              <FolderPlus className="w-5 h-5" />
            </Button>

            {/* Upload */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-full"
            >
              <Upload className="w-5 h-5" />
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

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-6 p-6 bg-card rounded-2xl shadow-sm border">
            <FileUpload userId={user.id} onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Sort and Filter Bar - Compact, one line */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sorteren:</span>
            <Button
              variant={sortBy === "name" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("name")}
              className="h-8 rounded-full"
            >
              Naam (A-Z)
            </Button>
            <Button
              variant={sortBy === "date" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("date")}
              className="h-8 rounded-full"
            >
              Datum
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="h-8 px-3 rounded-full border bg-background text-sm"
            >
              <option value="all">Alle bestanden</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="image">Afbeeldingen</option>
            </select>
          </div>
        </div>

        {/* Files Section */}
        <FileList 
          userId={user.id} 
          viewType={activeView}
          searchQuery={searchQuery}
          refreshTrigger={refreshTrigger}
          sortBy={sortBy}
          fileTypeFilter={fileTypeFilter}
          onFavoritesChange={() => checkFavorites(user.id)}
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
