"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getWinningPartnershipKeys } from "@/lib/partnership-history";

type DrawMethod = "random" | "random_mix" | "level" | "level_mix";

interface Player {
  id: string;
  full_name: string;
  level: number;
  gender: string;
  dominant_hand: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isLefty(p: Player): boolean {
  return p.dominant_hand === "LEFT";
}

function leftyCompatible(a: Player, b: Player): boolean {
  return !(isLefty(a) && isLefty(b));
}

function pairPlayers(
  players: Player[],
  method: DrawMethod,
  disallowedPairs: Set<string> = new Set(),
): Array<[Player, Player]> {
  const pairs: Array<[Player, Player]> = [];

  const canPair = (a: Player, b: Player): boolean =>
    leftyCompatible(a, b) &&
    !disallowedPairs.has([a.id, b.id].sort().join("|"));

  if (method === "random" || method === "random_mix") {
    const males = shuffleArray(players.filter((p) => p.gender === "MALE"));
    const females = shuffleArray(players.filter((p) => p.gender === "FEMALE"));

    if (method === "random_mix") {
      // Pair one male with one female, random order
      const count = Math.min(males.length, females.length);
      const usedMales = males.slice(0, count);
      const usedFemales = females.slice(0, count);
      const mixedPairs: Array<[Player, Player]> = usedMales.map((m, i) => [m, usedFemales[i]]);

      // Shuffle pairs
      const shuffledPairs = shuffleArray(mixedPairs);

      // Check lefty constraint: swap if both lefties
      for (const pair of shuffledPairs) {
        if (canPair(pair[0], pair[1])) {
          pairs.push(pair);
        } else {
          // Try to find another pair to swap with
          let swapped = false;
          for (let j = 0; j < pairs.length; j++) {
            if (canPair(pair[0], pairs[j][1]) && canPair(pairs[j][0], pair[1])) {
              // Swap second players
              const tmp = pairs[j][1];
              pairs[j] = [pairs[j][0], pair[1]];
              swapped = true;
              pairs.push([pair[0], tmp]);
              break;
            }
          }
          if (!swapped) {
            // Can't swap, still add but skip the pair
            pairs.push(pair);
          }
        }
      }

      // Handle leftover same-gender players randomly
      const leftoverMales = males.slice(count);
      const leftoverFemales = females.slice(count);
      const leftovers = shuffleArray([...leftoverMales, ...leftoverFemales]);

      // Pair leftovers among themselves
      for (let i = 0; i < leftovers.length - 1; i += 2) {
        if (canPair(leftovers[i], leftovers[i + 1])) {
          pairs.push([leftovers[i], leftovers[i + 1]]);
        } else {
          // Try to find a compatible pair from what we have
          let found = false;
          for (let j = i + 2; j < leftovers.length; j++) {
            if (canPair(leftovers[i], leftovers[j])) {
              [leftovers[i + 1], leftovers[j]] = [leftovers[j], leftovers[i + 1]];
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
      // Pure random: shuffle all together
      const all = shuffleArray(players);
      for (let i = 0; i < all.length - 1; i += 2) {
        if (canPair(all[i], all[i + 1])) {
          pairs.push([all[i], all[i + 1]]);
        } else {
          // Try to swap with a later player
          let swapped = false;
          for (let j = i + 2; j < all.length; j++) {
            if (canPair(all[i], all[j]) && canPair(all[i + 1], all[j - (j === i + 2 ? 0 : 1)])) {
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
    // Level-based: pair best with worst
    const sorted = [...players].sort((a, b) => b.level - a.level);

    if (method === "level_mix") {
      // Separate by gender, sort each by level
      const sortedMales = [...players.filter((p) => p.gender === "MALE")].sort(
        (a, b) => b.level - a.level,
      );
      const sortedFemales = [...players.filter((p) => p.gender === "FEMALE")].sort(
        (a, b) => b.level - a.level,
      );

      const count = Math.min(sortedMales.length, sortedFemales.length);
      const usedMales = sortedMales.slice(0, count);
      const usedFemales = sortedFemales.slice(0, count);

      // Pair best male with worst female, best female with worst male (level-balanced)
      for (let i = 0; i < count; i++) {
        const m = usedMales[i];
        const f = usedFemales[count - 1 - i];
        if (canPair(m, f)) {
          pairs.push([m, f]);
        } else {
          // Try to find another female for this male
          let swapped = false;
          for (let k = 0; k < pairs.length; k++) {
            const existingFemale = pairs[k][1].gender === "FEMALE" ? pairs[k][1] : pairs[k][0];
            const existingMale =
              pairs[k][0].gender === "MALE" ? pairs[k][0] : pairs[k][1];
            if (
              canPair(m, existingFemale) &&
              canPair(existingMale, f)
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

      // Handle leftovers
      const leftoverMales = sortedMales.slice(count);
      const leftoverFemales = sortedFemales.slice(count);
      const leftovers = [...leftoverMales, ...leftoverFemales];
      for (let i = 0; i < leftovers.length - 1; i += 2) {
        if (canPair(leftovers[i], leftovers[i + 1])) {
          pairs.push([leftovers[i], leftovers[i + 1]]);
        } else {
          pairs.push([leftovers[i], leftovers[i + 1]]);
        }
      }
    } else {
      // Level-based without gender constraint
      for (let i = 0; i < sorted.length - 1; i += 2) {
        if (canPair(sorted[i], sorted[i + 1])) {
          pairs.push([sorted[i], sorted[i + 1]]);
        } else {
          // Try to swap
          let swapped = false;
          for (let j = i + 2; j < sorted.length; j++) {
            if (canPair(sorted[i], sorted[j])) {
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

export async function drawPairs(method: DrawMethod) {
  const supabase = await createClient();

  const { data: players, error } = await supabase
    .from("profiles")
    .select("id, full_name, level, gender, dominant_hand");

  if (error || !players || players.length < 2) {
    return { error: "Se necesitan al menos 2 jugadores para sortear parejas." };
  }

  // Borrar sorteos anteriores
  await supabase.from("drawn_pairs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Avoid re-forming pairs that keep winning together (from the match history).
  const disallowedPairs = await getWinningPartnershipKeys(supabase);

  const paired = pairPlayers(players as Player[], method, disallowedPairs);

  const pairsToInsert = paired.map(([a, b], i) => ({
    pair_number: i + 1,
    player1_id: a.id,
    player2_id: b.id,
    draw_method: method,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from("drawn_pairs")
    .insert(pairsToInsert)
    .select("*");

  if (insertErr) {
    return { error: insertErr.message };
  }

  revalidatePath("/sorteo");

  const usedCount = paired.length * 2;
  const oddPlayer =
    players.length - usedCount > 0
      ? players.find(
          (p) => !paired.some(([a, b]) => a.id === p.id || b.id === p.id),
        )
      : null;

  return {
    ok: true,
    pairs: inserted ?? [],
    oddPlayer: oddPlayer?.full_name ?? null,
  };
}

export async function clearPairs() {
  const supabase = await createClient();
  await supabase.from("drawn_pairs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  revalidatePath("/sorteo");
  return { ok: true };
}
