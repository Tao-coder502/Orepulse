// test/safety.test.ts
import { describe, test, expect } from 'vitest';
import { evaluateSafety, SafetyStatus } from '../src/safety.js';
import { createScenario, resetScenario } from '../src/simulation.js';

// Helper to build a recommendation object safely
const buildRec = (action: any, params: any = {}, confidence = 0.9) => ({ action, parameters: params, confidence });

describe('Deterministic Safety Engine', () => {
  test('normal condition allows recommendation', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    const rec = buildRec('adjustDrillSpeed', { targetSpeed: 1200 });
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.ALLOW);
    expect(evalResult.humanOversightRequired).toBe(false);
    expect(evalResult.triggeredRules.length).toBe(0);
  });

  test('critical equipment anomaly stops and informs supervisor', () => {
    const scenario = createScenario('EQUIPMENT_ANOMALY');
    const state = resetScenario(scenario);
    const rec = buildRec('adjustDrillSpeed', { targetSpeed: 1100 });
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.STOP_AND_INFORM_SUPERVISOR);
    expect(evalResult.triggeredRules).toContain('criticalEquipmentAnomaly');
    expect(evalResult.humanOversightRequired).toBe(true);
  });

  test('conflicting recommendation yields CONSTRAIN', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    // Simulate equipment failure manually
    state.equipment.status = 'failed';
    const rec = buildRec('adjustDrillSpeed', { targetSpeed: 1300 });
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.CONSTRAIN);
    expect(evalResult.triggeredRules).toContain('conflictingRecommendation');
  });

  test('insufficient information triggers CONSTRAIN', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    const rec = buildRec('adjustDrillSpeed'); // missing parameters
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.CONSTRAIN);
    expect(evalResult.triggeredRules).toContain('insufficientInformation');
  });

  test('invalid AI response stops and informs supervisor', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    // @ts-ignore intentionally invalid action
    const rec = { action: 'unknownAction', parameters: {}, confidence: 0.8 } as any;
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.STOP_AND_INFORM_SUPERVISOR);
    expect(evalResult.triggeredRules).toContain('invalidAIResponse');
  });

  test('prohibited halt instruction during normal operation', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    const rec = buildRec('halt');
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.CONSTRAIN);
    expect(evalResult.triggeredRules).toContain('prohibitedInstruction');
  });

  test('human supervision required on degraded equipment', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    const state = resetScenario(scenario);
    state.equipment.status = 'degraded';
    const rec = buildRec('adjustDrillSpeed', { targetSpeed: 1150 });
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.humanOversightRequired).toBe(true);
    expect(evalResult.triggeredRules).toContain('humanSupervisionRequired');
  });

  test('combined operational risk stops and informs supervisor', () => {
    const scenario = createScenario('COMBINED_OPERATIONAL_RISK');
    const state = resetScenario(scenario);
    const rec = buildRec('adjustDrillSpeed', { targetSpeed: 1000 });
    const evalResult = evaluateSafety(rec, state);
    expect(evalResult.status).toBe(SafetyStatus.STOP_AND_INFORM_SUPERVISOR);
    expect(evalResult.triggeredRules).toContain('combinedOperationalRisk');
    expect(evalResult.humanOversightRequired).toBe(true);
  });

  test('safety authority: LLM proposal of NORMAL is overridden by safety constraints', () => {
    const scenario = createScenario('EQUIPMENT_ANOMALY');
    const state = resetScenario(scenario);
    // AI proposing normal adjustment despite critical 120C overheat
    const aiProposal = buildRec('adjustDrillSpeed', { targetSpeed: 1200 }, 0.99);
    const evalResult = evaluateSafety(aiProposal, state);
    expect(evalResult.status).toBe(SafetyStatus.STOP_AND_INFORM_SUPERVISOR);
    expect(evalResult.status).not.toBe(SafetyStatus.ALLOW);
    expect(evalResult.triggeredRules).toContain('criticalEquipmentAnomaly');
    expect(evalResult.humanOversightRequired).toBe(true);
  });
});
