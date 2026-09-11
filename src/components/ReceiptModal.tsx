import React from 'react';
import { Printer, Download, CheckCircle2, X } from 'lucide-react';
import { Student, Transaction } from '../types';

interface ReceiptModalProps {
  student: Student;
  transaction?: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ student, transaction, onClose }) => {
  const receiptNo = transaction
    ? (transaction.razorpayPaymentId
        ? `GIIT-RP-${transaction.razorpayPaymentId.replace(/^pay_/, '').slice(-8)}`
        : `GIIT-REC-${transaction.txnId.slice(-6)}`)
    : `GIIT-LEDGER-${student.id}`;
  const receiptDate = transaction?.createdAt || new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const amountPaid = transaction ? transaction.amount : student.paid;
  const paymentMethodDisplay = transaction?.paymentSource ||
    (transaction?.razorpayPaymentId
      ? `Razorpay Live Gateway (${transaction.razorpayPaymentId})`
      : 'Online Banking / College Gateway');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="depth-card-elevated w-full max-w-lg bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Official Fee Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div id="printableReceipt" className="p-6 text-slate-800">
          {/* Institution Header */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
              Global Institute of Information & Technology
            </h2>
            <p className="text-xs text-slate-500">Affiliated to State Technical Board & UGC Recognized</p>
            <p className="text-[11px] text-slate-500 font-mono mt-1">Accounts & Finance Directorate • Session 2025–26</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">Receipt Reference:</span>
              <span className="font-mono font-bold text-slate-700">{receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Date of Issue:</span>
              <span className="font-semibold text-slate-700">{receiptDate}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Student Name:</span>
              <span className="font-bold text-slate-800 text-sm">{student.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Student ID / Roll:</span>
              <span className="font-mono font-bold text-slate-700">{student.id}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Course & Semester:</span>
              <span className="font-semibold text-slate-700">{student.course} — {student.sem}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Payment Method:</span>
              <span className="font-semibold text-slate-700">{paymentMethodDisplay}</span>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <div className="my-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5">Tuition & Academic Semester Fees</td>
                  <td className="p-2.5 text-right font-mono">₹{student.total.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-700 font-semibold">Total Paid to Date</td>
                  <td className="p-2.5 text-right font-mono font-semibold text-emerald-700">₹{student.paid.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2.5 text-slate-900">Current Receipt Credit</td>
                  <td className="p-2.5 text-right font-mono text-blue-700 text-sm">₹{amountPaid.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end pt-3 text-[11px] text-slate-500">
            <div>
              <p className="italic">Computer generated electronic fee receipt.</p>
              <p>No physical signature required.</p>
            </div>
            <div className="text-right">
              <div className="w-28 border-b border-slate-400 mb-1"></div>
              <span className="font-semibold text-slate-700">Registrar Accounts</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="depth-btn btn-3d-secondary px-4 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="depth-btn btn-3d-primary px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
