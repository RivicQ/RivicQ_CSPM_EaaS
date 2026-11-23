import React from 'react';
import SitePage from './SitePage';
import WorkflowStudio from '../components/workflow/WorkflowStudio';

const WorkflowStudioPage: React.FC = () => (
  <SitePage
    eyebrow="Workflows"
    title="Security workflows, stage by stage"
    lede="Trace the DevSecOps lifecycle and ten adjacent workflows from inputs to evidence. These animations explain the designed path; they do not report live telemetry."
    primary={{ label: 'Open the console studio', to: '/workflow-studio' }}
    secondary={{ label: 'View Archify maps', to: '/maps' }}
    notice="Maturity labels distinguish implemented behavior from integration dependencies. No stage below claims a production connector, certification, or live customer event."
    maxWidth="lg"
  >
    <WorkflowStudio />
  </SitePage>
);

export default WorkflowStudioPage;
