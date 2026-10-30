import type {
  ConfirmedPlan,
  PlanningInput,
  PlanningRunResult,
  ProposedAssignment,
  ReplacementRunResult,
  ReplacementOption,
} from "./domain/types";
import type { StaffingSetting } from "./staffing-settings";
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

export interface ReplacementRunSnapshot {
  readonly replacementId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly providerName: string;
  readonly mode: PlanningProviderMode;
  readonly input: PlanningInput;
  readonly basePlan: ConfirmedPlan;
  readonly result: ReplacementRunResult;
  readonly confirmedPlan: ConfirmedPlan | null;
  readonly confirmedAt: string | null;
  readonly confirmedById: string | null;
}

export interface PlanningAuditEvent {
  readonly id: string;
  readonly action: "planning.confirmed" | "planning.replacement_confirmed";
  readonly entityType: "planning_run" | "replacement_run";
  readonly entityId: string;
  readonly actorId: string | null;
  readonly createdAt: string;
  readonly details: Readonly<Record<string, string>>;
}

export interface EmployeeRequestDecision {
  readonly requestId: string;
  readonly status: "approved" | "rejected";
  readonly decidedAt: string;
  readonly decidedById: string;
}

export interface PlanningPersistenceState {
  readonly runs: Map<string, PlanningRunSnapshot>;
  readonly replacementRuns: Map<string, ReplacementRunSnapshot>;
  readonly staffingSettings: Map<string, StaffingSetting>;
  readonly employeeRequestDecisions: Map<string, EmployeeRequestDecision>;
  readonly auditEvents: PlanningAuditEvent[];
}

export interface PersistedConfirmation {
  readonly snapshot: PlanningRunSnapshot;
  readonly alreadyConfirmed: boolean;
}

export interface PersistedReplacementConfirmation {
  readonly snapshot: ReplacementRunSnapshot;
  readonly alreadyConfirmed: boolean;
}

export interface PlanningPersistence {
  saveRun(snapshot: PlanningRunSnapshot, actor?: PlanningActor): Promise<void>;
  getRun(proposalId: string): Promise<PlanningRunSnapshot | null>;
  listAuditEvents(): Promise<readonly PlanningAuditEvent[]>;
  confirmRun(
    proposalId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
  ): Promise<PersistedConfirmation | null>;
  saveReplacementRun(
    snapshot: ReplacementRunSnapshot,
    actor?: PlanningActor,
  ): Promise<void>;
  getReplacementRun(replacementId: string): Promise<ReplacementRunSnapshot | null>;
  confirmReplacementRun(
    replacementId: string,
    selectedOptionId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
    acceptedTimeOffChangeIds?: readonly string[],
    confirmedOption?: ReplacementOption,
  ): Promise<PersistedReplacementConfirmation | null>;
  getStaffingSettings(): Promise<readonly StaffingSetting[]>;
  saveStaffingSettings(settings: readonly StaffingSetting[]): Promise<void>;
  getEmployeeRequestDecisions(): Promise<readonly EmployeeRequestDecision[]>;
  saveEmployeeRequestDecision(
    requestId: string,
    status: EmployeeRequestDecision["status"],
    actor: PlanningActor,
    decidedAt: Date,
  ): Promise<EmployeeRequestDecision>;
}

