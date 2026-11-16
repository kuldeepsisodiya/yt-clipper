import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandBar } from './components/CommandBar';
import { Overview } from './components/Overview';
import { LiveMonitor } from './components/LiveMonitor';
import { HighlightsExplorer } from './components/HighlightsExplorer';
import { ClipEditor } from './components/ClipEditor';
import { ClipsLibrary } from './components/ClipsLibrary';
import { RecordingsView } from './components/RecordingsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsModal } from './components/SettingsModal';
import { HighlightDetailModal } from './components/HighlightDetailModal';
import { SearchModal } from './components/SearchModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import {
  fetchStreamStatus,
  fetchHighlights,
  fetchClips,
  fetchAnalytics,
  startStream,
  stopStream,
  triggerTestHighlight,
  createManualMarker,
  toggleHighlightFavorite,
  updateHighlightStatus,
  deleteHighlight,
  deleteClip,
} from './services/api';
import { StreamStatusResponse, Highlight, Clip, AnalyticsData } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Studio data state
  const [streamStatus, setStreamStatus] = useState<StreamStatusResponse | undefined>();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | undefined>();

  // Modals & Editor
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // WebSocket Live Connection
  const { isConnected, latestPulse, latestHighlightEvent } = useWebSocket();

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [statusRes, highlightsRes, clipsRes, analyticsRes] = await Promise.all([
        fetchStreamStatus(),
        fetchHighlights(),
        fetchClips(),
        fetchAnalytics(),
      ]);
      setStreamStatus(statusRes);
      setHighlights(highlightsRes);
      setClips(clipsRes);
      setAnalytics(analyticsRes);
    } catch (e) {
      console.error('Error fetching studio data:', e);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Handle live WebSocket pulses
  useEffect(() => {
    if (latestPulse && streamStatus) {
      setStreamStatus((prev) =>
        prev
          ? {
              ...prev,
              chat_rate: latestPulse.chat_rate,
              chat_baseline: latestPulse.baseline,
              audio_level: latestPulse.audio_level,
              duration_seconds: latestPulse.timestamp_offset,
            }
          : prev
      );
    }
  }, [latestPulse]);

  // Handle live WebSocket highlight triggers
  useEffect(() => {
    if (latestHighlightEvent) {
      addToast(
        `Highlight Detected: ${latestHighlightEvent.category} (Score: ${latestHighlightEvent.score}/100)`,
        'success'
      );
      loadAllData();
    }
  }, [latestHighlightEvent, loadAllData]);

  // Keyboard shortcut Cmd+K for command search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Action handlers
  const handleStartStream = async (url: string) => {
    try {
      await startStream(url, false);
      addToast('Livestream recording buffer started');
      loadAllData();
    } catch (e) {
      addToast('Failed to start stream', 'error');
    }
  };

  const handleStopStream = async () => {
    try {
      await stopStream();
      addToast('Stream stopped');
      loadAllData();
    } catch (e) {
      addToast('Failed to stop stream', 'error');
    }
  };

  const handleTriggerDemo = async () => {
    try {
      await triggerTestHighlight();
      addToast('Simulated GTA VI event triggered!');
      loadAllData();
    } catch (e) {
      addToast('Error triggering simulation', 'error');
    }
  };

  const handleManualMarker = async (category: string, notes: string) => {
    try {
      await createManualMarker(category, notes);
      addToast(`Manual marker dropped: ${category}`);
      loadAllData();
    } catch (e) {
      addToast('Failed to create marker', 'error');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await toggleHighlightFavorite(id);
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, is_favorite: res.is_favorite } : h))
      );
    } catch (e) {
      // ignore
    }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      await updateHighlightStatus(id, 'Reviewed');
      addToast('Marked as reviewed');
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status: 'Reviewed' } : h))
      );
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await deleteHighlight(id);
      addToast('Highlight deleted');
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      if (selectedHighlight?.id === id) setSelectedHighlight(null);
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteClip = async (id: string) => {
    try {
      await deleteClip(id);
      addToast('Clip deleted');
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      // ignore
    }
  };

  const handleOpenClipEditor = (h: Highlight) => {
    setEditingHighlight(h);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-background text-primary-text flex">
      {/* Fixed Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'editor') setEditingHighlight(null);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isConnected={isConnected}
        highlightsCount={highlights.length}
        clipsCount={clips.length}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Command Bar */}
        <CommandBar
          streamStatus={streamStatus}
          onOpenSearch={() => setIsSearchOpen(true)}
          onTriggerDemo={handleTriggerDemo}
          onOpenManualMarker={() => {
            setActiveTab('monitor');
            addToast('Use the "Drop Creator Highlight Marker" panel in Live Monitor', 'info');
          }}
          onToggleStream={streamStatus?.is_active ? handleStopStream : () => setActiveTab('monitor')}
          notificationCount={highlights.filter((h) => h.status === 'Detected').length}
        />

        {/* View Router */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <Overview
              analytics={analytics}
              highlights={highlights}
              onSelectHighlight={setSelectedHighlight}
              onOpenClipEditor={handleOpenClipEditor}
            />
          )}

          {activeTab === 'monitor' && (
            <LiveMonitor
              streamStatus={streamStatus}
              recentHighlights={highlights}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              onTriggerDemo={handleTriggerDemo}
              onManualMarker={handleManualMarker}
              onSelectHighlight={setSelectedHighlight}
            />
          )}

          {activeTab === 'highlights' && (
            <HighlightsExplorer
              highlights={highlights}
              onSelectHighlight={setSelectedHighlight}
              onOpenClipEditor={handleOpenClipEditor}
              onToggleFavorite={handleToggleFavorite}
              onMarkReviewed={handleMarkReviewed}
              onDeleteHighlight={handleDeleteHighlight}
            />
          )}

          {activeTab === 'editor' && editingHighlight && (
            <ClipEditor
              highlight={editingHighlight}
              clip={clips.find((c) => c.highlight_id === editingHighlight.id)}
              onBack={() => setActiveTab('overview')}
              onSuccessToast={addToast}
            />
          )}

          {activeTab === 'clips' && (
            <ClipsLibrary
              clips={clips}
              onDeleteClip={handleDeleteClip}
              onSuccessToast={addToast}
            />
          )}

          {activeTab === 'recordings' && <RecordingsView />}

          {activeTab === 'analytics' && <AnalyticsView analytics={analytics} />}

          {activeTab === 'settings' && <SettingsModal onSuccessToast={addToast} />}
        </main>
      </div>

      {/* Detail Modal */}
      <HighlightDetailModal
        highlight={selectedHighlight}
        onClose={() => setSelectedHighlight(null)}
        onOpenClipEditor={handleOpenClipEditor}
        onToggleFavorite={handleToggleFavorite}
        onMarkReviewed={handleMarkReviewed}
        onDeleteHighlight={handleDeleteHighlight}
      />

      {/* Quick Search Palette (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        highlights={highlights}
        clips={clips}
        onSelectHighlight={setSelectedHighlight}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'editor') setEditingHighlight(null);
        }}
      />

      {/* Global Toast Stack */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};

export default App;
