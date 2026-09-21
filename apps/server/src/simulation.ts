// src/simulation.ts

import { SimulationScenario, MineState, EquipmentState, RampState, FleetState, TruckState, MaintenanceAlert, Telemetry } from './types.js';
import { z } from 'zod';

/** Deterministic seed – all functions are pure and rely only on the scenario definition */
export const createScenario = (scenarioId: string): SimulationScenario => {
  switch (scenarioId) {
    case 'NORMAL_OPERATIONS':
      return {
        id: 'NORMAL_OPERATIONS',
        description: 'Baseline normal mining operation.',
        initialMineState: {
          timestamp: new Date().toISOString(),
          oreGrade: 1.0,
          depth: 100,
          equipment: {
            temperature: 70,
            status: 'operational'
          },
          ramp: {
            congestionLevel: 10,
            status: 'open'
          },
          fleet: {
            trucks: [
              { id: 'T1', temperature: 60, operational: true },
              { id: 'T2', temperature: 60, operational: true }
            ],
            availability: 100
          }
        }
      };
    case 'EQUIPMENT_ANOMALY':
      return {
        id: 'EQUIPMENT_ANOMALY',
        description: 'Equipment exhibits high temperature leading to degraded status.',
        initialMineState: {
          timestamp: new Date().toISOString(),
          oreGrade: 1.0,
          depth: 100,
          equipment: {
            temperature: 120, // elevated temperature
            status: 'degraded',
            alert: {
              code: 'EQUIP_TEMP_HIGH',
              message: 'Equipment temperature exceeds safe limit.',
              severity: 'high'
            }
          },
          ramp: {
            congestionLevel: 10,
            status: 'open'
          },
          fleet: {
            trucks: [
              { id: 'T1', temperature: 60, operational: true },
              { id: 'T2', temperature: 60, operational: true }
            ],
            availability: 100
          }
        }
      };
    case 'COMBINED_OPERATIONAL_RISK':
      return {
        id: 'COMBINED_OPERATIONAL_RISK',
        description: 'Multiple risk factors simultaneously present.',
        initialMineState: {
          timestamp: new Date().toISOString(),
          oreGrade: 1.0,
          depth: 100,
          equipment: {
            temperature: 110, // elevated temperature
            status: 'degraded',
            alert: {
              code: 'MULTI_RISK',
              message: 'Combined equipment stress.',
              severity: 'medium'
            }
          },
          ramp: {
            congestionLevel: 80, // elevated congestion
            status: 'open'
          },
          fleet: {
            trucks: [
              { id: 'T1', temperature: 70, operational: false },
              { id: 'T2', temperature: 70, operational: false }
            ],
            // reduced availability due to maintenance
            availability: 40
          }
        },
        // deterministic what‑if overrides (can be set via API)
        simulatedTruckTemperature: 70,
        simulatedRampCongestion: 80,
        simulatedFleetAvailability: 40
      };
    case 'test-scenario':
        return {
          id: 'test-scenario',
          description: 'Test scenario for lab integration',
          initialMineState: {
            timestamp: new Date().toISOString(),
            oreGrade: 1.0,
            depth: 100,
            equipment: { temperature: 70, status: 'operational' },
            ramp: { congestionLevel: 10, status: 'open' },
            fleet: { trucks: [], availability: 100 }
          }
        };
      default:
        throw new Error(`Unknown scenario ${scenarioId}`);
  }
};

export const getScenario = (scenarioId: string): SimulationScenario => createScenario(scenarioId);

/** Update the mine state deterministically based on the current state and what‑if variables */
export const updateSimulationState = (state: MineState, overrides?: Partial<SimulationScenario>): MineState => {
  // Apply deterministic transformations – for educational purposes we simply increment depth and degrade equipment a bit
  const newDepth = state.depth + 1;
  const newTimestamp = new Date().toISOString();

  // Deterministic equipment temperature evolution (adds 0.5°C each step)
  const equipmentTemp = state.equipment.temperature + 0.5;
  const equipmentStatus = equipmentTemp > 115 ? 'degraded' : state.equipment.status;

  // Apply overrides if provided (what‑if variables)
  const equipment: EquipmentState = {
    temperature: overrides?.simulatedTruckTemperature ?? equipmentTemp,
    status: equipmentStatus,
    alert: state.equipment.alert
  };

  const ramp: RampState = {
    congestionLevel: overrides?.simulatedRampCongestion ?? state.ramp.congestionLevel,
    status: state.ramp.status
  };

  const fleet: FleetState = {
    trucks: state.fleet.trucks.map((t: TruckState) => ({
      ...t,
      temperature: overrides?.simulatedTruckTemperature ?? t.temperature,
      operational: overrides?.simulatedFleetAvailability ? overrides.simulatedFleetAvailability > 0 : t.operational
    })),
    availability: overrides?.simulatedFleetAvailability ?? state.fleet.availability
  };

  return {
    timestamp: newTimestamp,
    oreGrade: state.oreGrade,
    depth: newDepth,
    equipment,
    ramp,
    fleet
  };
};

export const resetScenario = (scenario: SimulationScenario): MineState => {
  return { ...scenario.initialMineState };
};

export const runSimulation = (scenarioId: string, steps: number, overrides?: Partial<SimulationScenario>) => {
  const scenario = getScenario(scenarioId);
  let state = resetScenario(scenario);
  const telemetry: Telemetry[] = [];
  for (let i = 0; i < steps; i++) {
    state = updateSimulationState(state, overrides);
    telemetry.push({
      sensorId: `step-${i}`,
      value: state.depth,
      unit: 'm',
      timestamp: state.timestamp
    });
  }
  return { finalState: state, telemetry };
};

/** Zod schemas that mirror the canonical JSON contract – used by Fastify for runtime validation */
export const MineStateSchema = z.object({
  timestamp: z.string().datetime(),
  oreGrade: z.number(),
  depth: z.number(),
  equipment: z.object({
    temperature: z.number(),
    status: z.enum(['operational', 'degraded', 'failed']),
    alert: z.object({
      code: z.string(),
      message: z.string(),
      severity: z.enum(['low', 'medium', 'high'])
    }).optional()
  }),
  ramp: z.object({
    congestionLevel: z.number().min(0).max(100),
    status: z.enum(['open', 'closed'])
  }),
  fleet: z.object({
    trucks: z.array(z.object({
      id: z.string(),
      temperature: z.number(),
      operational: z.boolean()
    })),
    availability: z.number().min(0).max(100)
  })
});

export const SimulationScenarioSchema = z.object({
  id: z.string(),
  description: z.string(),
  initialMineState: MineStateSchema,
  simulatedTruckTemperature: z.number().optional(),
  simulatedRampCongestion: z.number().optional(),
  simulatedFleetAvailability: z.number().optional()
});

export const TelemetrySchema = z.object({
  sensorId: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime()
});
