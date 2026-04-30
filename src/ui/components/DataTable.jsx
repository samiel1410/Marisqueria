import React from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState } from './Table';
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DataTable = ({
  columns = [],
  data = [],
  actions = null, // array of { label, onClick, variant, className }
  empty = {},
  pagination = null, // { current, total, pageSize, onChange }
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Table className={className}>
        <TableHeader>
          {columns.map(col => (
            <TableHead key={col.key} className={col.className || ''}>{col.header}</TableHead>
          ))}
          {actions && <TableHead className="text-right">Acciones</TableHead>}
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (actions ? 1 : 0)}>
                <EmptyState
                  title={empty.title || 'Sin registros'}
                  description={empty.description || ''}
                  icon={empty.icon}
                  action={empty.action}
                />
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id ?? row.key ?? JSON.stringify(row)}>
                {columns.map(col => (
                  <TableCell key={col.key} className={col.cellClass || ''}>
                    {col.render ? col.render(row) : (row[col.key] ?? '')}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {typeof actions === 'function' ? actions(row) : (
                        actions.map((a, i) => (
                          <Button key={i} variant={a.variant || 'primary'} className={a.className || ''} onClick={() => a.onClick(row)}>
                            {a.label}
                          </Button>
                        ))
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm text-primary-500 font-medium">
            Mostrando {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)} a {Math.min(pagination.current * pagination.pageSize, pagination.total)} de {pagination.total} resultados
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="py-1 px-3 text-sm h-9" 
              disabled={pagination.current <= 1}
              onClick={() => pagination.onChange(pagination.current - 1)}
            >
              <ChevronLeft size={16} /> Anterior
            </Button>
            <Button 
              variant="outline" 
              className="py-1 px-3 text-sm h-9" 
              disabled={pagination.current * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onChange(pagination.current + 1)}
            >
              Siguiente <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
