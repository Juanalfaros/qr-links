import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DepartmentRow } from '@/lib/types';

const NONE_VALUE = '__none__';

interface DepartmentSelectProps {
  value: string | null;
  departments: DepartmentRow[];
  onChange: (departmentId: string | null) => void;
  disabled?: boolean;
}

export function DepartmentSelect({ value, departments, onChange, disabled }: DepartmentSelectProps) {
  // Passing `items` is what lets <SelectValue> show the department's name
  // right after a page load — without it, Base UI can only resolve a
  // value->label mapping from <SelectItem> children mounted inside the
  // popup, which don't exist in the DOM until the dropdown is opened at
  // least once, so the trigger would show the raw department id instead.
  const items = {
    [NONE_VALUE]: 'Sin departamento',
    ...Object.fromEntries(departments.map((dept) => [dept.id, dept.name])),
  };

  return (
    <Select
      value={value ?? NONE_VALUE}
      items={items}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-40" aria-label="Departamento">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>Sin departamento</SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
