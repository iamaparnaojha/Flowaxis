'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ToastContainer } from '../../components/ui/Toast';
import styles from '../page.module.css';

export default function RegisterPage() {
  const { register, currentUser, isLoading } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) router.replace('/dashboard');
  }, [currentUser, isLoading, router]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await register(form);
      toast.success('Account created! Please sign in.');
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const mapped = {};
        data.errors.forEach(({ field, message }) => { mapped[field] = message; });
        setFieldErrors(mapped);
      }
      toast.error(data?.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.centeredPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.authLogo}>⬡</div>
          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>Join FlowAxis and start managing your projects</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            id="name"
            name="name"
            type="text"
            label="Full name"
            placeholder="Aparna Ojha"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name}
            autoComplete="name"
            autoFocus
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Min 8 chars, uppercase, number, symbol"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <Button type="submit" isLoading={isSubmitting} className={styles.submitBtn}>
            Create account
          </Button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link href="/" className={styles.authLink}>Sign in</Link>
        </p>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}
