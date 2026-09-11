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
  | 'razorpayLoginScreen'
  | 'studentDashboard'
  | 'paymentModal'
  | 'aiChatScreen'
  | 'adminDashboard'
  | 'adminAIScreen'
  | 'addStudentScreen';
