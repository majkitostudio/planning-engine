/** Tvary odpovědí HTTP API pro plánování. Sdílí je klient i route handlers. */

import type { ConfirmationBlocker } from "./confirmation";
import type { PlanningFailure } from "./domain/types";
import type { PlanningRunView } from "./view-model";
import type { ReplacementRunResult } from "./domain/types";

export interface ApiRejection {
  readonly code: string;
  readonly message: string;
  readonly blockers?: readonly ConfirmationBlocker[];
}

export type PlanningRunApiResponse =
  | { readonly ok: true; readonly view: PlanningRunView }
  | { readonly ok: false; readonly failure: PlanningFailure }
  | { readonly ok: false; readonly rejected: ApiRejection };

export type PlanningConfirmApiResponse =
  | {
      readonly ok: true;
      readonly view: PlanningRunView;
      readonly alreadyConfirmed: boolean;
    }
  | { readonly ok: false; readonly rejected: ApiRejection };

export type PlanningReplacementApiResponse =
  | {
      readonly ok: true;
      readonly replacementId: string;
      readonly result: ReplacementRunResult;
    }
  | { readonly ok: false; readonly rejected: ApiRejection };

export type PlanningReplacementConfirmApiResponse =
  | {
      readonly ok: true;
      readonly replacementId: string;
      readonly result: ReplacementRunResult;
      readonly confirmedPlan: ReplacementRunResult["basePlan"] | null;
      readonly alreadyConfirmed: boolean;
    }
  | { readonly ok: false; readonly rejected: ApiRejection };
