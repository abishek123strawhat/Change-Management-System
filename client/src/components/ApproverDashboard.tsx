import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Calendar, 
  MapPin,
  MessageSquare,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../api';
import { ChangeRequest, User, Role } from '../types';
import { ErrorAlert } from './ui/ErrorAlert';

interface ApproverDashboardProps {
  user: User;
  role: Role;
  searchTerm: string;
  filterStatus?: string;
}

export const ApproverDashboard: React.FC<ApproverDashboardProps> = ({ user, role, searchTerm, filterStatus }) => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comment, setComment] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>(filterStatus ? 'history' : 'pending');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch(`/api/requests?role=${role}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching requests');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id: string | number, status: string) => {
    let endpoint = 'hod';
    if (role === 'ACADEMIC') endpoint = 'academic';
    
    setActionError(null);
    try {
      const res = await apiFetch(`/api/requests/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          comment: comment[id.toString()] || ''
        })
      });
      if (res.ok) {
        fetchRequests();
        setComment(prev => ({ ...prev, [id.toString()]: '' }));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'An error occurred while updating the request');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5";
    switch (status) {
      case 'PENDING_HOD':
        return <span className={`${baseClasses} bg-blue-50 text-blue-600 border border-blue-100`}>Pending HOD</span>;
      case 'REJECTED_HOD':
        return <span className={`${baseClasses} bg-red-50 text-red-600 border border-red-100`}>Rejected by HOD</span>;
      case 'PENDING_ACADEMIC':
        return <span className={`${baseClasses} bg-amber-50 text-amber-600 border border-amber-100`}>Pending Implementation</span>;
      case 'IMPLEMENTED':
        return <span className={`${baseClasses} bg-emerald-50 text-emerald-600 border border-emerald-100`}>Implemented</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marks': return <FileText className="text-blue-500" size={18} />;
      case 'date': return <Calendar className="text-purple-500" size={18} />;
      case 'venue': return <MapPin className="text-orange-500" size={18} />;
      case 'revaluation': return <ClipboardCheck className="text-emerald-500" size={18} />;
      default: return null;
    }
  };

  const canAct = (req: ChangeRequest) => {
    if (filterStatus) return false; 
    if (role === 'HOD') return req.status === 'PENDING_HOD';
    if (role === 'ACADEMIC') return req.status === 'PENDING_ACADEMIC';
    return false;
  };

  const pendingRequests = requests.filter(canAct);
  const historyRequests = requests.filter(r => !canAct(r));
  const currentList = (activeTab === 'pending' ? pendingRequests : historyRequests).filter(r => {
    const search = (searchTerm || localSearchTerm).toLowerCase();
    const matchesSearch = r.description.toLowerCase().includes(search) ||
           r.type.toLowerCase().includes(search) ||
           r.faculty_name.toLowerCase().includes(search) ||
           (r.student_name || '').toLowerCase().includes(search) ||
           (r.student_reg_num || '').toLowerCase().includes(search) ||
           (r.subject_name || '').toLowerCase().includes(search) ||
           r.request_id.toLowerCase().includes(search);
    
    const matchesFilter = filterType === 'all' || r.type === filterType;
    const matchesStatus = !filterStatus || r.status === filterStatus;
    
    return matchesSearch && matchesFilter && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <ErrorAlert message={error} onClose={() => setError(null)} />
      <ErrorAlert message={actionError} onClose={() => setActionError(null)} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800">{role} Review Dashboard</h2>
          <p className="text-zinc-500">Manage and approve academic change requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchRequests(); }}
            className="p-2.5 text-zinc-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-zinc-200 transition-all"
            title="Refresh Data"
          >
            <Clock size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'pending' ? 'bg-white text-brand-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'history' ? 'bg-white text-brand-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by faculty, description or ID..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all"
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all h-full border ${
              filterType !== 'all' ? 'bg-brand-50 text-brand-600 border-brand-100' : 'text-zinc-600 hover:bg-zinc-100 border-transparent'
            }`}
          >
            <Filter size={18} />
            {filterType === 'all' ? 'Filter' : filterType === 'marks' ? 'Internal Marks' : filterType === 'date' ? 'Exam Date' : filterType === 'venue' ? 'Exam Venue' : 'Revaluation'}
          </button>

          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 z-20 p-2"
              >
                <button 
                  onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${filterType === 'all' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  All Requests
                </button>
                <button 
                  onClick={() => { setFilterType('marks'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${filterType === 'marks' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  <FileText size={14} /> Internal Marks
                </button>
                <button 
                  onClick={() => { setFilterType('date'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${filterType === 'date' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  <Calendar size={14} /> Exam Date
                </button>
                <button 
                  onClick={() => { setFilterType('venue'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${filterType === 'venue' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  <MapPin size={14} /> Exam Venue
                </button>
                <button 
                  onClick={() => { setFilterType('revaluation'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${filterType === 'revaluation' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  <ClipboardCheck size={14} /> Revaluation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-500">Loading requests...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 border-dashed">
            <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="text-zinc-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-800">No {activeTab} requests</h3>
            <p className="text-zinc-500 mt-1">Everything is up to date!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentList.map((req) => (
              <motion.div 
                layout
                key={req.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  canAct(req) ? 'border-brand-200 shadow-md ring-1 ring-brand-50' : 'border-zinc-200 shadow-sm'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                            {getTypeIcon(req.type)}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 capitalize">{req.type === 'date' ? 'Exam Date' : req.type === 'venue' ? 'Exam Venue' : req.type === 'marks' ? 'Internal Marks' : req.type === 'revaluation' ? 'Revaluation' : req.type} Change Request</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <span className="font-mono">#{req.request_id}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><UserIcon size={12}/> {req.faculty_name}</span>
                              <span>•</span>
                              {req.subject_name && (
                                <>
                                  <span className="font-bold text-brand-600">
                                    {req.subject_name}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {(req.student_name || req.student_reg_num) && (
                                <>
                                  <span className="flex items-center gap-1 font-bold text-zinc-600">
                                    {req.student_name} {req.student_reg_num && `(${req.student_reg_num})`}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span className="flex items-center gap-1"><Clock size={12}/> {new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>
 
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative">
                        <div className="absolute -top-2 -left-2 bg-white p-1 rounded-full border border-zinc-100 shadow-sm">
                          <AlertCircle size={14} className="text-brand-500" />
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed font-medium">
                          {req.description}
                        </p>
                      </div>
 
                      {(req.old_value || req.new_value) && (
                        <div className="flex items-center gap-4">
                          <div className="bg-zinc-100 px-4 py-2 rounded-xl border border-zinc-200 flex-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Old {req.type === 'date' ? 'Exam Date' : req.type === 'venue' ? 'Exam Venue' : req.type === 'marks' ? 'Internal Marks' : req.type === 'revaluation' ? 'Result' : req.type}</span>
                            <span className="text-sm font-bold text-zinc-700">{req.old_value}</span>
                          </div>
                          <ArrowRight size={20} className="text-zinc-300" />
                          <div className={`${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100') : 'bg-brand-50 border-brand-100'} px-4 py-2 rounded-xl border flex-1`}>
                            <span className={`text-[10px] font-bold ${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'text-emerald-400' : 'text-red-400') : 'text-brand-400'} uppercase block mb-1`}>New {req.type === 'date' ? 'Exam Date' : req.type === 'venue' ? 'Exam Venue' : req.type === 'marks' ? 'Internal Marks' : req.type === 'revaluation' ? 'Result' : req.type}</span>
                            <span className={`text-sm font-bold ${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'text-emerald-700' : 'text-red-700') : 'text-brand-700'}`}>{req.new_value}</span>
                          </div>
                        </div>
                      )}
 
                      {(req.hod_comment || req.academic_comment) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {req.hod_comment && (
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px]">
                              <span className="font-bold text-blue-700 block mb-1">HOD Review:</span>
                              <p className="text-zinc-600 italic">"{req.hod_comment}"</p>
                            </div>
                          )}
                          {req.academic_comment && (
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px]">
                              <span className="font-bold text-emerald-700 block mb-1">Academic Implementation:</span>
                              <p className="text-zinc-600 italic">"{req.academic_comment}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
 
                    {canAct(req) && (
                      <div className="lg:w-80 bg-zinc-50 p-6 rounded-2xl border border-zinc-200 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={14} />
                            Review Comment
                          </label>
                          <textarea 
                            value={comment[req.id.toString()] || ''}
                            onChange={(e) => setComment(prev => ({ ...prev, [req.id.toString()]: e.target.value }))}
                            placeholder="Add your justification or feedback..."
                            className="w-full p-3 text-sm rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white transition-all"
                            rows={3}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          {role === 'ACADEMIC' ? (
                            <button 
                              onClick={() => handleAction(req.id, 'IMPLEMENTED')}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
                            >
                              <CheckCircle2 size={18} />
                              Confirm Implementation
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleAction(req.id, 'PENDING_ACADEMIC')}
                                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
                              >
                                <ArrowRight size={18} />
                                Approve & Forward to Academic
                              </button>
                              <button 
                                onClick={() => handleAction(req.id, 'REJECTED_HOD')}
                                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                              >
                                <XCircle size={18} />
                                Decline Request
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
