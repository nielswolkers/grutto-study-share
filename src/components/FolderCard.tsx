import { useState } from "react";
import { Folder, MoreVertical, Edit2, Trash2, Copy, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import folderOrange from "@/assets/folder-orange.png";
import folderPink from "@/assets/folder-pink.png";
import folderRed from "@/assets/folder-red.png";
import folderBlue from "@/assets/folder-blue.png";
import folderGreen from "@/assets/folder-green.png";
import folderBlueDark from "@/assets/folder-blue-dark.png";
import folderYellow from "@/assets/folder-yellow.png";

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    color: string;
    owner_id: string;
  };
  fileCount: number;
  onUpdate: () => void;
}

// Map colors to folder icon images
const FOLDER_ICON_MAP: Record<string, string> = {
  "#ECA869": folderOrange,
  "#E4B4E6": folderPink, 
  "#E86C6C": folderRed,
  "#7FABDB": folderBlue,
  "#6BC497": folderGreen,
  "#4B8FBA": folderBlueDark,
  "#E8C547": folderYellow,
};

export const FolderCard = ({ folder, fileCount, onUpdate }: FolderCardProps) => {
  const navigate = useNavigate();

  const getFolderIcon = (color: string) => {
    return FOLDER_ICON_MAP[color] || folderGreen;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Map "${folder.name}" verwijderen?`)) return;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;

      toast.success("Map verwijderd");
      onUpdate();
    } catch (error: any) {
      toast.error("Kon map niet verwijderen");
      console.error(error);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const fileId = e.dataTransfer.getData('application/grutto-file-id');
    const draggedFolderId = e.dataTransfer.getData('application/grutto-folder-id');

    try {
      if (fileId) {
        const { error } = await supabase
          .from('files')
          .update({ folder_id: folder.id })
          .eq('id', fileId);

        if (error) throw error;
        toast.success('Bestand verplaatst naar map');
      } else if (draggedFolderId && draggedFolderId !== folder.id) {
        const { error } = await supabase
          .from('folders')
          .update({ parent_folder_id: folder.id })
          .eq('id', draggedFolderId);

        if (error) throw error;
        toast.success('Map verplaatst naar map');
      }

      onUpdate();
    } catch (error: any) {
      toast.error('Kon item niet verplaatsen');
      console.error(error);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/grutto-folder-id', folder.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="group relative bg-card rounded-3xl p-6 shadow-md border border-border/60 cursor-pointer transition-all hover:shadow-lg"
      onClick={() => navigate(`/folder/${folder.id}`)}
    >
      {/* Three dots menu - appears on hover */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-secondary/80 hover:bg-secondary"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toast.info('Naam wijzigen komt binnenkort');
            }} className="rounded-xl py-3">
              <Edit2 className="w-4 h-4 mr-2" />
              Naam wijzigen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toast.info('Kleur wijzigen komt binnenkort');
            }} className="rounded-xl py-3">
              <Folder className="w-4 h-4 mr-2" />
              Kleur wijzigen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toast.info('Map delen komt binnenkort');
            }} className="rounded-xl py-3">
              <Folder className="w-4 h-4 mr-2" />
              Deel map
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toast.info('Kopiëren komt binnenkort');
            }} className="rounded-xl py-3">
              <Copy className="w-4 h-4 mr-2" />
              Kopiëren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toast.info('Downloaden komt binnenkort');
            }} className="rounded-xl py-3">
              <Download className="w-4 h-4 mr-2" />
              Download als ZIP
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive rounded-xl py-3"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder Icon */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-20">
          <img 
            src={getFolderIcon(folder.color)} 
            alt={folder.name}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center w-full">
          <p className="font-medium text-base truncate">{folder.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {fileCount} bestand{fileCount !== 1 ? 'en' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
