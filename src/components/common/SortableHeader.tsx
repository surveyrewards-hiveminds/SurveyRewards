import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortDirection } from '../../hooks/useSortableTable';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: SortDirection } | null;
  onSort: (key: string) => void;
}

export function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort 
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  
  return (
    <th 
      className="text-left p-4 cursor-pointer group"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <div className={`
          transition-colors
          ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
        `}>
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </div>
      </div>
    </th>
  );
}