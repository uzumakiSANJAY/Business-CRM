import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { TrendingUp, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login as loginApi } from '../../api/auth.api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email, password }) => {
    setError('');
    try {
      const { token, user } = await loginApi(email, password);
      login(token, user);
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/collector/vendors', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-8 pt-10 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-xl leading-none">VendorCRM</p>
                <p className="text-indigo-200 text-xs mt-0.5">Collection Management System</p>
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold">Welcome back</h2>
            <p className="text-indigo-200 text-sm mt-1">Sign in to continue to your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl animate-slide-in">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : ''}`}
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Demo: <span className="font-medium text-slate-600">admin@crm.com</span> / <span className="font-medium text-slate-600">Admin@123</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