export function createInMemoryPersistenceState(): PlanningPersistenceState {
  return {
    runs: new Map(),
    replacementRuns: new Map(),
    staffingSettings: new Map(),
    employeeRequestDecisions: new Map(),
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

  async saveReplacementRun(
    snapshot: ReplacementRunSnapshot,
    actor?: PlanningActor,
  ): Promise<void> {
    void actor;
    this.state.replacementRuns.set(snapshot.replacementId, snapshot);
  }

  async getReplacementRun(
    replacementId: string,
  ): Promise<ReplacementRunSnapshot | null> {
    return this.state.replacementRuns.get(replacementId) ?? null;
  }

  async getStaffingSettings(): Promise<readonly StaffingSetting[]> {
    return [...this.state.staffingSettings.values()].sort(
      (left, right) =>
        left.dayOfWeek - right.dayOfWeek ||
        shiftKindOrder(left.shiftKind) - shiftKindOrder(right.shiftKind),
    );
  }

  async saveStaffingSettings(settings: readonly StaffingSetting[]): Promise<void> {
    this.state.staffingSettings.clear();
    for (const setting of settings) {
      this.state.staffingSettings.set(
        `${setting.dayOfWeek}|${setting.shiftKind}`,
        setting,
      );
    }
  }

  async getEmployeeRequestDecisions(): Promise<readonly EmployeeRequestDecision[]> {
    return [...this.state.employeeRequestDecisions.values()].sort((left, right) =>
      left.requestId.localeCompare(right.requestId),
    );
  }

  async saveEmployeeRequestDecision(
    requestId: string,
    status: EmployeeRequestDecision["status"],
    actor: PlanningActor,
    decidedAt: Date,
  ): Promise<EmployeeRequestDecision> {
    const decision = {
      requestId,
      status,
      decidedAt: decidedAt.toISOString(),
      decidedById: actor.userId,
    };
    this.state.employeeRequestDecisions.set(requestId, decision);
    return decision;
  }

  async listAuditEvents(): Promise<readonly PlanningAuditEvent[]> {
    return [...this.state.auditEvents].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
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

  async confirmReplacementRun(
    replacementId: string,
    selectedOptionId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
    acceptedTimeOffChangeIds: readonly string[] = [],
    confirmedOption?: ReplacementOption,
  ): Promise<PersistedReplacementConfirmation | null> {
    const current = this.state.replacementRuns.get(replacementId);
    if (!current) return null;
    if (current.confirmedPlan) {
      return { snapshot: current, alreadyConfirmed: true };
    }

    const confirmedPlan: ConfirmedPlan = {
      proposalId: replacementId,
      weekStart: current.result.request.weekStart,
      assignments,
      confirmedAt: confirmedAt.toISOString(),
    };
    const updated: ReplacementRunSnapshot = {
      ...current,
      result: {
        ...current.result,
        selectedOptionId,
        options: current.result.options.map((option) =>
          option.id === selectedOptionId && confirmedOption ? confirmedOption : option,
        ),
        request: {
          ...current.result.request,
          incident: {
            ...current.result.request.incident,
            status: "confirmed",
          },
        },
      },
      confirmedPlan,
      confirmedAt: confirmedPlan.confirmedAt,
      confirmedById: actor.userId,
    };

    this.state.replacementRuns.set(replacementId, updated);
    this.state.auditEvents.push({
      id: `audit-${this.state.auditEvents.length + 1}`,
      action: "planning.replacement_confirmed",
      entityType: "replacement_run",
      entityId: replacementId,
      actorId: actor.userId,
      createdAt: confirmedAt.toISOString(),
      details: replacementAuditDetails(
        current,
        selectedOptionId,
        assignments,
        acceptedTimeOffChangeIds,
        actor.email,
      ),
    });

    return { snapshot: updated, alreadyConfirmed: false };
  }

  getAuditEvents(): readonly PlanningAuditEvent[] {
    return [...this.state.auditEvents];
  }
}

function shiftKindOrder(shiftKind: StaffingSetting["shiftKind"]): number {
  return shiftKind === "morning" ? 0 : 1;
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
    return row && !isReplacementRecord(row)
      ? planningSnapshotFromRecord(row)
      : null;
  }

  async saveReplacementRun(
    snapshot: ReplacementRunSnapshot,
    actor?: PlanningActor,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      if (actor) await ensureActor(tx, actor);

      await tx.planningRunRecord.upsert({
        where: { proposalId: snapshot.replacementId },
        create: {
          proposalId: snapshot.replacementId,
          scenarioId: snapshot.scenarioId,
          scenarioLabel: snapshot.scenarioLabel,
          providerName: snapshot.providerName,
          mode: snapshot.mode,
          weekStart: snapshot.result.request.weekStart,
          input: toInputJson(snapshot.input),
          result: toInputJson(replacementEnvelope(snapshot)),
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
          weekStart: snapshot.result.request.weekStart,
          input: toInputJson(snapshot.input),
          result: toInputJson(replacementEnvelope(snapshot)),
        },
      });
    });
  }

  async getReplacementRun(
    replacementId: string,
  ): Promise<ReplacementRunSnapshot | null> {
    const row = await this.db.planningRunRecord.findUnique({
      where: { proposalId: replacementId },
    });
    return row && isReplacementRecord(row)
      ? replacementSnapshotFromRecord(row)
      : null;
  }

  async getStaffingSettings(): Promise<readonly StaffingSetting[]> {
    const rows = await this.db.staffingRequirementSetting.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { shiftKind: "asc" }],
    });
    return rows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      shiftKind: row.shiftKind as StaffingSetting["shiftKind"],
      requiredEmployees: row.requiredEmployees,
    }));
  }

  async saveStaffingSettings(settings: readonly StaffingSetting[]): Promise<void> {
    await this.db.$transaction(
      settings.map((setting) =>
        this.db.staffingRequirementSetting.upsert({
          where: {
            dayOfWeek_shiftKind: {
              dayOfWeek: setting.dayOfWeek,
              shiftKind: setting.shiftKind,
            },
          },
          create: {
            dayOfWeek: setting.dayOfWeek,
            shiftKind: setting.shiftKind,
            requiredEmployees: setting.requiredEmployees,
          },
          update: { requiredEmployees: setting.requiredEmployees },
        }),
      ),
    );
  }

  async getEmployeeRequestDecisions(): Promise<readonly EmployeeRequestDecision[]> {
    const rows = await this.db.employeeRequestDecision.findMany({
      orderBy: { requestId: "asc" },
    });
    return rows.map((row) => ({
      requestId: row.requestId,
      status: row.status,
      decidedAt: row.decidedAt.toISOString(),
      decidedById: row.decidedById,
    }));
  }

  async saveEmployeeRequestDecision(
    requestId: string,
    status: EmployeeRequestDecision["status"],
    actor: PlanningActor,
    decidedAt: Date,
  ): Promise<EmployeeRequestDecision> {
    return this.db.$transaction(async (tx) => {
      const actorRecord = await ensureActor(tx, actor);
      const row = await tx.employeeRequestDecision.upsert({
        where: { requestId },
        create: {
          requestId,
          status,
          decidedAt,
          decidedById: actorRecord.id,
        },
        update: { status, decidedAt, decidedById: actorRecord.id },
      });
      return {
        requestId: row.requestId,
        status: row.status,
        decidedAt: row.decidedAt.toISOString(),
        decidedById: actor.userId,
      };
    });
  }

  async listAuditEvents(): Promise<readonly PlanningAuditEvent[]> {
    const rows = await this.db.auditEvent.findMany({
      where: {
        action: { in: ["planning.confirmed", "planning.replacement_confirmed"] },
        entityType: { in: ["planning_run", "replacement_run"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action as PlanningAuditEvent["action"],
      entityType: row.entityType as PlanningAuditEvent["entityType"],
      entityId: row.entityId,
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
      details: auditDetailsFromJson(row.details),
    }));
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
        return { snapshot: planningSnapshotFromRecord(row), alreadyConfirmed: true };
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

      return { snapshot: planningSnapshotFromRecord(updated), alreadyConfirmed: false };
    });
  }

  async confirmReplacementRun(
    replacementId: string,
    selectedOptionId: string,
    assignments: readonly ProposedAssignment[],
    actor: PlanningActor,
    confirmedAt: Date,
    acceptedTimeOffChangeIds: readonly string[] = [],
    confirmedOption?: ReplacementOption,
  ): Promise<PersistedReplacementConfirmation | null> {
    return this.db.$transaction(async (tx) => {
      const row = await tx.planningRunRecord.findUnique({
        where: { proposalId: replacementId },
      });
      if (!row || !isReplacementRecord(row)) return null;

      if (row.confirmedPlan !== null) {
        return {
          snapshot: replacementSnapshotFromRecord(row),
          alreadyConfirmed: true,
        };
      }

      const actorRecord = await ensureActor(tx, actor);
      const current = replacementSnapshotFromRecord(row);
      const confirmedPlan: ConfirmedPlan = {
        proposalId: replacementId,
        weekStart: current.result.request.weekStart,
        assignments,
        confirmedAt: confirmedAt.toISOString(),
      };
      const updated = await tx.planningRunRecord.update({
        where: { proposalId: replacementId },
        data: {
          result: toInputJson({
            ...replacementEnvelope(current),
            result: {
              ...current.result,
              selectedOptionId,
              options: current.result.options.map((option) =>
                option.id === selectedOptionId && confirmedOption
                  ? confirmedOption
                  : option,
              ),
              request: {
                ...current.result.request,
                incident: {
                  ...current.result.request.incident,
                  status: "confirmed",
                },
              },
            },
          }),
          confirmedPlan: toInputJson(confirmedPlan),
          confirmedAt,
          confirmedById: actorRecord.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: "planning.replacement_confirmed",
          entityType: "replacement_run",
          entityId: replacementId,
          actorId: actorRecord.id,
          createdAt: confirmedAt,
          details: replacementAuditDetails(
            current,
            selectedOptionId,
            assignments,
            acceptedTimeOffChangeIds,
            actor.email,
          ),
        },
      });

      return {
        snapshot: replacementSnapshotFromRecord(updated),
        alreadyConfirmed: false,
      };
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

function auditDetailsFromJson(
  value: Prisma.JsonValue | null,
): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function planningSnapshotFromRecord(row: PlanningRunRecord): PlanningRunSnapshot {
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

function replacementEnvelope(snapshot: ReplacementRunSnapshot) {
  return {
    kind: "replacement" as const,
    basePlan: snapshot.basePlan,
    result: snapshot.result,
  };
}

function isReplacementRecord(row: PlanningRunRecord): boolean {
  const result = row.result;
  return (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result) &&
    (result as { kind?: unknown }).kind === "replacement"
  );
}

function replacementSnapshotFromRecord(
  row: PlanningRunRecord,
): ReplacementRunSnapshot {
  const envelope = row.result as unknown as {
    kind: "replacement";
    basePlan: ConfirmedPlan;
    result: ReplacementRunResult;
  };
  return {
    replacementId: row.proposalId,
    scenarioId: row.scenarioId,
    scenarioLabel: row.scenarioLabel,
    providerName: row.providerName,
    mode: row.mode as PlanningProviderMode,
    input: row.input as unknown as PlanningInput,
    basePlan: envelope.basePlan,
    result: envelope.result,
    confirmedPlan: row.confirmedPlan
      ? (row.confirmedPlan as unknown as ConfirmedPlan)
      : null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    confirmedById: row.confirmedById,
  };
}

function replacementAuditDetails(
  snapshot: ReplacementRunSnapshot,
  selectedOptionId: string,
  assignments: readonly ProposedAssignment[],
  acceptedTimeOffChangeIds: readonly string[],
  actorEmail: string,
): Readonly<Record<string, string>> {
  return {
    weekStart: snapshot.result.request.weekStart,
    email: actorEmail,
    baseProposalId: snapshot.basePlan.proposalId,
    incident: JSON.stringify(snapshot.result.request.incident),
    selectedOptionId,
    originalAssignments: JSON.stringify(snapshot.basePlan.assignments),
    newAssignments: JSON.stringify(assignments),
    acceptedTimeOffChangeIds: JSON.stringify(acceptedTimeOffChangeIds),
  };
}
