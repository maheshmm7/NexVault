import { useEffect, useRef, useState } from 'react';

/**
 * SafeChartContainer is a premium, robust wrapper component that prevents
 * Recharts from mounting before its parent container has resolved valid,
 * non-negative dimensions. This completely eliminates the console warnings:
 * "The width(-1) and height(-1) of chart should be greater than 0"
 */
export default function SafeChartContainer({ 
  children, 
  className = '', 
  height = 300, 
  minHeight = 200 
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hasDimensions, setHasDimensions] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      
      // Use standard bounding client rect or contentRect for precision
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      
      // Use explicit height or measured height
      const finalHeight = typeof height === 'number' ? height : (rect.height || minHeight);

      if (width > 0 && finalHeight > 0) {
        setDimensions({ width, height: finalHeight });
        setHasDimensions(true);
      }
    });

    resizeObserver.observe(container);
    
    // Initial dimensions check
    const initialRect = container.getBoundingClientRect();
    if (initialRect.width > 0) {
      const initHeight = typeof height === 'number' ? height : (initialRect.height || minHeight);
      setDimensions({ width: initialRect.width, height: initHeight });
      setHasDimensions(true);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [height, minHeight]);

  return (
    <div
      ref={containerRef}
      className={`w-full relative transition-all duration-300 ${className}`}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
      }}
    >
      {hasDimensions && dimensions.width > 0 && dimensions.height > 0 ? (
        <div className="absolute inset-0 w-full h-full">
          {typeof children === 'function' ? children(dimensions) : children}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted/40 font-medium">
          Establishing viewport context...
        </div>
      )}
    </div>
  );
}
