import { describe, expect, it } from "vitest";

import { canConfirmPlanning, toPlanningActor } from "./actor";

describe("planning actor", () => {
  it("převede session managera na serverového aktéra", () => {
    const actor = toPlanningActor({
      user: {
        id: "entra-sub-1",
        email: "manager@aaauto.cz",
        name: "Manažer",
        role: "manager",
      },
    });

    expect(actor).toEqual({
      userId: "entra-sub-1",
      email: "manager@aaauto.cz",
      displayName: "Manažer",
      role: "manager",
    });
    expect(actor && canConfirmPlanning(actor)).toBe(true);
  });

  it("viewer může být přihlášený, ale nesmí potvrzovat", () => {
    const actor = toPlanningActor({
      user: {
        id: "entra-sub-2",
        email: "viewer@aaauto.cz",
        name: null,
        role: "viewer",
      },
    });

    expect(actor?.displayName).toBe("viewer@aaauto.cz");
    expect(actor && canConfirmPlanning(actor)).toBe(false);
  });

  it("bez session nebo identity aktér nevznikne", () => {
    expect(toPlanningActor(null)).toBeNull();
    expect(toPlanningActor({ user: { role: "manager" } })).toBeNull();
  });
});
