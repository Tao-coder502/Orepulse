// scripts/e2e_runtime_verification.mjs
import { fastify } from '../apps/server/dist/src/server.js';
import { runSimulation } from '../apps/server/dist/src/simulation.js';

async function runTest1() {
  console.log('\n========================================');
  console.log('TEST 1: Canonical Normal State');
  console.log('========================================');
  const t0 = performance.now();
  const response = await fastify.inject({
    method: 'POST',
    url: '/api/lab/run',
    payload: {
      scenarioId: 'NORMAL_OPERATIONS',
      steps: 2,
    },
  });
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  const data = JSON.parse(response.body);
  const trace = data.trace;

  console.log(`Status Code: ${response.statusCode}`);
  console.log(`Elapsed Runtime: ${elapsed}s`);
  console.log(`Execution Mode: ${trace.executionMode}`);
  console.log(`LLM Used: ${trace.llmUsed}`);
  console.log(`Offline AI Status: ${trace.offlineAiStatus}`);
  console.log(`Supervisor Output Budget: 192 tokens`);
  console.log(`Proposal Decision: ${trace.proposedDecision?.decision}`);
  console.log(`Authoritative Safety Decision: ${trace.safetyEvaluation?.status || trace.safetyEvaluation?.decision}`);
  console.log(`Final Decision: ${trace.finalDecision?.decision}`);
  console.log(`Decision Authority: ${trace.decisionAuthority}`);
  console.log(`Agent Role: ${trace.agentRole}`);
  console.log(`Human Oversight Required: ${trace.humanOversightRequired}`);

  const passed = response.statusCode === 200 &&
    trace.decisionAuthority === 'typescript_safety_engine' &&
    trace.agentRole === 'proposal_only' &&
    (trace.finalDecision?.decision === 'ALLOW' || trace.finalDecision?.decision === 'NORMAL');

  console.log(`TEST 1 RESULT: ${passed ? 'PASS' : 'FAIL'}`);
  return { passed, elapsed, trace };
}

async function runTest2() {
  console.log('\n========================================');
  console.log('TEST 2: Canonical Dangerous State');
  console.log('========================================');
  const sim = runSimulation('COMBINED_OPERATIONAL_RISK', 2);
  console.log('Canonical MineState equipment temp:', sim.finalState.equipment.temperature, '°C');
  console.log('Canonical MineState ramp congestion:', sim.finalState.ramp.congestionLevel, '%');

  const t0 = performance.now();
  const response = await fastify.inject({
    method: 'POST',
    url: '/api/lab/run',
    payload: {
      scenarioId: 'COMBINED_OPERATIONAL_RISK',
      steps: 2,
    },
  });
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  const data = JSON.parse(response.body);
  const trace = data.trace;

  console.log(`Status Code: ${response.statusCode}`);
  console.log(`Elapsed Runtime: ${elapsed}s`);
  console.log(`Execution Mode: ${trace.executionMode}`);
  console.log(`LLM Used: ${trace.llmUsed}`);
  console.log(`Proposal Decision: ${trace.proposedDecision?.decision}`);
  console.log(`Authoritative Safety Decision: ${trace.safetyEvaluation?.status || trace.safetyEvaluation?.decision}`);
  console.log(`Triggered Safety Rules: ${JSON.stringify(trace.safetyEvaluation?.triggeredRules)}`);
  console.log(`Final Decision: ${trace.finalDecision?.decision}`);
  console.log(`Decision Authority: ${trace.decisionAuthority}`);
  console.log(`Agent Role: ${trace.agentRole}`);
  console.log(`Human Oversight Required: ${trace.humanOversightRequired}`);

  const authoritativeDecision = trace.safetyEvaluation?.status || trace.safetyEvaluation?.decision;
  const isDangerousHalt = authoritativeDecision === 'STOP_AND_INFORM_SUPERVISOR';
  const passed = response.statusCode === 200 &&
    isDangerousHalt &&
    trace.finalDecision?.decision === 'STOP_AND_INFORM_SUPERVISOR' &&
    trace.humanOversightRequired === true &&
    trace.decisionAuthority === 'typescript_safety_engine';

  console.log(`Authoritative Safety Enforced: ${isDangerousHalt}`);
  console.log(`TEST 2 RESULT: ${passed ? 'PASS' : 'FAIL'}`);
  return { passed, elapsed, trace };
}

async function main() {
  const t1 = await runTest1();
  const t2 = await runTest2();

  console.log('\n========================================');
  console.log('SUMMARY REPORT');
  console.log('========================================');
  console.log(`Normal-state E2E: ${t1.passed ? 'PASS' : 'FAIL'} (${t1.elapsed}s)`);
  console.log(`Dangerous-state E2E: ${t2.passed ? 'PASS' : 'FAIL'} (${t2.elapsed}s)`);
  console.log(`Authoritative safety verification: ${t2.passed ? 'PASS' : 'FAIL'}`);
  process.exit(t1.passed && t2.passed ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
