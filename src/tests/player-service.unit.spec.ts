import { describe, it, expect, vi } from "vitest";
import { PlayerService } from "../application/services/player.service";
import { ok, err } from "../domain/result";
import type { IPlayerRepository } from "../domain/repositories/player.repository";

type Mock = { [k: string]: ReturnType<typeof vi.fn> };

describe("PlayerService", () => {
  function buildService() {
    const repoMock: Mock = {
      findAll: vi.fn(),
      findProfiles: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      exists: vi.fn(),
      existsByName: vi.fn(),
    };
    const service = new PlayerService(repoMock as unknown as IPlayerRepository);
    return {
      service,
      repo: repoMock as unknown as Record<keyof Mock, Mock[keyof Mock]>,
    };
  }

  const input = {
    full_name: "Ana",
    gender: "FEMALE",
    dominant_hand: "RIGHT",
    level: 5,
  };

  describe("create", () => {
    it("rejects a duplicate name for the same user", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(ok(true));

      const res = await service.create({ ...input, id: "p2" }, "u1");
      expect(res).toEqual(err("Ya existe un jugador con ese nombre."));
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("creates the player when the name is free", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(ok(false));
      repo.create.mockResolvedValue(ok(undefined));

      const res = await service.create(input, "u1");
      expect(res).toEqual(ok(undefined));
      expect(repo.create).toHaveBeenCalledWith({
        ...input,
        user_uuid: "u1",
      });
    });

    it("propagates errors from the name check", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(err("boom"));

      const res = await service.create(input, "u1");
      expect(res).toEqual(err("boom"));
    });
  });

  describe("update", () => {
    it("rejects renaming to an existing name of another player", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(ok(true));

      const res = await service.update({ ...input, id: "p1" }, "u1");
      expect(res).toEqual(err("Ya existe un jugador con ese nombre."));
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("allows keeping the same name on the same player", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(ok(false));
      repo.update.mockResolvedValue(ok(undefined));

      const res = await service.update({ ...input, id: "p1" }, "u1");
      expect(res).toEqual(ok(undefined));
      expect(repo.existsByName).toHaveBeenCalledWith("u1", "Ana", "p1");
      expect(repo.update).toHaveBeenCalledWith(
        "p1",
        {
          full_name: "Ana",
          gender: "FEMALE",
          dominant_hand: "RIGHT",
          level: 5,
        },
        "u1",
      );
    });

    it("propagates errors from the name check", async () => {
      const { service, repo } = buildService();
      repo.existsByName.mockResolvedValue(err("boom"));

      const res = await service.update({ ...input, id: "p1" }, "u1");
      expect(res).toEqual(err("boom"));
    });
  });
});
