import fs from "fs";

let c = fs.readFileSync("lib/planning/ai-provider.ts", "utf8");

// Odstranit kontrolu konkrétních hodnot shiftKind z isPlanDraft assignments
let old1 = '    if (a.shiftKind !== "morning" && a.shiftKind !== "afternoon") return false;\n  }\n\n  // Validate explanations';
let new1 = '    if (typeof a.shiftKind !== "string") return false;\n  }\n\n  // Validate explanations';

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  console.log("Replaced assignments shiftKind check");
} else {
  console.log("Assignments pattern not found");
}

// Odstranit kontrolu konkrétních hodnot shiftKind z isPlanDraft alternatives
let old2 = '    if (typeof a.shiftKind !== "string") return false;\n    if (a.shiftKind !== "morning" && a.shiftKind !== "afternoon") return false;\n    }';
let new2 = '    if (typeof a.shiftKind !== "string") return false;\n    }';

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  console.log("Replaced alternatives shiftKind check");
} else {
  console.log("Alternatives pattern not found");
}

fs.writeFileSync("lib/planning/ai-provider.ts", c);
