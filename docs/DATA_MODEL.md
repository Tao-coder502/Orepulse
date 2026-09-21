# Data Model

## Core Types (canonical JSON contract)

```json
{
  "MineState": {
    "timestamp": "ISO8601",
    "depth": "number",
    "oreGrade": "number",
    "equipmentStatus": {
      "drill": "enum[operational, degraded, failed]",
      "conveyor": "enum[operational, degraded, failed]",
      "crusher": "enum[operational, degraded, failed]"
    },
    "environment": {
      "temperature": "number",
      "humidity": "number"
    }
  },
  "Telemetry": {
    "sensorId": "string",
    "value": "number",
    "unit": "string",
    "timestamp": "ISO8601"
  },
  "Scenario": {
    "id": "string",
    "description": "string",
    "initialState": "MineState",
    "goals": ["string"]
  },
  "AgentInput": {
    "scenarioId": "string",
    "timestamp": "ISO8601",
    "observations": ["Telemetry"],
    "domainState": "MineState"
  },
  "AgentFinding": {
    "type": "enum[anomaly, trend, threshold]",
    "description": "string",
    "confidence": "number"
  },
  "AgentRecommendation": {
    "action": "enum[adjustDrillSpeed, rerouteOre, scheduleMaintenance, halt]",
    "parameters": { "type": "object" },
    "confidence": "number"
  },
  "SafetyEvaluation": {
    "allowed": "boolean",
    "reasons": ["string"],
    "confidence": "number"
  },
  "FinalDecision": {
    "execute": "boolean",
    "decision": "enum[proceed, pause, abort]",
    "explanation": "string"
  },
  "LearningExplanation": {
    "insight": "string",
    "confidence": "number",
    "evidence": ["string"]
  },
  "AgentExecutionTrace": {
    "agent": "string",
    "step": "number",
    "input": "AgentInput",
    "output": {
      "finding": "AgentFinding",
      "recommendation": "AgentRecommendation",
      "safety": "SafetyEvaluation",
      "decision": "FinalDecision",
      "learning": "LearningExplanation"
    },
    "timestamp": "ISO8601"
  }
}
```

All runtimes must exchange data that conforms exactly to the schema above. TypeScript validates using **Zod**, Python validates using **Pydantic**.
