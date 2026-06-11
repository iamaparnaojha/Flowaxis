'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ToastContainer } from '../components/ui/Toast';
import styles from './page.module.css';

export default function LoginPage() {
  const { login, currentUser, isLoading } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && currentUser) router.replace('/dashboard');
  }, [currentUser, isLoading, router]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(form);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.centeredPage}>
        <div className={styles.loadingLogo}>⬡</div>
      </main>
    );
  }

  return (
    <main className={styles.centeredPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.authLogo}>⬡</div>
          <h1 className={styles.authTitle}>Welcome back</h1>
          <p className={styles.authSubtitle}>Sign in to your FlowAxis workspace</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
            autoFocus
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
          />
          <Button type="submit" isLoading={isSubmitting} className={styles.submitBtn}>
            Sign in
          </Button>
        </form>

        <p className={styles.switchAuth}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.authLink}>Create one</Link>
        </p>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}
