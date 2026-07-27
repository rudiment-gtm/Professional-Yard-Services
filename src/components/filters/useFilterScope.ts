import { useAppStore } from '@/store/appStore';
import type { FilterCondition, FilterGroup } from '@/types/filters';

export type FilterScope = 'map' | 'list';

interface FilterScopeApi {
  filters: FilterGroup[];
  addFilterGroup: () => void;
  duplicateFilterGroup: (groupId: string) => void;
  removeFilterGroup: (groupId: string) => void;
  addFilterCondition: (groupId: string) => void;
  updateFilterCondition: (groupId: string, condId: string, patch: Partial<FilterCondition>) => void;
  removeFilterCondition: (groupId: string, condId: string) => void;
  clearAdvancedFilters: () => void;
}

export function useFilterScope(scope: FilterScope = 'map'): FilterScopeApi {
  const isList = scope === 'list';
  return {
    filters: useAppStore((s) => (isList ? s.listAdvancedFilters : s.advancedFilters)),
    addFilterGroup: useAppStore((s) => (isList ? s.addListFilterGroup : s.addFilterGroup)),
    duplicateFilterGroup: useAppStore((s) => (isList ? s.duplicateListFilterGroup : s.duplicateFilterGroup)),
    removeFilterGroup: useAppStore((s) => (isList ? s.removeListFilterGroup : s.removeFilterGroup)),
    addFilterCondition: useAppStore((s) => (isList ? s.addListFilterCondition : s.addFilterCondition)),
    updateFilterCondition: useAppStore((s) => (isList ? s.updateListFilterCondition : s.updateFilterCondition)),
    removeFilterCondition: useAppStore((s) => (isList ? s.removeListFilterCondition : s.removeFilterCondition)),
    clearAdvancedFilters: useAppStore((s) => (isList ? s.clearListAdvancedFilters : s.clearAdvancedFilters)),
  };
}
