'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import styles from './page.module.css';

export default function DashboardPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) router.replace('/');
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.hero}>
          <div>
            <p className={styles.greeting}>{greeting},</p>
            <h1 className={styles.name}>{currentUser.name}</h1>
            <p className={styles.subtitle}>
              Here&apos;s what&apos;s happening across your workspace.
            </p>
          </div>
          {currentUser.role === 'admin' && (
            <div className={styles.roleBadge}>
              <span className="badge badge--completed mono">admin</span>
              <span className={styles.roleNote}>Full workspace access</span>
            </div>
          )}
        </div>

        <div className={styles.quickLinks}>
          <Link href="/projects" className={styles.quickCard}>
            <span className={styles.quickIcon}>◫</span>
            <div>
              <div className={styles.quickTitle}>Projects</div>
              <div className={styles.quickDesc}>View and manage your projects</div>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>

          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quickCard}>
            <span className={styles.quickIcon}>⟨/⟩</span>
            <div>
              <div className={styles.quickTitle}>API Docs</div>
              <div className={styles.quickDesc}>Explore the Swagger UI</div>
            </div>
            <span className={styles.arrow}>↗</span>
          </a>
        </div>

        <div className={styles.accountInfo}>
          <h2 className={styles.sectionTitle}>Account details</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{currentUser.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role</span>
              <span className={`badge badge--${currentUser.role === 'admin' ? 'completed' : 'active'} mono`}>
                {currentUser.role}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Member since</span>
              <span className={styles.infoValue}>
                {new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
