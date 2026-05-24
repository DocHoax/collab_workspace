import React, { useState, useRef } from "react";
import { 
  File, Upload, FileText, Download, Calendar, Trash2, ShieldCheck, 
  ArrowUp, Folder, Video, ImageIcon, FileCode, CheckCircle, AlertTriangle
} from "lucide-react";
import { ProjectFile, User } from "../types";

interface FileWorkspaceProps {
  files: ProjectFile[];
  users: User[];
  activeUser: User;
  onUploadFile: (name: string, type: string, size: string, data: string) => void;
}

export default function FileWorkspace({
  files,
  users,
  activeUser,
  onUploadFile
}: FileWorkspaceProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploaderName = (uploaderId: string) => {
    return users.find(u => u.id === uploaderId)?.name || "Academic Contributor";
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
        return <FileText className="w-8 h-8 text-rose-500" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return <ImageIcon className="w-8 h-8 text-emerald-500" />;
      case "xlsx":
      case "csv":
        return <FileText className="w-8 h-8 text-teal-500" />;
      case "js":
      case "ts":
      case "tsx":
      case "json":
      case "html":
      case "css":
        return <FileCode className="w-8 h-8 text-amber-500" />;
      default:
        return <File className="w-8 h-8 text-indigo-500" />;
    }
  };

  // Process selected file
  const processFile = (file: File) => {
    if (!file) return;
    
    setUploadProgress("Reading asset byte structures...");
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setUploadProgress("Uploading file chunk securely to Express backend...");
        
        // Timeout to simulate polished UI response
        setTimeout(() => {
          onUploadFile(
            file.name,
            file.type || "file",
            `${(file.size / 1024).toFixed(1)} KB`,
            result
          );
          setUploadProgress(null);
        }, 1000);
      }
    };

    reader.onerror = () => {
      setUploadProgress(null);
      alert("Error reading file");
    };

    reader.readAsDataURL(file);
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div id="file-sharing-manager" className="space-y-4">
      {/* Target Upload Zone */}
      <div 
        id="file-dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive 
            ? "border-blue-500 bg-blue-50/50 scale-[1.01]" 
            : "border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/80"
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-xs">
            <Upload className={`w-5 h-5 text-blue-600 ${isDragActive ? "animate-bounce" : ""}`} />
          </div>
          
          <div>
            <h3 className="font-semibold text-xs text-slate-700">
              Drag & drop team deliverables here
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports thesis chapters, design specification PDFs, diagrams, or code templates. Click to select manually.
            </p>
          </div>

          {uploadProgress && (
            <div className="w-full bg-blue-100/50 rounded-full h-1.5 overflow-hidden animate-pulse">
              <div className="bg-blue-600 h-full w-2/3 rounded-full" />
            </div>
          )}

          {uploadProgress && (
            <span className="text-[9px] font-bold text-blue-600 animate-pulse block">
              {uploadProgress}
            </span>
          )}
        </div>
      </div>

      {/* Files directory list */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-500" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Sprint Artifact Repository</h4>
              <span className="text-[9px] text-slate-400 block font-medium mt-0.5">Shared documents available to your supervisor & team</span>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-bold bg-white border border-slate-100 px-2 py-0.5 rounded-full scale-90">
            {files.length} Shared Files
          </span>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <h5 className="text-xs font-bold text-slate-500">No project artifacts shared</h5>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Upload thesis files or design wireframe mockups to save details into this workspace.</p>
          </div>
        ) : (
          <div id="file-list" className="divide-y divide-slate-100">
            {files.map((file) => (
              <div 
                key={file.id} 
                id={`file-row-${file.id}`}
                className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getFileIcon(file.name)}
                  
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-800 max-w-sm sm:max-w-md md:max-w-lg truncate" title={file.name}>
                      {file.name}
                    </h5>
                    
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 font-medium">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">{file.size}</span>
                      <span className="flex items-center gap-0.5">
                        Uploaded by <b className="text-slate-600">{getUploaderName(file.uploaderId)}</b>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3 text-slate-300" /> {new Date(file.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <a 
                    href={file.url} 
                    download={file.name}
                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
