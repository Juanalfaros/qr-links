import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import type { ProfileRow } from '@/lib/types';

interface BulkInviteDialogProps {
  onInvited: (users: ProfileRow[]) => void;
}

interface BulkInviteResult {
  invited: { id: string; email: string }[];
  failed: { email: string; error: string }[];
}

export function BulkInviteDialog({ onInvited }: BulkInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/bulk-invite', { method: 'POST', body: formData });
    const body = (await res.json().catch(() => ({}))) as Partial<BulkInviteResult> & { error?: string };

    if (!res.ok || !body.invited) {
      setError(body.error ?? 'No se pudo procesar el CSV');
      setLoading(false);
      return;
    }

    setResult({ invited: body.invited, failed: body.failed ?? [] });
    onInvited(
      body.invited.map((u) => ({
        id: u.id,
        email: u.email,
        role: 'user',
        created_at: new Date().toISOString(),
        full_name: null,
        avatar_url: null,
        department_id: null,
        suspended_at: null,
      })),
    );
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
        <HugeiconsIcon icon={UserMultiple02Icon} size={16} />
        Invitar por CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuarios por CSV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-invite-file">Archivo CSV</Label>
            <FileDropzone
              id="bulk-invite-file"
              accept=".csv,text/csv"
              required
              file={file}
              onFileChange={setFile}
              hint='Columna "email"'
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {result && (
            <div className="text-sm">
              <p>{result.invited.length} invitación(es) enviada(s).</p>
              {result.failed.length > 0 && (
                <ul className="text-destructive mt-1 list-disc pl-4">
                  {result.failed.map((f) => (
                    <li key={f.email}>
                      {f.email || '(vacío)'}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Button type="submit" disabled={loading || !file}>
            {loading ? 'Procesando...' : 'Enviar invitaciones'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
