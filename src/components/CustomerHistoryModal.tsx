import { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { X, ArrowDownRight, ArrowUpRight, Phone, MessageCircle } from "lucide-react";

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onAddUdhari?: (customerId: string, customerName: string) => void;
  onAddPaid?: (customerId: string, customerName: string) => void;
  onSendSMS?: (customer: any) => void;
}

export function CustomerHistoryModal({ isOpen, onClose, customerId, customerName, onAddUdhari, onAddPaid, onSendSMS }: CustomerHistoryModalProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !customerId) return;

    // Fetch customer data
    const unsubscribeCustomer = onSnapshot(doc(db, "customers", customerId), (docSnap) => {
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() });
      }
    });

    const q = query(
      collection(db, "transactions"),
      where("customerId", "==", customerId)
    );

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => {
        const tsA = a.timestamp || a.date;
        const tsB = b.timestamp || b.date;
        if (!tsA) return 1;
        if (!tsB) return -1;
        return tsB.toMillis() - tsA.toMillis();
      });
      setTransactions(data);
      setLoading(false);
    });

    return () => {
      unsubscribeCustomer();
      unsubscribeTransactions();
    };
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200 h-[90vh] sm:h-[700px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{customerName}</h3>
            {customer?.mobile && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {customer.mobile}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {customer && (
            <div className="bg-white p-4 mb-2 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total Udhari</p>
                  <p className="font-bold text-red-600 text-lg">₹{(customer.total_udhari || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total Paid</p>
                  <p className="font-bold text-green-600 text-lg">₹{(customer.total_paid || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className={`col-span-2 rounded-xl p-4 border ${customer.balance > 0 ? 'bg-red-50 border-red-100' : customer.balance < 0 ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                  <p className="text-xs uppercase tracking-wider text-slate-600 mb-1 font-semibold">
                    {customer.balance > 0 ? "Pending Balance" : customer.balance < 0 ? "Advance Balance" : "Balance Due"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-2xl ${customer.balance > 0 ? 'text-red-700' : customer.balance < 0 ? 'text-blue-700' : 'text-green-700'}`}>
                      ₹{Math.abs(customer.balance || 0).toLocaleString('en-IN')}
                    </p>
                    {customer.balance === 0 && <span className="px-2 py-1 rounded text-xs font-bold bg-green-200 text-green-800">PAID</span>}
                    {customer.balance > 0 && <span className="px-2 py-1 rounded text-xs font-bold bg-red-200 text-red-800">PENDING</span>}
                    {customer.balance < 0 && <span className="px-2 py-1 rounded text-xs font-bold bg-blue-200 text-blue-800">ADVANCE</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                  onClick={() => onAddUdhari && onAddUdhari(customer.id, customer.name)}
                  className="w-full bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowUpRight className="w-4 h-4" /> Udhari
                </button>
                <button 
                  onClick={() => onAddPaid && onAddPaid(customer.id, customer.name)}
                  className="w-full bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowDownRight className="w-4 h-4" /> Paid
                </button>
                <button 
                  onClick={() => onSendSMS && onSendSMS(customer)}
                  className={`col-span-2 w-full bg-transparent border py-2 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    customer.balance < 0
                      ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                      : customer.balance === 0
                        ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                        : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" /> 
                  {customer.balance < 0 ? "Advance Balance SMS" : customer.balance === 0 ? "Zero Balance SMS" : "Send Reminder SMS"}
                </button>
              </div>
            </div>
          )}

          <div className="px-4 py-2 bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Transaction Timeline</h4>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No transactions found for this customer.
                </div>
              ) : (
                transactions.map(t => (
                  <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'udhari' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <div className="flex items-start gap-3 pl-2">
                      <div className={`p-2 rounded-full mt-0.5 ${t.type === 'udhari' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {t.type === 'udhari' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${t.type === 'udhari' ? 'text-red-700' : 'text-green-700'}`}>
                          {t.type === 'udhari' ? 'Udhari Given' : 'Payment Received'}
                        </p>
                        {t.note && <p className="text-xs text-slate-600 mt-0.5">{t.note}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {(t.timestamp || t.date)?.toDate ? (t.timestamp || t.date).toDate().toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          }) : 'Pending...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-base ${t.type === 'udhari' ? 'text-red-600' : 'text-green-600'}`}>
                        {t.type === 'udhari' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                      </div>
                      {t.running_balance !== undefined && (
                        <div className="mt-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                          Bal: <span className={t.running_balance > 0 ? 'text-red-600' : t.running_balance < 0 ? 'text-blue-600' : 'text-green-600'}>
                            ₹{Math.abs(t.running_balance).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
