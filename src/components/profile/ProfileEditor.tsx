import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, FileText, ArrowRight, Download, Upload, ChevronDown, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { ResumeUploadResult, UserProfileData } from '../../types';
import { formatResumeAge, hasResume } from '../../utils/resume';
import { parseNameAndRole } from '../../utils/profile';

type JobSearch = 'Actively Looking' | 'Casually Exploring' | 'Not Looking';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  location: string;
  totalExperienceYears: string;
  totalExperienceMonths: string;
  designation: string;
  currentCompany: string;
  currentlyNotWorking: boolean;
  noticePeriod: string;
  currentCtcLpa: string;
  expectedCtcLpa: string;
  summary: string;
  educationDegree: string;
  educationCollege: string;
  graduationYear: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  jobSearchStatus: JobSearch;
}

const NOTICE_OPTIONS = ['Immediate', '15 days', '30 days', '60 days', '90 days', 'More than 90 days'];
const DEGREE_OPTIONS = ['PhD', 'M.Tech', 'M.E.', 'MBA', 'MCA', 'M.Sc', 'M.Com', 'M.A.', 'B.Tech', 'B.E.', 'BCA', 'B.Sc', 'B.Com', 'BBA', 'B.A.', 'Diploma'];

const num = (v?: number | null) => (v === null || v === undefined ? '' : String(v));

const formFromProfile = (p: UserProfileData, fallbackMobile?: string): ProfileForm => {
  const { cleanName, role } = parseNameAndRole(p.name, p.designation);
  const [first, ...rest] = (cleanName || '').trim().split(/\s+/);
  return {
    firstName: p.firstName ? parseNameAndRole(p.firstName).cleanName : (first ?? ''),
    lastName: p.lastName ? parseNameAndRole(p.lastName).cleanName : rest.join(' '),
    phone: p.phone || fallbackMobile || '',
    dateOfBirth: p.dateOfBirth || '',
    location: p.location || '',
    totalExperienceYears: num(p.totalExperienceYears),
    totalExperienceMonths: num(p.totalExperienceMonths),
    designation: p.designation || role || '',
    currentCompany: p.currentlyNotWorking ? '' : (p.currentCompany || ''),
    currentlyNotWorking: Boolean(p.currentlyNotWorking),
    noticePeriod: p.noticePeriod || '',
    currentCtcLpa: num(p.currentCtcLpa),
    expectedCtcLpa: num(p.expectedCtcLpa),
    summary: p.summary || '',
    educationDegree: p.educationDegree || '',
    educationCollege: p.educationCollege || '',
    graduationYear: num(p.graduationYear),
    linkedinUrl: p.linkedinUrl || '',
    githubUrl: p.githubUrl || '',
    portfolioUrl: p.portfolioUrl || '',
    jobSearchStatus: p.jobSearchStatus?.startsWith('Casually') ? 'Casually Exploring'
      : p.jobSearchStatus?.startsWith('Not') ? 'Not Looking' : 'Actively Looking'
  };
};

const ageFrom = (dob: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};

interface ProfileEditorProps {
  // Called after a successful save
  onSaved: () => void;
  submitLabel: string;
  // Optional left side of the footer (e.g. the checkout amount)
  footerSummary?: React.ReactNode;
  // Reports uploading/saving so the parent can block closing meanwhile
  onBusyChange?: (busy: boolean) => void;
  // Optional skip / cancel callback
  onSkip?: () => void;
  skipLabel?: string;
}

/**
 * Profile form used by registration (/register) and "Edit Profile". Uploading a resume fills
 * the fields it could read (marked "from resume"); nothing is saved until the user clicks Save.
 * Required: first name, mobile number, current city, total experience, current role (or not working), key skills.
 * Optional fields are collapsed by default with an incentive banner, auto-populated from resume without data loss.
 */
