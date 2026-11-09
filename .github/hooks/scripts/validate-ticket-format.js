#!/usr/bin/env node
/**
 * UserPromptSubmit hook: flags a likely-mistyped EPMCDMETST ticket reference (wrong prefix,
 * missing digits, lowercase) before an agent spends a turn re-asking for the correct format.
 */
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let prompt = raw;
  try {
    prompt = JSON.parse(raw).prompt ?? raw;
  } catch {
    // fall back to raw text if stdin isn't the expected JSON shape
  }

  const validTicket = /\bEPMCDMETST-\d+\b/;
  const nearMiss = /\b(?:epmcdmetst|EPMCD(?:METST)?)[-_ ]?\d+\b/i;

  let systemMessage;
  if (!validTicket.test(prompt) && nearMiss.test(prompt)) {
    systemMessage =
      'Possible mistyped ticket reference detected. The required format is exactly "EPMCDMETST-<digits>" (e.g. EPMCDMETST-52508).';
  }

  process.stdout.write(JSON.stringify({ continue: true, ...(systemMessage ? { systemMessage } : {}) }));
});
