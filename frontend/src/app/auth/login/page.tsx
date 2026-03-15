'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckSquare, Eye, EyeOff, LogIn } from 'lucide-react';
import { authApi } from '@/lib/authApi';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data);
      if (res.data?.user) {
        setUser(res.data.user, res.data.accessToken);
        toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Login failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">TaskFlow</span>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back — pick up where you left off.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
            <input {...register('email')} type="email" className="input-field" placeholder="you@example.com" autoComplete="email" autoFocus />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Password</label>
            <div className="relative mt-1.5">
              <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Sign in
              </span>
            )}
          </button>
        </form>
      </div>
      <p className="text-center text-sm text-slate-500 mt-5">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-brand-600 font-medium hover:text-brand-700">Create one</Link>
      </p>
    </div>
  );
}
