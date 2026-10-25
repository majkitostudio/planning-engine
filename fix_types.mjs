import fs from "fs";

const OLD_CAST = "(outcome as Extract<PlanningOutcome, { ok: false }>).failure";
const NEW_CAST = "(outcome as unknown as Extract<PlanningOutcome, { ok: false }>).failure";

// === input-validation.test.ts ===
let inputTest = fs.readFileSync("lib/planning/domain/input-validation.test.ts", "utf8");
const c1 = inputTest.split(OLD_CAST).length - 1;
inputTest = inputTest.split(OLD_CAST).join(NEW_CAST);
console.log(`input: replaced ${c1} outcome casts`);
fs.writeFileSync("lib/planning/domain/input-validation.test.ts", inputTest);

// === plan-draft-validation.test.ts ===
let draft = fs.readFileSync("lib/planning/domain/plan-draft-validation.test.ts", "utf8");

// a. add ExplanationTopic import
draft = draft.replace(
  `  Alternative,
  PlanningOutcome,
} from "./types";`,
  `  Alternative,
  ExplanationTopic,
  PlanningOutcome,
} from "./types";`
);

// b. outcome cast
const c2 = draft.split(OLD_CAST).length - 1;
draft = draft.split(OLD_CAST).join(NEW_CAST);
console.log(`draft: replaced ${c2} outcome casts`);

// c. as Alternative -> as unknown as Alternative
const c3 = draft.split("} as Alternative,").length - 1;
draft = draft.split("} as Alternative,").join("} as unknown as Alternative,");
console.log(`draft: replaced ${c3} as Alternative`);

// d. invalid topic
const c4 = draft.split('"invalid_topic" as any').length - 1;
draft = draft.split('"invalid_topic" as any').join('"invalid_topic" as ExplanationTopic');
console.log(`draft: replaced ${c4} invalid_topic as any`);

fs.writeFileSync("lib/planning/domain/plan-draft-validation.test.ts", draft);
console.log("\nDone.");