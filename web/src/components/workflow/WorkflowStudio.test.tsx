import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTheme, ThemeProvider } from '@mui/material';
import { workflowById } from '../../data/workflows';
import WorkflowStudio from './WorkflowStudio';

const originalMatchMedia = window.matchMedia;

const renderStudio = (element: React.ReactElement = <WorkflowStudio />) =>
  render(<ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>{element}</ThemeProvider>);

beforeEach(() => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('WorkflowStudio', () => {
  it('renders the default workflow with its stage count and mode label', () => {
    renderStudio();
    expect(screen.getByRole('heading', { level: 1, name: /devsecops lifecycle \(30 stages\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Stage 1 of 30: Intake and scope/)).toBeInTheDocument();
    expect(screen.getByText('INTEGRATION PENDING')).toBeInTheDocument();
    expect(screen.queryByText('SIMULATED — no live telemetry')).not.toBeInTheDocument();
  });

  it('labels simulated workflows without claiming live telemetry', () => {
    renderStudio(<WorkflowStudio workflowId="cbom" />);
    expect(screen.getByRole('heading', { level: 1, name: /CBOM and SBOM evidence lifecycle/i })).toBeInTheDocument();
    expect(screen.getByText('SIMULATED — no live telemetry')).toBeInTheDocument();
  });

  it('moves between stages with Next and Previous', async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Policy baseline' })).toBeInTheDocument();
    expect(screen.getByText(/Stage 2 of 30: Policy baseline/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Intake and scope' })).toBeInTheDocument();
  });

  it('changes the workflow from the select and resets to stage 0', async () => {
    const user = userEvent.setup();
    const onWorkflowChange = jest.fn();
    renderStudio(<WorkflowStudio onWorkflowChange={onWorkflowChange} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Stage 2 of 30/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Workflow' }), 'cbom');
    expect(screen.getByRole('heading', { level: 1, name: /CBOM and SBOM evidence lifecycle/i })).toBeInTheDocument();
    expect(screen.getByText(/Stage 1 of 8: Declare sources/)).toBeInTheDocument();
    expect(onWorkflowChange).toHaveBeenCalledWith('cbom');
  });

  it('always renders all 30 static stage names in a collapsed accordion', () => {
    renderStudio();
    expect(screen.getByRole('button', { name: 'Static stage list' })).toHaveAttribute('aria-expanded', 'false');
    const staticList = screen.getByTestId('static-stage-list');
    const names = within(staticList)
      .getAllByRole('listitem', { hidden: true })
      .map((item) => item.textContent);
    expect(names).toHaveLength(30);
    expect(names).toEqual(workflowById('devsecops').stages.map((stage) => stage.name));
  });

  it('renders a gated stage with the matching severity color', async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(screen.getByRole('button', { name: 'Policy gate' }));
    const gateChip = screen.getByTestId('gate-chip');
    expect(gateChip).toHaveTextContent('BLOCK');
    expect(gateChip).toHaveClass('MuiChip-colorError');
  });

  it('supports ArrowLeft, ArrowRight, Home and End on the stage rail', async () => {
    const user = userEvent.setup();
    renderStudio();
    screen.getByRole('button', { name: 'Intake and scope' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(/Stage 2 of 30: Policy baseline/)).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByText(/Stage 30 of 30: Audit evidence pack/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit evidence pack' })).toHaveAttribute('aria-current', 'step');
    await user.keyboard('{Home}');
    expect(screen.getByText(/Stage 1 of 30: Intake and scope/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Stage 1 of 30: Intake and scope/)).toBeInTheDocument();
  });

  it('stops at the last stage and restarts from stage 0', async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(screen.getByRole('button', { name: 'Audit evidence pack' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByText(/Stage 1 of 30: Intake and scope/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.getByText(/Stage 1 of 30: Intake and scope/)).toBeInTheDocument();
  });

  it('exposes speed control and a one-line Archify map link', async () => {
    const user = userEvent.setup();
    renderStudio();
    const speed = screen.getByRole('combobox', { name: 'Speed' });
    await user.selectOptions(speed, '2');
    expect(speed).toHaveValue('2');
    expect(screen.getByRole('link', { name: /open archify map/i })).toHaveAttribute(
      'href',
      expect.stringContaining('rivicq-finding-devsecops-workflow.html?present=1'),
    );
  });

  it('keeps controls and details in compact mode', () => {
    renderStudio(<WorkflowStudio compact workflowId="cbom" />);
    expect(screen.queryByText(/Local pipeline from declared sources/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Declare sources' })).toBeInTheDocument();
    expect(screen.getByText('SIMULATED — no live telemetry')).toBeInTheDocument();
  });
});
