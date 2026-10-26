/**
 * Veřejné API čistého plánovacího jádra.
 *
 * Jádro je nezávislé na UI, Next.js i databázi — importovat ho lze odkudkoliv,
 * včetně testů bez PostgreSQL a bez reálných dat.
 *
 * Doménový kontrakt je záměrně **oddělený** v `./domain` (ADR 0001). Jádro
 * o něm neví; doména naopak používá jeho `PlanProposal` a `ControlResult`.
 */

export * from "./types";
export * from "./control";
export * from "./domain";
export * from "./ai-provider";
export * from "./orchestrator";
