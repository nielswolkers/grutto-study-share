import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Search, X, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  file: {
    id: string;
    filename: string;
  };
  open: boolean;
  onClose: () => void;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

export const ShareDialog = ({ file, open, onClose }: ShareDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [currentShares, setCurrentShares] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (open) {
      loadCurrentShares();
    }
  }, [open, file.id]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadCurrentShares = async () => {
    try {
      const { data, error } = await supabase
        .from('file_shares')
        .select('shared_with_user_id')
        .eq('file_id', file.id);

      if (error) throw error;
      setCurrentShares(data.map(s => s.shared_with_user_id));
    } catch (error: any) {
      console.error("Failed to load shares:", error);
    }
  };

  const searchUsers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', `${searchQuery}%`)
        .neq('id', currentUserId!)
        .limit(10);

      if (error) throw error;

      // Filter out already shared users
      const filtered = data.filter(
        profile => !currentShares.includes(profile.id) &&
          !selectedUsers.some(u => u.id === profile.id)
      );

      setSearchResults(filtered);
    } catch (error: any) {
      console.error("Search failed:", error);
    }
  };

  const addUser = (profile: Profile) => {
    setSelectedUsers(prev => [...prev, profile]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    setIsSharing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user.id;

      // Create share records
      const shareInserts = selectedUsers.map(user => ({
        file_id: file.id,
        shared_with_user_id: user.id,
        shared_by_user_id: currentUserId!,
      }));

      const { error: shareError } = await supabase
        .from('file_shares')
        .insert(shareInserts);

      if (shareError) throw shareError;

      // Create notifications
      const notificationInserts = selectedUsers.map(user => ({
        recipient_id: user.id,
        sender_id: currentUserId!,
        type: 'file_shared',
        file_id: file.id,
        message: `shared "${file.filename}" with you`,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notificationInserts);

      if (notifError) console.error("Notification error:", notifError);

      toast.success(`File shared with ${selectedUsers.length} user(s)`);
      onClose();
    } catch (error: any) {
      toast.error("Failed to share file");
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Share "{file.filename}" with other users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter username to share with"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => addUser(profile)}
                  className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{profile.username}</p>
                  {profile.display_name && (
                    <p className="text-sm text-muted-foreground">{profile.display_name}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected users:</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="pl-3 pr-1">
                    {user.username}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => removeUser(user.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedUsers.length === 0 || isSharing}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {isSharing ? "Sharing..." : `Share with ${selectedUsers.length}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
