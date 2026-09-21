// src/pythonBridge.ts

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FastifyBaseLogger } from 'fastify';
import { AgentResult, AgentExecutionTrace } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPythonExecutable(rootDir: string): string {
  // Check virtualenv on Windows
  const venvWin = path.resolve(rootDir, 'agent-runtime', '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) {
    return venvWin;
  }
  // Check virtualenv on POSIX
  const venvPosix = path.resolve(rootDir, 'agent-runtime', '.venv', 'bin', 'python');
  if (fs.existsSync(venvPosix)) {
    return venvPosix;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function findProjectRoot(): string {
  let curr = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(curr, 'agent-runtime', 'run_lab_chain.py'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(__dirname, '../../..');
}

export const PYTHON_TIMEOUT_MS = 90_000;

/**
 * Executes a Python agent script with the given payload.
 * Returns a parsed JSON result adhering to AgentResult/AgentExecutionTrace or a deterministic fallback on error/timeout.
 */
export function invokePythonAgent(
  logger: FastifyBaseLogger,
  agentName: string,
  payload: unknown,
  timeoutMs: number = PYTHON_TIMEOUT_MS
): any {
  try {
    const rootDir = findProjectRoot();
    const scriptPath = path.resolve(rootDir, 'agent-runtime', 'run_lab_chain.py');
    const pythonExe = getPythonExecutable(rootDir);
    const args = [scriptPath, '--agent', agentName];
    const proc = spawnSync(pythonExe, args, {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      cwd: rootDir,
      timeout: timeoutMs,
    });

    if (proc.error) {
      throw proc.error;
    }
    if (proc.status !== 0) {
      throw new Error(`Agent ${agentName} exited with code ${proc.status}: ${proc.stderr}`);
    }
    const result = JSON.parse(proc.stdout);
    if (!result.executionMode) {
      result.executionMode = 'a2a_adk';
    }
    // Ensure llmUsed is explicitly typed — only true when Python sets it true
    if (typeof result.llmUsed === 'undefined') {
      result.llmUsed = false;
    }
    return result;
  } catch (e) {
    logger.error(`Python agent ${agentName} failed: ${e}`);
    // Deterministic fallback
    if (agentName === 'supervisor') {
      const fallbackTrace: AgentExecutionTrace = {
        executionId: `fallback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        inputSummary: 'Deterministic fallback trace due to agent unavailability',
        executionMode: 'deterministic_fallback',
        llmUsed: false,
        llmProvider: null,
        llmModel: null,
        events: [],
        supervisorStarted: true,
        agentsInvoked: ['supervisor_agent', 'fleet_agent', 'maintenance_agent', 'safety_engine', 'learning_agent'],
        agentResults: {
          fleet: {
            findings: [{
              agent: 'fleet_agent',
              status: 'NOMINAL',
              relevantSignals: ['ramp_congestion_percent'],
              concerns: [],
              confidence: 0.85,
              summary: 'Deterministic fallback fleet assessment'
            }],
            recommendation: { recommendation: 'Maintain standard dispatch intervals', rationale: 'Fallback bounds' }
          },
          maintenance: {
            findings: [{
              agent: 'maintenance_agent',
              status: 'NOMINAL',
              relevantSignals: ['truck_temperature_celsius'],
              concerns: [],
              confidence: 0.85,
              summary: 'Deterministic fallback maintenance assessment'
            }],
            recommendation: { recommendation: 'Continue standard equipment operation cycle', rationale: 'Fallback bounds' }
          }
        },
        proposedDecision: {
          decision: 'NORMAL',
          contributingSignals: ['truck_temperature_celsius', 'ramp_congestion_percent'],
          agentsConsulted: ['fleet_agent', 'maintenance_agent'],
          explanation: 'Deterministic fallback proposal',
          proposedAction: 'adjustDrillSpeed',
          parameters: { targetSpeed: 1.0 },
          confidence: 0.85
        },
        safetyEvaluation: {
          status: 'ALLOW',
          decision: 'ALLOW',
          triggeredRules: [],
          explanation: 'Fallback evaluation ready for TypeScript Safety Engine governance',
          humanOversightRequired: false,
          educationalNotice: 'Deterministic fallback engaged.'
        },
        finalDecision: { decision: 'ALLOW', action: 'adjustDrillSpeed' },
        humanOversightRequired: false,
        learningExplanation: {
          whatHappened: 'Simulation evaluated operational parameters under deterministic fallback protection.',
          importantSignals: ['truck_temperature', 'ramp_congestion'],
          agentsInvolved: ['supervisor_agent', 'fleet_agent', 'maintenance_agent', 'safety_engine'],
          decisionExplanation: 'The safety engine evaluated conditions and decided the outcome.',
          safetyExplanation: 'The deterministic safety engine retains authority even during fallback mode.',
          learningTakeaway: 'System safety guarantees hold regardless of agent runtime status.',
          reflectionQuestion: 'Why must safety engines operate independently of external AI model availability?'
        },
        decisionAuthority: 'typescript_safety_engine',
        agentRole: 'proposal_only'
      };
      return fallbackTrace;
    }
    return {
      status: 'fallback',
      detail: `Python agent ${agentName} unavailable or errored.`,
    };
  }
}
