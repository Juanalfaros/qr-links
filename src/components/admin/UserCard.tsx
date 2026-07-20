import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleSelect } from '@/components/admin/RoleSelect';
import { DepartmentSelect } from '@/components/admin/DepartmentSelect';
import { UserRowActions } from '@/components/admin/UserRowActions';
import type { DepartmentRow, ProfileRow, UserRole } from '@/lib/types';

interface UserCardProps {
  user: ProfileRow;
  departments: DepartmentRow[];
  disabled?: boolean;
  onRoleChange: (role: UserRole) => void;
  onDepartmentChange: (departmentId: string | null) => void;
  onSuspendToggled: (userId: string, suspendedAt: string | null) => void;
}

export function UserCard({
  user,
  departments,
  disabled,
  onRoleChange,
  onDepartmentChange,
  onSuspendToggled,
}: UserCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{user.email}</p>
            <p className="text-muted-foreground text-sm">Creado {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.suspended_at ? 'destructive' : 'success'}>
              {user.suspended_at ? 'Suspendido' : 'Activo'}
            </Badge>
            <UserRowActions user={user} disabled={disabled} onSuspendToggled={onSuspendToggled} />
          </div>
        </div>
        <RoleSelect value={user.role} disabled={disabled} onChange={onRoleChange} />
        <DepartmentSelect
          value={user.department_id}
          departments={departments}
          disabled={disabled}
          onChange={onDepartmentChange}
        />
      </CardContent>
    </Card>
  );
}
