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
  { name: "Oranje", color: "#ECA869" },
  { name: "Roze", color: "#E4B4E6" },
  { name: "Rood", color: "#E86C6C" },
  { name: "Blauw", color: "#7FABDB" },
  { name: "Groen", color: "#6BC497" },
  { name: "Donkerblauw", color: "#4B8FBA" },
  { name: "Geel", color: "#E8C547" },
];

export const FolderDialog = ({ open, onClose, onSuccess, userId }: FolderDialogProps) => {
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].color);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error("Voer een mapnaam in");
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

      toast.success("Map aangemaakt");
      setFolderName("");
      setSelectedColor(FOLDER_COLORS[0].color);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Kon map niet aanmaken");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe Map Aanmaken</DialogTitle>
          <DialogDescription>
            Organiseer je bestanden met aangepaste mappen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Mapnaam</Label>
            <Input
              id="folder-name"
              placeholder="Voer mapnaam in"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Mapkleur</Label>
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
              Annuleren
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!folderName.trim() || isCreating}
              className="flex-1"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              {isCreating ? "Aanmaken..." : "Map Aanmaken"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
