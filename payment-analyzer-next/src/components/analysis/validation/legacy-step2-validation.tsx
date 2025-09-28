'use client';


interface LegacyStep2ValidationProps {
  readonly uploadedFiles: File[];
  readonly onAnalyzeWeek: () => void;
}

export function LegacyStep2Validation({
  uploadedFiles,
  onAnalyzeWeek
}: LegacyStep2ValidationProps) {

  return (
    <div className="legacy-step2">
      <div className="validate-section">
        <div className="validate-content">
          <div className="validate-header">
            <h2 className="validate-title">Validate Documents</h2>
            <p className="validate-subtitle">Review your uploaded documents before analysis</p>
          </div>

        <div className="validation-status" id="validationStatus">
          <div className="validation-card">
            <div className="validation-info">
              <h3>Document Review</h3>
              <p>Check that all documents are correctly identified and ready for analysis</p>
            </div>
          </div>
        </div>

        {/* Analysis Preview Section */}
        <div className="analysis-preview-section" id="analysisPreview">
          <div className="preview-header">
            <h3 className="preview-title">Analysis Preview</h3>
            <div className="validation-badge modern invalid">
              <span className="badge-icon">⚠️</span>
              <span className="badge-text">INCOMPLETE</span>
            </div>
          </div>

          <div className="preview-grid">
            <div className="preview-card">
              <div className="preview-card-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M7 13v4M11 10v7M15 7v10"/>
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
                <div className="preview-card-value">{uploadedFiles.filter(f => f.name.toLowerCase().includes('runsheet')).length}</div>
              </div>
            </div>
            <div className="preview-card">
              <div className="preview-card-icon">💰</div>
              <div className="preview-card-content">
                <div className="preview-card-label">Invoices</div>
                <div className="preview-card-value">{uploadedFiles.filter(f => f.name.toLowerCase().includes('invoice')).length}</div>
              </div>
            </div>
            <div className="preview-card">
              <div className="preview-card-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div className="preview-card-content">
                <div className="preview-card-label">Status</div>
                <div className="preview-card-value status-text">Missing invoices</div>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="files-section" id="filesSection">
          <div className="files-header">
            <h3 className="files-title">Uploaded Files</h3> 
            <div className="files-count" id="filesCount">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="file-list enhanced-file-list" id="fileList">
            {uploadedFiles.map((file) => {
              const fileSize = (file.size / 1024).toFixed(1);
              const fileType = file.name.toLowerCase().includes('runsheet') ? 'runsheet' : 'invoice';
              const fileTypeIcon = fileType === 'runsheet' ? '📦' : '💰';
              const fileTypeLabel = fileType === 'runsheet' ? 'Runsheet' : 'Invoice';

              return (
                <div key={`${file.name}-${file.size}`} className="file-item">
                  <div className="file-icon">
                    {fileTypeIcon}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                      <span className="file-size">{fileSize}KB</span>
                      <span className={`file-type-badge ${fileType}`}>
                        {fileTypeLabel}
                      </span>
                    </div>
                  </div>
                  <button className="file-remove" aria-label={`Remove ${file.name}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" aria-hidden="true">
                      <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="validation-actions">
          <button className="btn btn-primary" id="proceedToAnalysisBtn" onClick={onAnalyzeWeek}>
            <span className="btn-icon">🚀</span>
            <span className="btn-text">Proceed to Analysis</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}


