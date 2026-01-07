import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn'; // Assuming we create this util

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export function Dropzone({ onFileSelect }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        setError('Please upload a PDF file.');
      }
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
        setError(null);
      } else {
        setError('Please upload a PDF file.');
      }
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer",
          isDragActive
            ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
            : "border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50",
          error ? "border-red-300 bg-red-50" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
        />

        <div className="bg-blue-100 p-3 rounded-full mb-3">
          <Upload className={cn("w-6 h-6 text-blue-600", isDragActive && "animate-bounce")} />
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Upload your Transcript
        </h3>
        <p className="text-slate-500 mb-2 max-w-sm text-sm">
          Drag and drop your PDF transcript here, or click to browse.
          <br />
          <span className="text-[10px] text-slate-400 mt-1 block">
            We process files locally. Your data never leaves your device.
          </span>
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-100 px-4 py-2 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
