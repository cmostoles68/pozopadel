export function countChampionshipsByPairIds(
  championPairs: [string, string][],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [playerIdA, playerIdB] of championPairs) {
    counts[playerIdA] = (counts[playerIdA] ?? 0) + 1;
    counts[playerIdB] = (counts[playerIdB] ?? 0) + 1;
  }
  return counts;
}

export function countChampionshipsByDrawnPairIds(
  championDrawnPairIds: (string | null)[],
  pairMembersById: Map<string, [string, string]>,
): Record<string, number> {
  const championPairs: [string, string][] = [];
  for (const id of championDrawnPairIds) {
    if (!id) continue;
    const members = pairMembersById.get(id);
    if (!members) continue;
    championPairs.push(members);
  }
  return countChampionshipsByPairIds(championPairs);
}
