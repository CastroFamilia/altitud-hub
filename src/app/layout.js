import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { AppProvider } from "@/lib/context";
import { AuthProvider } from "@/lib/auth-context";
import AuthGate from "@/components/layout/AuthGate";
import ErrorBoundary from "@/components/layout/ErrorBoundary";

export const metadata = {
  title: "ALTITUD HUB",
  description: "Central de Operaciones REMAX Altitud",
};

export default function RootLayout({ children }) {
  // Inline script to prevent FOUC — reads localStorage before paint
  const themeScript = `(function(){try{var t=localStorage.getItem('color-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.remove('dark')}})()`;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex h-screen font-sans antialiased text-sm bg-slate-50 text-gray-800 dark:bg-dark-bg dark:text-slate-200 transition-colors duration-300 relative">
        <ErrorBoundary module="Altitud Hub" fullPage>
          <AppProvider>
            <AuthProvider>
              <AuthGate>
                <Sidebar />
                <main className="flex-1 flex flex-col relative overflow-hidden" id="main-scroll-area">
                  <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiIC8+CjxwYXRoIGQ9Ik0wIDBoMXY0MEgweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgLz4KPHBhdGggZD0iTTAgMGg0MHYxSDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiAvPgo8L3N2Zz4=')" }}></div>
                  <ErrorBoundary module="Contenido Principal">
                    {children}
                  </ErrorBoundary>
                </main>
              </AuthGate>
            </AuthProvider>
          </AppProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
