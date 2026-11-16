import React, { useEffect, useState } from 'react';
import { HardDrive, FileVideo, Download, Folder, RefreshCw } from 'lucide-react';
import { fetchRecordings } from '../services/api';

export const RecordingsView: React.FC = () => {
  const [data, setData] = useState<{ files: any[]; total_size_mb: number; buffer_location: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetchRecordings();
      setData(res);
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg text-primary-text">
            Stream Buffer Storage
          </h2>
          <p className="text-xs text-secondary-text">
            Continuous local rolling recordings and raw video buffers
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-lg bg-surface-subtle hover:bg-elevated text-secondary-text hover:text-primary-text border border-white/5 transition-colors interactive-tap"
          title="Refresh recordings"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Total Buffer Size
          </span>
          <div className="font-display text-3xl font-bold text-primary-text mt-1">
            {data?.total_size_mb || 0} MB
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Local SSD buffer</span>
        </div>

        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Active Segments
          </span>
          <div className="font-display text-3xl font-bold text-primary-text mt-1">
            {data?.files?.length || 0}
          </div>
          <span className="text-xs text-secondary-text mt-1 block">MP4 rolling chunks</span>
        </div>

        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle truncate">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Local Storage Path
          </span>
          <div className="text-xs font-mono text-accent-coral mt-2 truncate">
            {data?.buffer_location || 'data/recordings'}
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Managed by VICE CLIPS</span>
        </div>
      </div>

      {/* Files List */}
      <div className="rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-primary-text text-sm">
            Buffer Chunks on Disk
          </h3>
        </div>

        <div className="divide-y divide-white/5 text-xs">
          {(!data?.files || data.files.length === 0) ? (
            <div className="p-8 text-center text-secondary-text">
              No active recordings found in buffer.
            </div>
          ) : (
            data.files.map((file, idx) => (
              <div
                key={idx}
                className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileVideo className="w-5 h-5 text-accent-coral" />
                  <div>
                    <div className="font-mono text-primary-text font-medium">{file.filename}</div>
                    <div className="text-secondary-text text-[11px]">{file.created_at}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-secondary-text">{file.size_mb} MB</span>
                  <a
                    href={`/api/media/${file.filename}`}
                    download={file.filename}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors interactive-tap"
                    title="Download raw file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
