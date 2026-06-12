import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

export const metadata = {
  title: 'FlowAxis — Project & Task Management',
  description:
    'FlowAxis is a precise, technical project management platform built by Aparna Ojha. ' +
    'Manage projects, tasks, and team members with clarity.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
