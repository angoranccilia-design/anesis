/**
 * Machine à états générique. Chaque entité à cycle de vie déclare sa carte de transitions ;
 * toute transition hors carte est interdite et doit être rejetée par le domaine.
 */

export type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

export const canTransition = <S extends string>(map: TransitionMap<S>, from: S, to: S): boolean =>
  (map[from] ?? []).includes(to);

export const assertTransition = <S extends string>(
  entity: string,
  map: TransitionMap<S>,
  from: S,
  to: S,
): void => {
  if (!canTransition(map, from, to)) {
    throw new Error(`${entity} : transition interdite ${from} → ${to}`);
  }
};

/** États terminaux d'une carte (aucune sortie). */
export const terminalStates = <S extends string>(map: TransitionMap<S>): S[] =>
  (Object.keys(map) as S[]).filter((s) => (map[s] ?? []).length === 0);
