import fs from "fs";
const file = "lib/planning/domain/plan-draft-validation.test.ts";
let s = fs.readFileSync(file, "utf8");
const old = 'import type {\n  PlanDraft,\n  PlanningInput,\n  ProposedAssignment,\n  ShiftKind,\n  PlanningModelProvider,\n} from "./types";';
const neu = 'import type {\n  PlanDraft,\n  PlanningInput,\n  ProposedAssignment,\n  ShiftKind,\n} from "./types";\nimport type { PlanningModelProvider } from "../../ai-provider";';
if (s.includes(old)) {
  s = s.replace(old, neu);
  fs.writeFileSync(file, s);
  console.log("OK - replaced");
} else {
  console.log("NOT FOUND");
  console.log("first 600:", JSON.stringify(s.slice(0, 600)));
}