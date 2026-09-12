export type CourseId = 'BCA' | 'BBA' | 'B.Com' | 'B.Tech' | 'MCA' | 'MBA' | 'BA';

export interface Student {
  docId: string;
  id: string;
  name: string;
  mobile: string;
  total: number;
  paid: number;
  course: string;
  sem: string;
  isTestAccount?: boolean;
  enrollmentNo?: string;
  annualFee?: number;
  installmentAmount?: number;
  previousPendingFee?: number;
  advanceFeePaid?: number;
  createdAt?: string;
}

export interface Transaction {
  docId: string;
  txnId: string;
  studentId: string;
  studentName: string;
  studentDocId: string;
  amount: number;
  status: 'pending' | 'done' | 'rejected' | 'SUCCESS' | 'CAPTURED';
  time?: any;
  createdAt?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentSource?: string;
  course?: string;
  semester?: string;
  semType?: 'ODD' | 'EVEN';
  feeCycle?: string;
  isAdvance?: boolean;
  targetSemester?: string;
  notes?: string;
}

export type FeeStatus = 'FEE_CLEARED' | 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'ADVANCE_PAID';

export interface FeeCalculationResult {
  studentId: string;
  course: string;
  currentSem: string;
  currentSemNumber: number;
  semType: 'ODD' | 'EVEN';
  cycle: 'JUNE_EVEN' | 'DECEMBER_ODD';
  cycleName: string;
  annualFee: number;
  installmentAmount: number;
  currentSemesterFee: number;
  previousPendingFee: number;
  totalApplicableFee: number;
  amountPaid: number;
  advanceFeePaid: number;
  advanceFeeStatus: 'ADVANCE_PAID' | 'ADVANCE_DUE' | 'NOT_APPLICABLE';
  totalPending: number;
  paymentStatus: FeeStatus;
  statusMessage: string;
  breakdown: {
    previousPending: number;
    semesterFee: number;
    totalDue: number;
    paid: number;
    remaining: number;
    isAdvanceCovered: boolean;
    caseType: 'CASE_A' | 'CASE_B' | 'CASE_C' | 'STANDARD';
  };
  nextPaymentDate: string;
  nextPaymentPurpose: string;
  isCleared: boolean;

  // Consistent UI-facing fields for direct access
  statusCase: 'CASE_A' | 'CASE_B' | 'CASE_C' | 'STANDARD';
  statusLabel: string;
  statusDescription: string;
  effectiveDueAmount: number;
  semesterInstallment: number;
  newSemesterFee: number;
  totalDueAmount: number;
  semester: string;
  status: FeeStatus;
  activeCycle: AcademicCycle;
}

export interface AcademicCycle {
  cycle: 'JUNE_EVEN' | 'DECEMBER_ODD';
  cycleName: string;
  semType: 'ODD' | 'EVEN';
  targetSemesters: number[];
  upcomingAdvanceSemType?: 'ODD' | 'EVEN';
  normalPaymentDeadline?: string;
  nextPaymentDate?: string;
  nextPaymentPurpose?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

export type ScreenId =
  | 'loginScreen'
  | 'adminLoginScreen'
  | 'studentDashboard'
  | 'paymentModal'
  | 'aiChatScreen'
  | 'adminDashboard'
  | 'adminAIScreen'
  | 'addStudentScreen';
