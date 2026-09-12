import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  CreditCard,
  History,
  Bot,
  UserCheck,
  Bell,
  Search,
  PlusCircle,
  Check,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Building,
  FileText,
  Loader2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, Transaction, ChatMessage, ScreenId, FeeCalculationResult, AcademicCycle, CourseId } from './types';
import { DataService } from './services/dataService';
import { COURSE_MAP, getCurrentAcademicCycle } from './services/feeRules';
import { Header } from './components/Header';
import { StudentChart } from './components/StudentChart';
import { AdminChart } from './components/AdminChart';
import { ReceiptModal } from './components/ReceiptModal';

export default function App() {
  // Navigation & Authentication
  const [screen, setScreen] = useState<ScreenId>('loginScreen');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Academic Cycle & Fee Calculation State
  const [currentCycle] = useState<AcademicCycle>(getCurrentAcademicCycle());
  const [currentUserFeeStatus, setCurrentUserFeeStatus] = useState<FeeCalculationResult | null>(null);

  // Form Inputs (with exact legacy IDs)
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [mobileInput, setMobileInput] = useState<string>('');
  const [adminMobileInput, setAdminMobileInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');

  // Razorpay Live Payment States
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessDetails, setPaymentSuccessDetails] = useState<{
    amount: number;
    paymentId: string;
    orderId: string;
    receiptNo: string;
  } | null>(null);

  // Add Student Inputs
  const [newIdInput, setNewIdInput] = useState<string>('');
  const [newNameInput, setNewNameInput] = useState<string>('');
  const [newMobileInput, setNewMobileInput] = useState<string>('');
  const [newTotalInput, setNewTotalInput] = useState<string>('35000');
  const [newAnnualFeeInput, setNewAnnualFeeInput] = useState<string>('35000');
  const [newPreviousPendingInput, setNewPreviousPendingInput] = useState<string>('0');
  const [newCourseInput, setNewCourseInput] = useState<string>('BCA');
  const [newSemInput, setNewSemInput] = useState<string>('Sem 1');

  // Search & Filters
  const [searchInputVal, setSearchInputVal] = useState<string>('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');

  // Data Collections
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyListState, setHistoryListState] = useState<Transaction[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // Chat State
  const [studentMessages, setStudentMessages] = useState<ChatMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [adminChatInputText, setAdminChatInputText] = useState<string>('');
  const [isChatTyping, setIsChatTyping] = useState<boolean>(false);
  const [isAdminChatTyping, setIsAdminChatTyping] = useState<boolean>(false);

  // Toast System
  const [toasts, setToasts] = useState<{ id: string; msg: string; type?: 'info' | 'success' | 'error' }[]>([]);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<{ student: Student; txn?: Transaction | null } | null>(null);

  // Chat scroll refs
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const adminChatBottomRef = useRef<HTMLDivElement | null>(null);

  // Toast Trigger
  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Screen Switcher
  const showScreen = (id: ScreenId) => {
    // Strict Guard: Admin screens require verified admin privileges
    if ((id === 'adminDashboard' || id === 'adminAIScreen' || id === 'addStudentScreen') && !isAdminLoggedIn) {
      showToast('⚠️ Admin privileges required to access accounts console', 'error');
      setScreen('adminLoginScreen');
      return;
    }
    setScreen(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = (id: ScreenId) => {
    showScreen(id);
  };

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const loadedStudents = await DataService.fetchAllStudents();
    setStudents(loadedStudents);
    const loadedTxns = await DataService.fetchTransactions();
    setTransactions(loadedTxns);
  };

  // Sync Student History & calculate fee clearance status whenever currentUser or transactions change
  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      const studentTxns = transactions.filter(t => t.studentId === currentUser.id);
      setHistoryListState(studentTxns);
      DataService.calculateStudentStatus(currentUser, studentTxns)
        .then(res => {
          if (isMounted) setCurrentUserFeeStatus(res);
        })
        .catch(err => {
          console.error('Error calculating fee status:', err);
        });
    } else {
      setCurrentUserFeeStatus(null);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, transactions]);

  // Expose legacy global functions for complete backward compatibility
  useEffect(() => {
    const win = window as any;
    win.showScreen = showScreen;
    win.goBack = goBack;
    win.showToast = showToast;
    win.studentLogin = handleStudentLogin;
    win.adminLogin = handleAdminLogin;
    win.openPayment = () => {
      setPaymentSuccessDetails(null);
      showScreen('paymentModal');
    };
    win.submitPayment = handleStartRazorpayPayment;
    win.toggleNotification = () => setIsNotificationOpen(prev => !prev);
    win.openAIChat = () => {
      if (studentMessages.length === 0) {
        setStudentMessages([
          {
            id: 'init_1',
            role: 'ai',
            text: 'Namaste! 🙏 Main aapka GIIT Fee Assistant hoon. Aap mujhse apne dues, payment status, online fees deposit, ya ledger ke baare mein pooch sakte hain!'
          }
        ]);
      }
      showScreen('aiChatScreen');
    };
    win.openAdminAI = () => {
      if (adminMessages.length === 0) {
        setAdminMessages([
          {
            id: 'init_admin',
            role: 'ai',
            text: 'Hello Admin! 👋 Main aapka AI Accounts Analytics Assistant hoon. Real-time fee collections, pending amounts, course-wise statistics aur defaulters report ke baare mein kuch bhi pooch sakte hain.'
          }
        ]);
      }
      showScreen('adminAIScreen');
    };
    win.searchStudents = handleSearchInput;
    win.edit = handleEditPaid;
    win.deleteStudent = handleDeleteStudent;
    win.addStudent = handleAddStudent;
    win.askSuggestion = handleStudentSuggestion;
    win.askAdminSuggestion = handleAdminSuggestion;
    win.sendChat = handleSendStudentChat;
    win.sendAdminChat = handleSendAdminChat;
  }, [currentUser, studentIdInput, mobileInput, adminMobileInput, adminPasswordInput, payAmountInput, isProcessingPayment, students, transactions]);

  // Scroll chats on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [studentMessages, isChatTyping]);

  useEffect(() => {
    adminChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminMessages, isAdminChatTyping]);

  // Student Login Handler
  async function handleStudentLogin() {
    const student = await DataService.loginStudent(studentIdInput, mobileInput);
    if (!student) {
      showToast('❌ Invalid Student ID or Mobile Number', 'error');
      return;
    }
    setCurrentUser(student);
    setIsAdminLoggedIn(false);
    showToast(`Welcome, ${student.name}!`, 'success');
    showScreen('studentDashboard');
  }

  // Admin Login Handler
  function handleAdminLogin() {
    if (adminMobileInput.trim() === '9334777278' && adminPasswordInput.trim() === 'Aditya@1205') {
      setIsAdminLoggedIn(true);
      setCurrentUser(null);
      showToast('✅ Admin Authenticated Successfully', 'success');
      showScreen('adminDashboard');
      loadAllData();
    } else {
      showToast('❌ Invalid Admin Credentials', 'error');
    }
  }

  // Logout Handler
  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
    setStudentIdInput('');
    setMobileInput('');
    setAdminMobileInput('');
    setAdminPasswordInput('');
    showToast('Signed out successfully', 'info');
    showScreen('loginScreen');
  };

  // Helper to ensure Razorpay SDK is loaded
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise(resolve => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        // If already loaded
        if ((window as any).Razorpay) resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Razorpay Order Creation & Checkout Handler
  async function handleStartRazorpayPayment() {
    if (!currentUser) {
      showToast('⚠️ Please login to your student account first', 'error');
      return;
    }

    const amt = Number(payAmountInput);
    if (!amt || isNaN(amt) || amt <= 0) {
      showToast('⚠️ Please enter a valid fee amount (₹)', 'error');
      return;
    }

    const total = currentUser.total || 0;
    const paid = currentUser.paid || 0;
    const pending = Math.max(0, total - paid);

    if (pending > 0 && amt > pending) {
      const proceed = confirm(`Note: The entered amount (₹${amt.toLocaleString('en-IN')}) is greater than your current pending balance (₹${pending.toLocaleString('en-IN')}). Do you wish to proceed with advance fee credit?`);
      if (!proceed) return;
    }

    setIsProcessingPayment(true);
    showToast('Connecting to GIIT Razorpay Live Gateway...', 'info');

    try {
      const scriptReady = await ensureRazorpayLoaded();
      if (!scriptReady || !(window as any).Razorpay) {
        setIsProcessingPayment(false);
        showToast('❌ Unable to load Razorpay payment SDK. Please verify your connection.', 'error');
        return;
      }

      const statusCaseKey = currentUserFeeStatus?.statusCase || currentUserFeeStatus?.breakdown?.caseType || 'STANDARD';
      const effectiveDue = currentUserFeeStatus?.effectiveDueAmount ?? currentUserFeeStatus?.totalPending ?? 0;
      const isAdvancePayment = currentUserFeeStatus
        ? amt > effectiveDue || currentUserFeeStatus.status === 'ADVANCE_PAID' || statusCaseKey === 'CASE_A'
        : false;
      const targetSem = currentUserFeeStatus?.semester || currentUserFeeStatus?.currentSem || currentUser.sem;
      const cycleName = currentUserFeeStatus?.activeCycle?.cycleName || currentCycle.cycleName;

      // 1. Create order on server
      const orderRes = await DataService.createRazorpayOrder(amt, currentUser, {
        feeCycle: cycleName,
        isAdvance: isAdvancePayment,
        targetSemester: targetSem
      });

      if (!orderRes.success || !orderRes.orderId || !orderRes.keyId) {
        setIsProcessingPayment(false);
        showToast(`❌ Gateway Order Failed: ${orderRes.error || 'Server error'}`, 'error');
        return;
      }

      // 2. Launch Razorpay Standard Checkout
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'Global Institute of Information & Technology',
        description: `Fee Payment (${targetSem} • ${cycleName}) • ${currentUser.name}`,
        image: 'https://iili.io/B8DynWP.png',
        order_id: orderRes.orderId,
        prefill: {
          name: currentUser.name,
          contact: currentUser.mobile
        },
        notes: {
          studentId: currentUser.id,
          studentName: currentUser.name,
          course: currentUser.course,
          semester: targetSem,
          feeCycle: cycleName,
          isAdvance: isAdvancePayment ? 'true' : 'false',
          institution: 'GIIT Accounts'
        },
        theme: {
          color: '#1d4ed8'
        },
        handler: async function (response: any) {
          // 3. Razorpay callback -> Verify signature on backend
          await handleVerifyAndCreditPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            amt
          );
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            showToast('Payment window closed by user', 'info');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsProcessingPayment(false);
        const desc = resp?.error?.description || resp?.error?.reason || 'Payment was declined or cancelled by bank.';
        showToast(`❌ Payment Failed: ${desc}`, 'error');
      });

      rzp.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      console.error('Error initiating Razorpay checkout:', err);
      showToast(`❌ Payment Gateway Error: ${err.message || 'Unable to connect to gateway'}`, 'error');
    }
  }

  // Server-Side Payment Verification & Atomic Ledger Update
  async function handleVerifyAndCreditPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    amt: number
  ) {
    if (!currentUser) return;
    setIsProcessingPayment(true);
    showToast('🔐 Cryptographically verifying payment with banking gateway...', 'info');

    try {
      // 1. Mandatory server-side HMAC SHA256 signature verification
      const verifyRes = await DataService.verifyRazorpayPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        studentId: currentUser.id,
        studentDocId: currentUser.docId,
        amount: amt
      });

      if (!verifyRes.success) {
        setIsProcessingPayment(false);
        showToast(`❌ Verification Failed: ${verifyRes.error || 'Invalid signature received from gateway'}`, 'error');
        return;
      }

      const statusCaseKey = currentUserFeeStatus?.statusCase || currentUserFeeStatus?.breakdown?.caseType || 'STANDARD';
      const effectiveDue = currentUserFeeStatus?.effectiveDueAmount ?? currentUserFeeStatus?.totalPending ?? 0;
      const isAdvancePayment = currentUserFeeStatus
        ? amt > effectiveDue || currentUserFeeStatus.status === 'ADVANCE_PAID' || statusCaseKey === 'CASE_A'
        : false;
      const targetSem = currentUserFeeStatus?.semester || currentUserFeeStatus?.currentSem || currentUser.sem;
      const cycleName = currentUserFeeStatus?.activeCycle?.cycleName || currentCycle.cycleName;

      // 2. Record verified transaction and update student's paid fee
      const recordRes = await DataService.recordVerifiedPayment(
        currentUser,
        amt,
        paymentId,
        orderId,
        {
          feeCycle: cycleName,
          isAdvance: isAdvancePayment,
          targetSemester: targetSem
        }
      );

      setIsProcessingPayment(false);
      setPayAmountInput('');

      // Update current student in active React state
      setCurrentUser(prev => prev ? { ...prev, paid: (prev.paid || 0) + amt } : null);

      // Celebration effect
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

      // Save success details to show in UI
      setPaymentSuccessDetails({
        amount: amt,
        paymentId: paymentId,
        orderId: orderId,
        receiptNo: `GIIT-RP-${paymentId.replace(/^pay_/, '').slice(-8)}`
      });

      if (verifyRes.alreadyProcessed || recordRes.alreadyProcessed) {
        showToast(`ℹ️ Payment was already recorded and verified. (Ref: ${paymentId})`, 'info');
      } else {
        showToast(`✅ Payment Successful! Credited ₹${amt.toLocaleString('en-IN')} (Ref: ${paymentId})`, 'success');
      }

      // Refresh all collections
      await loadAllData();
    } catch (err: any) {
      setIsProcessingPayment(false);
      console.error('Error during payment verification:', err);
      showToast(`❌ Verification Error: ${err.message || 'Verification could not be completed'}`, 'error');
    }
  }

  // Add Student Handler
  async function handleAddStudent() {
    const id = newIdInput.trim();
    const name = newNameInput.trim();
    const mob = newMobileInput.trim();
    const total = Number(newTotalInput) || 35000;
    const annual = Number(newAnnualFeeInput) || total;
    const prevPending = Number(newPreviousPendingInput) || 0;

    if (!id || !name || !mob) {
      showToast('⚠️ Please complete all required student fields (ID, Name, Mobile)', 'error');
      return;
    }

    // Strict validation against course rules & backend checks
    const valResult = await DataService.validateStudentData({
      course: newCourseInput,
      sem: newSemInput,
      studentId: id,
      mobile: mob,
      total
    });

    if (!valResult.valid) {
      showToast(`❌ ${valResult.error || 'Invalid student data'}`, 'error');
      return;
    }

    try {
      const added = await DataService.addStudent({
        id,
        name,
        mobile: mob,
        total,
        annualFee: annual,
        installmentAmount: Math.round(annual / 2),
        previousPendingFee: prevPending,
        course: newCourseInput,
        sem: newSemInput
      });

      setNewIdInput('');
      setNewNameInput('');
      setNewMobileInput('');
      setNewTotalInput('35000');
      setNewAnnualFeeInput('35000');
      setNewPreviousPendingInput('0');
      showToast(`✅ Student ${added.name} registered with verified semester fee structure!`, 'success');
      await loadAllData();
      showScreen('adminDashboard');
    } catch (err: any) {
      showToast(`❌ ${err.message || 'Could not register student'}`, 'error');
    }
  }

  // Edit Paid Fee Handler
  async function handleEditPaid(docId: string, currentPaid: number) {
    const val = prompt('Enter additional fee amount to credit (in ₹):', '5000');
    if (!val || isNaN(Number(val)) || Number(val) <= 0) return;

    await DataService.editPaid(docId, Number(val));
    showToast(`✅ Added ₹${Number(val).toLocaleString('en-IN')} to student ledger!`, 'success');
    await loadAllData();
  }

  // Delete Student Handler
  async function handleDeleteStudent(docId: string) {
    if (!confirm('Are you sure you want to delete this student record from the GIIT database?')) return;
    await DataService.deleteStudent(docId);
    showToast('🗑 Student record removed', 'info');
    await loadAllData();
  }

  // Student AI Chat Handlers
  async function handleSendStudentChat() {
    const text = chatInputText.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text };
    setStudentMessages(prev => [...prev, userMsg]);
    setChatInputText('');
    setIsChatTyping(true);

    const total = currentUser?.total || 0;
    const paid = currentUser?.paid || 0;
    const pending = total - paid;
    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

    const context = `
Student Information:
- Name: ${currentUser?.name || 'Student'}
- Student ID: ${currentUser?.id || 'N/A'}
- Course: ${currentUser?.course || 'BCA'}
- Semester: ${currentUser?.sem || 'Sem 1'}
- Total Fee: ₹${total.toLocaleString('en-IN')}
- Paid Amount: ₹${paid.toLocaleString('en-IN')}
- Pending Amount: ₹${pending.toLocaleString('en-IN')}
- Payment Progress: ${pct}%
- Payment Gateway: Razorpay Live Gateway (UPI, Cards, Net Banking)
Institute: Global Institute of Information & Technology (GIIT)
`;

    const systemPrompt = `You are a respectful and accurate fee assistant for GIIT (Global Institute of Information & Technology).
Reply naturally in Hindi, Hinglish, or English depending on how the student asked.
Keep answers concise, professional, and clear.
${context}`;

    const reply = await DataService.callGemini(systemPrompt, text);
    setIsChatTyping(false);
    setStudentMessages(prev => [...prev, { id: 'ai_' + Date.now(), role: 'ai', text: reply }]);
  }

  function handleStudentSuggestion(promptText: string) {
    setChatInputText(promptText);
    setTimeout(() => {
      const userMsg: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text: promptText };
      setStudentMessages(prev => [...prev, userMsg]);
      setChatInputText('');
      setIsChatTyping(true);

      const total = currentUser?.total || 0;
      const paid = currentUser?.paid || 0;
      const pending = total - paid;
      const context = `Student: ${currentUser?.name}, Course: ${currentUser?.course}, Total: ₹${total}, Paid: ₹${paid}, Pending: ₹${pending}, Gateway: Razorpay Live Gateway`;

      DataService.callGemini(`You are GIIT Fee Assistant. Answer clearly in Hinglish/Hindi: ${context}`, promptText)
        .then(reply => {
          setIsChatTyping(false);
          setStudentMessages(prev => [...prev, { id: 'ai_' + Date.now(), role: 'ai', text: reply }]);
        });
    }, 50);
  }

  // Admin AI Chat Handlers
  async function handleSendAdminChat() {
    const text = adminChatInputText.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text };
    setAdminMessages(prev => [...prev, userMsg]);
    setAdminChatInputText('');
    setIsAdminChatTyping(true);

    const totalStudents = students.length;
    const totalFee = students.reduce((a, s) => a + (s.total || 0), 0);
    const totalPaid = students.reduce((a, s) => a + (s.paid || 0), 0);
    const totalPending = Math.max(0, totalFee - totalPaid);

    const context = `
GIIT ADMIN ACCOUNTS DATA:
Total Students: ${totalStudents}
Total Fees: ₹${totalFee.toLocaleString('en-IN')}
Total Collected: ₹${totalPaid.toLocaleString('en-IN')}
Total Pending: ₹${totalPending.toLocaleString('en-IN')}
Collection Rate: ${totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0}%
All Students: ${students.map(s => `${s.name} (${s.course} ${s.sem}): Paid ₹${s.paid} of ₹${s.total}`).join('; ')}
`;

    const systemPrompt = `You are an intelligent Accounts Analytics Assistant for GIIT administration.
Provide precise, data-driven answers using Indian currency formatting (₹).
Reply in professional Hindi/Hinglish or English based on user prompt.
${context}`;

    const reply = await DataService.callGemini(systemPrompt, text);
    setIsAdminChatTyping(false);
    setAdminMessages(prev => [...prev, { id: 'ai_' + Date.now(), role: 'ai', text: reply }]);
  }

  function handleAdminSuggestion(promptText: string) {
    setAdminChatInputText(promptText);
    setTimeout(() => {
      const userMsg: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text: promptText };
      setAdminMessages(prev => [...prev, userMsg]);
      setAdminChatInputText('');
      setIsAdminChatTyping(true);

      const totalFee = students.reduce((a, s) => a + (s.total || 0), 0);
      const totalPaid = students.reduce((a, s) => a + (s.paid || 0), 0);

      DataService.callGemini(`GIIT Accounts: Total Fees ₹${totalFee}, Collected ₹${totalPaid}, Total Students ${students.length}. Provide concise summary:`, promptText)
        .then(reply => {
          setIsAdminChatTyping(false);
          setAdminMessages(prev => [...prev, { id: 'ai_' + Date.now(), role: 'ai', text: reply }]);
        });
    }, 50);
  }

  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInputVal(e.target.value);
  }

  // Filtered Students for Admin List
  const filteredStudents = students.filter(s => {
    const q = searchInputVal.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.mobile.includes(q) ||
      s.course.toLowerCase().includes(q) ||
      s.sem.toLowerCase().includes(q);

    const matchesCourse = selectedCourseFilter === 'ALL' || s.course === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  // Pending Transactions for Notification Dropdown
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  // Calculations for current student
  const studentTotal = currentUser?.total || 0;
  const studentPaid = currentUser?.paid || 0;
  const studentPending = Math.max(0, studentTotal - studentPaid);
  const studentPct = studentTotal > 0 ? Math.round((studentPaid / studentTotal) * 100) : 0;

  // Calculations for admin dashboard
  const adminTotalStudents = students.length;
  const adminTotalFee = students.reduce((a, s) => a + (s.total || 0), 0);
  const adminTotalPaid = students.reduce((a, s) => a + (s.paid || 0), 0);
  const adminTotalPending = Math.max(0, adminTotalFee - adminTotalPaid);
  const adminCollectionRate = adminTotalFee > 0 ? Math.round((adminTotalPaid / adminTotalFee) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-12">
      {/* Toast Notification Container */}
      <div id="toastContainer" className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast depth-card-elevated px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 shadow-lg rounded-xl flex items-center gap-2.5 pointer-events-auto transition-all animate-in fade-in slide-in-from-top-3"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Official Collegiate Header */}
      <Header
        currentScreen={screen}
        onNavigate={showScreen}
        isAdminLoggedIn={isAdminLoggedIn}
        isStudentLoggedIn={!!currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7">

        {/* ============================================================ */}
        {/* SCREEN 1: STUDENT LOGIN                                      */}
        {/* ============================================================ */}
        <section
          id="loginScreen"
          className={`screen ${screen === 'loginScreen' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-md mx-auto">
            {/* Top Credibility Banner */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs mb-2">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                GIIT Student Accounts Directorate
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Student Fee Portal Login</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Access your semester fee dues, installment ledgers, and verified payment receipts.
              </p>
            </div>

            {/* Elevated 3D Auth Card */}
            <div className="depth-card bg-white p-6 sm:p-7 border border-slate-200 relative">
              <div className="screen-icon w-12 h-12 mx-auto mb-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-5">
                Sign In to Student Account
              </h3>

              {/* Student ID Input */}
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Student Registration / Roll ID
              </label>
              <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 mb-4 bg-slate-50 border border-slate-300">
                <span className="input-icon text-slate-400 mr-2.5">
                  <UserCheck className="w-4 h-4" />
                </span>
                <input
                  id="studentId"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  placeholder="Student ID"
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                />
              </div>

              {/* Mobile Number Input */}
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Registered Mobile Number
              </label>
              <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 mb-5 bg-slate-50 border border-slate-300">
                <span className="input-icon text-slate-400 mr-2.5">
                  <span className="text-xs font-bold text-slate-500">+91</span>
                </span>
                <input
                  id="mobile"
                  type="tel"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  placeholder="Mobile Number"
                  value={mobileInput}
                  onChange={e => setMobileInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                />
              </div>

              {/* Action Buttons */}
              <button
                id="loginStudentBtn"
                onClick={handleStudentLogin}
                className="btn btn-primary btn-3d-primary depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 mb-3 flex items-center justify-center gap-2"
              >
                <span>Login as Student</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative px-3 bg-white text-[11px] font-semibold text-slate-400 uppercase">
                  Institutional Staff Access
                </span>
              </div>

              <button
                id="toAdminLoginBtn"
                onClick={() => {
                  setAdminMobileInput('');
                  setAdminPasswordInput('');
                  showScreen('adminLoginScreen');
                }}
                className="btn btn-secondary btn-3d-secondary depth-btn w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Admin & Accounts Officer Login</span>
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 2: ADMIN LOGIN                                        */}
        {/* ============================================================ */}
        <section
          id="adminLoginScreen"
          className={`screen ${screen === 'adminLoginScreen' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={() => {
                setAdminMobileInput('');
                setAdminPasswordInput('');
                goBack('loginScreen');
              }}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Login</span>
            </button>

            <div className="depth-card bg-white p-6 sm:p-7 border border-slate-200">
              <div className="screen-icon w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                Accounts Officer Verification
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5">
                Authorized access for GIIT fee management and approvals.
              </p>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Mobile ID
              </label>
              <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 mb-4 bg-slate-50 border border-slate-300">
                <span className="input-icon text-slate-400 mr-2.5">
                  <span className="text-xs font-bold text-slate-500">+91</span>
                </span>
                <input
                  id="adminMobile"
                  type="tel"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  placeholder="Admin Mobile / ID"
                  value={adminMobileInput}
                  onChange={e => setAdminMobileInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Security Password
              </label>
              <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 mb-5 bg-slate-50 border border-slate-300">
                <span className="input-icon text-slate-400 mr-2.5">🔒</span>
                <input
                  id="adminPassword"
                  type="password"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                  placeholder="Password"
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>

              <button
                id="adminLoginBtn"
                onClick={handleAdminLogin}
                className="btn btn-dark btn-3d-dark depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 mb-2 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify & Enter Admin Console</span>
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 3: STUDENT DASHBOARD                                  */}
        {/* ============================================================ */}
        <section
          id="studentDashboard"
          className={`screen ${screen === 'studentDashboard' ? 'active block' : 'hidden'}`}
        >
          {currentUser && (
            <div className="space-y-5">
              {/* Back / Logout button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => goBack('loginScreen')}
                  className="back-btn"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Switch Account / Sign Out</span>
                </button>
                <span className="text-xs font-medium text-slate-500">
                  Refreshed: {new Date().toLocaleDateString('en-IN')}
                </span>
              </div>

              {/* Student Identity Banner */}
              <div className="student-header depth-card bg-white p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    id="studentAvatar"
                    className="student-avatar w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-700 text-white font-bold text-lg sm:text-xl flex items-center justify-center shadow-md flex-shrink-0"
                  >
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id="studentName" className="text-base sm:text-lg font-bold text-slate-900">
                        {currentUser.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active Enrolled
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span id="studentCourse" className="badge px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        {currentUser.course}
                      </span>
                      <span id="studentSem" className="badge badge-sem px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                        {currentUser.sem}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {currentUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Print/View Statement */}
                <button
                  onClick={() => setSelectedReceipt({ student: currentUser, txn: null })}
                  className="depth-btn btn-3d-secondary px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>View Official Fee Statement</span>
                </button>
              </div>

              {/* Academic Fee Cycle & Advance Clearance Banner */}
              <div className="space-y-3">
                {/* Academic Cycle Header Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-medium shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold tracking-wide">
                      Academic Cycle: {currentUserFeeStatus?.activeCycle?.cycleName || currentCycle.cycleName}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-300">
                      {currentUserFeeStatus?.activeCycle?.semType || currentCycle.semType} Semesters Cycle ({currentUserFeeStatus?.activeCycle?.targetSemesters?.join(', ') || currentCycle.targetSemesters.join(', ')})
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-300 font-mono bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-800">
                    Policy: Fee Collected 1 Semester in Advance
                  </span>
                </div>

                {/* Case A / Case B / Case C Banner */}
                {currentUserFeeStatus && (() => {
                  const statusCaseKey = currentUserFeeStatus.statusCase || currentUserFeeStatus.breakdown?.caseType || 'STANDARD';
                  const prevPending = currentUserFeeStatus.previousPendingFee ?? currentUserFeeStatus.breakdown?.previousPending ?? 0;
                  const newSemFee = currentUserFeeStatus.newSemesterFee ?? currentUserFeeStatus.breakdown?.semesterFee ?? 0;
                  const totalDue = currentUserFeeStatus.totalDueAmount ?? currentUserFeeStatus.totalPending ?? (prevPending + newSemFee);
                  return (
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                        statusCaseKey === 'CASE_A'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                          : statusCaseKey === 'CASE_B'
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {statusCaseKey === 'CASE_A' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        ) : statusCaseKey === 'CASE_B' ? (
                          <AlertCircle className="w-5 h-5 text-rose-700" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-700" />
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-sm tracking-tight">
                            {currentUserFeeStatus.statusLabel || currentUserFeeStatus.statusMessage || 'Fee Status'}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              statusCaseKey === 'CASE_A'
                                ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                                : statusCaseKey === 'CASE_B'
                                ? 'bg-rose-200/80 text-rose-900 border border-rose-300'
                                : 'bg-amber-200/80 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {statusCaseKey.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="leading-relaxed font-normal opacity-90">
                          {currentUserFeeStatus.statusDescription || currentUserFeeStatus.statusMessage}
                        </p>
                        {statusCaseKey === 'CASE_B' && (
                          <div className="mt-2 pt-2 border-t border-rose-200 font-mono text-[11px] text-rose-900 flex flex-wrap items-center gap-2">
                            <span>Previous Pending: ₹{prevPending.toLocaleString('en-IN')}</span>
                            <span>+</span>
                            <span>New Semester Fee: ₹{newSemFee.toLocaleString('en-IN')}</span>
                            <span>=</span>
                            <span className="font-bold">Total Due: ₹{totalDue.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 3D Fee Overview Grid (Elevated Metric Surfaces) */}
              <div className="fee-grid grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Total Fee Card */}
                <div className="fee-card fee-total depth-card bg-white p-4 sm:p-5 border border-slate-200 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="fee-label text-xs font-bold uppercase tracking-wider text-slate-500">
                      Annual Fee & Installment
                    </span>
                    <Building className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="fee-amount text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    ₹<span>{(currentUserFeeStatus?.annualFee || studentTotal).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Semester Installment: <b className="text-slate-800">₹{(currentUserFeeStatus?.semesterInstallment || Math.round(studentTotal / 2)).toLocaleString('en-IN')}</b> (Annual / 2)
                  </p>
                </div>

                {/* Paid Fee Card */}
                <div className="fee-card fee-paid depth-card bg-white p-4 sm:p-5 border border-slate-200 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="fee-label text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Total Fee Cleared
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="fee-amount text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
                    ₹<span id="paidFees">{studentPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-emerald-600/90 font-medium mt-1">
                    {currentUserFeeStatus && currentUserFeeStatus.advanceFeePaid > 0
                      ? `Includes ₹${currentUserFeeStatus.advanceFeePaid.toLocaleString('en-IN')} advance payment`
                      : `Verified by Accounts (${studentPct}% completed)`}
                  </p>
                </div>

                {/* Pending Balance Card */}
                <div className="fee-card fee-pending depth-card bg-white p-4 sm:p-5 border border-slate-200 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="fee-label text-xs font-bold uppercase tracking-wider text-rose-700">
                      Outstanding Dues
                    </span>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="fee-amount text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    ₹<span id="pendingFees">{(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending) > 0
                      ? 'Advance clearance required before semester start'
                      : 'All semester fees completely cleared!'}
                  </p>
                </div>
              </div>

              {/* Progress Bar with physical track */}
              <div className="progress-wrap depth-card bg-white p-4 border border-slate-200">
                <div className="progress-label flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    Semester Fee Clearance Progress
                  </span>
                  <span id="progressPercent" className="font-bold text-slate-900">
                    {studentPct}%
                  </span>
                </div>
                <div className="progress-bar w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    id="progressFill"
                    className="progress-fill h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${studentPct}%` }}
                  />
                </div>
              </div>

              {/* Main 2-Column Section on Desktop: Chart & Payment Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart Card */}
                <div className="chart-wrap depth-card bg-white p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Fee Breakdown Chart
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">Real-time Ledger</span>
                  </div>
                  <StudentChart
                    paid={studentPaid}
                    pending={currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending}
                    advancePaid={currentUserFeeStatus?.advanceFeePaid || 0}
                  />
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div>Cleared: <b className="text-emerald-700">₹{studentPaid.toLocaleString('en-IN')}</b></div>
                    <div>Advance: <b className="text-blue-700">₹{(currentUserFeeStatus?.advanceFeePaid || 0).toLocaleString('en-IN')}</b></div>
                    <div>Dues: <b className="text-rose-700">₹{(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending).toLocaleString('en-IN')}</b></div>
                  </div>
                </div>

                {/* Action Hub Card */}
                <div className="depth-card bg-white p-5 border border-slate-200 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Online Fee Payment & Support
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Instant zero-convenience fee transfer through UPI, Net Banking, or GIIT QR code. All transactions receive official verified e-receipts.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Pay Now Button */}
                    <button
                      id="openPaymentModalBtn"
                      onClick={() => {
                        setPaymentSuccessDetails(null);
                        showScreen('paymentModal');
                      }}
                      className="btn btn-success btn-3d-success depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Make Online Payment (Pay Now)</span>
                    </button>

                    {/* AI Assistant Button */}
                    <button
                      id="openStudentAIBtn"
                      onClick={() => (window as any).openAIChat()}
                      className="btn btn-ai btn-3d-ai depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2"
                    >
                      <Bot className="w-4 h-4 text-blue-700" />
                      <span>Ask GIIT Fee Assistant (AI)</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-blue-700 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-950">Razorpay Live Gateway Active</p>
                      <p className="text-[11px] text-blue-700">Instant credit clearance via Cards, UPI, & Net Banking</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History Section */}
              <div className="depth-card bg-white p-4 sm:p-5 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <h4 className="section-title text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    Payment Transaction History
                  </h4>
                  <span className="text-xs text-slate-500">{historyListState.length} Record(s)</span>
                </div>

                <div id="historyList" className="space-y-2.5">
                  {historyListState.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No prior payment transactions recorded for this student.
                    </div>
                  ) : (
                    historyListState.map((t, idx) => (
                      <div
                        key={t.docId || idx}
                        className="txn-card depth-input p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{t.amount.toLocaleString('en-IN')}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === 'done' || t.status === 'SUCCESS' || t.status === 'CAPTURED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : t.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {t.status === 'done' || t.status === 'SUCCESS' || t.status === 'CAPTURED'
                                ? '✓ Verified (Razorpay)'
                                : t.status === 'rejected'
                                ? '✕ Rejected'
                                : '⏳ Pending Accounts Approval'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            Ref: <span className="text-slate-700 font-semibold">{t.razorpayPaymentId || t.txnId}</span>
                            {t.razorpayOrderId && (
                              <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">({t.razorpayOrderId})</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {(t.status === 'done' || t.status === 'SUCCESS' || t.status === 'CAPTURED') && (
                            <button
                              onClick={() => setSelectedReceipt({ student: currentUser, txn: t })}
                              className="depth-btn btn-3d-secondary px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              Receipt
                            </button>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {t.createdAt || 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* SCREEN 4: MAKE PAYMENT MODAL                                 */}
        {/* ============================================================ */}
        <section
          id="paymentModal"
          className={`screen ${screen === 'paymentModal' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => {
                setPaymentSuccessDetails(null);
                goBack('studentDashboard');
              }}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Dashboard</span>
            </button>

            <div className="depth-card bg-white p-5 sm:p-7 border border-slate-200">
              {paymentSuccessDetails ? (
                /* Payment Success View */
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    Fee Payment Successful!
                  </h3>
                  <p className="text-xs text-slate-500 mb-5">
                    Your fee payment was verified and cleared by Razorpay Live Gateway.
                  </p>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2.5 mb-6 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500">Student Name:</span>
                      <span className="font-bold text-slate-800">{currentUser?.name}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-700 text-sm font-mono">
                        ₹{paymentSuccessDetails.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500">Razorpay Payment ID:</span>
                      <span className="font-mono font-bold text-blue-800">{paymentSuccessDetails.paymentId}</span>
                    </div>
                    {paymentSuccessDetails.orderId && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <span className="text-slate-500">Razorpay Order ID:</span>
                        <span className="font-mono text-slate-600 text-[11px]">{paymentSuccessDetails.orderId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Verification Status:</span>
                      <span className="font-bold text-emerald-700">✓ VERIFIED & CREDITED</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      onClick={() => {
                        const txn = transactions.find(t => t.razorpayPaymentId === paymentSuccessDetails.paymentId || t.txnId === paymentSuccessDetails.paymentId);
                        if (currentUser) {
                          setSelectedReceipt({
                            student: currentUser,
                            txn: txn || {
                              id: 'txn_' + Date.now(),
                              studentId: currentUser.id,
                              studentName: currentUser.name,
                              amount: paymentSuccessDetails.amount,
                              status: 'done',
                              txnId: paymentSuccessDetails.paymentId,
                              razorpayPaymentId: paymentSuccessDetails.paymentId,
                              razorpayOrderId: paymentSuccessDetails.orderId,
                              paymentSource: 'Razorpay Live Gateway'
                            }
                          });
                        }
                      }}
                      className="btn btn-3d-primary depth-btn w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download / Print Receipt</span>
                    </button>
                    <button
                      onClick={() => {
                        setPaymentSuccessDetails(null);
                        showScreen('studentDashboard');
                      }}
                      className="btn btn-3d-secondary depth-btn w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment Initiation View */
                <div>
                  <div className="screen-icon w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                    Razorpay Online Fee Payment
                  </h3>
                  <p className="text-xs text-slate-500 text-center mb-5">
                    Live collegiate fee gateway supporting UPI, Debit/Credit Cards, and Net Banking
                  </p>

                  {/* Student Fee Summary Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Student Name:</span>
                      <span className="font-bold text-slate-800">{currentUser?.name} ({currentUser?.id})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Course & Semester:</span>
                      <span className="font-semibold text-slate-700">{currentUser?.course} — {currentUser?.sem}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Academic Fee Cycle:</span>
                      <span className="font-mono text-slate-700">{currentUserFeeStatus?.activeCycle?.cycleName || currentCycle.cycleName}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Effective Outstanding Due:</span>
                      <span className="font-bold text-base text-rose-700 font-mono">
                        ₹{(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details Form */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Fee Payment Amount (₹)
                        </label>
                        {currentUser && (
                          <button
                            type="button"
                            onClick={() => {
                              const amt = currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending;
                              setPayAmountInput(String(amt > 0 ? amt : (currentUserFeeStatus?.semesterInstallment || 17500)));
                            }}
                            className="text-[11px] text-blue-700 hover:underline font-semibold"
                          >
                            {(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending) > 0
                              ? `Pay Full Due (₹${(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending).toLocaleString('en-IN')})`
                              : `Pay Next Sem Installment (₹${(currentUserFeeStatus?.semesterInstallment || 17500).toLocaleString('en-IN')})`}
                          </button>
                        )}
                      </div>
                      <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                        <span className="input-icon text-slate-500 font-bold mr-2 text-sm">₹</span>
                        <input
                          id="payAmount"
                          type="number"
                          placeholder="e.g. 17500"
                          disabled={isProcessingPayment}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                          value={payAmountInput}
                          onChange={e => setPayAmountInput(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Quick amount chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 self-center">Quick Select:</span>
                      {(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending) > 0 && (
                        <button
                          type="button"
                          onClick={() => setPayAmountInput(String(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending))}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
                        >
                          Due ₹{(currentUserFeeStatus ? currentUserFeeStatus.effectiveDueAmount : studentPending).toLocaleString('en-IN')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPayAmountInput(String(currentUserFeeStatus?.semesterInstallment || 17500))}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                      >
                        Installment ₹{(currentUserFeeStatus?.semesterInstallment || 17500).toLocaleString('en-IN')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmountInput(String(currentUserFeeStatus?.annualFee || 35000))}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      >
                        Annual ₹{(currentUserFeeStatus?.annualFee || 35000).toLocaleString('en-IN')}
                      </button>
                    </div>

                    <button
                      id="submitPaymentBtn"
                      onClick={handleStartRazorpayPayment}
                      disabled={isProcessingPayment}
                      className="btn btn-success btn-3d-success depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 transition-all"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing Gateway Request...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-blue-200" />
                          <span>Pay Online with Razorpay</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>256-bit SSL Bank Encrypted • Razorpay Live Production Gateway</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 5: STUDENT AI CHAT                                    */}
        {/* ============================================================ */}
        <section
          id="aiChatScreen"
          className={`screen ${screen === 'aiChatScreen' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => goBack('studentDashboard')}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Dashboard</span>
            </button>

            <div className="depth-card bg-white p-5 border border-slate-200">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">GIIT Student Fee Assistant</h3>
                  <p className="text-[11px] text-slate-500">
                    Bilingual AI support for fee dues, payment verification & schedules.
                  </p>
                </div>
              </div>

              {/* Chat message box */}
              <div
                id="chatMessages"
                className="chat-messages h-72 overflow-y-auto pr-1 space-y-3 mb-3"
              >
                {studentMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`chat-bubble max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-700 text-white rounded-br-none shadow-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatTyping && (
                  <div className="flex justify-start">
                    <div className="chat-bubble p-3 rounded-2xl bg-slate-100 rounded-bl-none border border-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Suggestion Chips */}
              <div className="chat-suggestions flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => handleStudentSuggestion('Mera kitna fee baki hai?')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition font-medium"
                >
                  💬 Kitna fee baki hai?
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentSuggestion('Mujhe payment kaise karni hai?')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition font-medium"
                >
                  💬 Payment kaise karein?
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentSuggestion('Mera payment history dikhao')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition font-medium"
                >
                  💬 Payment history
                </button>
              </div>

              {/* Input row */}
              <div className="chat-input-row flex items-center gap-2">
                <div className="input-wrap depth-input flex-1 rounded-xl flex items-center px-3.5 py-2.5 bg-slate-50 border border-slate-300">
                  <input
                    id="chatInput"
                    placeholder="Apna sawaal yahan likhein (Hindi / English)..."
                    className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendStudentChat()}
                  />
                </div>
                <button
                  id="sendChatBtn"
                  onClick={handleSendStudentChat}
                  className="btn-3d-send send-btn depth-btn w-10 h-10 rounded-xl bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 6: ADMIN DASHBOARD                                    */}
        {/* ============================================================ */}
        <section
          id="adminDashboard"
          className={`screen ${screen === 'adminDashboard' ? 'active block' : 'hidden'}`}
        >
          <div className="space-y-5">
            {/* Admin Header Bar */}
            <div className="admin-header depth-card bg-white p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Accounts Management Console
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    Administrator
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time fee collections ledger, verification queue, and student records.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Notification / Transaction Ledger Trigger */}
                <div className="notif-wrap relative">
                  <button
                    onClick={() => setIsNotificationOpen(prev => !prev)}
                    className="notif-btn depth-btn px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>Payment Records</span>
                    <span
                      id="notifyCount"
                      className="notif-badge ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-700 text-white"
                    >
                      {transactions.length}
                    </span>
                  </button>

                  {/* Notification Dropdown Panel */}
                  <div
                    id="notificationBox"
                    className={`notif-box ${isNotificationOpen ? '' : 'hidden'} absolute right-0 mt-2 w-80 sm:w-96 depth-card-elevated bg-white p-3.5 border border-slate-200 shadow-xl z-40 rounded-xl max-h-96 overflow-y-auto`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                        <span>Gateway Payment Records ({transactions.length})</span>
                      </span>
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>

                    {transactions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No payment records registered yet in the system.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {transactions.map((t, idx) => (
                          <div
                            key={t.docId || idx}
                            className="txn-card p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>{t.studentName || t.studentId}</span>
                              <span className="text-emerald-700">₹{t.amount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                              <p>
                                Pay ID: <span className="font-bold text-blue-800">{t.razorpayPaymentId || t.txnId}</span>
                              </p>
                              {t.razorpayOrderId && (
                                <p className="text-slate-500">Order ID: {t.razorpayOrderId}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200">
                              <span className="font-bold text-emerald-700">
                                {t.status === 'done' || t.status === 'SUCCESS' || t.status === 'CAPTURED' ? '✓ Verified (Razorpay)' : t.status}
                              </span>
                              <div className="flex items-center gap-2">
                                <span>{t.createdAt || 'Recent'}</span>
                                <button
                                  onClick={() => {
                                    const studentMatch = students.find(s => s.id === t.studentId) || {
                                      id: t.studentId,
                                      name: t.studentName || t.studentId,
                                      mobile: 'N/A',
                                      course: 'N/A',
                                      sem: 'N/A',
                                      total: t.amount,
                                      paid: t.amount
                                    };
                                    setSelectedReceipt({ student: studentMatch, txn: t });
                                    setIsNotificationOpen(false);
                                  }}
                                  className="text-[10px] font-semibold text-blue-700 hover:underline flex items-center gap-0.5"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  Receipt
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Switch / Sign Out */}
                <button
                  onClick={handleLogout}
                  className="depth-btn btn-3d-secondary px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                >
                  Exit Admin
                </button>
              </div>
            </div>

            {/* Admin Stats Grid */}
            <div id="adminStats" className="admin-stats grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="stat-card depth-card bg-white p-4 border border-slate-200">
                <div className="stat-label text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Enrolled Students
                </div>
                <div className="stat-num text-2xl font-bold text-slate-900">{adminTotalStudents}</div>
                <span className="text-[10px] text-slate-400">Total Registered</span>
              </div>

              <div className="stat-card depth-card bg-white p-4 border border-slate-200">
                <div className="stat-label text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Total Collected
                </div>
                <div className="stat-num text-2xl font-bold text-emerald-700">
                  ₹{(adminTotalPaid / 1000).toFixed(1)}k
                </div>
                <span className="text-[10px] text-emerald-600">₹{adminTotalPaid.toLocaleString('en-IN')}</span>
              </div>

              <div className="stat-card depth-card bg-white p-4 border border-slate-200">
                <div className="stat-label text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                  Outstanding Dues
                </div>
                <div className="stat-num text-2xl font-bold text-rose-700">
                  ₹{(adminTotalPending / 1000).toFixed(1)}k
                </div>
                <span className="text-[10px] text-rose-600">₹{adminTotalPending.toLocaleString('en-IN')}</span>
              </div>

              <div className="stat-card depth-card bg-white p-4 border border-slate-200">
                <div className="stat-label text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                  Collection Rate
                </div>
                <div className="stat-num text-2xl font-bold text-blue-700">{adminCollectionRate}%</div>
                <span className="text-[10px] text-slate-400">Target: 85% by Finals</span>
              </div>
            </div>

            {/* Admin Analytics Chart */}
            <div className="chart-wrap depth-card bg-white p-4 sm:p-5 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Departmental Fee Collections & Dues Breakdown
                </span>
                <span className="text-xs text-slate-400">Session 2025–26</span>
              </div>
              <AdminChart students={students} />
            </div>

            {/* Admin Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="addStudentNavBtn"
                onClick={() => showScreen('addStudentScreen')}
                className="btn btn-primary btn-3d-primary depth-btn py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Student Record</span>
              </button>

              <button
                id="openAdminAIBtn"
                onClick={() => (window as any).openAdminAI()}
                className="btn btn-ai btn-3d-ai depth-btn py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4 text-blue-700" />
                <span>Launch AI Accounts Analytics Assistant</span>
              </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="depth-card bg-white p-4 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="input-wrap depth-input flex-1 w-full rounded-xl flex items-center px-3.5 py-2.5 bg-slate-50 border border-slate-300">
                  <span className="input-icon text-slate-400 mr-2">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="searchInput"
                    placeholder="Search by student name, ID, mobile, course, semester..."
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    value={searchInputVal}
                    onChange={handleSearchInput}
                  />
                  {searchInputVal && (
                    <button
                      onClick={() => setSearchInputVal('')}
                      className="text-xs text-slate-400 hover:text-slate-600 ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Course Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['ALL', 'BCA', 'BBA', 'B.Com', 'BA', 'B.Tech', 'MCA', 'MBA'].map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCourseFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        selectedCourseFilter === c
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Roster */}
              <div id="studentList" className="space-y-2.5 pt-2">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No matching student records located.
                  </div>
                ) : (
                  filteredStudents.map(s => {
                    const total = s.total || 0;
                    const paid = s.paid || 0;
                    const pending = Math.max(0, total - paid);
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

                    return (
                      <div
                        key={s.docId}
                        className="student-card depth-input p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                      >
                        <div className="student-card-header flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="student-card-name font-bold text-slate-900 text-sm">
                              {s.name}
                            </div>
                            <div className="student-card-id text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono">{s.id}</span>
                              <span>•</span>
                              <span className="font-semibold text-blue-700">{s.course}</span>
                              <span>•</span>
                              <span>{s.sem}</span>
                              <span>•</span>
                              <span>📱 {s.mobile}</span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="badge px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {pct}% Paid
                            </span>
                          </div>
                        </div>

                        {/* Metrics summary */}
                        <div className="grid grid-cols-3 gap-2 text-xs py-2 text-slate-600 border-t border-b border-slate-100">
                          <div>Total: <b className="text-slate-800">₹{total.toLocaleString('en-IN')}</b></div>
                          <div>Cleared: <b className="text-emerald-700">₹{paid.toLocaleString('en-IN')}</b></div>
                          <div>Pending: <b className="text-rose-700">₹{pending.toLocaleString('en-IN')}</b></div>
                        </div>

                        {/* Mini progress bar */}
                        <div className="mini-progress w-full h-1.5 rounded-full bg-slate-100 overflow-hidden my-2.5 border border-slate-200/50">
                          <div
                            className="mini-progress-fill h-full bg-emerald-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="student-card-actions flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setSelectedReceipt({ student: s, txn: null })}
                            className="depth-btn btn-3d-secondary px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-slate-600" />
                            Statement
                          </button>
                          <button
                            onClick={() => handleEditPaid(s.docId, s.paid)}
                            className="btn-edit btn-3d-primary depth-btn px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-700 text-white hover:bg-blue-800 flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Credit Paid
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.docId)}
                            className="btn-delete btn-3d-danger depth-btn px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 7: ADMIN AI SCREEN                                    */}
        {/* ============================================================ */}
        <section
          id="adminAIScreen"
          className={`screen ${screen === 'adminAIScreen' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => goBack('adminDashboard')}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Console</span>
            </button>

            <div className="depth-card bg-white p-5 border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400 shadow-2xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Accounts Analytics Assistant</h3>
                  <p className="text-[11px] text-slate-500">
                    Query financial reports, outstanding dues, course statistics, and collections.
                  </p>
                </div>
              </div>

              {/* Chat Message Box */}
              <div
                id="adminChatMessages"
                className="chat-messages h-72 overflow-y-auto pr-1 space-y-3 mb-3"
              >
                {adminMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`chat-bubble max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none shadow-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAdminChatTyping && (
                  <div className="flex justify-start">
                    <div className="chat-bubble p-3 rounded-2xl bg-slate-100 rounded-bl-none border border-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-700 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-slate-700 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-slate-700 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={adminChatBottomRef} />
              </div>

              {/* Suggestions */}
              <div className="chat-suggestions flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => handleAdminSuggestion('Total collection kitni hai?')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium"
                >
                  💬 Total collection
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminSuggestion('Sabse zyada pending fee kis student ki hai?')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium"
                >
                  💬 Max pending student
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminSuggestion('Course-wise fee summary do')}
                  className="suggestion-chip text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium"
                >
                  💬 Course summary
                </button>
              </div>

              {/* Input Row */}
              <div className="chat-input-row flex items-center gap-2">
                <div className="input-wrap depth-input flex-1 rounded-xl flex items-center px-3.5 py-2.5 bg-slate-50 border border-slate-300">
                  <input
                    id="adminChatInput"
                    placeholder="Ask about fee statistics, collection rate..."
                    className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                    value={adminChatInputText}
                    onChange={e => setAdminChatInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendAdminChat()}
                  />
                </div>
                <button
                  id="sendAdminChatBtn"
                  onClick={handleSendAdminChat}
                  className="btn-3d-dark send-btn depth-btn w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCREEN 8: ADD STUDENT                                        */}
        {/* ============================================================ */}
        <section
          id="addStudentScreen"
          className={`screen ${screen === 'addStudentScreen' ? 'active block' : 'hidden'}`}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={() => goBack('adminDashboard')}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Console</span>
            </button>

            <div className="depth-card bg-white p-6 sm:p-7 border border-slate-200">
              <div className="screen-icon w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                Register New Student
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5">
                Create ledger account in GIIT Student Database.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Student ID
                  </label>
                  <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300">
                    <span className="input-icon text-slate-400 mr-2 text-xs font-mono">🆔</span>
                    <input
                      id="newId"
                      placeholder="e.g. GIIT-2025-101"
                      className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                      value={newIdInput}
                      onChange={e => setNewIdInput(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Full Student Name
                  </label>
                  <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300">
                    <span className="input-icon text-slate-400 mr-2">👤</span>
                    <input
                      id="newName"
                      placeholder="e.g. Ananya Patel"
                      className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                      value={newNameInput}
                      onChange={e => setNewNameInput(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Registered Mobile Number
                  </label>
                  <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300">
                    <span className="input-icon text-slate-400 mr-2">📱</span>
                    <input
                      id="newMobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                      value={newMobileInput}
                      onChange={e => setNewMobileInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Annual Fee (₹)
                    </label>
                    <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300">
                      <span className="input-icon text-slate-500 font-bold mr-2 text-sm">₹</span>
                      <input
                        id="newAnnualFee"
                        type="number"
                        placeholder="e.g. 35000"
                        className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                        value={newAnnualFeeInput}
                        onChange={e => {
                          setNewAnnualFeeInput(e.target.value);
                          setNewTotalInput(e.target.value);
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Installment: <b className="text-slate-800">₹{Math.round((Number(newAnnualFeeInput) || 35000) / 2).toLocaleString('en-IN')}</b> (Annual / 2)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Previous Pending Dues (₹)
                    </label>
                    <div className="input-wrap depth-input rounded-xl flex items-center px-3.5 py-3 bg-slate-50 border border-slate-300">
                      <span className="input-icon text-slate-500 font-bold mr-2 text-sm">₹</span>
                      <input
                        id="newPrevPending"
                        type="number"
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
                        value={newPreviousPendingInput}
                        onChange={e => setNewPreviousPendingInput(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Carryover unpaid balance from prior semester</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Degree Course
                    </label>
                    <select
                      id="newCourse"
                      className="select-input depth-input w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none"
                      value={newCourseInput}
                      onChange={e => {
                        const selectedCourse = e.target.value;
                        setNewCourseInput(selectedCourse);
                        const courseMeta = COURSE_MAP[selectedCourse] || COURSE_MAP['BCA'];
                        const currentSemNum = parseInt(newSemInput.replace(/\D/g, '')) || 1;
                        if (currentSemNum > courseMeta.totalSemesters) {
                          setNewSemInput('Sem 1');
                        }
                      }}
                    >
                      <option value="BCA">BCA (6 Sem • 3 Yrs)</option>
                      <option value="BBA">BBA (6 Sem • 3 Yrs)</option>
                      <option value="B.Com">B.Com (6 Sem • 3 Yrs)</option>
                      <option value="BA">BA (6 Sem • 3 Yrs)</option>
                      <option value="B.Tech">B.Tech (8 Sem • 4 Yrs)</option>
                      <option value="MCA">MCA (4 Sem • 2 Yrs)</option>
                      <option value="MBA">MBA (4 Sem • 2 Yrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Enrolled Semester
                    </label>
                    <select
                      id="newSem"
                      className="select-input depth-input w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none"
                      value={newSemInput}
                      onChange={e => setNewSemInput(e.target.value)}
                    >
                      {Array.from(
                        { length: (COURSE_MAP[newCourseInput] || COURSE_MAP['BCA']).totalSemesters },
                        (_, idx) => `Sem ${idx + 1}`
                      ).map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  id="saveStudentBtn"
                  onClick={handleAddStudent}
                  className="btn btn-primary btn-3d-primary depth-btn w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2 mt-4"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Student Record to Database</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          student={selectedReceipt.student}
          transaction={selectedReceipt.txn}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Collegiate Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-200/80 pt-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2025–2026 Global Institute of Information & Technology. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Finance Directorate</span>
            <span>•</span>
            <span>Helpline: +91 9334777278</span>
            <span>•</span>
            <span>accounts@giit.ac.in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
