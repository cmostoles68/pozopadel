import { z } from "zod";

export const uuidSchema = z.string().min(1).max(200);

export const createPlayerSchema = z.object({
  id: uuidSchema.optional(),
  full_name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo"),
  gender: z.enum(["MALE", "FEMALE"], { message: "Género no válido" }),
  dominant_hand: z.enum(["RIGHT", "LEFT"], { message: "Mano dominante no válida" }),
  level: z.coerce.number().min(1, "El nivel debe ser como mínimo 1").max(10, "El nivel debe ser como máximo 10"),
});

export const updatePlayerSchema = createPlayerSchema.extend({
  id: uuidSchema,
});

export const createTournamentSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(100, "El título es demasiado largo"),
  numberOfCourts: z.coerce.number().int().min(1, "Debe haber al menos 1 pista").max(20, "Máximo 20 pistas"),
  minutesPerRound: z.coerce.number().int().min(1, "Los minutos por ronda deben ser entre 1 y 90").max(90, "Los minutos por ronda deben ser entre 1 y 90"),
});

export const drawMethodSchema = z.enum(["random", "random_mix", "level", "level_mix"]);

export const courtResultSchema = z.array(
  z.object({
    drawnPairId: uuidSchema,
    score: z.coerce.number().int().min(0).max(1000),
  }),
).min(1, "Debe haber al menos un resultado");

export const saveCourtResultSchema = z.object({
  roundId: uuidSchema,
  courtNumber: z.coerce.number().int().min(1, "El número de pista debe ser al menos 1"),
  winnerDrawnPairId: uuidSchema,
  results: courtResultSchema,
});