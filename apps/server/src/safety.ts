// src/safety.ts

import { MineState, EquipmentState, RampState, FleetState } from './types.js';
import { z } from 'zod';

/** Safety status enumeration – authoritative outcomes */
export enum SafetyStatus {
  ALLOW = 'ALLOW',
  CONSTRAIN = 'CONSTRAIN',
  STOP_AND_INFORM_SUPERVISOR = 'STOP_AND_INFORM_SUPERVISOR'
}

/** Structured safety evaluation returned to the caller */
export interface SafetyEvaluation {
  status: SafetyStatus;
  triggeredRules: string[]; // identifiers of the rules that fired
  explanation: string; // human‑readable justification
  humanOversightRequired: boolean; // does a supervisor need to review?
  educationalNotice: string; // educational context for the user
}

/** Minimal definition of an agent recommendation (synthetic educational) */
export const AgentRecommendationSchema = z.object({
  action: z.enum(['adjustDrillSpeed', 'rerouteOre', 'scheduleMaintenance', 'halt']),
  parameters: z.object({}).passthrough().optional(),
  confidence: z.number().min(0).max(1)
});
export type AgentRecommendation = z.infer<typeof AgentRecommendationSchema>;

/**
 * Deterministic safety engine – evaluates a single structured recommendation
 * against the current deterministic mine state and returns a deterministic
 * SafetyEvaluation. No LLM or external agent is consulted; the engine is
 * authoritative.
 */
export const evaluateSafety = (
  recommendation: AgentRecommendation,
  state: MineState
): SafetyEvaluation => {
  const triggered: string[] = [];
  let status = SafetyStatus.ALLOW;
  let explanation = 'Recommendation passes all safety checks.';
  let humanOversight = false;
  let notice = 'All checks are educational synthetic rules.';

  // Helper to push rule and possibly downgrade status
  const trigger = (ruleId: string, newStatus: SafetyStatus, msg: string, requireHuman = false) => {
    triggered.push(ruleId);
    // Only downgrade if the new status is more severe
    if (newStatus === SafetyStatus.STOP_AND_INFORM_SUPERVISOR) {
      status = newStatus;
    } else if (newStatus === SafetyStatus.CONSTRAIN && status === SafetyStatus.ALLOW) {
      status = newStatus;
    }
    explanation = msg;
    if (requireHuman) humanOversight = true;
  };

  // 1. critical simulated equipment anomaly
  if (state.equipment.temperature > 100 || (state.equipment.alert && state.equipment.alert.severity === 'high')) {
    trigger(
      'criticalEquipmentAnomaly',
      SafetyStatus.STOP_AND_INFORM_SUPERVISOR,
      'Equipment temperature exceeds safe limits; immediate supervisor intervention required.',
      true
    );
  }

  // 1b. compounding combined operational risk (high congestion AND high equipment temperature)
  if (state.ramp.congestionLevel > 60 && state.equipment.temperature > 100) {
    trigger(
      'combinedOperationalRisk',
      SafetyStatus.STOP_AND_INFORM_SUPERVISOR,
      `Combined operational risk: severe ramp congestion (${state.ramp.congestionLevel}%) and engine overheat (${state.equipment.temperature}°C). Immediate halt mandated to clear haulway.`,
      true
    );
  }

  // 2. conflicting agent recommendations (simplified): if action is adjustDrillSpeed but equipment is failed
  if (recommendation.action === 'adjustDrillSpeed' && state.equipment.status === 'failed') {
    trigger(
      'conflictingRecommendation',
      SafetyStatus.CONSTRAIN,
      'Cannot adjust drill speed when equipment is failed.'
    );
  }

  // 3. insufficient information – missing parameters for actions that require them
  const actionsRequiringParams: Record<string, string[]> = {
    adjustDrillSpeed: ['targetSpeed'],
    rerouteOre: ['newRoute'],
    scheduleMaintenance: ['maintenanceWindow']
  };
  const required = actionsRequiringParams[recommendation.action];
  if (required && recommendation.parameters) {
    const missing = required.filter(p => !(p in recommendation.parameters!));
    if (missing.length > 0) {
      trigger(
        'insufficientInformation',
        SafetyStatus.CONSTRAIN,
        `Missing required parameters for ${recommendation.action}: ${missing.join(', ')}`
      );
    }
  } else if (required && (!recommendation.parameters || Object.keys(recommendation.parameters).length === 0)) {
    trigger(
      'insufficientInformation',
      SafetyStatus.CONSTRAIN,
      `Action ${recommendation.action} requires parameters but none were provided.`
    );
  }

  // 4. invalid AI response – duplicate check (already validated by schema). If we ever get here with an unknown action, treat as invalid.
  const knownActions = ['adjustDrillSpeed', 'rerouteOre', 'scheduleMaintenance', 'halt'];
  if (!knownActions.includes(recommendation.action)) {
    trigger(
      'invalidAIResponse',
      SafetyStatus.STOP_AND_INFORM_SUPERVISOR,
      'Recommendation contains an unknown action.',
      true
    );
  }

  // 5. prohibited operational instruction – e.g., "halt" during normal conditions
  if (recommendation.action === 'halt' && state.equipment.status === 'operational') {
    trigger(
      'prohibitedInstruction',
      SafetyStatus.CONSTRAIN,
      'Halting operation while equipment is fully operational is prohibited without justification.'
    );
  }

  // 6. human supervision required – degraded equipment and any adjustment action
  if (state.equipment.status === 'degraded' && recommendation.action === 'adjustDrillSpeed') {
    trigger(
      'humanSupervisionRequired',
      SafetyStatus.ALLOW,
      'Adjustment on degraded equipment should be reviewed by a supervisor.',
      true
    );
  }

  // 7. normal simulated condition – if no rules triggered, keep ALLOW with educational notice.
  if (triggered.length === 0) {
    notice = 'All safety checks passed – normal simulated condition.';
  }

  return {
    status,
    triggeredRules: triggered,
    explanation,
    humanOversightRequired: humanOversight,
    educationalNotice: notice
  };
};

/** Zod schema for the evaluated SafetyEvaluation – useful for API validation */
export const SafetyEvaluationSchema = z.object({
  status: z.nativeEnum(SafetyStatus),
  triggeredRules: z.array(z.string()),
  explanation: z.string(),
  humanOversightRequired: z.boolean(),
  educationalNotice: z.string()
});
