import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../store/gameStore';

interface GameLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const GameLog: React.FC<GameLogProps> = ({ logs, onClearLogs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Convert logs to plain text for export or copy
  const serializeLogs = () =>
    logs
      .map(
        (l) =>
          `${l.timestamp.toISOString()} [${l.type.toUpperCase()}] ${l.message}`
      )
      .join('\n');

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(serializeLogs());
      alert('Logs copied to clipboard');
    } catch (err) {
      alert('Failed to copy logs');
    }
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([serializeLogs()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gameboy-ai-logs-${new Date().toISOString()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'ai':
        return '🤖';
      case 'game':
        return '🎮';
      case 'error':
        return '❌';
      case 'user':
        return '👤';
      default:
        return '📝';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return '#60a5fa'; // Blue
      case 'ai':
        return '#34d399'; // Green
      case 'game':
        return '#fbbf24'; // Yellow
      case 'error':
        return '#f87171'; // Red
      case 'user':
        return '#a78bfa'; // Purple
      default:
        return '#9ca3af'; // Gray
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="controls-panel">
      <h3 className="panel-title">
        📋 Activity Log
      </h3>
      
      <div
        ref={logContainerRef}
        className="log-container"
        style={{ height: '240px' }}
      >
        {logs.length === 0 ? (
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            No activity yet...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                borderLeft: `3px solid ${getLogColor(log.type)}`,
                fontSize: '12px',
                lineHeight: '1.4'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '2px'
              }}>
                <span style={{ fontSize: '14px' }}>
                  {getLogIcon(log.type)}
                </span>
                <span style={{
                  color: getLogColor(log.type),
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fontSize: '10px'
                }}>
                  {log.type}
                </span>
                <span style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '10px',
                  marginLeft: 'auto'
                }}>
                  {formatTime(log.timestamp)}
                </span>
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                marginLeft: '20px'
              }}>
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Statistics */}
      {logs.length > 0 && (
          <div className="log-stats">
            <span>Total: {logs.length}</span>
            <span>
              AI: {logs.filter(l => l.type === 'ai').length} |
              Game: {logs.filter(l => l.type === 'game').length} |
              Errors: {logs.filter(l => l.type === 'error').length}
            </span>
          </div>
      )}

      {/* Export / Clear Log Controls */}
      {logs.length > 0 && (
        <div className="log-actions">
          <button
            className="button"
            style={{ fontSize: '11px', padding: '4px 12px' }}
            onClick={handleCopyLogs}
          >
            Copy Logs
          </button>
          <button
            className="button"
            style={{ fontSize: '11px', padding: '4px 12px' }}
            onClick={handleDownloadLogs}
          >
            Download Logs
          </button>
          {logs.length > 10 && (
            <button
              className="button"
              style={{ fontSize: '11px', padding: '4px 12px' }}
              onClick={onClearLogs}
            >
              Clear Old Logs
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default GameLog; 