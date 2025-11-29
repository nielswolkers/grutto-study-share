import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FileText, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
      
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to update notifications");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const unreadCount = notifications.filter(n => !n.read_status).length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}

          {!loading && notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.read_status ? 'bg-card' : 'bg-accent/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="font-medium text-sm truncate">
                      {notification.profiles?.display_name || notification.profiles?.username}
                    </p>
                    {!notification.read_status && (
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  {notification.files && (
                    <p className="text-sm font-medium mt-1 truncate">
                      "{notification.files.filename}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!notification.read_status && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
