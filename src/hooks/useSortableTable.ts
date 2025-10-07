import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type SortConfig = {
  key: string;
  direction: SortDirection;
};

export function useSortableTable<T>(items: T[], defaultSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;

    return [...items].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle numeric values (including price strings with '$')
      if (typeof aValue === 'string' && aValue.startsWith('$')) {
        const aNum = parseFloat(aValue.replace('$', ''));
        const bNum = parseFloat(bValue.replace('$', ''));
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
      else direction = 'asc';
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  return { items: sortedItems, sortConfig, requestSort };
}