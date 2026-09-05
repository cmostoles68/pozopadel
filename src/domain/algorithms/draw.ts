import type { PlayerProfile } from "../entities/player";
import type { DrawMethod } from "../entities/pair";
import type { PartnershipRecord } from "../entities/pair";

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isLefty(p: PlayerProfile): boolean {
  return p.dominant_hand === "LEFT";
}

function leftyCompatible(a: PlayerProfile, b: PlayerProfile): boolean {
  return !(isLefty(a) && isLefty(b));
}

function canPair(
  a: PlayerProfile,
  b: PlayerProfile,
  disallowedPairs: Set<string>,
): boolean {
  return (
    leftyCompatible(a, b) && !disallowedPairs.has([a.id, b.id].sort().join("|"))
  );
}

export function pairPlayers(
  players: PlayerProfile[],
  method: DrawMethod,
  disallowedPairs: Set<string> = new Set(),
): Array<[PlayerProfile, PlayerProfile]> {
  const pairs: Array<[PlayerProfile, PlayerProfile]> = [];

  if (method === "random" || method === "random_mix") {
    const males = shuffleArray(players.filter((p) => p.gender === "MALE"));
    const females = shuffleArray(players.filter((p) => p.gender === "FEMALE"));

    if (method === "random_mix") {
      const count = Math.min(males.length, females.length);
      const usedMales = males.slice(0, count);
      const usedFemales = females.slice(0, count);
      const mixedPairs: Array<[PlayerProfile, PlayerProfile]> = usedMales.map(
        (m, i) => [m, usedFemales[i]],
      );

      const shuffledPairs = shuffleArray(mixedPairs);

      for (const pair of shuffledPairs) {
        if (canPair(pair[0], pair[1], disallowedPairs)) {
          pairs.push(pair);
        } else {
          let swapped = false;
          for (let j = 0; j < pairs.length; j++) {
            if (
              canPair(pair[0], pairs[j][1], disallowedPairs) &&
              canPair(pairs[j][0], pair[1], disallowedPairs)
            ) {
              const tmp = pairs[j][1];
              pairs[j] = [pairs[j][0], pair[1]];
              swapped = true;
              pairs.push([pair[0], tmp]);
              break;
            }
          }
          if (!swapped) {
            pairs.push(pair);
          }
        }
      }

      const leftoverMales = males.slice(count);
      const leftoverFemales = females.slice(count);
      const leftovers = shuffleArray([...leftoverMales, ...leftoverFemales]);

      for (let i = 0; i < leftovers.length - 1; i += 2) {
        if (canPair(leftovers[i], leftovers[i + 1], disallowedPairs)) {
          pairs.push([leftovers[i], leftovers[i + 1]]);
        } else {
          let found = false;
          for (let j = i + 2; j < leftovers.length; j++) {
            if (canPair(leftovers[i], leftovers[j], disallowedPairs)) {
              [leftovers[i + 1], leftovers[j]] = [
                leftovers[j],
                leftovers[i + 1],
              ];
              pairs.push([leftovers[i], leftovers[i + 1]]);
              found = true;
              break;
            }
          }
          if (!found) {
            pairs.push([leftovers[i], leftovers[i + 1]]);
          }
        }
      }
    } else {
      const all = shuffleArray(players);
      for (let i = 0; i < all.length - 1; i += 2) {
        if (canPair(all[i], all[i + 1], disallowedPairs)) {
          pairs.push([all[i], all[i + 1]]);
        } else {
          let swapped = false;
          for (let j = i + 2; j < all.length; j++) {
            if (
              canPair(all[i], all[j], disallowedPairs) &&
              canPair(
                all[i + 1],
                all[j - (j === i + 2 ? 0 : 1)],
                disallowedPairs,
              )
            ) {
              [all[i + 1], all[j]] = [all[j], all[i + 1]];
              pairs.push([all[i], all[i + 1]]);
              swapped = true;
              break;
            }
          }
          if (!swapped) {
            pairs.push([all[i], all[i + 1]]);
          }
        }
      }
    }
  } else {
    const sorted = [...players].sort((a, b) => b.level - a.level);

    if (method === "level_mix") {
      const sortedMales = [...players.filter((p) => p.gender === "MALE")].sort(
        (a, b) => b.level - a.level,
      );
      const sortedFemales = [
        ...players.filter((p) => p.gender === "FEMALE"),
      ].sort((a, b) => b.level - a.level);

      const count = Math.min(sortedMales.length, sortedFemales.length);
      const usedMales = sortedMales.slice(0, count);
      const usedFemales = sortedFemales.slice(0, count);

      for (let i = 0; i < count; i++) {
        const m = usedMales[i];
        const f = usedFemales[count - 1 - i];
        if (canPair(m, f, disallowedPairs)) {
          pairs.push([m, f]);
        } else {
          let swapped = false;
          for (let k = 0; k < pairs.length; k++) {
            const existingFemale =
              pairs[k][1].gender === "FEMALE" ? pairs[k][1] : pairs[k][0];
            const existingMale =
              pairs[k][0].gender === "MALE" ? pairs[k][0] : pairs[k][1];
            if (
              canPair(m, existingFemale, disallowedPairs) &&
              canPair(existingMale, f, disallowedPairs)
            ) {
              pairs[k] = [existingMale, f];
              pairs.push([m, existingFemale]);
              swapped = true;
              break;
            }
          }
          if (!swapped) {
            pairs.push([m, f]);
          }
        }
      }

      const leftoverMales = sortedMales.slice(count);
      const leftoverFemales = sortedFemales.slice(count);
      const leftovers = [...leftoverMales, ...leftoverFemales];
      for (let i = 0; i < leftovers.length - 1; i += 2) {
        pairs.push([leftovers[i], leftovers[i + 1]]);
      }
    } else {
      for (let i = 0; i < sorted.length - 1; i += 2) {
        if (canPair(sorted[i], sorted[i + 1], disallowedPairs)) {
          pairs.push([sorted[i], sorted[i + 1]]);
        } else {
          let swapped = false;
          for (let j = i + 2; j < sorted.length; j++) {
            if (canPair(sorted[i], sorted[j], disallowedPairs)) {
              [sorted[i + 1], sorted[j]] = [sorted[j], sorted[i + 1]];
              pairs.push([sorted[i], sorted[i + 1]]);
              swapped = true;
              break;
            }
          }
          if (!swapped) {
            pairs.push([sorted[i], sorted[i + 1]]);
          }
        }
      }
    }
  }

  return pairs;
}

