import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Loader2, ShieldCheck, Cpu, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { formatResumeAge, hasResume } from '../../utils/resume';

/**
 * Resume upload. The server stores the file and reads it; the profile form then opens
 * pre-filled with what was found, for the user to review and save.
 */
export const CvUploadSyncModal: React.FC = () => {
  const {
    isCvSyncModalOpen,
    setIsCvSyncModalOpen,
    setIsUpdateProfileModalOpen,
    setResumeExtract,
    uploadResume,
    userProfile
  } = useApp();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCvSyncModalOpen) return null;

  const handleClose = () => {
    if (uploadingName) return;
    setIsCvSyncModalOpen(false);
  };

  const processFile = async (file: File) => {
    setUploadingName(file.name);
    const result = await uploadResume(file);
    setUploadingName(null);
    if (!result) return;
    setResumeExtract(result);
    setIsCvSyncModalOpen(false);
    setIsUpdateProfileModalOpen(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processFile(file);
  };

  return (
    <div className="app-modal-backdrop open">
      <div className="app-modal-card cv-sync-modal-size">
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal" disabled={Boolean(uploadingName)}>
          <X size={18} />
        </button>

        <div className="cv-sync-modal-content">
          <div className="cv-sync-header">
            <h2 className="cv-sync-title">{hasResume(userProfile) ? 'Update Your Resume' : 'Upload Your Resume'}</h2>
            <p className="cv-sync-subtitle">
              {hasResume(userProfile) && formatResumeAge(userProfile)
                ? <>Your resume was last uploaded <strong className="text-amber-600">{formatResumeAge(userProfile)}</strong>. </>
                : <>You haven't uploaded a resume yet. </>}
              We'll fill your profile from it, and you can check everything before saving.
            </p>
          </div>

          {uploadingName ? (
            <div className="cv-dropzone">
              <div className="cv-dropzone-icon-wrap">
                <Loader2 size={32} className="text-purple-600 animate-spin" />
              </div>
              <strong className="cv-drop-title">Uploading and reading {uploadingName}…</strong>
              <span className="cv-drop-formats">This usually takes a few seconds.</span>
            </div>
          ) : (
            <div
              className={`cv-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="cv-dropzone-icon-wrap">
                <UploadCloud size={32} className="text-purple-600" />
              </div>
              <strong className="cv-drop-title">Click to upload or drag & drop your resume</strong>
              <span className="cv-drop-formats">PDF, DOCX or TXT, up to 5 MB</span>
            </div>
          )}

          <div className="cv-sync-benefits-grid">
            <div className="cv-benefit-card">
              <div className="cv-ben-icon bg-blue"><Cpu size={15} /></div>
              <div>
                <strong>Profile auto-fill</strong>
                <span>Name, experience, current role, salary, education and skills are read from your resume</span>
              </div>
            </div>
            <div className="cv-benefit-card">
              <div className="cv-ben-icon bg-purple"><ShieldCheck size={15} /></div>
              <div>
                <strong>Private</strong>
                <span>Only you and the mentors you book can download it</span>
              </div>
            </div>
          </div>

          {hasResume(userProfile) && !uploadingName && (
            <a className="cv-drop-formats" href={peerpathApi.ownResumeUrl()} target="_blank" rel="noreferrer">
              <FileText size={13} /> {userProfile.resumeFileName} <Download size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
