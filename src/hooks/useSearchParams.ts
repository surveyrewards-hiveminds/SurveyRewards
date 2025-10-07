import { useMemo } from 'react';

export function useSearchParams<T extends Record<string, string>>(): Partial<T> {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries()) as Partial<T>;
  }, [window.location.search]);
}