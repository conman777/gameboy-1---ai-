import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Target } from 'lucide-react';

interface AIVisionData {
  enemies?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  items?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  player?: { x: number; y: number; width: number; height: number };
  obstacles?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  goals?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  path?: Array<{ x: number; y: number }>;
  attention?: Array<{ x: number; y: number; radius: number; confidence: number }>;
}

interface AIVisualizationOverlayProps {
  gameScreenRef: React.RefObject<HTMLCanvasElement>;
  isVisible: boolean;
  onToggleVisibility: () => void;
  visionData?: AIVisionData;
  aiObservation?: string;
  aiReasoning?: string;
}

const AIVisualizationOverlay: React.FC<AIVisualizationOverlayProps> = ({
  gameScreenRef,
  isVisible,
  onToggleVisibility,
  visionData,
  aiObservation,
  aiReasoning
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Update overlay position and size to match the game screen
  useEffect(() => {
    const updateOverlayPosition = () => {
      if (gameScreenRef.current) {
        const rect = gameScreenRef.current.getBoundingClientRect();
        setOverlayPosition({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateOverlayPosition();
    window.addEventListener('resize', updateOverlayPosition);
    window.addEventListener('scroll', updateOverlayPosition);

    return () => {
      window.removeEventListener('resize', updateOverlayPosition);
      window.removeEventListener('scroll', updateOverlayPosition);
    };
  }, [gameScreenRef]);

  // Draw the AI vision overlay
  useEffect(() => {
    if (!isVisible || !overlayCanvasRef.current || !visionData) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up drawing styles
    ctx.lineWidth = 2;
    ctx.font = '10px monospace';

    // Scale factor from Game Boy native resolution (160x144) to display size
    const scaleX = canvas.width / 160;
    const scaleY = canvas.height / 144;

    // Draw player
    if (visionData.player) {
      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      const p = visionData.player;
      const x = p.x * scaleX;
      const y = p.y * scaleY;
      const w = p.width * scaleX;
      const h = p.height * scaleY;
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#22c55e';
      ctx.fillText('PLAYER', x, y - 2);
    }

    // Draw enemies
    if (visionData.enemies) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      visionData.enemies.forEach((enemy, i) => {
        const x = enemy.x * scaleX;
        const y = enemy.y * scaleY;
        const w = enemy.width * scaleX;
        const h = enemy.height * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(enemy.label || `ENEMY ${i + 1}`, x, y - 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      });
    }

    // Draw items/collectibles
    if (visionData.items) {
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
      visionData.items.forEach((item, i) => {
        const x = item.x * scaleX;
        const y = item.y * scaleY;
        const w = item.width * scaleX;
        const h = item.height * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(item.label || `ITEM ${i + 1}`, x, y - 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
      });
    }

    // Draw goals/objectives
    if (visionData.goals) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      visionData.goals.forEach((goal, i) => {
        const x = goal.x * scaleX;
        const y = goal.y * scaleY;
        const w = goal.width * scaleX;
        const h = goal.height * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText(goal.label || `GOAL ${i + 1}`, x, y - 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      });
    }

    // Draw obstacles
    if (visionData.obstacles) {
      ctx.strokeStyle = '#6b7280';
      ctx.fillStyle = 'rgba(107, 114, 128, 0.2)';
      visionData.obstacles.forEach((obstacle, i) => {
        const x = obstacle.x * scaleX;
        const y = obstacle.y * scaleY;
        const w = obstacle.width * scaleX;
        const h = obstacle.height * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(obstacle.label || `OBSTACLE ${i + 1}`, x, y - 2);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.2)';
      });
    }

    // Draw attention areas (where AI is focusing)
    if (visionData.attention) {
      visionData.attention.forEach((att) => {
        const x = att.x * scaleX;
        const y = att.y * scaleY;
        const radius = att.radius * Math.min(scaleX, scaleY);
        
        ctx.strokeStyle = `rgba(34, 197, 94, ${att.confidence})`;
        ctx.fillStyle = `rgba(34, 197, 94, ${att.confidence * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw intended path
    if (visionData.path && visionData.path.length > 1) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      visionData.path.forEach((point, i) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw arrow at the end
      if (visionData.path.length > 1) {
        const lastPoint = visionData.path[visionData.path.length - 1];
        const secondLastPoint = visionData.path[visionData.path.length - 2];
        const angle = Math.atan2(
          (lastPoint.y - secondLastPoint.y) * scaleY,
          (lastPoint.x - secondLastPoint.x) * scaleX
        );
        
        const x = lastPoint.x * scaleX;
        const y = lastPoint.y * scaleY;
        const arrowLength = 10;
        
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - arrowLength * Math.cos(angle - Math.PI / 6),
          y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x - arrowLength * Math.cos(angle + Math.PI / 6),
          y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [isVisible, visionData, overlayPosition]);

  // Generate mock vision data for demonstration
  const generateMockVisionData = (): AIVisionData => {
    return {
      player: { x: 80, y: 100, width: 16, height: 16 },
      enemies: [
        { x: 120, y: 80, width: 16, height: 16, label: 'GOOMBA' },
        { x: 40, y: 60, width: 16, height: 16, label: 'ENEMY' }
      ],
      items: [
        { x: 60, y: 40, width: 8, height: 8, label: 'COIN' },
        { x: 140, y: 120, width: 12, height: 12, label: 'POWERUP' }
      ],
      goals: [
        { x: 20, y: 20, width: 16, height: 32, label: 'EXIT' }
      ],
      attention: [
        { x: 80, y: 100, radius: 20, confidence: 0.8 },
        { x: 120, y: 80, radius: 15, confidence: 0.6 }
      ],
      path: [
        { x: 80, y: 100 },
        { x: 70, y: 90 },
        { x: 50, y: 70 },
        { x: 30, y: 40 },
        { x: 20, y: 20 }
      ]
    };
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          color: 'white',
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          zIndex: 1000
        }}
        title="Show AI Vision Overlay"
      >
        <Eye size={16} />
        Show AI Vision
      </button>
    );
  }

  const currentVisionData = visionData || generateMockVisionData();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggleVisibility}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '8px',
          color: '#22c55e',
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          zIndex: 1000
        }}
        title="Hide AI Vision Overlay"
      >
        <EyeOff size={16} />
        Hide AI Vision
      </button>

      {/* Overlay canvas */}
      <canvas
        ref={overlayCanvasRef}
        width={overlayPosition.width}
        height={overlayPosition.height}
        style={{
          position: 'absolute',
          left: overlayPosition.x,
          top: overlayPosition.y,
          width: overlayPosition.width,
          height: overlayPosition.height,
          pointerEvents: 'none',
          zIndex: 100,
          border: '2px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '4px'
        }}
      />

      {/* AI Analysis Panel */}
      <div
        style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          width: '300px',
          maxHeight: '400px',
          background: 'rgba(0,0,0,0.9)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          color: 'white',
          fontSize: '11px',
          zIndex: 1000,
          overflow: 'auto'
        }}
      >
        <div style={{
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#22c55e'
        }}>
          <Target size={14} />
          AI Vision Analysis
        </div>

        {/* Legend */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Legend:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.5)', border: '1px solid #22c55e' }}></div>
              <span>Player</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(239, 68, 68, 0.5)', border: '1px solid #ef4444' }}></div>
              <span>Enemies</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(251, 191, 36, 0.5)', border: '1px solid #fbbf24' }}></div>
              <span>Items</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(139, 92, 246, 0.5)', border: '1px solid #8b5cf6' }}></div>
              <span>Goals</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '2px', background: '#06b6d4', borderRadius: '1px' }}></div>
              <span>Intended Path</span>
            </div>
          </div>
        </div>

        {/* AI Observation */}
        {aiObservation && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#22c55e' }}>👁️ AI Sees:</div>
            <div style={{ 
              background: 'rgba(34, 197, 94, 0.1)',
              padding: '6px',
              borderRadius: '4px',
              lineHeight: '1.3'
            }}>
              {aiObservation}
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        {aiReasoning && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#06b6d4' }}>🧠 AI Thinks:</div>
            <div style={{ 
              background: 'rgba(6, 182, 212, 0.1)',
              padding: '6px',
              borderRadius: '4px',
              lineHeight: '1.3'
            }}>
              {aiReasoning}
            </div>
          </div>
        )}

        {/* Vision Statistics */}
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
          <div>Enemies detected: {currentVisionData.enemies?.length || 0}</div>
          <div>Items detected: {currentVisionData.items?.length || 0}</div>
          <div>Goals detected: {currentVisionData.goals?.length || 0}</div>
          <div>Attention points: {currentVisionData.attention?.length || 0}</div>
        </div>

        <div style={{ 
          marginTop: '8px', 
          fontSize: '9px', 
          color: 'rgba(255,255,255,0.5)',
          fontStyle: 'italic'
        }}>
          Note: This is a demonstration overlay. In a full implementation, this would show real AI vision analysis from computer vision models.
        </div>
      </div>
    </>
  );
};

export default AIVisualizationOverlay;