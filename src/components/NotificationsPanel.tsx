import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { FileText, X, FileIcon } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/dateUtils";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  read_status: boolean;
  created_at: string;
  sender_id: string;
  file_id: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
  };
  files?: {
    filename: string;
  };
}

export const NotificationsPanel = ({ open, onClose, userId }: NotificationsPanelProps) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, userId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data: notifData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(notifData?.map(n => n.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', senderIds);

      // Get file info
      const fileIds = [...new Set(notifData?.filter(n => n.file_id).map(n => n.file_id!) || [])];
      const { data: files } = await supabase
        .from('files')
        .select('id, filename')
        .in('id', fileIds);

      // Map profiles and files to notifications
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const fileMap = new Map(files?.map(f => [f.id, f]) || []);

      const enrichedNotifications = notifData?.map(n => ({
        ...n,
        profiles: profileMap.get(n.sender_id),
        files: n.file_id ? fileMap.get(n.file_id) : undefined,
      })) || [];

      setNotifications(enrichedNotifications as Notification[]);
    } catch (error: any) {
      toast.error("Failed to load notifications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_status: true } : n)
      );
    } catch (error: any) {
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read_status)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .in('id', unreadIds);

      if (error) throw error;
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_status: true }))
      );
      
      toast.success("Alle meldingen gemarkeerd als gelezen");
    } catch (error: any) {
      toast.error("Kon meldingen niet bijwerken");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_status) {
      await markAsRead(notification.id);
    }

    // Navigate to file preview if it's a file-related notification
    if (notification.file_id) {
      onClose();
      navigate(`/preview/${notification.file_id}`);
    }
  };

  const getFileIcon = (filename: string) => {
    if (!filename) return <FileIcon className="w-5 h-5 text-muted-foreground" />;
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5" style={{ color: 'hsl(var(--file-pdf))' }} />;
    } else if (ext === 'docx' || ext === 'doc') {
      return <FileText className="w-5 h-5" style={{ color: 'hsl(var(--file-word))' }} />;
    }
    return <FileIcon className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Meldingen</SheetTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={markAllAsRead}
              className="text-sm"
            >
              Wis alles
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-auto max-h-[calc(100vh-100px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Geen meldingen</p>
            </div>
          )}

          {!loading && notifications.map((notification) => (
            <div
              key={notification.id}
              className="space-y-3 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              {/* Sender and action */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-base flex-1">
                  <span className="font-medium">
                    {notification.profiles?.display_name || notification.profiles?.username}
                  </span>
                  {' '}heeft een bestand met u gedeeld.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 text-xs rounded-full bg-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  Wis
                </Button>
              </div>

              {/* File card */}
              {notification.files && (
                <div className="bg-secondary/30 rounded-xl p-4 flex items-center gap-3">
                  {getFileIcon(notification.files.filename)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {notification.files.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      0.20 MB
                    </p>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-sm text-muted-foreground">
                {formatRelativeDate(notification.created_at)}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
