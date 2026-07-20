import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileImportIcon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import type { LinkRow } from '@/lib/types';

interface BitlyImportDialogProps {
  onImported: (links: LinkRow[]) => void;
}

interface ImportResult {
  imported: (Omit<LinkRow, 'clicks' | 'tags'> & { has_password: boolean })[];
  failed: { long_url: string; error: string }[];
}

export function BitlyImportDialog({ onImported }: BitlyImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/links/import-bitly', { method: 'POST', body: formData });
    const body = (await res.json().catch(() => ({}))) as Partial<ImportResult> & { error?: string };

    if (!res.ok || !body.imported) {
      setError(body.error ?? 'No se pudo procesar el CSV');
      setLoading(false);
      return;
    }

    setResult({ imported: body.imported, failed: body.failed ?? [] });
    onImported(body.imported.map((link) => ({ ...link, clicks: 0, tags: [] })));
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFile(null);
          setResult(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <HugeiconsIcon icon={FileImportIcon} size={16} />
        Importar de Bitly
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar links desde Bitly</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bitly-import-file">Export CSV de Bitly</Label>
            <FileDropzone
              id="bitly-import-file"
              accept=".csv,text/csv"
              required
              file={file}
              onFileChange={setFile}
              hint='Columnas "long_url" y "title"'
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {result && (
            <div className="text-sm">
              <p>{result.imported.length} link(s) importado(s).</p>
              {result.failed.length > 0 && (
                <ul className="text-destructive mt-1 list-disc pl-4">
                  {result.failed.map((f, i) => (
                    <li key={`${f.long_url}-${i}`}>
                      {f.long_url || '(vacío)'}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Button type="submit" disabled={loading || !file}>
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
