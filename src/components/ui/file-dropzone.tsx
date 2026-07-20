import { useRef, useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { CloudUploadIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  id: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  hint: string;
  icon?: IconSvgElement;
  required?: boolean;
  disabled?: boolean;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Click-to-browse works via a <label htmlFor> pointing at a visually hidden
// (not display:none) <input type="file"> — that keeps the input focusable
// and Enter/Space-activatable for keyboard users with zero custom ARIA, and
// avoids nesting a real <button> inside a role="button" container.
export function FileDropzone({
  id,
  accept,
  file,
  onFileChange,
  hint,
  icon = CloudUploadIcon,
  required,
  disabled,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const clearFile = () => {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (disabled) return;
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onFileChange(dropped);
      }}
      className={cn(
        'rounded-2xl border border-dashed p-6 text-center transition-colors',
        dragActive ? 'border-ring bg-accent-blue/30' : 'border-border',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <div className="bg-accent-green text-accent-green-foreground flex size-11 items-center justify-center rounded-2xl">
            <HugeiconsIcon icon={Tick02Icon} size={20} />
          </div>
          <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
          <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <label htmlFor={id} className="hover:text-foreground cursor-pointer underline underline-offset-2">
              Cambiar archivo
            </label>
            <button
              type="button"
              onClick={clearFile}
              className="text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className="flex cursor-pointer flex-col items-center gap-2">
          <div className="bg-accent-lilac text-accent-lilac-foreground flex size-11 items-center justify-center rounded-2xl">
            <HugeiconsIcon icon={icon} size={20} />
          </div>
          <p className="text-sm font-medium">
            Arrastra tu archivo aquí o <span className="underline underline-offset-2">haz click para buscar</span>
          </p>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </label>
      )}
    </div>
  );
}
