'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className={styles.navbar}>
      <div className={`container ${styles.inner}`}>
        <Link href={currentUser ? '/dashboard' : '/'} className={styles.brand}>
          <span className={styles.logo}>⬡</span>
          <span className={styles.brandName}>FlowAxis</span>
        </Link>

        <nav className={styles.nav}>
          {currentUser ? (
            <>
              <Link href="/projects" className={styles.navLink}>Projects</Link>
              <div className={styles.userChip}>
                <span className={styles.avatar}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <span className={styles.userName}>{currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <span className="badge badge--active mono">admin</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/" className={styles.navLink}>Login</Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
