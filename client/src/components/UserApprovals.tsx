import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { apiFetch } from '../api';
import { CheckCircle2, XCircle, User as UserIcon, Clock } from 'lucide-react';
import { ErrorAlert } from './ui/ErrorAlert';

interface UserApprovalsProps {
  currentUser: User;
}

export const UserApprovals: React.FC<UserApprovalsProps> = ({ currentUser }) => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch(`/api/pending-users?role=${currentUser.role}`);
      if (!res.ok) throw new Error('Failed to fetch pending users');
      const data = await res.json();
      setPendingUsers(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentUser.role]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleAction = async (userId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      setError(null);
      const res = await apiFetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()} user`);
      fetchPendingUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      <ErrorAlert message={error} onClose={() => setError(null)} />
      
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading pending approvals...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 border-dashed">
          <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="text-zinc-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-zinc-800">No Pending Approvals</h3>
          <p className="text-zinc-500 mt-1">There are no new users waiting for your approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingUsers.map(user => (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{user.name}</h3>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Role:</span>
                    <span className="font-bold text-zinc-800">{user.role}</span>
                  </div>
                  {user.department && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Department:</span>
                      <span className="font-bold text-zinc-800">{user.department}</span>
                    </div>
                  )}
                  {user.student_reg_num && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Reg No:</span>
                      <span className="font-bold text-zinc-800 font-mono">{user.student_reg_num}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Status:</span>
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold">
                      <Clock size={12} /> Pending
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(user.id, 'REJECTED')}
                  className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors flex justify-center items-center gap-1"
                >
                  <XCircle size={16} /> Reject
                </button>
                <button 
                  onClick={() => handleAction(user.id, 'APPROVED')}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors flex justify-center items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
