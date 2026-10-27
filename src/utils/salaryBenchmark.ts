/**
 * Dynamic Salary Benchmark & Trajectory Calculator for Shine PeerComet
 * 
 * Uses industry-standard "Up to ₹XX LPA" highest market standard packages
 * to showcase maximum compensation upside without limiting or down-leveling candidates.
 */

export interface TrackSalaryInfo {
  min: number;
  max: number;
  display: string;
  shortDisplay: string;
  boosterUpsideDisplay: string;
  lockedCount: number;
  mentorPastRole: string;
  mentorPastSalary: string;
  mentorJumpRole: string;
  mentorJumpSalary: string;
}

export interface DynamicSalaryBenchmark {
  currentCtcNum: number;
  currentCtcDisplay: string;
  targetCtcDisplay: string;
  targetCtcShort: string;
  targetMax: number;
  jumpPercentage: number;
  jumpPercentageDisplay: string;
  totalUpsideAmountDisplay: string;
  tracks: {
    arch: TrackSalaryInfo;
    pm: TrackSalaryInfo;
    search: TrackSalaryInfo;
    ai: TrackSalaryInfo;
    semi: TrackSalaryInfo;
  };
}

/**
 * Extracts numeric CTC (in Lakhs per annum) from any free-form string.
 */
export function parseCtcNumber(rawCtc?: string): number {
  if (!rawCtc) return 5.5;
  
  const clean = rawCtc.replace(/,/g, '').trim();
  
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*[-–—to]+\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const val1 = parseFloat(rangeMatch[1]);
    return isNaN(val1) ? 5.5 : val1;
  }
  
  const singleMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    return isNaN(val) ? 5.5 : val;
  }
  
  return 5.5;
}

/**
 * Computes market-standard "Up to ₹XX LPA" benchmark metrics.
 */
export function calculateSalaryBenchmark(
  currentCtcRaw?: string,
  _targetCtcRaw?: string
): DynamicSalaryBenchmark {
  const currentCtcNum = parseCtcNumber(currentCtcRaw);
  
  // Highest market benchmark standard for Frontend/UI Architect track
  const highestTargetLakhs = 36;
  const jumpPercentage = Math.max(40, Math.round(((highestTargetLakhs - currentCtcNum) / currentCtcNum) * 100));

  const currentCtcDisplay = currentCtcRaw && currentCtcRaw.includes('LPA') 
    ? (currentCtcRaw.includes('₹') ? currentCtcRaw : `₹${currentCtcRaw}`)
    : `₹${currentCtcNum} LPA`;

  const targetCtcDisplay = `Up to ₹${highestTargetLakhs} LPA`;
  const targetCtcShort = `Up to ₹${highestTargetLakhs}L`;
  const jumpPercentageDisplay = `+${jumpPercentage}%`;
  const totalUpsideAmountDisplay = `+₹${Math.round(highestTargetLakhs - currentCtcNum)}L`;

  const computeTrack = (
    baseMin: number, 
    baseMax: number, 
    lockedCount: number,
    boosterLakhs: number,
    mentorPastRole: string,
    mentorJumpSalary: string
  ): TrackSalaryInfo => {
    return {
      min: baseMin,
      max: baseMax,
      display: `Up to ₹${baseMax} LPA`,
      shortDisplay: `Up to ₹${baseMax}L`,
      boosterUpsideDisplay: `+₹${boosterLakhs}L Jump`,
      lockedCount,
      mentorPastRole,
      mentorPastSalary: '₹6L',
      mentorJumpRole: 'Reached',
      mentorJumpSalary
    };
  };

  return {
    currentCtcNum,
    currentCtcDisplay,
    targetCtcDisplay,
    targetCtcShort,
    targetMax: highestTargetLakhs,
    jumpPercentage,
    jumpPercentageDisplay,
    totalUpsideAmountDisplay,
    tracks: {
      arch: computeTrack(22, 36, 520, 14, 'Junior Frontend Dev (Same baseline CV)', 'Staff Architect at Razorpay'),
      pm: computeTrack(24, 38, 430, 16, 'Senior Software Engineer', 'Lead PM at Shine'),
      search: computeTrack(32, 48, 290, 18, 'Backend & Database Engineer', 'Principal Search Architect'),
      ai: computeTrack(28, 45, 610, 16, 'Fullstack Developer', 'GenAI Lead at Swiggy'),
      semi: computeTrack(26, 42, 48, 16, 'Junior Embedded / FPGA Engineer', 'Staff Silicon Architect at Qualcomm')
    }
  };
}
