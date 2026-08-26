import { Search } from 'lucide-react';

interface TableToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (val: number) => void;
  totalRows: number;
  searchPlaceholder?: string;
}

const ROW_OPTIONS = [10, 25, 50, 100];

export default function TableToolbar({
  search,
  onSearchChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalRows,
  searchPlaceholder = 'Cari...',
}: TableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 bg-white">
      {/* Left: rows per page */}
      <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
        <span>Tampilkan</span>
        <select
          value={rowsPerPage}
          onChange={e => onRowsPerPageChange(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white cursor-pointer"
        >
          {ROW_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>dari <strong>{totalRows}</strong> baris</span>
      </div>

      {/* Right: search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
        />
      </div>
    </div>
  );
}
