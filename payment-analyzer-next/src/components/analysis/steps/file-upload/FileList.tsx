/**
 * FileList - Display list of uploaded files with status
 * Matches legacy CSS classes: file-list, enhanced-file-list, file-item, file-name, file-size
 */

"use client";

import { AlertCircle, CheckCircle, File, FileText, Loader2, X } from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UploadedFile } from "@/hooks/use-file-upload";
import {
  type AnimatePresenceProps,
  loadFramerMotion,
  type MotionDivProps,
  StaticDiv,
  StaticPresence,
} from "@/lib/optimization/dynamic-motion";
import { formatFileSize } from "@/lib/utils";
import type { FileListProps } from "./types";

export function FileList({ files, onRemove, onClearAll, disabled, isProcessing }: FileListProps) {
  // Dynamic motion loading
  const [motionComponents, setMotionComponents] = useState<{
    MotionDiv: ComponentType<MotionDivProps>;
    AnimatePresence: ComponentType<AnimatePresenceProps>;
  }>({
    MotionDiv: StaticDiv,
    AnimatePresence: StaticPresence,
  });

  useEffect(() => {
    // Load framer-motion only when component mounts and files exist
    if (files.length > 0) {
      loadFramerMotion().then(({ motion, AnimatePresence }) => {
        setMotionComponents({
          MotionDiv: motion.div as ComponentType<MotionDivProps>,
          AnimatePresence,
        });
      });
    }
  }, [files.length]);

  const getFileIcon = (file: UploadedFile) => {
    switch (file.fileType) {
      case "runsheet":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "invoice":
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
        return (
          <Badge variant="info" size="sm">
            Uploading
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="info" size="sm">
            Processing
          </Badge>
        );
      case "success":
        return (
          <Badge variant="success" size="sm">
            Ready
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error" size="sm">
            Error
          </Badge>
        );
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <Card padding="none" className="file-list enhanced-file-list">
      {/* File list header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h4 className="files-title font-semibold text-slate-900">
          Uploaded Files ({files.length})
        </h4>
        {onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            disabled={disabled || isProcessing}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* File items container */}
      <div className="divide-y divide-slate-200">
        <motionComponents.AnimatePresence>
          {files.map((file) => (
            <motionComponents.MotionDiv
              key={file.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="file-item p-4 flex items-center space-x-3"
            >
              {/* File type icon */}
              <div className="file-icon-wrapper">{getFileIcon(file)}</div>

              {/* File info section */}
              <div className="file-info flex-1 min-w-0">
                <div className="file-details flex items-center space-x-2 mb-1">
                  <p className="file-name text-sm font-medium text-slate-900 truncate">
                    {file.file.name}
                  </p>
                  <div className="file-status">{getStatusBadge(file)}</div>
                </div>

                <div className="file-meta flex items-center space-x-2 text-xs text-slate-500">
                  <span className="file-size">{formatFileSize(file.file.size)}</span>
                  {file.fileType && (
                    <>
                      <span>•</span>
                      <span className="file-type capitalize">{file.fileType}</span>
                    </>
                  )}
                </div>

                {/* Progress bar for uploading files */}
                {(file.status === "uploading" || file.status === "processing") && (
                  <div className="mt-2">
                    <Progress value={file.progress} size="sm" animated />
                  </div>
                )}

                {/* Error message */}
                {file.error && <p className="text-xs text-red-600 mt-1">{file.error}</p>}
              </div>

              {/* Status icon and remove button */}
              <div className="flex items-center space-x-2">
                {getStatusIcon(file)}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                  disabled={disabled || isProcessing}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motionComponents.MotionDiv>
          ))}
        </motionComponents.AnimatePresence>
      </div>
    </Card>
  );
}
