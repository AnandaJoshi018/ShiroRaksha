import React, { useState, useRef } from 'react';
import { MoveHorizontal } from 'lucide-react';

const ImageComparison = ({ before, after }) => {
  const [pos, setPos] = useState(50);
  const [isDown, setIsDown] = useState(false);
  const ref = useRef(null);

  const move = (e) => {
    if (!isDown || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    setPos(Math.min(100, Math.max(0, (x / rect.width) * 100)));
  };

  const handleStart = () => setIsDown(true);
  const handleEnd = () => setIsDown(false);

  return (
    <div
      ref={ref}
      onMouseDown={handleStart} onMouseUp={handleEnd}
      onMouseMove={move} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchEnd={handleEnd}
      onTouchMove={move}
      style={{ position: 'relative', width: '100%', height: '100%', cursor: 'col-resize', touchAction: 'none' }}
    >
      <img src={after} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', top: 0, left: 0 }} alt="B" />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: `inset(0 ${100 - pos}% 0 0)`, backgroundColor: '#030712' }}>
        <img src={before} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="A" />
      </div>

      {/* Slider Handle */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${pos}%`,
        width: '2px',
        background: '#3b82f6',
        boxShadow: '0 0 10px #3b82f6',
        zIndex: 10
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '32px',
          height: '32px',
          background: '#3b82f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)',
          border: '2px solid white'
        }}>
          <MoveHorizontal size={16} color="white" />
        </div>
      </div>
    </div>
  );
};
export default ImageComparison;