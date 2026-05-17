import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../components/CommandPalette';
import useNotificationScanner from '../hooks/useNotificationScanner';
import { BRANDING } from '../config/branding';

export default function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Initialize the background scanner to check for alerts on dashboard load
  useNotificationScanner();

  // Dispatches named actions requested from the Command Palette to
  // components that own the relevant modal state.
  const handlePaletteAction = (action) => {
    window.dispatchEvent(new CustomEvent(BRANDING.ACTION_EVENT, { detail: action }));
  };


  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--text)' }}
    >
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Premium Background Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full opacity-60" />
          <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full opacity-60" />
        </div>

        <div className="">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="content-max-w relative">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Command Palette — rendered outside main scroll area */}
      <CommandPalette onAction={handlePaletteAction} />
    </div>
  );
}