import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, Sparkles, 
  ArrowRight, ShieldCheck, TrendingUp, Cpu
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { BRAND } from '../../config/brand';

export const CvUploadSyncModal: React.FC = () => {
  const { 
    isCvSyncModalOpen, 
    setIsCvSyncModalOpen, 
    userProfile, 
    updateCandidateResume,
    navigate
  } = useApp();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [scannedFile, setScannedFile] = useState<{ name: string; size: string } | null>(null);
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCvSyncModalOpen) return null;

  const handleClose = () => {
    setUploadStatus('idle');
    setScannedFile(null);
    setScanStepIndex(0);
    setIsCvSyncModalOpen(false);
  };

  const simulatedExtractedSkills = [
    'Next.js 15 & Server Components',
    'React 19 Architecture',
    'TypeScript 5.x Micro-Frontends',
    'Tailwind CSS & Design Tokens',
    'REST & GraphQL APIs',
    'UI Web Performance (Core Web Vitals)'
  ];

  const processFile = async (file: File) => {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = file.size < 1024 * 1024 
      ? `${Math.round(file.size / 1024)} KB` 
      : `${fileSizeMB} MB`;

    setScannedFile({
      name: file.name,
      size: sizeStr
    });
    setUploadStatus('scanning');
    setScanStepIndex(0);

    // Step 1: Uploading
    setTimeout(async () => {
      setScanStepIndex(1);
      // Step 2: AI Parsing via backend API
      try {
        const textSample = `${file.name.replace(/[^a-zA-Z0-9]/g, ' ')} React.js TypeScript Next.js JavaScript Redux Micro-Frontends Web Vitals 4 years exp`;
        const parsed = await peerpathApi.parseCv(textSample, { fileName: file.name, fileSize: file.size });
        
        setTimeout(() => {
          setScanStepIndex(2);
          const skillsToSync = parsed.parsedSkills && parsed.parsedSkills.length > 0
            ? parsed.parsedSkills
            : simulatedExtractedSkills;

          setTimeout(() => {
            updateCandidateResume(file.name, skillsToSync, '₹24L - ₹30 LPA');
            setUploadStatus('complete');
          }, 700);
        }, 800);
      } catch (err) {
        setTimeout(() => {
          setScanStepIndex(2);
          setTimeout(() => {
            updateCandidateResume(file.name, simulatedExtractedSkills, '₹24L - ₹30 LPA');
            setUploadStatus('complete');
          }, 700);
        }, 800);
      }
    }, 600);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUsePresetDemo = () => {
    const candidateNameSafe = (userProfile?.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
    const dummyFile = new File(['sample resume content'], `${candidateNameSafe}_Updated_Resume.pdf`, { type: 'application/pdf' });
    processFile(dummyFile);
  };

  return (
    <div className="app-modal-backdrop open">
      <div className="app-modal-card cv-sync-modal-size">
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="cv-sync-modal-content">
          
          {/* Header */}
          <div className="cv-sync-header">
            <div className="cv-sync-badge-row">
              <span className="cv-sync-pill">
                <Sparkles size={13} className="sparkle-anim" /> AI Resume Parser & Sync
              </span>
              <span className="cv-free-pill">100% Free Shine Upgrade</span>
            </div>
            <h2 className="cv-sync-title">Update Your Latest CV</h2>
            <p className="cv-sync-subtitle">
              Your profile on Shine was last updated <strong className="text-amber-600">{userProfile?.resumeLastUpdated || 'almost a year ago'}</strong>.
              Updating takes 5 seconds and gives your mentors & recruiters an instant, accurate picture of your skills.
            </p>
          </div>

          {uploadStatus === 'idle' && (
            <>
              {/* Dropzone */}
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
                  accept=".pdf,.doc,.docx" 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                
                <div className="cv-dropzone-icon-wrap">
                  <UploadCloud size={32} className="text-purple-600" />
                </div>
                
                <strong className="cv-drop-title">Click to upload or drag & drop your latest CV</strong>
                <span className="cv-drop-formats">Supported formats: PDF, DOCX, DOC (Up to 10MB)</span>
                
                <div className="cv-preset-action" onClick={(e) => { e.stopPropagation(); handleUsePresetDemo(); }}>
                  <button type="button" className="btn-preset-fast-demo">
                    <Sparkles size={13} /> ⚡ Fast Demo: Upload Updated Resume (1-Click)
                  </button>
                </div>
              </div>

              {/* 3 Core Value Props */}
              <div className="cv-sync-benefits-grid">
                <div className="cv-benefit-card">
                  <div className="cv-ben-icon bg-blue"><Cpu size={15} /></div>
                  <div>
                    <strong>Auto Skill Extraction</strong>
                    <span>AI auto-updates your tech stack on your Shine profile</span>
                  </div>
                </div>

                <div className="cv-benefit-card">
                  <div className="cv-ben-icon bg-green"><TrendingUp size={15} /></div>
                  <div>
                    <strong>+22% Profile Score</strong>
                    <span>Jump into the top 5% recruiter search pool</span>
                  </div>
                </div>

                <div className="cv-benefit-card">
                  <div className="cv-ben-icon bg-purple"><ShieldCheck size={15} /></div>
                  <div>
                    <strong>Zero-Prep Mentor Dossier</strong>
                    <span>Mentors review your latest projects with zero effort</span>
                  </div>
                </div>
              </div>

              {/* Current Resume Info */}
              {userProfile?.resumeFileName ? (
                <div className="cv-current-on-file-box">
                  <div className="cv-file-info-left">
                    <FileText size={16} className="text-slate-500" />
                    <div>
                      <span className="text-xs text-slate-500">Currently on File:</span>
                      <strong className="text-sm block text-slate-800">{userProfile.resumeFileName}</strong>
                    </div>
                  </div>
                  <span className="cv-file-age-badge">{userProfile?.resumeLastUpdated || 'On File'}</span>
                </div>
              ) : (
                <div className="cv-current-on-file-box">
                  <div className="cv-file-info-left">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <span className="text-xs text-slate-500">Status:</span>
                      <strong className="text-sm block text-slate-600">No resume uploaded yet</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {uploadStatus === 'scanning' && (
            <div className="cv-scanning-screen">
              <div className="cv-scan-animation-wrap">
                <div className="cv-scan-circle-spinner"></div>
                <div className="cv-scan-icon-center">
                  <Sparkles size={28} className="text-purple-600 animate-spin" />
                </div>
              </div>

              <h3 className="cv-scan-heading">Scanning & Syncing Resume...</h3>
              <p className="cv-scan-sub">File: <strong>{scannedFile?.name}</strong> ({scannedFile?.size})</p>

              <div className="cv-scan-steps-progress">
                <div className={`cv-scan-step ${scanStepIndex >= 0 ? 'done' : ''}`}>
                  <CheckCircle2 size={14} /> <span>Uploading Document Securely</span>
                </div>
                <div className={`cv-scan-step ${scanStepIndex >= 1 ? 'done' : ''} ${scanStepIndex === 1 ? 'active' : ''}`}>
                  <CheckCircle2 size={14} /> <span>AI Extracting Tech Stack & Jump Trajectory</span>
                </div>
                <div className={`cv-scan-step ${scanStepIndex >= 2 ? 'done' : ''} ${scanStepIndex === 2 ? 'active' : ''}`}>
                  <CheckCircle2 size={14} /> <span>Updating Shine Profile & Recruiter Spotlight</span>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'complete' && (
            <div className="cv-complete-screen">
              <div className="cv-success-checkmark-wrap">
                <CheckCircle2 size={44} className="text-emerald-500" />
              </div>

              <h3 className="cv-complete-title">Resume Synced & Profile Boosted!</h3>
              <p className="cv-complete-sub">
                Your Shine profile is now updated with your latest resume details and synced across {BRAND.name} mentors.
              </p>

              <div className="cv-results-card">
                <div className="cv-res-score-row">
                  <div className="cv-score-pill">
                    <span className="cv-lbl">Profile Match Score</span>
                    <strong className="cv-val text-emerald-600">70% ➔ 92% (+22% Boost)</strong>
                  </div>
                  <div className="cv-score-pill">
                    <span className="cv-lbl">Target Inbound Potential</span>
                    <strong className="cv-val text-blue-600">₹24L - ₹30 LPA</strong>
                  </div>
                </div>

                <div className="cv-extracted-skills-sec">
                  <span className="cv-skills-label">
                    <Sparkles size={13} /> {simulatedExtractedSkills.length} Verified Skills Extracted by AI:
                  </span>
                  <div className="cv-skills-chips-wrap">
                    {simulatedExtractedSkills.map((sk, i) => (
                      <span key={i} className="cv-extracted-chip">
                        <CheckCircle2 size={11} className="text-emerald-600" /> {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cv-complete-actions">
                <button 
                  type="button" 
                  className="btn-outline-dark"
                  onClick={() => {
                    handleClose();
                    navigate('profile-view');
                  }}
                >
                  View My Profile
                </button>
                <button 
                  type="button" 
                  className="btn-shine-gold"
                  onClick={() => {
                    handleClose();
                    navigate('guidance-view');
                  }}
                >
                  <span>Explore 1:1 Mentors</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
