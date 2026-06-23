// Standalone test of the ask agent (no Ink). Verifies the claude -p subprocess,
// stream parsing and session continuation. Run: `npx tsx src/ask/ask-test.ts`
import { products } from "../fixtures/products.js";
import { runAskTurn, buildSystemPrompt, gatherContext } from "./agent.js";

const p = products[0];
const ctx = gatherContext();
const systemPrompt = buildSystemPrompt(p, ctx);

console.log(`Context: ${JSON.stringify(ctx)}\n`);
console.log(`Q: In one short sentence, what is ${p.name} and who is it for?\n`);
process.stdout.write("A: ");

runAskTurn({
  prompt: `In one short sentence, what is ${p.name} and who is it for?`,
  sessionId: null,
  systemPrompt,
  cwd: process.cwd(),
  cb: {
    onText: (t) => process.stdout.write(t),
    onTool: (name) => process.stdout.write(`\n  [tool: ${name}]\n`),
    onError: (e) => {
      console.error("\nERROR:", e);
      process.exit(1);
    },
    onDone: (sid) => {
      console.log(`\n\nDONE. session_id=${sid}`);
      process.exit(0);
    },
  },
});
