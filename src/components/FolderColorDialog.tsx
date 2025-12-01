import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { toast } from "sonner";
import folderOrange from "@/assets/folder-orange.png";
import folderPink from "@/assets/folder-pink.png";
import folderRed from "@/assets/folder-red.png";
import folderBlue from "@/assets/folder-blue.png";
import folderGreen from "@/assets/folder-green.png";
import folderBlueDark from "@/assets/folder-blue-dark.png";
import folderYellow from "@/assets/folder-yellow.png";

interface FolderColorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folderId: string;
  currentColor: string;
}

const FOLDER_COLORS = [
  { name: "Oranje", color: "#ECA869", icon: folderOrange },
  { name: "Roze", color: "#E4B4E6", icon: folderPink },
  { name: "Rood", color: "#E86C6C", icon: folderRed },
  { name: "Blauw", color: "#7FABDB", icon: folderBlue },
  { name: "Groen", color: "#6BC497", icon: folderGreen },
  { name: "Donkerblauw", color: "#4B8FBA", icon: folderBlueDark },
  { name: "Geel", color: "#E8C547", icon: folderYellow },
];

export const FolderColorDialog = ({ 
  open, 
  onClose, 
  onSuccess, 
  folderId, 
  currentColor 
}: FolderColorDialogProps) => {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChangeColor = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ color: selectedColor })
        .eq('id', folderId);

      if (error) throw error;

      toast.success("Mapkleur gewijzigd");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Kon mapkleur niet wijzigen");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mapkleur Wijzigen</DialogTitle>
          <DialogDescription>
            Kies een nieuwe kleur voor deze map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mapkleur</Label>
            <div className="grid grid-cols-4 gap-3">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.color}
                  onClick={() => setSelectedColor(colorOption.color)}
                  className={`h-20 rounded-xl border-2 transition-all flex items-center justify-center bg-white ${
                    selectedColor === colorOption.color
                      ? "border-primary ring-2 ring-primary/20 scale-105"
                      : "border-border hover:border-primary/50"
                  }`}
                  title={colorOption.name}
                >
                  <img 
                    src={colorOption.icon} 
                    alt={colorOption.name}
                    className="w-12 h-10 object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleChangeColor}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? "Wijzigen..." : "Wijzigen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
