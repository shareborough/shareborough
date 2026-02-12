import { useEffect, useRef, useState, useCallback } from "react";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  /** Called when a barcode is successfully detected. */
  onDetected: (code: string, format: string) => void;
  /** Called when the user cancels scanning. */
  onClose: () => void;
}

/**
 * Camera-based barcode scanner using Quagga2.
 * Supports ISBN, UPC-A, EAN-13, EAN-8, Code 128, Code 39.
 */
export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const detectedRef = useRef(false);

  const handleDetected = useCallback(
    (result: { codeResult?: { code?: string | null; format?: string } }) => {
      const code = result.codeResult?.code;
      const format = result.codeResult?.format ?? "unknown";
      if (code && !detectedRef.current) {
        detectedRef.current = true;
        Quagga.stop();
        onDetected(code, format);
      }
    },
    [onDetected],
  );

  useEffect(() => {
    if (!scannerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        decoder: {
          readers: [
            "ean_reader",       // EAN-13 (includes ISBN-13)
            "ean_8_reader",     // EAN-8
            "upc_reader",       // UPC-A
            "code_128_reader",  // Code 128
            "code_39_reader",   // Code 39
          ],
        },
        locate: true,
        frequency: 10,
      },
      (err) => {
        if (err) {
          if (err.message?.includes("NotAllowedError") || err.name === "NotAllowedError") {
            setError("Camera permission denied. Please allow camera access in your browser settings.");
          } else if (err.message?.includes("NotFoundError") || err.name === "NotFoundError") {
            setError("No camera found. Please connect a camera and try again.");
          } else {
            setError(`Camera error: ${err.message || "Unknown error"}`);
          }
          return;
        }
        Quagga.start();
        setScanning(true);
      },
    );

    Quagga.onDetected(handleDetected);

    return () => {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [handleDetected]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      {error ? (
        <div className="p-6 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div
            ref={scannerRef}
            className="barcode-scanner-viewport"
            style={{ position: "relative", width: "100%", height: "240px" }}
          />
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-16 border-2 border-sage-400 rounded-lg opacity-60" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-center justify-between">
            <p className="text-white text-xs">
              {scanning ? "Point camera at barcode" : "Starting camera..."}
            </p>
            <button
              type="button"
              onClick={() => {
                Quagga.stop();
                onClose();
              }}
              className="px-3 py-1 rounded bg-white/20 text-white text-sm hover:bg-white/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
