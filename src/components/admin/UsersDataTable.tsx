import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { BulkInviteDialog } from '@/components/admin/BulkInviteDialog';
import { NewDepartmentForm } from '@/components/admin/NewDepartmentForm';
import { RoleSelect } from '@/components/admin/RoleSelect';
import { DepartmentSelect } from '@/components/admin/DepartmentSelect';
import { UserRowActions } from '@/components/admin/UserRowActions';
import { UserCard } from '@/components/admin/UserCard';
import type { DepartmentRow, ProfileRow, UserRole } from '@/lib/types';

interface UsersDataTableProps {
  initialUsers: ProfileRow[];
  initialDepartments: DepartmentRow[];
  currentUserId: string;
}

export function UsersDataTable({ initialUsers, initialDepartments, currentUserId }: UsersDataTableProps) {
  const [users, setUsers] = useState<ProfileRow[]>(initialUsers);
  const [departments, setDepartments] = useState<DepartmentRow[]>(initialDepartments);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const previous = users;
    setUpdatingId(userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));

    const res = await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });

    if (!res.ok) {
      setUsers(previous);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? 'No se pudo actualizar el rol');
    }
    setUpdatingId(null);
  };

  const handleDepartmentChange = async (userId: string, departmentId: string | null) => {
    const previous = users;
    setUpdatingId(userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, department_id: departmentId } : u)));

    const res = await fetch('/api/admin/update-department', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, departmentId }),
    });

    if (!res.ok) {
      setUsers(previous);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? 'No se pudo actualizar el departamento');
    }
    setUpdatingId(null);
  };

  const handleSuspendToggled = (userId: string, suspendedAt: string | null) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, suspended_at: suspendedAt } : u)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NewDepartmentForm onCreated={(dept) => setDepartments((prev) => [...prev, dept])} />
        <div className="flex flex-wrap items-center gap-2">
          <BulkInviteDialog onInvited={(newUsers) => setUsers((prev) => [...newUsers, ...prev])} />
          <InviteUserDialog onInvited={(user) => setUsers((prev) => [user, ...prev])} />
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            departments={departments}
            disabled={updatingId === user.id || user.id === currentUserId}
            onRoleChange={(role) => handleRoleChange(user.id, role)}
            onDepartmentChange={(departmentId) => handleDepartmentChange(user.id, departmentId)}
            onSuspendToggled={handleSuspendToggled}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="bg-card border-border/60 hidden overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const disabled = updatingId === user.id || user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <RoleSelect
                      value={user.role}
                      disabled={disabled}
                      onChange={(role) => handleRoleChange(user.id, role)}
                    />
                  </TableCell>
                  <TableCell>
                    <DepartmentSelect
                      value={user.department_id}
                      departments={departments}
                      disabled={disabled}
                      onChange={(departmentId) => handleDepartmentChange(user.id, departmentId)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.suspended_at ? 'destructive' : 'success'}>
                      {user.suspended_at ? 'Suspendido' : 'Activo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      user={user}
                      disabled={user.id === currentUserId}
                      onSuspendToggled={handleSuspendToggled}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
