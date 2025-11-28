import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Upload, File, X, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  userId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('word')) return <FileText className="w-8 h-8 text-file-word" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="w-8 h-8 text-file-excel" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileSpreadsheet className="w-8 h-8 text-file-powerpoint" />;
  if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-file-pdf" />;
  return <File className="w-8 h-8 text-muted-foreground" />;
};

export const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Filter for supported file types
    const supportedFiles = acceptedFiles.filter(file => {
      const type = file.type;
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      return validTypes.includes(type) && file.size <= 50 * 1024 * 1024; // 50MB
    });

    if (supportedFiles.length !== acceptedFiles.length) {
      toast.error("Some files were rejected. Only PDF, Word, PowerPoint, and Excel files under 50MB are supported.");
    }

    // Initialize upload tracking
    const newUploads = supportedFiles.map(file => ({
      file,
      progress: 0,
    }));
    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload each file
    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${file.name}`;

      try {
        // Start progress animation
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev =>
            prev.map(uf =>
              uf.file === file && uf.progress < 90
                ? { ...uf, progress: uf.progress + 10 }
                : uf
            )
          );
        }, 200);

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-files')
          .upload(fileName, file);

        clearInterval(progressInterval);
        
        // Set to 100%
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, progress: 100 } : uf
          )
        );

        if (uploadError) throw uploadError;

        // Create file record in database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            owner_id: userId,
            filename: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_url: fileName,
          });

        if (dbError) throw dbError;

        // Remove from uploading list
        setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
      } catch (error: any) {
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, error: error.message } : uf
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Call completion callback
    if (supportedFiles.length > 0) {
      onUploadComplete();
    }
  }, [userId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, Word, PowerPoint, Excel • Max 50MB per file
            </p>
          </>
        )}
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf, index) => (
            <div key={index} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-3 mb-2">
                {getFileIcon(uf.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uf.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUploadingFile(uf.file)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {uf.error ? (
                <p className="text-sm text-destructive">{uf.error}</p>
              ) : (
                <Progress value={uf.progress} className="h-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
