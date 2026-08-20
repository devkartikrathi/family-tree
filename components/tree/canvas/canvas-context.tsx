'use client';

import { createContext, useContext } from 'react';

export type RelativeKind = 'parent' | 'child' | 'partner' | 'sibling';

export interface CanvasActions {
  selectedId: string | null;
  hoveredId: string | null;
  /** Ids to keep bright while the rest of the tree dims. */
  focusIds: Set<string> | null;
  select(personId: string | null): void;
  hover(personId: string | null): void;
  addRelative(personId: string, kind: RelativeKind, unionId?: string): void;
  editUnion(unionId: string): void;
}

const CanvasContext = createContext<CanvasActions | null>(null);

export const CanvasProvider = CanvasContext.Provider;

export function useCanvas(): CanvasActions {
  const value = useContext(CanvasContext);
  if (!value) throw new Error('useCanvas must be used inside the family canvas');
  return value;
}
