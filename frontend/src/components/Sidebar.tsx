import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Flame,
  Film,
  HardDrive,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isConnected: boolean;
  highlightsCount?: number;
  clipsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isConnected,
  highlightsCount = 0,
  clipsCount = 0,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitor', label: 'Live Monitor', icon: Radio, pulse: true },
    { id: 'highlights', label: 'Highlights', icon: Flame, badge: highlightsCount },
    { id: 'clips', label: 'Clips Library', icon: Film, badge: clipsCount },
    { id: 'recordings', label: 'Recordings', icon: HardDrive },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 flex flex-col justify-between border-r border-border bg-surface-subtle/80 backdrop-blur-xl transition-all duration-200 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-coral to-accent-lavender flex items-center justify-center shadow-coral-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base tracking-wider text-primary-text">
                  VICE <span className="text-accent-coral">CLIPS</span>
                </span>
                <span className="text-[10px] tracking-widest text-secondary-text uppercase">
                  GTA VI Studio
                </span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-coral to-accent-lavender flex items-center justify-center mx-auto shadow-coral-glow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors interactive-tap"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group interactive-tap ${
                  isActive
                    ? 'bg-elevated text-primary-text shadow-glass-subtle border border-white/10'
                    : 'text-secondary-text hover:text-primary-text hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-accent-coral' : 'text-secondary-text group-hover:text-primary-text'
                    }`}
                  />
                  {item.pulse && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-status-success animate-ping" />
                  )}
                </div>

                {!isCollapsed && (
                  <span className="flex-1 text-left tracking-tight">{item.label}</span>
                )}

                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-accent-coral text-white font-bold' : 'bg-white/10 text-secondary-text'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Status */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-1">
          {isConnected ? (
            <div className="flex items-center gap-2 text-xs text-status-success">
              <span className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_#75D6A0]" />
              {!isCollapsed && <span className="font-mono text-[11px]">Stream Live</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-secondary-text">
              <span className="w-2 h-2 rounded-full bg-secondary-text/50" />
              {!isCollapsed && <span className="font-mono text-[11px]">Reconnecting...</span>}
            </div>
          )}
        </div>

        {/* Profile indicator */}
        {!isCollapsed && (
          <div className="p-2.5 rounded-lg bg-card/60 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-primary-text">Leonida Studio Pro</span>
              <span className="text-[10px] text-secondary-text font-mono">v1.0.0 (GTA VI Edition)</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-coral/30 to-accent-lavender/30 border border-white/10 flex items-center justify-center text-[10px] font-bold text-accent-coral">
              VI
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
