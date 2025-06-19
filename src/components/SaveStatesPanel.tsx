import React, { useState, useRef } from 'react';
import { Save, Download, Trash2, Edit3, Clock, Plus } from 'lucide-react';
import { useSaveStateStore, SaveState } from '../store/saveStateStore';
import { GameBoyEmulatorRef } from './GameBoyEmulator';

interface SaveStatesPanelProps {
  currentRomId: string | null;
  emulatorRef: React.RefObject<GameBoyEmulatorRef>;
  onLoadState?: (stateId: string) => void;
  onSaveState?: (stateName: string) => void;
}

const SaveStatesPanel: React.FC<SaveStatesPanelProps> = ({
  currentRomId,
  emulatorRef,
  onLoadState,
  onSaveState
}) => {
  const {
    getSaveStatesForRom,
    addSaveState,
    deleteSaveState,
    renameSaveState,
    loadSaveState
  } = useSaveStateStore();
  
  const [newSaveName, setNewSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveStates = currentRomId ? getSaveStatesForRom(currentRomId) : [];

  const handleSaveState = async () => {
    if (!currentRomId || !emulatorRef.current) {
      console.warn('Cannot save state: No ROM loaded or emulator not ready');
      return;
    }

    if (!newSaveName.trim()) {
      alert('Please enter a name for the save state');
      return;
    }

    setIsSaving(true);
    try {
      // Get current screen for thumbnail
      const screenData = emulatorRef.current.getScreenData();
      let screenshot: string | undefined;
      
      if (screenData) {
        // Create canvas to generate screenshot
        const canvas = document.createElement('canvas');
        canvas.width = screenData.width;
        canvas.height = screenData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(screenData, 0, 0);
          screenshot = canvas.toDataURL('image/png');
        }
      }

      // Save the state
      const stateData = await emulatorRef.current.saveState();
      if (stateData) {
        addSaveState(currentRomId, newSaveName.trim(), stateData, screenshot);
        setNewSaveName('');
        onSaveState?.(newSaveName.trim());
        console.log('Save state created successfully');
      } else {
        alert('Failed to save state');
      }
    } catch (error) {
      console.error('Error saving state:', error);
      alert('Failed to save state');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadState = async (stateId: string) => {
    if (!emulatorRef.current) {
      console.warn('Cannot load state: Emulator not ready');
      return;
    }

    setIsLoading(true);
    try {
      const saveState = loadSaveState(stateId);
      if (saveState) {
        const success = await emulatorRef.current.loadState(saveState.data);
        if (success) {
          onLoadState?.(stateId);
          console.log('Save state loaded successfully');
        } else {
          alert('Failed to load state');
        }
      } else {
        alert('Save state not found');
      }
    } catch (error) {
      console.error('Error loading state:', error);
      alert('Failed to load state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteState = (stateId: string) => {
    if (confirm('Are you sure you want to delete this save state?')) {
      deleteSaveState(stateId);
    }
  };

  const handleEditName = (state: SaveState) => {
    setEditingId(state.id);
    setEditingName(state.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      renameSaveState(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleExportState = async (stateId: string) => {
    const saveState = loadSaveState(stateId);
    if (!saveState) return;

    try {
      // Create a blob with the save state data
      const exportData = {
        name: saveState.name,
        romId: saveState.romId,
        timestamp: saveState.timestamp,
        data: Array.from(saveState.data) // Convert Uint8Array to regular array for JSON
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${saveState.name.replace(/[^a-z0-9]/gi, '_')}.gbs`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting save state:', error);
      alert('Failed to export save state');
    }
  };

  const handleImportState = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentRomId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        const stateData = new Uint8Array(importData.data);
        
        // Add imported state
        addSaveState(
          currentRomId,
          `${importData.name} (Imported)`,
          stateData
        );
        
        alert('Save state imported successfully');
      } catch (error) {
        console.error('Error importing save state:', error);
        alert('Failed to import save state. Make sure it\'s a valid .gbs file.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  if (!currentRomId) {
    return (
      <div className="controls-panel">
        <h3 className="panel-title">
          <Save size={20} />
          Save States
        </h3>
        <div style={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.6)', 
          padding: '20px',
          fontStyle: 'italic'
        }}>
          Load a ROM to use save states
        </div>
      </div>
    );
  }

  return (
    <div className="controls-panel">
      <h3 className="panel-title">
        <Save size={20} />
        Save States ({saveStates.length})
      </h3>

      {/* Create New Save State */}
      <div className="section">
        <label className="form-label">Create New Save State</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={newSaveName}
            onChange={(e) => setNewSaveName(e.target.value)}
            placeholder="Enter save state name..."
            className="input-field"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveState()}
            disabled={isSaving}
          />
          <button
            onClick={handleSaveState}
            disabled={isSaving || !newSaveName.trim()}
            className="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: '80px'
            }}
          >
            {isSaving ? (
              <>⏳ Saving...</>
            ) : (
              <>
                <Plus size={14} />
                Save
              </>
            )}
          </button>
        </div>
        
        {/* Import/Export */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleImportState}
            className="button"
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Download size={12} />
            Import
          </button>
        </div>
      </div>

      {/* Save States List */}
      <div className="section">
        <label className="form-label">Saved States</label>
        
        {saveStates.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.6)', 
            padding: '16px',
            fontStyle: 'italic',
            fontSize: '12px'
          }}>
            No save states yet. Create one above!
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {saveStates.map((state) => (
              <div
                key={state.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Screenshot thumbnail */}
                  {state.screenshot && (
                    <div style={{
                      width: '48px',
                      height: '36px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <img
                        src={state.screenshot}
                        alt="Save state screenshot"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* State info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name (editable) */}
                    {editingId === state.id ? (
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="input-field"
                          style={{ 
                            fontSize: '12px', 
                            padding: '2px 6px',
                            flex: 1
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: '3px',
                            color: 'white',
                            padding: '2px 6px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '3px',
                            color: 'white',
                            padding: '2px 6px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        fontWeight: 'bold',
                        color: 'white',
                        fontSize: '13px',
                        marginBottom: '4px',
                        wordBreak: 'break-word'
                      }}>
                        {state.name}
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <div style={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '8px'
                    }}>
                      <Clock size={10} />
                      {formatTimestamp(state.timestamp)}
                    </div>
                    
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleLoadState(state.id)}
                        disabled={isLoading}
                        style={{
                          background: '#3b82f6',
                          border: 'none',
                          borderRadius: '3px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {isLoading ? '⏳' : <Download size={10} />}
                        Load
                      </button>
                      
                      <button
                        onClick={() => handleEditName(state)}
                        style={{
                          background: '#8b5cf6',
                          border: 'none',
                          borderRadius: '3px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Edit3 size={10} />
                        Rename
                      </button>
                      
                      <button
                        onClick={() => handleExportState(state.id)}
                        style={{
                          background: '#059669',
                          border: 'none',
                          borderRadius: '3px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Download size={10} />
                        Export
                      </button>
                      
                      <button
                        onClick={() => handleDeleteState(state.id)}
                        style={{
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: '3px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Trash2 size={10} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".gbs,.json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default SaveStatesPanel;