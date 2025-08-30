
import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X } from './Icons';

interface FileUploadProps {
  id: string;
  label: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ id, label, description, file, onFileChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File | undefined) => {
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        onFileChange(selectedFile);
      } else {
        alert('Invalid file type. Please upload an Excel (.xls, .xlsx) or CSV (.csv) file.');
      }
    }
  }, [onFileChange]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</label>
      {file ? (
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
          <div className="flex items-center space-x-3 overflow-hidden">
            <FileIcon className="h-6 w-6 text-sky-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
          </div>
          <button onClick={removeFile} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-slate-700">
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onButtonClick}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
            ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 bg-white dark:bg-slate-800'}`}
        >
          <UploadCloud className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            <span className="font-semibold text-sky-600 dark:text-sky-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 text-center">{description}</p>
          <input
            ref={inputRef}
            id={id}
            name={id}
            type="file"
            className="hidden"
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
};
