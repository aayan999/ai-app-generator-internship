'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  const { login, sendMagicLink, error, loading, clearError } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: { email: string; password: string }) => {
    setIsSubmitting(true);
    clearError();
    const result = await login(data.email, data.password);
    if (result.success) {
      router.push('/dashboard');
    }
    setIsSubmitting(false);
  };

  const handleMagicLink = async (email: string) => {
    clearError();
    await sendMagicLink(email);
  };

  return (
    <AuthForm
      mode="login"
      onSubmit={handleSubmit}
      onMagicLink={handleMagicLink}
      error={error}
      loading={isSubmitting || loading}
      onToggleMode={() => router.push('/signup')}
    />
  );
}
