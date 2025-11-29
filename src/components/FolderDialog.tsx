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
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface FolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const FOLDER_COLORS = [
  { name: "Mint", color: "#B8E6D5" },
  { name: "Lavender", color: "#E4D4F4" },
  { name: "Peach", color: "#FFD4C2" },
  { name: "Sky", color: "#C2E0FF" },
  { name: "Lemon", color: "#FFF4B8" },
  { name: "Rose", color: "#FFD4E5" },
  { name: "Sage", color: "#D4E8D4" },
  { name: "Coral", color: "#FFB8C2" },
];

export const FolderDialog = ({ open, onClose, onSuccess, userId }: FolderDialogProps) => {
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].color);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          name: folderName.trim(),
          color: selectedColor,
          owner_id: userId,
        });

      if (error) throw error;

      toast.success("Folder created successfully");
      setFolderName("");
      setSelectedColor(FOLDER_COLORS[0].color);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to create folder");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Organize your files with custom folders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Folder Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.color}
                  onClick={() => setSelectedColor(colorOption.color)}
                  className={`h-12 rounded-lg transition-all ${
                    selectedColor === colorOption.color
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption.color }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!folderName.trim() || isCreating}
              className="flex-1"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              {isCreating ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
