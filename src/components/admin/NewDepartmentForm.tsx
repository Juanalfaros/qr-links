import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DepartmentRow } from '@/lib/types';

interface NewDepartmentFormProps {
  onCreated: (department: DepartmentRow) => void;
}

export function NewDepartmentForm({ onCreated }: NewDepartmentFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; department?: DepartmentRow };

    if (!res.ok || !body.department) {
      toast.error(body.error ?? 'No se pudo crear el departamento');
      setLoading(false);
      return;
    }

    onCreated(body.department);
    setName('');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nuevo departamento"
        required
        className="h-9 w-44"
      />
      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? 'Creando...' : 'Crear'}
      </Button>
    </form>
  );
}
