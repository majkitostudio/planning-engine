import type {
  ConfirmedPlan,
  PlanningInput,
  PlanningRunResult,
  ProposedAssignment,
} from "./domain/types";
import type { PlanningActor } from "../auth/actor";
import { prisma as defaultPrisma } from "../db";
import { Prisma, type PlanningRunRecord, type PrismaClient } from "@/prisma/generated/client";
import type { PlanningProviderMode } from "./runtime-types";

export interface PlanningRunSnapshot {
  readonly proposalId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly providerName: string;
  readonly mode: PlanningProviderMode;
  readonly input: PlanningInput;
  readonly result: PlanningRunResult;
  readonly confirmedPlan: ConfirmedPlan | null;
  readonly confirmedAt: string | null;
  readonly confirmedById: string | null;
}

export interface PlanningAuditEvent {
  readonly id: string;
  readonly action: "planning.confirmed";
  readonly entityType: "planning_run";
  readonly entityId: string;
  readonly actorId: string;
  readonly createdAt: string;
  readonly details: Readonly<Record<string, string>>;
}

export interface PlanningPersistenceState {
  readonly runs: Map<string, PlanningRunSnapshot>;
  readonly auditEvents: PlanningAuditEvent[];
}

export interface PersistedConfirmation {
  readonly snapshot: PlanningRunSnapshot;
  readonly alreadyConfirmed: boolean;
}

export interface PlanningPersistence {
  saveRun(snapshot: PlanningRunSnapshot, actor?: PlanningActor): Promise<void>;
  getRun(proposalId: string): Promise<PlanningRunSnapshot | null>;
  confirmRun(
    proposalId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
  ): Promise<PersistedConfirmation | null>;
}

export function createInMemoryPersistenceState(): PlanningPersistenceState {
  return {
    runs: new Map(),
    auditEvents: [],
  };
}

export class InMemoryPlanningPersistence implements PlanningPersistence {
  constructor(
    private readonly state: PlanningPersistenceState =
      createInMemoryPersistenceState(),
  ) {}

  async saveRun(
    snapshot: PlanningRunSnapshot,
    actor?: PlanningActor,
  ): Promise<void> {
    void actor;
    this.state.runs.set(snapshot.proposalId, snapshot);
  }

  async getRun(proposalId: string): Promise<PlanningRunSnapshot | null> {
    return this.state.runs.get(proposalId) ?? null;
  }

  async confirmRun(
    proposalId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
  ): Promise<PersistedConfirmation | null> {
    const current = this.state.runs.get(proposalId);
    if (!current) return null;

    if (current.confirmedPlan) {
      return { snapshot: current, alreadyConfirmed: true };
    }

    const confirmedPlan: ConfirmedPlan = {
      proposalId,
      weekStart: current.result.weekStart,
      assignments,
      confirmedAt: confirmedAt.toISOString(),
    };
    const updated: PlanningRunSnapshot = {
      ...current,
      confirmedPlan,
      confirmedAt: confirmedPlan.confirmedAt,
      confirmedById: actor.userId,
    };

    this.state.runs.set(proposalId, updated);
    this.state.auditEvents.push({
      id: `audit-${this.state.auditEvents.length + 1}`,
      action: "planning.confirmed",
      entityType: "planning_run",
      entityId: proposalId,
      actorId: actor.userId,
      createdAt: confirmedAt.toISOString(),
      details: {
        weekStart: current.result.weekStart,
        email: actor.email,
      },
    });

    return { snapshot: updated, alreadyConfirmed: false };
  }

  getAuditEvents(): readonly PlanningAuditEvent[] {
    return [...this.state.auditEvents];
  }
}

export class PrismaPlanningPersistence implements PlanningPersistence {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async saveRun(
    snapshot: PlanningRunSnapshot,
    actor?: PlanningActor,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      if (actor) await ensureActor(tx, actor);

      await tx.planningRunRecord.upsert({
        where: { proposalId: snapshot.proposalId },
        create: {
          proposalId: snapshot.proposalId,
          scenarioId: snapshot.scenarioId,
          scenarioLabel: snapshot.scenarioLabel,
          providerName: snapshot.providerName,
          mode: snapshot.mode,
          weekStart: snapshot.result.weekStart,
          input: toInputJson(snapshot.input),
          result: toInputJson(snapshot.result),
          confirmedPlan: snapshot.confirmedPlan
            ? toInputJson(snapshot.confirmedPlan)
            : Prisma.JsonNull,
          confirmedAt: snapshot.confirmedAt
            ? new Date(snapshot.confirmedAt)
            : null,
          confirmedById: snapshot.confirmedById,
        },
        update: {
          scenarioId: snapshot.scenarioId,
          scenarioLabel: snapshot.scenarioLabel,
          providerName: snapshot.providerName,
          mode: snapshot.mode,
          weekStart: snapshot.result.weekStart,
          input: toInputJson(snapshot.input),
          result: toInputJson(snapshot.result),
        },
      });
    });
  }

  async getRun(proposalId: string): Promise<PlanningRunSnapshot | null> {
    const row = await this.db.planningRunRecord.findUnique({
      where: { proposalId },
    });
    return row ? snapshotFromRecord(row) : null;
  }

  async confirmRun(
    proposalId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
  ): Promise<PersistedConfirmation | null> {
    return this.db.$transaction(async (tx) => {
      const row = await tx.planningRunRecord.findUnique({
        where: { proposalId },
      });
      if (!row) return null;

      if (row.confirmedPlan !== null) {
        return { snapshot: snapshotFromRecord(row), alreadyConfirmed: true };
      }

      const actorRecord = await ensureActor(tx, actor);
      const confirmedPlan: ConfirmedPlan = {
        proposalId,
        weekStart: row.weekStart,
        assignments,
        confirmedAt: confirmedAt.toISOString(),
      };
      const updated = await tx.planningRunRecord.update({
        where: { proposalId },
        data: {
          confirmedPlan: toInputJson(confirmedPlan),
          confirmedAt,
          confirmedById: actorRecord.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: "planning.confirmed",
          entityType: "planning_run",
          entityId: proposalId,
          actorId: actorRecord.id,
          createdAt: confirmedAt,
          details: {
            weekStart: row.weekStart,
            email: actor.email,
          },
        },
      });

      return { snapshot: snapshotFromRecord(updated), alreadyConfirmed: false };
    });
  }
}

async function ensureActor(
  db: Prisma.TransactionClient,
  actor: PlanningActor,
) {
  return db.appUser.upsert({
    where: { externalSubject: actor.userId },
    create: {
      externalSubject: actor.userId,
      email: actor.email,
      displayName: actor.displayName,
      role: actor.role,
    },
    update: {
      email: actor.email,
      displayName: actor.displayName,
      active: true,
    },
  });
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function snapshotFromRecord(row: PlanningRunRecord): PlanningRunSnapshot {
  return {
    proposalId: row.proposalId,
    scenarioId: row.scenarioId,
    scenarioLabel: row.scenarioLabel,
    providerName: row.providerName,
    mode: row.mode as PlanningProviderMode,
    input: row.input as unknown as PlanningInput,
    result: row.result as unknown as PlanningRunResult,
    confirmedPlan: row.confirmedPlan
      ? (row.confirmedPlan as unknown as ConfirmedPlan)
      : null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    confirmedById: row.confirmedById,
  };
}
