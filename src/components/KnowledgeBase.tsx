import React, { useEffect, useState } from 'react';
import { useActionMemoryStore } from '../store/actionMemoryStore';
import type { ActionRecord } from '../storage/actionMemoryDB';

interface KnowledgeBaseProps {
  romId: string | null;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ romId }) => {
  const { actions, loadActions, clearActions } = useActionMemoryStore();
  const [selected, setSelected] = useState<ActionRecord | null>(null);

  useEffect(() => {
    if (romId) {
      loadActions(romId);
    }
  }, [romId, loadActions]);

  if (!romId) {
    return (
      <div className="controls-panel">
        <h3 className="panel-title">📚 Knowledge Base</h3>
        <p style={{ opacity: 0.6 }}>Load a game to view knowledge.</p>
      </div>
    );
  }

  const handleClear = async () => {
    if (window.confirm('Delete all recorded actions for this ROM?')) {
      await clearActions(romId);
    }
  };

  return (
    <div className="controls-panel">
      <h3 className="panel-title">📚 Knowledge Base ({actions.length})</h3>

      {actions.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No actions recorded yet.</p>
      ) : (
        <div className="log-container" style={{ height: '300px' }}>
          {actions.slice().reverse().map((a, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '4px 0',
                cursor: 'pointer',
              }}
              onClick={() => setSelected(a)}
            >
              <span style={{ width: '70px', fontSize: '11px', opacity: 0.7 }}>
                {new Date(a.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ width: '40px', fontWeight: 'bold' }}>{a.button}</span>
              <span style={{ width: '60px', fontSize: '11px' }}>{a.pixelDiff} px</span>
              <span style={{ width: '20px' }}>{a.success ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <button className="button" style={{ marginTop: '8px' }} onClick={handleClear}>
          Clear Records
        </button>
      )}

      {/* Simple modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#1e1e1e',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Action Details</h3>
            <p>
              <strong>Button:</strong> {selected.button} &nbsp;|&nbsp;{' '}
              <strong>Success:</strong> {selected.success ? 'Yes' : 'No'} &nbsp;|&nbsp;{' '}
              <strong>Pixel diff:</strong> {selected.pixelDiff}
            </p>
            <p>
              <strong>Time:</strong> {new Date(selected.timestamp).toLocaleString()}
            </p>
            {selected.observation && (
              <p>
                <strong>Observation:</strong> {selected.observation}
              </p>
            )}
            {selected.reasoning && (
              <p>
                <strong>Reasoning:</strong> {selected.reasoning}
              </p>
            )}
            {selected.fullResponse && (
              <pre
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '11px',
                }}
              >
{selected.fullResponse}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <h4>Before</h4>
                <img
                  src={`data:image/png;base64,${selected.beforeImage}`}
                  alt="before"
                  style={{ width: '160px', imageRendering: 'pixelated' }}
                />
              </div>
              <div>
                <h4>After</h4>
                <img
                  src={`data:image/png;base64,${selected.afterImage}`}
                  alt="after"
                  style={{ width: '160px', imageRendering: 'pixelated' }}
                />
              </div>
            </div>
            <button className="button" style={{ marginTop: '12px' }} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 