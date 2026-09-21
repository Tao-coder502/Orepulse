import { describe, test, expect } from 'vitest';
import { fastify } from '../src/server.js';

describe('Lab Endpoints Integration', () => {
  test('POST /api/lab/run executes successfully and returns trace', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/lab/run',
      payload: {
        scenarioId: 'NORMAL_OPERATIONS',
        steps: 2,
        simulatedTruckTemperature: 75,
        simulatedRampCongestion: 20,
        simulatedFleetAvailability: 90,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('runId');
    expect(body).toHaveProperty('trace');
    expect(body.trace).toHaveProperty('executionId');
    expect(body.trace.executionMode).toBe('a2a_adk');
    expect(body.trace).toHaveProperty('experimentId');
    expect(Array.isArray(body.trace.events)).toBe(true);
    expect(body.trace.events.some((e: any) => e.transport === 'a2a')).toBe(true);
    expect(body.trace).toHaveProperty('finalDecision');
  });

  test('GET /api/lab/trace/:runId retrieves saved trace', async () => {
    const runRes = await fastify.inject({
      method: 'POST',
      url: '/api/lab/run',
      payload: {
        scenarioId: 'COMBINED_OPERATIONAL_RISK',
        steps: 1,
      },
    });
    expect(runRes.statusCode).toBe(200);
    const runData = JSON.parse(runRes.body);

    const traceRes = await fastify.inject({
      method: 'GET',
      url: `/api/lab/trace/${runData.runId}`,
    });
    expect(traceRes.statusCode).toBe(200);
    const traceData = JSON.parse(traceRes.body);
    expect(traceData.runId).toBe(runData.runId);
  });

  test('GET /api/scenario/list returns predefined scenarios', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/scenario/list',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('scenarios');
    expect(body.scenarios.length).toBeGreaterThanOrEqual(3);
  });
});

