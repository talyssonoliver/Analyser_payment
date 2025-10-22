"use client";

import "@/styles/legacy.css";
import { FileUpdateMarker } from "@/components/analysis/validation/file-update-marker";
import { useFileUpdateDetection } from "@/hooks/use-file-update-detection";

interface LegacyStep2ValidationProps {
  readonly uploadedFiles: File[];
  readonly validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  readonly onAnalyzeWeek: () => void;
  readonly onFileRemove?: (fileName: string, fileSize: number) => void;
}

export function LegacyStep2Validation({
  uploadedFiles,
  validationResult,
  onAnalyzeWeek,
  onFileRemove,
}: LegacyStep2ValidationProps) {
  // Use file update detection hook
  const { fileUpdateFlags, isLoading: isDetectingUpdates } = useFileUpdateDetection(uploadedFiles);

  // Helper to generate file key matching the hook
  const generateFileKey = (file: File): string => {
    return `${file.name}-${file.size}`;
  };

  // Detect file type based on filename patterns (matching the logic from use-file-upload.ts)
  const detectFileType = (filename: string): "runsheet" | "invoice" | "unknown" => {
    const lowerName = filename.toLowerCase();
    if (
      lowerName.includes("runsheet") ||
      lowerName.includes("run_sheet") ||
      lowerName.includes("run-sheet")
    ) {
      return "runsheet";
    }
    if (lowerName.includes("invoice") || lowerName.includes("bill") || lowerName.includes("dv_")) {
      return "invoice";
    }
    return "unknown";
  };

  // Determine validation status
  const getValidationStatus = () => {
    if (!validationResult) return "Not validated";
    if (!validationResult.isValid) return "Invalid";
    if (validationResult.warnings.length > 0) {
      // Check for specific warning types
      const hasNoRunsheet = validationResult.warnings.some((w) => w.includes("No runsheet files"));
      const hasNoInvoice = validationResult.warnings.some((w) => w.includes("No invoice files"));
      if (hasNoRunsheet) return "Missing runsheets";
      if (hasNoInvoice) return "Missing invoices";
      return "Has warnings";
    }
    return "Valid";
  };

  const getStatusColor = () => {
    if (!validationResult?.isValid) return "text-red-600";
    if (validationResult.warnings.length > 0) return "text-amber-600";
    return "text-green-600";
  };

  const getBadgeStatus = () => {
    if (!validationResult?.isValid) return "INVALID";
    if (validationResult.warnings.length > 0) return "INCOMPLETE";
    return "READY";
  };

  const getBadgeClass = () => {
    if (!validationResult?.isValid) return "invalid";
    if (validationResult.warnings.length > 0) return "invalid"; // Use 'invalid' for incomplete status (amber color)
    return "valid";
  };

  const getBadgeIcon = () => {
    if (!validationResult?.isValid) return "❌";
    if (validationResult.warnings.length > 0) return "⚠️";
    return "✅";
  };

  return (
    <div className="legacy-step2 w-full max-w-4xl mx-auto">
      <div className="validate-section">
        <div className="validate-content">
          <div className="validation-status">
            <div className="validation-card">
              <div className="validation-info">
                <h3>Document Review</h3>
                <p>Check that all documents are correctly identified and ready for analysis</p>
              </div>
            </div>
          </div>

          {/* Analysis Preview Section */}
          <div className="analysis-preview-section">
            <div className="preview-header">
              <h3 className="preview-title">Analysis Preview</h3>
              <div className={`validation-badge modern ${getBadgeClass()}`}>
                <span className="badge-icon">{getBadgeIcon()}</span>
                <span className="badge-text">{getBadgeStatus()}</span>
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-card">
                <div className="preview-card-icon">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 13v4M11 10v7M15 7v10" />
                  </svg>
                </div>
                <div className="preview-card-content">
                  <div className="preview-card-label">Total Files</div>
                  <div className="preview-card-value">{uploadedFiles.length}</div>
                </div>
              </div>
              <div className="preview-card">
                <div className="preview-card-icon">📦</div>
                <div className="preview-card-content">
                  <div className="preview-card-label">Runsheets</div>
                  <div className="preview-card-value">
                    {uploadedFiles.filter((f) => detectFileType(f.name) === "runsheet").length}
                  </div>
                </div>
              </div>
              <div className="preview-card">
                <div className="preview-card-icon">💰</div>
                <div className="preview-card-content">
                  <div className="preview-card-label">Invoices</div>
                  <div className="preview-card-value">
                    {uploadedFiles.filter((f) => detectFileType(f.name) === "invoice").length}
                  </div>
                </div>
              </div>
              <div className="preview-card">
                <div className="preview-card-icon">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <div className="preview-card-content">
                  <div className="preview-card-label">Status</div>
                  <div className={`preview-card-value status-text ${getStatusColor()}`}>
                    {getValidationStatus()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="files-section">
            <div className="files-header">
              <h3 className="files-title">Uploaded Files</h3>
              <div className="files-count">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="file-list enhanced-file-list">
              {uploadedFiles.map((file) => {
                const fileSize = (file.size / 1024).toFixed(1);
                const fileType = detectFileType(file.name);
                const fileKey = generateFileKey(file);
                const updateFlag = fileUpdateFlags[fileKey];

                let fileTypeIcon = "📄";
                let fileTypeLabel = "Unknown";

                if (fileType === "runsheet") {
                  fileTypeIcon = "📦";
                  fileTypeLabel = "Runsheet";
                } else if (fileType === "invoice") {
                  fileTypeIcon = "💰";
                  fileTypeLabel = "Invoice";
                }

                return (
                  <div key={`${file.name}-${file.size}`} className="file-item">
                    <div className="file-icon">{fileTypeIcon}</div>
                    <div className="file-info">
                      <div className="flex items-center gap-2">
                        <div className="file-name">{file.name}</div>
                        {!isDetectingUpdates && updateFlag?.isUpdated && (
                          <FileUpdateMarker
                            isUpdated={true}
                            changeType={updateFlag.changeType}
                            lastProcessed={updateFlag.lastProcessed}
                          />
                        )}
                      </div>
                      <div className="file-details">
                        <span className="file-size">{fileSize}KB</span>
                        <span className={`file-type-badge ${fileType}`}>{fileTypeLabel}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="file-remove"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => onFileRemove?.(file.name, file.size)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        stroke="currentColor"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="validation-actions">
            <button className="btn btn-primary" onClick={onAnalyzeWeek} type="button">
              <span className="btn-icon">🚀</span>
              <span className="btn-text">Proceed to Analysis</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
