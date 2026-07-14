import { useEffect, useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Controlled drag-and-drop image picker. Stages File objects locally with
 * previews; the caller decides when/how to actually upload them.
 */
export default function ImageDropzone({ files, onChange, maxFiles = 5, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const previewUrlsRef = useRef(new Map());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function getPreviewUrl(file) {
    let url = previewUrlsRef.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      previewUrlsRef.current.set(file, url);
    }
    return url;
  }

  function addFiles(fileList) {
    setError('');
    const incoming = Array.from(fileList);
    const accepted = [];

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`${file.name}: exceeds 5MB limit`);
        continue;
      }
      accepted.push(file);
    }

    const combined = [...files, ...accepted];
    if (combined.length > maxFiles) {
      setError(`You can attach up to ${maxFiles} images`);
    }
    onChange(combined.slice(0, maxFiles));
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }

  function removeAt(index) {
    const next = files.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-md px-4 py-6 text-center cursor-pointer transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700'
            : isDragging
            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-900 dark:text-slate-100">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">JPEG, PNG, WEBP or GIF, up to 5MB each (max {maxFiles})</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="relative group">
              <img
                src={getPreviewUrl(file)}
                alt={file.name}
                className="w-full aspect-square object-cover rounded-md border border-slate-200 dark:border-slate-700"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-900 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
