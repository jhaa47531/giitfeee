import { Student, Transaction, FeeCalculationResult, CourseId, AcademicCycle } from '../types';

export interface CourseConfig {
  id: CourseId;
  name: string;
  totalSemesters: number;
  years: number;
}

export const ALL_COURSES: CourseConfig[] = [
  { id: 'BCA', name: 'Bachelor of Computer Applications', totalSemesters: 6, years: 3 },
  { id: 'BBA', name: 'Bachelor of Business Administration', totalSemesters: 6, years: 3 },
  { id: 'B.Com', name: 'Bachelor of Commerce', totalSemesters: 6, years: 3 },
  { id: 'B.Tech', name: 'Bachelor of Technology', totalSemesters: 8, years: 4 },
  { id: 'MCA', name: 'Master of Computer Applications', totalSemesters: 4, years: 2 },
  { id: 'MBA', name: 'Master of Business Administration', totalSemesters: 4, years: 2 },
  { id: 'BA', name: 'Bachelor of Arts', totalSemesters: 6, years: 3 }
];

export const COURSE_MAP: Record<string, CourseConfig> = ALL_COURSES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<string, CourseConfig>
);

/**
 * Extracts numeric semester value from strings like "Sem 1", "Semester 4", "4"
 */
export function parseSemNumber(sem: string): number {
  if (!sem) return 1;
  const match = sem.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

/**
 * Returns formatted semester string like "Sem 1"
 */
export function formatSemString(num: number): string {
  return `Sem ${num}`;
}

/**
 * Get valid semester options for a course
 */
export function getSemestersForCourse(courseId: string): string[] {
  const config = COURSE_MAP[courseId] || { totalSemesters: 6 };
  const sems: string[] = [];
  for (let i = 1; i <= config.totalSemesters; i++) {
    sems.push(`Sem ${i}`);
  }
  return sems;
}

/**
 * Validates course and semester combination
 */
export function isValidCourseAndSemester(courseId: string, sem: string): { valid: boolean; error?: string } {
  const config = COURSE_MAP[courseId];
  if (!config) {
    return {
      valid: false,
      error: `Invalid course "${courseId}". Valid courses: ${ALL_COURSES.map(c => c.id).join(', ')}`
    };
  }

  const semNum = parseSemNumber(sem);
  if (isNaN(semNum) || semNum < 1 || semNum > config.totalSemesters) {
    return {
      valid: false,
      error: `Invalid semester "${sem}" for ${config.id}. Allowed semesters: Sem 1 to Sem ${config.totalSemesters}`
    };
  }

  return { valid: true };
}

/**
 * Determines whether a semester is ODD or EVEN
 * Odd: 1, 3, 5, 7
 * Even: 2, 4, 6, 8
 */
export function getSemesterType(sem: string | number): 'ODD' | 'EVEN' {
  const num = typeof sem === 'number' ? sem : parseSemNumber(sem);
  return num % 2 === 0 ? 'EVEN' : 'ODD';
}

/**
 * Academic Cycle detection:
 * June -> Even Semester Cycle (June 1 - Nov 30)
 * December -> Odd Semester Cycle (Dec 1 - May 31)
 *
 * Normal Fee payment dates:
 * - 15 April: Advance fee for upcoming Even semester (applicable in June cycle)
 * - 15 October: Advance fee for upcoming Odd semester (applicable in Dec cycle)
 */
export function getCurrentAcademicCycle(customDate?: Date): AcademicCycle {
  const now = customDate || new Date();
  const month = now.getMonth(); // 0 = Jan, 5 = June, 11 = Dec
  const year = now.getFullYear();

  // June (5) through November (10) -> June Even Semester Cycle
  if (month >= 5 && month <= 10) {
    return {
      cycle: 'JUNE_EVEN',
      cycleName: 'June Even Semester Cycle',
      semType: 'EVEN',
      targetSemesters: [2, 4, 6, 8],
      upcomingAdvanceSemType: 'ODD',
      normalPaymentDeadline: `15 June ${year}`,
      nextPaymentDate: `15 October ${year}`,
      nextPaymentPurpose: 'Advance fee for upcoming Odd Semester (December cycle)'
    };
  } else {
    // December (11) through May (4) -> December Odd Semester Cycle
    const nextYear = month === 11 ? year + 1 : year;
    return {
      cycle: 'DECEMBER_ODD',
      cycleName: 'December Odd Semester Cycle',
      semType: 'ODD',
      targetSemesters: [1, 3, 5, 7],
      upcomingAdvanceSemType: 'EVEN',
      normalPaymentDeadline: `15 December ${year}`,
      nextPaymentDate: `15 April ${nextYear}`,
      nextPaymentPurpose: 'Advance fee for upcoming Even Semester (June cycle)'
    };
  }
}

/**
 * Resolve student's Annual Fee and Installment Amount
 * Installment amount = annual_fee / 2
 */
export function getStudentFeeStructure(student: Student): {
  annualFee: number;
  installmentAmount: number;
  courseTotalFee: number;
} {
  const courseConfig = COURSE_MAP[student.course] || { years: 3, totalSemesters: 6 };
  let annualFee = student.annualFee;

  if (!annualFee || annualFee <= 0) {
    if (student.total > 0) {
      if (student.total <= 60000) {
        // If total entered looks like annual fee (e.g. ₹35,000, ₹45,000, ₹50,000)
        annualFee = student.total;
      } else {
        // If total is full multi-year fee
        annualFee = Math.round(student.total / (courseConfig.years || 3));
      }
    } else {
      annualFee = 35000; // Standard default fallback
    }
  }

  const installmentAmount = Math.round(annualFee / 2);
  const courseTotalFee = student.total > annualFee ? student.total : annualFee * courseConfig.years;

  return {
    annualFee,
    installmentAmount,
    courseTotalFee
  };
}

export interface CalculateFeeOptions {
  asOfDate?: Date;
  forceCycle?: 'JUNE_EVEN' | 'DECEMBER_ODD';
}

/**
 * Centralized Master Fee Status Calculator
 * The backend & frontend source of truth for fee calculations.
 */
export function calculateStudentFeeStatus(
  student: Student,
  transactions: Transaction[] = [],
  options?: CalculateFeeOptions
): FeeCalculationResult {
  const { annualFee, installmentAmount } = getStudentFeeStructure(student);
  const semNum = parseSemNumber(student.sem);
  const semType = getSemesterType(semNum);

  const cycleInfo = getCurrentAcademicCycle(options?.asOfDate);
  const activeCycle = options?.forceCycle || cycleInfo.cycle;
  const cycleName = activeCycle === 'JUNE_EVEN' ? 'June Even Semester Cycle' : 'December Odd Semester Cycle';

  // Filter verified transactions belonging to this specific student ID
  const studentTxns = transactions.filter(
    t =>
      t.studentId === student.id &&
      (t.status === 'done' || t.status === 'SUCCESS' || t.status === 'CAPTURED')
  );

  // Total verified paid amount
  const totalVerifiedPaid = studentTxns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const effectivePaid = Math.max(totalVerifiedPaid, Number(student.paid) || 0);

  // Installment for this semester
  const currentSemesterFee = installmentAmount;

  // Previous pending fee (if explicitly set or calculated from ledger)
  const previousPendingFee = Math.max(0, Number(student.previousPendingFee) || 0);

  // Identify advance payments specifically tagged or deposited in advance window
  const advanceTxns = studentTxns.filter(t => t.isAdvance === true);
  const advanceAmountFromTxns = advanceTxns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const advanceFeePaid = Math.max(advanceAmountFromTxns, Number(student.advanceFeePaid) || 0);

  // Total due before considering payments
  const totalApplicableFee = previousPendingFee + currentSemesterFee;

  // Let's determine how payments cover previous pending and current/advance fee
  let remainingPaidPool = effectivePaid;

  // 1. First cover previous pending fee
  const paidTowardsPrevious = Math.min(previousPendingFee, remainingPaidPool);
  const effectivePreviousPending = Math.max(0, previousPendingFee - paidTowardsPrevious);
  remainingPaidPool = Math.max(0, remainingPaidPool - paidTowardsPrevious);

  // 2. Next cover current semester fee
  const paidTowardsCurrentSem = Math.min(currentSemesterFee, remainingPaidPool);
  const effectiveCurrentSemPending = Math.max(0, currentSemesterFee - paidTowardsCurrentSem);
  remainingPaidPool = Math.max(0, remainingPaidPool - paidTowardsCurrentSem);

  // 3. Any excess payment is considered advance fee credit
  const calculatedAdvanceCredit = Math.max(advanceFeePaid, remainingPaidPool);

  // Total net pending amount
  const totalPending = effectivePreviousPending + effectiveCurrentSemPending;

  // Check advance payment status for upcoming cycle
  const isAdvanceCovered = calculatedAdvanceCredit >= currentSemesterFee;

  let caseType: 'CASE_A' | 'CASE_B' | 'CASE_C' | 'STANDARD' = 'STANDARD';
  let paymentStatus: FeeCalculationResult['paymentStatus'] = 'PENDING';
  let statusMessage = '';
  let statusLabel = '';
  let statusDescription = '';
  let isCleared = false;

  // Determine Case A, Case B, Case C as required in Sections 8 & 9
  const isPreviousCleared = effectivePreviousPending === 0;
  const isCurrentSemCleared = effectiveCurrentSemPending === 0;

  if (isPreviousCleared && isCurrentSemCleared) {
    // Both previous and current semester fee are covered!
    caseType = 'CASE_A';
    paymentStatus = 'FEE_CLEARED';
    statusLabel = 'Fee Cleared & Advance Compliant';
    statusDescription = 'All past dues and current semester fee installments are fully cleared. No outstanding balance is pending for this semester.';
    statusMessage = 'Your Fee is Cleared';
    isCleared = true;
  } else if (!isPreviousCleared && effectiveCurrentSemPending > 0) {
    // CASE B: Previous fee is pending AND new semester fee is applicable
    caseType = 'CASE_B';
    paymentStatus = effectivePaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    statusLabel = 'Previous Pending + New Semester Fee';
    statusDescription = 'Student has past semester pending dues along with new semester installment fees. Please clear the pending dues to ensure exam clearance.';
    const semLabel = activeCycle === 'JUNE_EVEN' ? 'Even Semester Fee' : 'Odd Semester Fee';
    statusMessage = `Previous Pending Fee: ₹${effectivePreviousPending.toLocaleString('en-IN')} | ${semLabel}: ₹${effectiveCurrentSemPending.toLocaleString('en-IN')} | Total Pending Fee: ₹${totalPending.toLocaleString('en-IN')}`;
    isCleared = false;
  } else if (isPreviousCleared && effectiveCurrentSemPending > 0) {
    // CASE C: Previous fee is completely cleared BUT current/new semester fee is pending
    caseType = 'CASE_C';
    paymentStatus = paidTowardsCurrentSem > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    statusLabel = 'Previous Cleared — New Semester Fee Due';
    statusDescription = 'Previous semester dues are completely settled. Only the current semester installment is pending payment.';
    const semLabel = activeCycle === 'JUNE_EVEN' ? 'Even Semester Fee Pending' : 'Odd Semester Fee Pending';
    statusMessage = `${semLabel}: ₹${effectiveCurrentSemPending.toLocaleString('en-IN')}`;
    isCleared = false;
  } else {
    // Standard partial or remaining pending
    caseType = 'STANDARD';
    if (totalPending === 0) {
      paymentStatus = 'FEE_CLEARED';
      statusLabel = 'Fee Cleared';
      statusDescription = 'All applicable semester fees are cleared.';
      statusMessage = 'Your Fee is Cleared';
      isCleared = true;
    } else if (effectivePaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
      statusLabel = 'Partially Paid';
      statusDescription = `An outstanding fee balance of ₹${totalPending.toLocaleString('en-IN')} remains after recent payments.`;
      statusMessage = `Outstanding Balance: ₹${totalPending.toLocaleString('en-IN')} (₹${effectivePaid.toLocaleString('en-IN')} paid)`;
      isCleared = false;
    } else {
      paymentStatus = 'PENDING';
      statusLabel = 'Fee Due';
      statusDescription = `Semester installment fee of ₹${totalPending.toLocaleString('en-IN')} is awaiting payment.`;
      statusMessage = `Fee Pending: ₹${totalPending.toLocaleString('en-IN')}`;
      isCleared = false;
    }
  }

  // Advance status badge
  let advanceFeeStatus: FeeCalculationResult['advanceFeeStatus'] = 'NOT_APPLICABLE';
  if (isAdvanceCovered) {
    advanceFeeStatus = 'ADVANCE_PAID';
  } else if (isCleared && calculatedAdvanceCredit === 0) {
    advanceFeeStatus = 'ADVANCE_DUE';
  }

  return {
    studentId: student.id,
    course: student.course,
    currentSem: student.sem,
    currentSemNumber: semNum,
    semType,
    cycle: activeCycle,
    cycleName,
    annualFee,
    installmentAmount,
    currentSemesterFee,
    previousPendingFee: effectivePreviousPending,
    totalApplicableFee,
    amountPaid: effectivePaid,
    advanceFeePaid: calculatedAdvanceCredit,
    advanceFeeStatus,
    totalPending,
    paymentStatus,
    statusMessage,
    breakdown: {
      previousPending: effectivePreviousPending,
      semesterFee: effectiveCurrentSemPending,
      totalDue: totalPending,
      paid: effectivePaid,
      remaining: totalPending,
      isAdvanceCovered,
      caseType
    },
    nextPaymentDate: cycleInfo.nextPaymentDate || '',
    nextPaymentPurpose: cycleInfo.nextPaymentPurpose || '',
    isCleared,

    // Consistent UI fields for direct access
    statusCase: caseType,
    statusLabel,
    statusDescription,
    effectiveDueAmount: totalPending,
    semesterInstallment: installmentAmount,
    newSemesterFee: effectiveCurrentSemPending,
    totalDueAmount: totalPending,
    semester: student.sem,
    status: paymentStatus,
    activeCycle: cycleInfo
  };
}
