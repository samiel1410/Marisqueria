import React from 'react';
import DataTable from './DataTable';

const UsersTable = ({ users = [], branches = [], onEdit = () => {}, onDelete = () => {} }) => {
  const resolveBranch = (branch_id) => {
    const b = branches.find(x => String(x.id) === String(branch_id));
    return b ? b.name : (branch_id ? branch_id : '—');
  };

  const columns = [
    { key: 'username', header: 'Usuario', render: (r) => <div className="font-semibold text-primary-900">{r.username}</div> },
    { key: 'role', header: 'Rol', render: (r) => <div className="text-sm text-primary-600">{r.role}</div> },
    { key: 'branch', header: 'Sucursal', render: (r) => <div className="text-sm text-primary-600">{resolveBranch(r.branch_id)}</div> },
    { key: 'created_at', header: 'Creado', render: (r) => <div className="text-sm text-primary-500">{r.created_at || '—'}</div> },
  ];

  const actions = [
    { label: 'Editar', onClick: (r) => onEdit(r) },
    { label: 'Eliminar', variant: 'danger', onClick: (r) => onDelete(r.id) },
  ];

  return (
    <DataTable columns={columns} data={users} actions={actions} empty={{ title: 'Sin usuarios', description: 'No hay usuarios registrados.' }} />
  );
};

export default UsersTable;
