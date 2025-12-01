import { useState } from "react";
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
import { Label } from "./ui/label";
import { toast } from "sonner";

interface FolderRenameDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folderId: string;
  currentName: string;
}

export const FolderRenameDialog = ({ 
  open, 
  onClose, 
  onSuccess, 
  folderId, 
  currentName 
}: FolderRenameDialogProps) => {
  const [folderName, setFolderName] = useState(currentName);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRename = async () => {
    if (!folderName.trim()) {
      toast.error("Voer een mapnaam in");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: folderName.trim() })
        .eq('id', folderId);

      if (error) throw error;

      toast.success("Map hernoemd");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Kon map niet hernoemen");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Map Hernoemen</DialogTitle>
          <DialogDescription>
            Wijzig de naam van deze map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Mapnaam</Label>
            <Input
              id="folder-name"
              placeholder="Voer mapnaam in"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleRename}
              disabled={!folderName.trim() || isUpdating}
              className="flex-1"
            >
              {isUpdating ? "Hernoemen..." : "Hernoemen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