export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  onSaved,
  submitLabel,
  footerSummary,
  onBusyChange,
  onSkip,
  skipLabel
}) => {
  const {
    userProfile,
    updateFullProfile,
    uploadResume,
    resumeExtract,
    setResumeExtract,
    currentUser
  } = useApp();

  const [form, setForm] = useState<ProfileForm>(() => formFromProfile(userProfile, currentUser?.id && /^\d{10}$/.test(currentUser.id) ? currentUser.id : undefined));
  const [skills, setSkills] = useState<string[]>(userProfile.skills || []);
  const [newSkill, setNewSkill] = useState<string>('');
  const [fromResume, setFromResume] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isOptionalOpen, setIsOptionalOpen] = useState<boolean>(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const applyResume = (result: ResumeUploadResult) => {
    const ex = result.extracted || {};
    const updates: Partial<ProfileForm> = {};
    const filled = new Set<string>();
    const put = (key: keyof ProfileForm, value: unknown) => {
      if (value === undefined || value === null || value === '') return;
      (updates as Record<string, unknown>)[key] = String(value);
      filled.add(key);
    };
    let detectedFirst = ex.firstName;
    let detectedLast = ex.lastName;
    let detectedRole = ex.currentDesignation;

    if (detectedFirst) {
      const parsedFirst = parseNameAndRole(detectedFirst, detectedRole);
      detectedFirst = parsedFirst.cleanName;
      if (!detectedRole && parsedFirst.role) detectedRole = parsedFirst.role;
    }
    if (detectedLast) {
      const parsedLast = parseNameAndRole(detectedLast, detectedRole);
      detectedLast = parsedLast.cleanName;
      if (!detectedRole && parsedLast.role) detectedRole = parsedLast.role;
    }

    put('firstName', detectedFirst);
    put('lastName', detectedLast);
    put('phone', ex.phone);
    put('dateOfBirth', ex.dateOfBirth);
    put('location', ex.location);
    put('totalExperienceYears', ex.totalExperienceYears);
    put('totalExperienceMonths', ex.totalExperienceYears !== undefined ? (ex.totalExperienceMonths ?? 0) : undefined);
    put('designation', detectedRole);
    put('currentCompany', ex.currentCompany);
    put('noticePeriod', ex.noticePeriod);
    put('currentCtcLpa', ex.currentCtcLpa);
    put('expectedCtcLpa', ex.expectedCtcLpa);
    put('summary', ex.summary);
    put('educationDegree', ex.highestQualification);
    put('educationCollege', ex.educationCollege);
    put('graduationYear', ex.graduationYear);
    put('linkedinUrl', ex.linkedinUrl);
    put('githubUrl', ex.githubUrl);
    if (filled.has('currentCompany') || filled.has('designation')) {
      updates.currentlyNotWorking = false;
    } else {
      updates.currentlyNotWorking = true;
    }

    setForm(prev => ({ ...prev, ...updates }));
    if (ex.skills?.length) {
      setSkills(prev => Array.from(new Set([...prev, ...ex.skills!])).slice(0, 25));
      filled.add('skills');
    }
    setFromResume(filled);

    if (!result.textFound) {
      setBanner({ kind: 'warning', text: "Resume saved, but we couldn't read text from it (it may be a scanned image). Please fill in your details below." });
    } else if (filled.size === 0) {
      setBanner({ kind: 'warning', text: "Resume saved. We couldn't find profile details in it, so please fill them in below." });
    } else {
      setBanner({ kind: 'success', text: `We filled ${filled.size} field${filled.size === 1 ? '' : 's'} from your resume. Check below and save.` });
    }
  };

  // Apply a resume uploaded from the CV modal, if any (the editor mounts fresh each time it's shown)
  useEffect(() => {
    if (resumeExtract) {
      applyResume(resumeExtract);
      setResumeExtract(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onBusyChange?.(isUploading || isSaving);
  }, [isUploading, isSaving]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFromResume(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadFileName(file.name);
    setIsUploading(true);
    setBanner(null);
    setErrorMessage('');
    const result = await uploadResume(file);
    setIsUploading(false);
    setUploadFileName('');
    if (result) applyResume(result);
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    if (skills.length >= 25) {
      setErrorMessage('You can add up to 25 skills');
      return;
    }
    if (!skills.some(s => s.toLowerCase() === skill.toLowerCase())) setSkills(prev => [...prev, skill]);
    setNewSkill('');
  };

  const toNumber = (value: string): number | null => (value.trim() === '' ? null : Number(value));
  const toUrl = (value: string): string => {
    const v = value.trim();
    return !v || /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  const optionalFilledCount = [
    form.dateOfBirth,
    form.noticePeriod,
    form.currentCtcLpa,
    form.expectedCtcLpa,
    form.summary,
    form.educationDegree,
    form.educationCollege,
    form.graduationYear,
    form.linkedinUrl,
    form.githubUrl,
    form.portfolioUrl,
  ].filter(v => typeof v === 'string' && v.trim().length > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If designation and currentCompany are both empty and user hasn't checked currentlyNotWorking:
    // Auto-detect currentlyNotWorking = true so freshers, students, and between-jobs candidates are NEVER blocked!
    const isWorkingEmpty = !form.designation.trim() && !form.currentCompany.trim();
    const effectiveNotWorking = form.currentlyNotWorking || isWorkingEmpty;

    // Graceful fallbacks so Save & Continue always succeeds
    const firstName = form.firstName.trim() || userProfile.firstName || currentUser?.name?.split(' ')[0] || 'User';
    const location = form.location.trim() || userProfile.location || 'Remote / Flexible';
    const expYearsStr = form.totalExperienceYears.trim() === '' ? '0' : form.totalExperienceYears;
    const years = toNumber(expYearsStr) ?? 0;
    const months = toNumber(form.totalExperienceMonths) ?? 0;

    // Mobile number validation (mandatory for mentor session notifications & SMS alerts)
    const cleanPhone = form.phone.trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
    if (!cleanPhone) {
      return setErrorMessage('Mobile number is required to receive session booking updates & SMS notifications');
    }
    if (cleanPhone.length !== 10) {
      return setErrorMessage('Please enter a valid 10-digit mobile number');
    }

    if (skills.length === 0) {
      return setErrorMessage('Please add at least 1 key skill (e.g. React, Node.js, System Design)');
    }

    if (years < 0 || years > 60) return setErrorMessage('Experience (years) must be a whole number from 0 to 60');
    if (months < 0 || months > 11) return setErrorMessage('Experience (months) must be from 0 to 11');

    const designation = effectiveNotWorking ? '' : form.designation.trim();
    const currentCompany = effectiveNotWorking ? '' : form.currentCompany.trim();

    const currentCtc = toNumber(form.currentCtcLpa);
    const expectedCtc = toNumber(form.expectedCtcLpa);
    if ([currentCtc, expectedCtc].some(v => v !== null && (Number.isNaN(v) || v < 0 || v > 1000))) {
      return setErrorMessage('Salary must be a number in lakhs per annum (e.g. 12.5)');
    }
    if (form.dateOfBirth) {
      const age = ageFrom(form.dateOfBirth);
      if (age === null || age < 15 || age > 80) return setErrorMessage('Please enter a valid date of birth');
    }
    const gradYear = toNumber(form.graduationYear);
    if (gradYear !== null && (!Number.isInteger(gradYear) || gradYear < 1950 || gradYear > 2100)) {
      return setErrorMessage('Please enter a valid passing year');
    }

    const updates: Partial<UserProfileData> = {
      name: [firstName, form.lastName.trim()].filter(Boolean).join(' '),
      firstName,
      lastName: form.lastName.trim(),
      phone: cleanPhone,
      dateOfBirth: form.dateOfBirth || null,
      location,
      totalExperienceYears: years,
      totalExperienceMonths: months,
      designation,
      currentCompany,
      currentlyNotWorking: effectiveNotWorking,
      noticePeriod: form.noticePeriod.trim(),
      currentCtcLpa: currentCtc,
      expectedCtcLpa: expectedCtc,
      summary: form.summary.trim(),
      skills,
      educationDegree: form.educationDegree.trim(),
      educationCollege: form.educationCollege.trim(),
      graduationYear: gradYear,
      linkedinUrl: toUrl(form.linkedinUrl),
      githubUrl: toUrl(form.githubUrl),
      portfolioUrl: toUrl(form.portfolioUrl),
      jobSearchStatus: form.jobSearchStatus,
      // The headline follows the designation unless the user wrote their own
      ...(!userProfile.headline || userProfile.headline === userProfile.designation ? { headline: designation || 'Tech Professional' } : {})
    };

    setIsSaving(true);
    const saved = await updateFullProfile(updates);
    setIsSaving(false);
    if (saved) onSaved();
  };

  const hint = (key: string) => fromResume.has(key) && <span className="sup-field-hint">✓ from resume</span>;
  const groupClass = (key: string, extra = '') => `sup-floating-group ${extra} ${fromResume.has(key) ? 'field-highlighted' : ''}`;
  const age = ageFrom(form.dateOfBirth);

  const textField = (key: keyof ProfileForm, label: string, placeholder = '', extra = '', type = 'text') => (
    <div className={groupClass(key, extra)}>
      <label className="sup-floating-label">{label}</label>
      <input
        type={type}
        className="sup-floating-input"
        value={form[key] as string}
        onChange={e => set(key, e.target.value as ProfileForm[typeof key])}
        placeholder={placeholder}
      />
      {hint(key)}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="sup-form-wrapper">
      <div className="sup-form-body">

        {/* Resume: upload to auto-fill */}
        <div className="sup-resume-section">
          {isUploading ? (
            <div className="sup-resume-uploading-card">
              <div className="sup-ruc-spinner-wrap">
                <Loader2 size={24} className="animate-spin text-purple-600" />
              </div>
              <div className="sup-ruc-content">
                <div className="sup-ruc-title-row">
                  <strong className="sup-ruc-title">
                    Uploading &amp; Reading {uploadFileName || 'Resume'}…
                  </strong>
                  <span className="sup-ruc-badge">AI Parser</span>
                </div>
                <p className="sup-ruc-subtitle">
                  Extracting your work history, education, skills, and contact details…
                </p>
                <div className="sup-ruc-progress-bar">
                  <div className="sup-ruc-progress-shimmer" />
                </div>
              </div>
            </div>
          ) : (
            <div className="sup-floating-group resume-upload-group">
              <label className="sup-floating-label">Resume</label>
              <div
                className="sup-resume-input-row"
                onClick={() => resumeInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <div className="sup-resume-left-content">
                  <FileText size={16} className="text-purple-600 flex-shrink-0" />
                  <span className="sup-resume-filename">
                    {hasResume(userProfile)
                      ? `${userProfile.resumeFileName}${formatResumeAge(userProfile) ? ` • uploaded ${formatResumeAge(userProfile)}` : ''}`
                      : 'Upload your resume to fill this form automatically'}
                  </span>
                </div>
                <span className="btn-sup-upload-inline">
                  <Upload size={14} />
                  <span>{hasResume(userProfile) ? 'Upload new' : 'Upload'}</span>
                </span>
              </div>
              <input ref={resumeInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleResumeChange} />
            </div>
          )}
          <span className="sup-resume-subtext">
            PDF, DOCX or TXT, up to 5 MB. Only you and the mentors you book can download it.
            {hasResume(userProfile) && (
              <> <a href={peerpathApi.ownResumeUrl()} target="_blank" rel="noreferrer"><Download size={11} /> Download</a></>
            )}
          </span>
        </div>

        {banner && (
          <div className={`sup-parse-alert ${banner.kind === 'success' ? 'success' : ''}`}>
            {banner.kind === 'success'
              ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              : <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />}
            <span>{banner.text}</span>
          </div>
        )}

        {/* 1. Basic details (Mandatory) */}
        <span className="sup-section-label">Basic details</span>
        <div className="sup-fields-grid-2">
          {textField('firstName', 'First Name *', 'First name')}
          {textField('lastName', 'Last Name', 'Last name')}

          <div className={groupClass('phone')}>
            <label className="sup-floating-label">Mobile Number *</label>
            <div className="sup-mobile-input-wrap">
              <span className="sup-country-prefix">🇮🇳 +91</span>
              <input
                type="tel"
                maxLength={10}
                className="sup-floating-input sup-mobile-input"
                value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
              />
            </div>
            {hint('phone')}
          </div>

          {textField('location', 'Current City *', 'e.g. Bengaluru')}
        </div>

        {/* 2. Work experience (Mandatory) */}
        <span className="sup-section-label">Work experience</span>
        <div className="sup-fields-grid-2">
          <div className={groupClass('totalExperienceYears')}>
            <label className="sup-floating-label">Total Experience (years) *</label>
            <input
              type="number"
              min={0}
              max={60}
              className="sup-floating-input"
              value={form.totalExperienceYears}
              onChange={e => set('totalExperienceYears', e.target.value)}
              placeholder="e.g. 4"
            />
            {hint('totalExperienceYears')}
          </div>
          <div className={groupClass('totalExperienceMonths')}>
            <label className="sup-floating-label">and months</label>
            <select
              className="sup-floating-input"
              value={form.totalExperienceMonths}
              onChange={e => set('totalExperienceMonths', e.target.value)}
            >
              <option value="">0</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>
                  {m}
                </option>
              ))}
            </select>
            {hint('totalExperienceMonths')}
          </div>
        </div>

        <div className="sup-checkbox-row">
          <label className="sup-checkbox-label">
            <input
              type="checkbox"
              className="sup-checkbox-input"
              checked={form.currentlyNotWorking}
              onChange={e => set('currentlyNotWorking', e.target.checked)}
            />
            <span>I am not working currently</span>
          </label>
        </div>

        {!form.currentlyNotWorking && (
          <div className="sup-fields-grid-2">
            {textField('designation', 'Current Designation *', 'e.g. Senior Software Engineer')}
            {textField('currentCompany', 'Current Company *', 'e.g. Infosys')}
          </div>
        )}

        {/* 3. Key Skills (Mandatory) */}
        <div className="sup-skills-section">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div className="sup-floating-group skills-input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="sup-floating-label">Key Skills *</label>
              <input
                type="text"
                className="sup-floating-input"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill (e.g. React, Node.js) and press Enter"
              />
            </div>
            <button
              type="button"
              className="btn-sup-add-skill-inline"
              onClick={addSkill}
              disabled={!newSkill.trim()}
              style={{ height: '48px' }}
            >
              + Add
            </button>
          </div>
          <div className="sup-skills-limits-row">
            <span>
              {fromResume.has('skills')
                ? '✓ Skills auto-extracted from resume. Remove any that are not relevant.'
                : 'Add 2-3 key skills to help mentors assess your profile'}
            </span>
            <span className="sup-skills-count">{skills.length} of 25 added</span>
          </div>
          {skills.length > 0 && (
            <div className="sup-skills-block">
              <div className="sup-chips-wrap">
                {skills.map(skill => (
                  <span key={skill} className="sup-chip-selected">
                    <span>{skill}</span>
                    <button
                      type="button"
                      className="btn-sup-chip-delete"
                      onClick={() => setSkills(prev => prev.filter(s => s !== skill))}
                      title={`Remove ${skill}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Collapsible Optional Details Accordion */}
        <div className="sup-optional-accordion">
          <div
            className={`sup-optional-header ${isOptionalOpen ? 'open' : ''}`}
            onClick={() => setIsOptionalOpen(prev => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOptionalOpen(prev => !prev);
              }
            }}
          >
            <div className="sup-opt-left">
              <div className="sup-opt-icon-orb">
                <Sparkles size={18} className="text-purple-600" />
              </div>
              <div className="sup-opt-title-col">
                <div className="sup-opt-title-row">
                  <span className="sup-opt-title">Optional Details for Deeper Matching</span>
                  {optionalFilledCount > 0 ? (
                    <span className="sup-opt-filled-badge">
                      ✓ {optionalFilledCount} details added {fromResume.size > 0 ? 'from resume' : ''}
                    </span>
                  ) : null}
                </div>
                <p className="sup-opt-desc">
                  Adding compensation, DOB &amp; education gives you <strong>better trajectory calibration &amp; mentor match accuracy</strong>.
                </p>
              </div>
            </div>
            <div className="sup-opt-right">
              <button
                type="button"
                className="sup-opt-toggle-btn"
                onClick={e => {
                  e.stopPropagation();
                  setIsOptionalOpen(prev => !prev);
                }}
              >
                <span>{isOptionalOpen ? 'Hide' : 'Add Details'}</span>
                <ChevronDown size={14} className={`sup-opt-chevron ${isOptionalOpen ? 'rotated' : ''}`} />
              </button>
            </div>
          </div>

          {isOptionalOpen && (
            <div className="sup-optional-content animate-slide-down">
              {/* Timeline & Salary */}
              <span className="sup-section-label">Compensation &amp; Notice</span>
              <div className="sup-fields-grid-2">
                <div className={groupClass('noticePeriod')}>
                  <label className="sup-floating-label">Notice Period</label>
                  <input
                    list="notice-options"
                    className="sup-floating-input"
                    value={form.noticePeriod}
                    onChange={e => set('noticePeriod', e.target.value)}
                    placeholder="e.g. 30 days"
                  />
                  <datalist id="notice-options">
                    {NOTICE_OPTIONS.map(o => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                  {hint('noticePeriod')}
                </div>
                <div className={groupClass('dateOfBirth')}>
                  <label className="sup-floating-label">Date of Birth{age !== null ? ` (age ${age})` : ''}</label>
                  <input
                    type="date"
                    className="sup-floating-input"
                    value={form.dateOfBirth}
                    onChange={e => set('dateOfBirth', e.target.value)}
                  />
                  {hint('dateOfBirth')}
                </div>
                <div className={groupClass('currentCtcLpa')}>
                  <label className="sup-floating-label">Current Salary (LPA)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="sup-floating-input"
                    value={form.currentCtcLpa}
                    onChange={e => set('currentCtcLpa', e.target.value)}
                    placeholder="e.g. 12.5"
                  />
                  {hint('currentCtcLpa')}
                </div>
                <div className={groupClass('expectedCtcLpa')}>
                  <label className="sup-floating-label">Expected Salary (LPA)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="sup-floating-input"
                    value={form.expectedCtcLpa}
                    onChange={e => set('expectedCtcLpa', e.target.value)}
                    placeholder="e.g. 18"
                  />
                  {hint('expectedCtcLpa')}
                </div>
              </div>

              {/* Profile Summary */}
              <div className={groupClass('summary', 'single-col')}>
                <label className="sup-floating-label">Profile Summary</label>
                <textarea
                  className="sup-floating-input"
                  rows={3}
                  maxLength={3000}
                  value={form.summary}
                  onChange={e => set('summary', e.target.value)}
                  placeholder="A few lines about your experience and what you want to achieve"
                />
                {hint('summary')}
              </div>

              {/* Education */}
              <span className="sup-section-label">Education</span>
              <div className="sup-fields-grid-2">
                <div className={groupClass('educationDegree')}>
                  <label className="sup-floating-label">Highest Qualification</label>
                  <input
                    list="degree-options"
                    className="sup-floating-input"
                    value={form.educationDegree}
                    onChange={e => set('educationDegree', e.target.value)}
                    placeholder="e.g. B.Tech"
                  />
                  <datalist id="degree-options">
                    {DEGREE_OPTIONS.map(o => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                  {hint('educationDegree')}
                </div>
                <div className={groupClass('graduationYear')}>
                  <label className="sup-floating-label">Passing Year</label>
                  <input
                    type="number"
                    min={1950}
                    max={2100}
                    className="sup-floating-input"
                    value={form.graduationYear}
                    onChange={e => set('graduationYear', e.target.value)}
                    placeholder="e.g. 2020"
                  />
                  {hint('graduationYear')}
                </div>
              </div>
              {textField('educationCollege', 'College / University', 'e.g. NIT Trichy', 'single-col')}

              {/* Links */}
              <span className="sup-section-label">Professional Links</span>
              <div className="sup-fields-grid-2">
                {textField('linkedinUrl', 'LinkedIn', 'linkedin.com/in/your-name')}
                {textField('githubUrl', 'GitHub', 'github.com/your-name')}
              </div>
              {textField('portfolioUrl', 'Portfolio / Website', 'https://…', 'single-col')}

              {/* Job search */}
              <div className="sup-job-search-section">
                <label className="sup-subheading">How would you describe your current job search?</label>
                <div className="sup-pills-row">
                  {(['Actively Looking', 'Casually Exploring', 'Not Looking'] as JobSearch[]).map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`sup-search-pill ${form.jobSearchStatus === option ? 'active' : ''}`}
                      onClick={() => set('jobSearchStatus', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="sup-parse-alert">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

          <div className="sup-footer">
            {footerSummary ? (
              <div className="sup-footer-checkout-row">
                {footerSummary}
                <button type="submit" className="btn-sup-submit btn-sup-checkout" disabled={isSaving || isUploading}>
                  <span>{isSaving ? 'Saving…' : submitLabel}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="sup-footer-default-row" style={{ display: 'flex', alignItems: 'center', justifyContent: onSkip ? 'space-between' : 'flex-end', width: '100%', gap: '12px' }}>
                {onSkip && (
                  <button
                    type="button"
                    className="btn-sup-skip"
                    onClick={onSkip}
                    disabled={isSaving || isUploading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '8px 4px',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px'
                    }}
                  >
                    {skipLabel || "Skip for now, I'll update later"}
                  </button>
                )}
                <button type="submit" className="btn-sup-submit" disabled={isSaving || isUploading}>
                  {isSaving ? 'Saving…' : submitLabel}
                </button>
              </div>
            )}
          </div>
        </form>
  );
};
