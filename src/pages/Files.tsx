import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Bell, LogOut, FolderPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { FolderDialog } from "@/components/FolderDialog";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { authHelpers } from "@/lib/supabase";

const Files = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUnreadCount(session.user.id);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Actions Bar */}
        <div className="mb-8 flex items-center gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoeken naar bestanden, types, of personen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={handleNotificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bestanden Uploaden</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <FileUpload userId={user.id} onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Files Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Snelle toegang</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowFolderDialog(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Nieuwe Map
              </Button>
              {!showUpload && (
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Uploaden
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="bg-card border-b w-full justify-start rounded-none h-auto p-0">
              <TabsTrigger 
                value="recent"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Recent
              </TabsTrigger>
              <TabsTrigger 
                value="uploaded"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Mijn Bestanden
              </TabsTrigger>
              <TabsTrigger 
                value="shared"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Gedeeld
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-6">
              <FileList 
                userId={user.id} 
                viewType="recent" 
                searchQuery={searchQuery}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>

            <TabsContent value="uploaded" className="mt-6">
              <FileList 
                userId={user.id} 
                viewType="uploaded" 
                searchQuery={searchQuery}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>

            <TabsContent value="shared" className="mt-6">
              <FileList 
                userId={user.id} 
                viewType="shared" 
                searchQuery={searchQuery}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Dialogs */}
      <FolderDialog
        open={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
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
