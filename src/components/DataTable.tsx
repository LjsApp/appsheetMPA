import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  columns: {
    key: string;
    label: string;
    render?: (value: unknown, row: T) => React.ReactNode;
    width?: string;
  }[];
  data: T[];
  keyField?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'No data found.',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-100 text-xs">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider', col.width)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row[keyField] != null && row[keyField] !== '' ? String(row[keyField]) : `row-${rowIndex}`}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-800 whitespace-nowrap">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
