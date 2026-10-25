import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Controlled drag-and-drop image picker. Stages File objects locally with
 * previews; the caller decides when/how to actually upload them.
 */
export default function ImageDropzone({ files, onChange, maxFiles = 5, disabled = false }) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const previewUrlsRef = useRef(new Map());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const currentFiles = new Set(files);
    for (const [file, url] of previewUrlsRef.current) {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        previewUrlsRef.current.delete(file);
      }
    }
  }, [files]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setError('');
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('Live camera needs HTTPS or localhost and browser camera support. Try the device camera or choose a photo.'));
      return;
    }
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      setCameraOpen(true);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? t('Camera permission was denied. Allow camera access in your browser settings, or choose a photo.')
          : t('Could not start the camera. Check that it is connected and not being used by another app.')
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError(t('Camera is starting. Please wait a moment and try again.'));
      return;
    }
    const scale = Math.min(1, 1920 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError(t('Could not capture the photo. Please try again.'));
        return;
      }
      addFiles([new File([blob], `civic-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
      closeCamera();
    }, 'image/jpeg', 0.88);
  }

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
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-paper-line dark:border-board-line'
            : isDragging
            ? 'border-civic bg-civic-soft dark:bg-civic/10'
            : 'border-paper-line bg-paper-warm/50 hover:border-civic dark:border-board-line dark:bg-board-line/30'
        }`}
      >
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-civic dark:text-seal-green">{t('Click to upload')}</span> {t('or drag and drop')}
        </p>
        <p className="text-xs text-ink-soft">{t('JPEG, PNG, WEBP or GIF, up to 5MB each (max')} {maxFiles})</p>
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

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={disabled || files.length >= maxFiles} onClick={() => inputRef.current?.click()} className="rounded-md border border-paper-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50 dark:border-board-line dark:text-paper">
          {t('Choose photos')}
        </button>
        <button type="button" disabled={disabled || files.length >= maxFiles} onClick={openCamera} className="rounded-md border border-paper-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50 dark:border-board-line dark:text-paper">
          {t('Use camera')}
        </button>
        {cameraError && (
          <button type="button" disabled={disabled || files.length >= maxFiles} onClick={() => cameraInputRef.current?.click()} className="rounded-md border border-paper-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50 dark:border-board-line dark:text-paper">
            {t('Open device camera')}
          </button>
        )}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" disabled={disabled} className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {error && <p className="text-xs text-stamp-red mt-2">{error}</p>}
      {cameraError && <p className="mt-2 text-xs text-stamp-red" role="alert">{cameraError}</p>}

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={t('Camera')}>
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 dark:bg-board">
            <video ref={videoRef} autoPlay muted playsInline className="max-h-[70vh] w-full rounded-md bg-black object-contain" />
            {cameraError && <p className="mt-2 text-sm text-stamp-red" role="alert">{cameraError}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={closeCamera} className="rounded-md border border-paper-line px-4 py-2 text-sm dark:border-board-line">{t('Cancel')}</button>
              <button type="button" onClick={capturePhoto} className="rounded-md bg-civic px-4 py-2 text-sm font-semibold text-white">{t('Capture photo')}</button>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="relative group">
              <img
                src={getPreviewUrl(file)}
                alt={file.name}
                className="aspect-square w-full rounded-md border border-paper-line object-cover dark:border-board-line"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-ink text-paper text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`${t('Remove photo')} ${file.name}`}
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
