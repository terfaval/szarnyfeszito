import './globals.css';
import { DataProvider } from '@/lib/DataContext';

export const metadata = {
  title: 'Szárnyfeszítő',
  description: 'Madárles útikalauz – local JSON MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className="bg-slate-50 text-slate-900">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
