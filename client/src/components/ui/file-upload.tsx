import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  className?: string;
  accept?: string;
  maxSize?: number; // In bytes
  onUploadComplete: (file: any) => void;
  fileType: "video" | "audio" | "image" | "text";
}

export function FileUpload({
  className,
  accept = "*/*",
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUploadComplete,
  fileType
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFile = async (file: File) => {
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          
          const response = await apiRequest("POST", "/api/upload", undefined, {
            method: "POST",
            headers: {
              "Content-Type": file.type,
              "X-File-Name": file.name,
              "X-File-Type": fileType
            },
            body: arrayBuffer,
          });
          
          const asset = await response.json();
          onUploadComplete(asset);
          
          toast({
            title: "Upload complete",
            description: `${file.name} has been uploaded successfully`,
          });
        } catch (error) {
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Failed to upload file",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getFileTypeInfo = () => {
    switch (fileType) {
      case "video":
        return {
          icon: "ri-movie-line",
          text: "video files",
          supportText: "Support: MP4, WebM (max 50MB)"
        };
      case "audio":
        return {
          icon: "ri-music-line",
          text: "audio files",
          supportText: "Support: MP3, WAV (max 50MB)"
        };
      case "image":
        return {
          icon: "ri-image-line",
          text: "image files",
          supportText: "Support: JPG, PNG, SVG (max 10MB)"
        };
      case "text":
        return {
          icon: "ri-file-text-line",
          text: "text files",
          supportText: "Support: TXT, JSON (max 1MB)"
        };
    }
  };

  const info = getFileTypeInfo();

  return (
    <div
      className={cn(
        "upload-drop-area rounded-lg py-8 px-4 text-center border-2 border-dashed border-secondary/50 transition-all duration-200",
        isDragging ? "border-primary bg-primary/10" : "hover:border-secondary hover:bg-secondary/5",
        isUploading ? "opacity-70 pointer-events-none" : "",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <i className={`${info.icon} text-3xl text-secondary mb-2`}></i>
      {isUploading ? (
        <div className="flex flex-col items-center">
          <p className="text-sm mb-2">Uploading file...</p>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <p className="text-sm mb-2">Drag and drop {info.text} here</p>
          <p className="text-xs text-foreground/50">{info.supportText}</p>
          <button
            type="button"
            className="mt-3 bg-secondary/20 text-secondary hover:bg-secondary/30 text-sm px-4 py-1.5 rounded transition-colors"
            onClick={handleBrowseClick}
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileInputChange}
          />
        </>
      )}
    </div>
  );
}
