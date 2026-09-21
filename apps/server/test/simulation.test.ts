// test/simulation.test.ts
import { describe, test, expect } from 'vitest';
import { createScenario, resetScenario, updateSimulationState, runSimulation } from '../src/simulation.js';

describe('Deterministic Simulation Engine', () => {
  test('scenario creation - NORMAL_OPERATIONS', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    expect(scenario.id).toBe('NORMAL_OPERATIONS');
    expect(scenario.initialMineState.equipment.status).toBe('operational');
  });

  test('reset returns initial state', () => {
    const scenario = createScenario('EQUIPMENT_ANOMALY');
    const state = resetScenario(scenario);
    expect(state.equipment.temperature).toBe(120);
    expect(state.equipment.status).toBe('degraded');
  });

  test('update simulation state is deterministic', () => {
    const scenario = createScenario('NORMAL_OPERATIONS');
    let state = resetScenario(scenario);
    state = updateSimulationState(state);
    const state2 = updateSimulationState(state);
    // depth should increase by 2 total
    expect(state2.depth).toBe(state.depth + 1);
    // equipment temperature increments by 0.5 each step
    expect(state2.equipment.temperature).toBeCloseTo(state.equipment.temperature + 0.5);
  });

  test('runSimulation produces expected steps', () => {
    const result = runSimulation('NORMAL_OPERATIONS', 3);
    expect(result.telemetry).toHaveLength(3);
    expect(result.finalState.depth).toBe(103); // initial 100 + 3 steps
  });

  test('what‑if overrides affect simulation deterministically', () => {
    const overrides = { simulatedTruckTemperature: 80, simulatedRampCongestion: 50, simulatedFleetAvailability: 20 };
    const result = runSimulation('COMBINED_OPERATIONAL_RISK', 1, overrides);
    expect(result.finalState.ramp.congestionLevel).toBe(50);
    expect(result.finalState.fleet.availability).toBe(20);
    // truck temperatures should reflect the override
    expect(result.finalState.fleet.trucks[0].temperature).toBe(80);
  });
});
