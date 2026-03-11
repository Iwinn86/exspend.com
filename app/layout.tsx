import './globals.css';
import NavBar from './components/NavBar';
import AuthGuard from './components/AuthGuard';

export const metadata = {
  title: 'Exspend Gateway',
  description: 'Crypto spending gateway for Ghana',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 min-h-screen crypto-bg">
        <AuthGuard>
          <NavBar />
          <main className="max-w-6xl mx-auto mt-8 px-4">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}