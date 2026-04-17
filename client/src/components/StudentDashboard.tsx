import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Calendar, 
  MapPin,
  Search,
  Filter,
  ChevronRight,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../api';
import { ChangeRequest, User } from '../types';
import { ErrorAlert } from './ui/ErrorAlert';

interface StudentDashboardProps {
  user: User;
  searchTerm: string;
  filterStatus?: string;
  hideImplemented?: boolean;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, searchTerm: globalSearchTerm, filterStatus, hideImplemented }) => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch(`/api/requests?role=STUDENT&studentRegNum=${user.student_reg_num?.trim()}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching requests');
    } finally {
      setLoading(false);
    }
  }, [user.student_reg_num]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-sm";
    switch (status) {
      case 'PENDING_HOD':
        return <span className={`${baseClasses} bg-blue-50 text-blue-600 border border-blue-100`}><Clock size={14}/> Pending HOD</span>;
      case 'REJECTED_HOD':
        return <span className={`${baseClasses} bg-red-50 text-red-600 border border-red-100`}><XCircle size={14}/> Rejected by HOD</span>;
      case 'PENDING_ACADEMIC':
        return <span className={`${baseClasses} bg-amber-50 text-amber-600 border border-amber-100`}><Clock size={14}/> Pending Implementation</span>;
      case 'IMPLEMENTED':
        return <span className={`${baseClasses} bg-emerald-50 text-emerald-600 border border-emerald-100`}><CheckCircle2 size={14}/> Implemented</span>;
      case 'EXPIRED':
        return <span className={`${baseClasses} bg-zinc-100 text-zinc-500 border border-zinc-200`}><Clock size={14}/> Time Limit Expired</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marks': return <FileText className="text-blue-500" size={20} />;
      case 'date': return <Calendar className="text-purple-500" size={20} />;
      case 'venue': return <MapPin className="text-orange-500" size={20} />;
      case 'revaluation': return <ClipboardCheck className="text-emerald-500" size={20} />;
      default: return null;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status.startsWith('PENDING')).length,
    implemented: requests.filter(r => r.status === 'IMPLEMENTED').length,
    rejected: requests.filter(r => r.status.startsWith('REJECTED')).length,
  };

  const filteredRequests = requests.filter(r => {
    const search = (globalSearchTerm || localSearchTerm).toLowerCase();
    const matchesSearch = r.description.toLowerCase().includes(search) ||
           r.type.toLowerCase().includes(search) ||
           r.faculty_name.toLowerCase().includes(search) ||
           (r.subject_name || '').toLowerCase().includes(search) ||
           r.request_id.toLowerCase().includes(search);
    
    const matchesFilter = filterType === 'all' || r.type === filterType;
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const isNotHidden = !hideImplemented || r.status !== 'IMPLEMENTED';
    
    return matchesSearch && matchesFilter && matchesStatus && isNotHidden;
  });

  return (
    <div className="space-y-8">
      <ErrorAlert message={error} onClose={() => setError(null)} />
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Requests</p>
          <h4 className="text-3xl font-bold text-zinc-800 mt-1">{stats.total}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-blue-500">Pending</p>
          <h4 className="text-3xl font-bold text-zinc-800 mt-1">{stats.pending}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-emerald-500">Implemented</p>
          <h4 className="text-3xl font-bold text-zinc-800 mt-1">{stats.implemented}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-red-500">Rejected</p>
          <h4 className="text-3xl font-bold text-zinc-800 mt-1">{stats.rejected}</h4>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800">My Academic Updates</h2>
          <p className="text-zinc-500">View and track academic changes submitted on your behalf</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchRequests(); }}
            className="p-2.5 text-zinc-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-zinc-200 transition-all"
            title="Refresh Data"
          >
            <Clock size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between gap-4 bg-zinc-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by description or type..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                filterType !== 'all' ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'text-zinc-600 hover:bg-zinc-100 border border-transparent'
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

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-zinc-500">Loading your requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-zinc-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-800">No requests found</h3>
              <p className="text-zinc-500 mt-1">There are no change requests associated with your registration number.</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <motion.div 
                layout
                key={req.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-zinc-50/80 transition-all group border-b border-zinc-100"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`mt-1 p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${
                      req.type === 'marks' ? 'bg-blue-50' : req.type === 'date' ? 'bg-purple-50' : req.type === 'venue' ? 'bg-orange-50' : 'bg-emerald-50'
                    }`}>
                      {getTypeIcon(req.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900 text-lg capitalize">
                          {req.type === 'date' ? 'Exam Date' : req.type === 'venue' ? 'Exam Venue' : req.type === 'marks' ? 'Internal Marks' : req.type === 'revaluation' ? 'Revaluation' : req.type} Change
                        </span>
                        <span className="text-xs font-mono bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">ID: {req.request_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                        <span className="text-zinc-500">Submitted by:</span> {req.faculty_name}
                        {req.subject_name && (
                          <>
                            <span className="text-zinc-300">|</span>
                            <span className="text-brand-600">{req.subject_name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-zinc-600 leading-relaxed max-w-2xl">{req.description}</p>
                      
                      {(req.old_value || req.new_value) && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="bg-zinc-100 px-3 py-1 rounded-lg border border-zinc-200">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Old</span>
                            <span className="text-sm font-medium text-zinc-700">{req.old_value}</span>
                          </div>
                          <ArrowRight size={14} className="text-zinc-300" />
                          <div className={`${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100') : 'bg-brand-50 border-brand-100'} px-3 py-1 rounded-lg border`}>
                            <span className={`text-[10px] font-bold ${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'text-emerald-400' : 'text-red-400') : 'text-brand-400'} uppercase block`}>New</span>
                            <span className={`text-sm font-bold ${req.type === 'revaluation' ? (req.new_value !== 'No Changes' ? 'text-emerald-700' : 'text-red-700') : 'text-brand-700'}`}>{req.new_value}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Calendar size={14} />
                          Submitted {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock size={14} />
                          Last updated {new Date(req.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {(req.hod_comment || req.academic_comment) && (
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 w-full mt-3">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Reviewer Feedback</p>
                          <div className="space-y-2">
                            {req.hod_comment && (
                              <div className="flex gap-2 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                                <p className="text-xs text-zinc-600"><span className="font-bold">HOD:</span> {req.hod_comment}</p>
                              </div>
                            )}
                            {req.academic_comment && (
                              <div className="flex gap-2 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                                <p className="text-xs text-zinc-600"><span className="font-bold">Academic:</span> {req.academic_comment}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-4 min-w-[200px]">
                    {getStatusBadge(req.status)}
                    
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="text-zinc-400 hover:text-brand-600 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200"
            >
              <div className="bg-zinc-50 p-6 border-b border-zinc-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    selectedRequest.type === 'marks' ? 'bg-blue-50 text-blue-600' : 
                    selectedRequest.type === 'date' ? 'bg-purple-50 text-purple-600' : 
                    selectedRequest.type === 'venue' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {getTypeIcon(selectedRequest.type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 capitalize">
                      {selectedRequest.type === 'date' ? 'Exam Date' : selectedRequest.type === 'venue' ? 'Exam Venue' : selectedRequest.type === 'marks' ? 'Internal Marks' : selectedRequest.type === 'revaluation' ? 'Revaluation' : selectedRequest.type} Change Details
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">Request ID: #{selectedRequest.request_id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Faculty Information</p>
                    <p className="text-sm font-bold text-zinc-700">{selectedRequest.faculty_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Subject</p>
                    <p className="text-sm font-bold text-zinc-700">{selectedRequest.subject_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Submission Date</p>
                    <p className="text-sm font-bold text-zinc-700">
                      {new Date(selectedRequest.created_at).toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Description & Justification</p>
                  <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 italic text-zinc-700 leading-relaxed">
                    "{selectedRequest.description}"
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Old Value</p>
                    <p className="text-lg font-bold text-zinc-800">{selectedRequest.old_value}</p>
                  </div>
                  <div className={`${selectedRequest.type === 'revaluation' ? (selectedRequest.new_value !== 'No Changes' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100') : 'bg-brand-50 border-brand-100'} p-4 rounded-2xl border`}>
                    <p className={`text-[10px] font-bold ${selectedRequest.type === 'revaluation' ? (selectedRequest.new_value !== 'No Changes' ? 'text-emerald-400' : 'text-red-400') : 'text-brand-400'} uppercase tracking-widest mb-2`}>New Value</p>
                    <p className={`text-lg font-bold ${selectedRequest.type === 'revaluation' ? (selectedRequest.new_value !== 'No Changes' ? 'text-emerald-700' : 'text-red-700') : 'text-brand-700'}`}>{selectedRequest.new_value}</p>
                  </div>
                </div>

                {(selectedRequest.hod_comment || selectedRequest.academic_comment) && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reviewer Feedback History</p>
                    <div className="space-y-3">
                      {selectedRequest.hod_comment && (
                        <div className="flex gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">H</div>
                          <div>
                            <p className="text-xs font-bold text-blue-700">HOD Feedback</p>
                            <p className="text-sm text-zinc-600 mt-1">{selectedRequest.hod_comment}</p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.academic_comment && (
                        <div className="flex gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">A</div>
                          <div>
                            <p className="text-xs font-bold text-emerald-700">Academic Implementation</p>
                            <p className="text-sm text-zinc-600 mt-1">{selectedRequest.academic_comment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex justify-end">
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="bg-zinc-800 hover:bg-zinc-900 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
