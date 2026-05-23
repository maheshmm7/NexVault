import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';

export default function ImageCropModal({ src, isOpen, onCancel, onSave }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset states when a new image is loaded
  useEffect(() => {
    if (src) {
      setZoom(1);
      setRotation(0);
      setOffsetX(0);
      setOffsetY(0);
      
      const img = new Image();
      img.onload = () => {
        const containerSize = 256;
        const aspect = img.width / img.height;
        let displayWidth, displayHeight;
        
        if (aspect > 1) {
          displayHeight = containerSize;
          displayWidth = containerSize * aspect;
        } else {
          displayWidth = containerSize;
          displayHeight = containerSize / aspect;
        }
        
        setImageSize({ width: displayWidth, height: displayHeight });
      };
      img.src = src;
    }
  }, [src]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - startPos.x);
    setOffsetY(e.clientY - startPos.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile screens
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX - offsetX, y: touch.clientY - offsetY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffsetX(touch.clientX - startPos.x);
    setOffsetY(touch.clientY - startPos.y);
  };

  const handleCrop = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');

      // Clear with transparent background
      ctx.clearRect(0, 0, 300, 300);

      // Create scaled coordinates
      const S = 300 / 256;

      // 1. Move origin to the crop center (150, 150) plus user's dragged offsets
      ctx.translate(150 + offsetX * S, 150 + offsetY * S);
      
      // 2. Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);
      
      // 3. Apply scale
      ctx.scale(zoom, zoom);

      // 4. Draw image centered
      ctx.drawImage(
        img,
        -(imageSize.width * S) / 2,
        -(imageSize.height * S) / 2,
        imageSize.width * S,
        imageSize.height * S
      );

      // Convert to base64
      const croppedBase64 = canvas.toDataURL('image/png');
      onSave(croppedBase64);
    };
    img.src = src;
  };

  // Global mouseUp listener to ensure drag state cleans up safely
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl p-6 flex flex-col items-center"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted hover:text-main hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="w-full text-center mb-6">
              <h3 className="text-lg font-black text-main tracking-tight">Crop Profile Photo</h3>
              <p className="text-xs text-muted mt-1">
                Drag to reposition. Use the controls below to zoom and rotate.
              </p>
            </div>

            {/* Cropping Viewport */}
            <div 
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="relative w-64 h-64 rounded-full border-2 border-primary/40 overflow-hidden cursor-move bg-slate-950/30 flex items-center justify-center select-none shadow-[0_0_25px_rgba(0,0,0,0.5)] group"
            >
              {src && (
                <img
                  ref={imageRef}
                  src={src}
                  alt="Crop Preview"
                  style={{
                    width: `${imageSize.width}px`,
                    height: `${imageSize.height}px`,
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="max-w-none select-none pointer-events-none transition-transform duration-75 ease-out"
                />
              )}
              
              {/* Radial Overlay Mask Guide */}
              <div className="absolute inset-0 rounded-full border border-primary/20 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]" />
            </div>

            {/* Controls */}
            <div className="w-full mt-6 space-y-4">
              {/* Zoom Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><ZoomOut className="w-3.5 h-3.5" /> Zoom Out</span>
                  <span className="text-primary font-bold">{Math.round(zoom * 100)}%</span>
                  <span className="flex items-center gap-1">Zoom In <ZoomIn className="w-3.5 h-3.5" /></span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((zoom - 1) / 2) * 100}%, rgba(255,255,255,0.1) ${((zoom - 1) / 2) * 100}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
              </div>

              {/* Rotation Control */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted font-semibold uppercase tracking-wider">
                    <span>Rotation</span>
                    <span className="text-primary font-bold">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(rotation / 360) * 100}%, rgba(255,255,255,0.1) ${(rotation / 360) * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="mt-4 p-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-main transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>+90°</span>
                </button>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="w-full flex items-center justify-end gap-3 mt-8 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-muted hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleCrop}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-black bg-primary text-white hover:bg-primary/95 transition-all shadow-[0_0_15px_rgba(59,130,246,0.35)]"
              >
                <Check className="w-4 h-4" />
                Apply & Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
