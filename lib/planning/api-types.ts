/** Tvary odpovědí HTTP API pro plánování. Sdílí je klient i route handlers. */

import type { ConfirmationBlocker } from "./confirmation";
import type { PlanningFailure } from "./domain/types";
import type { PlanningRunView } from "./view-model";

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
