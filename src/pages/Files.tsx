import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Bell, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { authHelpers } from "@/lib/supabase";

const Files = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await authHelpers.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success("File uploaded successfully!");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">GS</span>
              </div>
              <h1 className="text-xl font-semibold">Grutto Study</h1>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
              >
                <Bell className="w-5 h-5" />
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoeken"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card shadow-sm"
            />
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Files</h2>
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
            {!showUpload && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            )}
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
                My Files
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
    </div>
  );
};

export default Files;
