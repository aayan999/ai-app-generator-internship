'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';

export default function SignupPage() {
  const { register, error, loading, clearError } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: { email: string; password: string; name?: string }) => {
    setIsSubmitting(true);
    clearError();
    const result = await register(data.email, data.password, data.name || '');
    if (result.success) {
      router.push('/dashboard');
    }
    setIsSubmitting(false);
  };

  return (
    <AuthForm
      mode="signup"
      onSubmit={handleSubmit}
      error={error}
      loading={isSubmitting || loading}
      onToggleMode={() => router.push('/login')}
    />
  );
}
