import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserRole } from '@/lib/types';

interface RoleSelectProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

const ROLE_ITEMS = { user: 'user', manager: 'manager', superadmin: 'superadmin' };

export function RoleSelect({ value, onChange, disabled }: RoleSelectProps) {
  return (
    <Select value={value} items={ROLE_ITEMS} onValueChange={(v) => onChange(v as UserRole)} disabled={disabled}>
      <SelectTrigger className="w-36" aria-label="Rol">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">user</SelectItem>
        <SelectItem value="manager">manager</SelectItem>
        <SelectItem value="superadmin">superadmin</SelectItem>
      </SelectContent>
    </Select>
  );
}
