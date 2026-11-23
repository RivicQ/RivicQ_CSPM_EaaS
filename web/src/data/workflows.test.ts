import { ARCHIFY_DIAGRAMS } from "./archifyDiagrams";
import {
  DEFAULT_WORKFLOW_ID,
  WORKFLOWS,
  workflowById,
  WorkflowGate,
  WorkflowMaturity,
} from "./workflows";

const REQUIRED_WORKFLOW_IDS = [
  "devsecops",
  "cbom",
  "pqc-migration",
  "cloud-posture",
  "ai-model-security",
  "hsm-lifecycle",
  "wireless-security",
  "eaas-api",
  "remediation",
  "incident-response",
];

const REQUIRED_DEVSECOPS_STAGES = [
  "Intake and scope",
  "Policy baseline",
  "Source discovery",
  "Dependency and SBOM",
  "Cryptographic inventory",
  "Secrets and key handling",
  "Infrastructure as code review",
  "Container build",
  "Image scanning",
  "SBOM attestation",
  "Static analysis",
  "Unit and contract tests",
  "Policy gate",
  "Artifact signing",
  "Provenance capture",
  "Staging deployment",
  "Dynamic application testing",
  "API misuse testing",
  "Authorization checks",
  "TLS and certificate verification",
  "Runtime posture",
  "Compliance mapping",
  "Risk scoring",
  "PQC readiness review",
  "Exception review",
  "Release approval",
  "Production deployment",
  "Continuous monitoring",
  "Incident triage",
  "Audit evidence pack",
];

const MATURITIES: readonly WorkflowMaturity[] = [
  "Production implemented",
  "Beta implemented",
  "Experimental",
  "Integration pending",
  "Planned",
  "Not supported",
];

const GATES: readonly WorkflowGate[] = ["BLOCK", "WARN", "ALLOW", "INFORM"];

const STRING_FIELDS = [
  "id",
  "name",
  "phase",
  "summary",
  "success",
  "failure",
  "evidence",
] as const;

const LIST_FIELDS = ["inputs", "outputs", "checks", "tools"] as const;

describe("workflow catalog", () => {
  it("has exactly the ten declared workflows with unique ids", () => {
    const ids = WORKFLOWS.map((workflow) => workflow.id);
    expect(WORKFLOWS).toHaveLength(10);
    expect(ids).toEqual(REQUIRED_WORKFLOW_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_WORKFLOW_ID).toBe("devsecops");
  });

  it("defines the DevSecOps 30-stage order", () => {
    const devsecops = workflowById("devsecops");
    expect(devsecops.stages).toHaveLength(30);
    expect(devsecops.stages.map((stage) => stage.name)).toEqual(REQUIRED_DEVSECOPS_STAGES);
  });

  it("gives every stage complete, non-empty fields and valid labels", () => {
    const problems = WORKFLOWS.flatMap((workflow) =>
      workflow.stages.flatMap((stage) => {
        const found: string[] = [];
        STRING_FIELDS.forEach((field) => {
          if (!stage[field].trim()) found.push(`${field} is empty`);
        });
        LIST_FIELDS.forEach((field) => {
          if (stage[field].length === 0) found.push(`${field} is empty`);
          if (stage[field].some((value) => !value.trim())) found.push(`${field} has blank values`);
        });
        if (!MATURITIES.includes(stage.maturity)) found.push(`invalid maturity ${stage.maturity}`);
        if (stage.gate !== undefined && !GATES.includes(stage.gate)) {
          found.push(`invalid gate ${stage.gate}`);
        }
        return found.map((problem) => `${workflow.id}/${stage.id}: ${problem}`);
      }),
    );

    expect(problems).toEqual([]);
  });

  it("keeps every stage id unique within its workflow", () => {
    const duplicates = WORKFLOWS.flatMap((workflow) => {
      const stageIds = workflow.stages.map((stage) => stage.id);
      return stageIds.length === new Set(stageIds).size
        ? []
        : [workflow.id];
    });
    expect(duplicates).toEqual([]);
  });

  it("references only published Archify diagrams", () => {
    const published = new Set(ARCHIFY_DIAGRAMS.map((diagram) => diagram.id));
    const missing = WORKFLOWS.filter((workflow) => !published.has(workflow.diagramId)).map(
      (workflow) => workflow.id,
    );
    expect(missing).toEqual([]);
  });

  it("falls back to the default workflow for unknown ids", () => {
    expect(workflowById("missing")).toBe(workflowById(DEFAULT_WORKFLOW_ID));
    expect(workflowById("").id).toBe(DEFAULT_WORKFLOW_ID);
  });
});
