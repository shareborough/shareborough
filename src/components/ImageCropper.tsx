import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  /** Data URL or object URL of the image to crop */
  src: string;
  /** Aspect ratio (width/height). Default 1 (square). */
  aspect?: number;
  /** Called with the cropped image as a Blob */
  onCrop: (blob: Blob) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  size: number;
}

/**
 * Simple image cropper.
 * User drags to pan, pinch/scroll to zoom within a square crop area.
 * Mobile-friendly with touch events.
 */
export default function ImageCropper({ src, aspect = 1, onCrop, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, size: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 });
  const lastPinchDistance = useRef<number | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Initial crop: fit the smaller dimension
      const minDim = Math.min(img.width, img.height);
      setCrop({
        x: (img.width - minDim) / 2,
        y: (img.height - minDim) / 2,
        size: minDim,
      });
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  // Draw preview
  useEffect(() => {
    if (!loaded || !imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displaySize = 300;
    canvas.width = displaySize;
    canvas.height = displaySize / aspect;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imgRef.current,
      crop.x, crop.y, crop.size, crop.size / aspect,
      0, 0, displaySize, displaySize / aspect,
    );
  }, [loaded, crop, aspect]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [crop],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !imgRef.current) return;
      const img = imgRef.current;
      const scale = crop.size / 300; // pixels per canvas pixel
      const dx = (e.clientX - dragStart.current.x) * scale;
      const dy = (e.clientY - dragStart.current.y) * scale;
      setCrop((prev) => ({
        ...prev,
        x: clamp(dragStart.current.cropX - dx, 0, img.width - prev.size),
        y: clamp(dragStart.current.cropY - dy, 0, img.height - prev.size / aspect),
      }));
    },
    [dragging, crop.size, aspect],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!imgRef.current) return;
      const img = imgRef.current;
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      setCrop((prev) => {
        const minDim = Math.min(img.width, img.height);
        const newSize = clamp(prev.size * delta, 50, minDim);
        // Keep center stable
        const centerX = prev.x + prev.size / 2;
        const centerY = prev.y + (prev.size / aspect) / 2;
        return {
          size: newSize,
          x: clamp(centerX - newSize / 2, 0, img.width - newSize),
          y: clamp(centerY - (newSize / aspect) / 2, 0, img.height - newSize / aspect),
        };
      });
    },
    [aspect],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Start pinch gesture
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        lastPinchDistance.current = distance;
        e.preventDefault();
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null && imgRef.current) {
        // Handle pinch zoom
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const delta = distance / lastPinchDistance.current;
        lastPinchDistance.current = distance;

        const img = imgRef.current;
        setCrop((prev) => {
          const minDim = Math.min(img.width, img.height);
          const newSize = clamp(prev.size * (1 / delta), 50, minDim);
          // Keep center stable
          const centerX = prev.x + prev.size / 2;
          const centerY = prev.y + (prev.size / aspect) / 2;
          return {
            size: newSize,
            x: clamp(centerX - newSize / 2, 0, img.width - newSize),
            y: clamp(centerY - (newSize / aspect) / 2, 0, img.height - newSize / aspect),
          };
        });
      }
    },
    [aspect]
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
  }, []);

  async function handleCrop() {
    if (!imgRef.current) return;
    const output = document.createElement("canvas");
    const outputSize = 800; // output dimension
    output.width = outputSize;
    output.height = outputSize / aspect;
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      imgRef.current,
      crop.x, crop.y, crop.size, crop.size / aspect,
      0, 0, outputSize, outputSize / aspect,
    );
    output.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">Drag to pan, pinch or scroll to zoom</p>
      <div
        className="relative bg-gray-900 rounded-lg overflow-hidden cursor-move select-none"
        style={{ width: 300, height: 300 / aspect }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full"
        />
        {/* Crop border overlay */}
        <div className="absolute inset-0 border-2 border-white/50 rounded-lg pointer-events-none" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleCrop} className="btn-primary text-sm">
          Crop & Use
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