export function computeWinningPartnerships(
  history: {
    winner_player1_id: string;
    winner_player2_id: string;
    loser_player1_id: string;
    loser_player2_id: string;
  }[],
  minMatches = 2,
  minWinRate = 0.7,
): PartnershipRecord[] {
  if (history.length === 0) return [];

  const key = (a: string, b: string) => [a, b].sort().join("|");

  const wins = new Map<string, number>();
  const totals = new Map<string, number>();

  const bump = (ids: [string, string], win: boolean) => {
    const k = key(ids[0], ids[1]);
    totals.set(k, (totals.get(k) ?? 0) + 1);
    if (win) wins.set(k, (wins.get(k) ?? 0) + 1);
  };

  for (const m of history) {
    bump([m.winner_player1_id, m.winner_player2_id], true);
    bump([m.loser_player1_id, m.loser_player2_id], false);
  }

  const result: PartnershipRecord[] = [];
  for (const [k, total] of totals) {
    if (total < minMatches) continue;
    const w = wins.get(k) ?? 0;
    const winRate = w / total;
    if (winRate >= minWinRate) {
      const [a, b] = k.split("|");
      result.push({ a, b, wins: w, total, winRate });
    }
  }

  return result;
}

export function getDrawValidationError(playerCount: number): string | null {
  if (playerCount < 4) {
    return "Necesitas al menos 4 jugadores (número par) para sortear.";
  }
  if (playerCount % 2 !== 0) {
    return "El número de jugadores debe ser par para sortear.";
  }
  return null;
}
