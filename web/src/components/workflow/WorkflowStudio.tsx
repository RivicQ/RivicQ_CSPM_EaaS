import React, { useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Fade,
  FormControl,
  InputLabel,
  LinearProgress,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { PRISM } from '../../theme/prism';
import { ARCHIFY_FONTS, NEBULA, nebulaCardSx, nebulaPanelSx } from '../../theme/nebulaSurfaces';
import { proBlueContainedButtonSx } from '../../theme/designSystem';
import { archifyDiagram, archifyDiagramHref } from '../../data/archifyDiagrams';
import {
  DEFAULT_WORKFLOW_ID,
  WORKFLOWS,
  workflowById,
  type WorkflowGate,
  type WorkflowStage,
} from '../../data/workflows';

type WorkflowStudioProps = {
  workflowId?: string;
  compact?: boolean;
  onWorkflowChange?: (id: string) => void;
};

type Speed = 0.5 | 1 | 2;

const STAGE_DURATION_MS = 2400;

const GATE_COLORS: Record<WorkflowGate, 'error' | 'warning' | 'success' | 'info'> = {
  BLOCK: 'error',
  WARN: 'warning',
  ALLOW: 'success',
  INFORM: 'info',
};

const reducedMotionQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)') ?? null;
};

const eyebrowSx = {
  color: NEBULA.faint,
  fontFamily: ARCHIFY_FONTS.mono,
  fontSize: '0.625rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

const DetailList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={eyebrowSx}>{title}</Typography>
    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, color: NEBULA.muted, fontSize: '0.8125rem' }}>
      {items.map((item) => (
        <Box component="li" key={item} sx={{ mb: 0.35 }}>
          {item}
        </Box>
      ))}
    </Box>
  </Box>
);

const StageDetail: React.FC<{ stage: WorkflowStage }> = ({ stage }) => (
  <Box sx={{ minWidth: 0 }}>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
      <Chip size="small" variant="outlined" label={stage.phase} sx={{ color: NEBULA.muted, borderColor: NEBULA.lineHi }} />
      <Chip size="small" variant="outlined" label={stage.maturity} sx={{ color: NEBULA.text, borderColor: NEBULA.lineHi }} />
      {stage.gate ? (
        <Chip size="small" color={GATE_COLORS[stage.gate]} label={stage.gate} data-testid="gate-chip" />
      ) : null}
    </Stack>
    <Typography component="h2" sx={{ fontFamily: ARCHIFY_FONTS.title, fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-0.02em' }}>
      {stage.name}
    </Typography>
    <Typography sx={{ mt: 0.5, mb: 2, color: NEBULA.muted, fontSize: '0.875rem', maxWidth: 760 }}>
      {stage.summary}
    </Typography>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 2,
        minWidth: 0,
      }}
    >
      <DetailList title="Inputs" items={stage.inputs} />
      <DetailList title="Outputs" items={stage.outputs} />
      <DetailList title="Checks" items={stage.checks} />
      <DetailList title="Tools" items={stage.tools} />
    </Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 1.5,
        mt: 2,
        pt: 2,
        borderTop: '1px solid',
        borderColor: NEBULA.line,
        minWidth: 0,
      }}
    >
      {[
        { label: 'Success', value: stage.success },
        { label: 'Failure', value: stage.failure },
        { label: 'Evidence', value: stage.evidence },
      ].map((row) => (
        <Box key={row.label} sx={{ minWidth: 0 }}>
          <Typography sx={eyebrowSx}>{row.label}</Typography>
          <Typography sx={{ mt: 0.35, color: NEBULA.muted, fontSize: '0.8125rem' }}>{row.value}</Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

type StageRailProps = {
  stages: WorkflowStage[];
  activeIndex: number;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
};

const StageRail: React.FC<StageRailProps> = ({ stages, activeIndex, reducedMotion, onSelect }) => {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(activeIndex);

  useEffect(() => {
    setFocusIndex(activeIndex);
  }, [activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = stages.length - 1;
    let next = index;
    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(index + 1, last);
        break;
      case 'ArrowLeft':
        next = Math.max(index - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    setFocusIndex(next);
    onSelect(next);
    buttons.current[next]?.focus();
  };

  return (
    <Box
      component="ol"
      role="list"
      aria-label="Workflow stages"
      sx={{
        display: 'flex',
        gap: 1,
        m: 0,
        p: 0.5,
        mx: -0.5,
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: `${NEBULA.lineHi} transparent`,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: NEBULA.lineHi, borderRadius: 999 },
      }}
    >
      {stages.map((stage, index) => {
        const active = index === activeIndex;
        return (
          <Box component="li" role="listitem" key={stage.id} sx={{ flex: '0 0 auto', listStyle: 'none' }}>
            <Button
              ref={(node) => {
                buttons.current[index] = node;
              }}
              size="small"
              tabIndex={focusIndex === index ? 0 : -1}
              aria-current={active ? 'step' : undefined}
              onClick={() => {
                setFocusIndex(index);
                onSelect(index);
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              sx={{
                flexShrink: 0,
                maxWidth: 220,
                px: 1.25,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                border: '1px solid',
                borderColor: active ? NEBULA.accent : NEBULA.line,
                borderRadius: PRISM.radii.sm,
                bgcolor: active ? 'rgba(124,58,237,0.18)' : NEBULA.raised,
                color: active ? NEBULA.text : NEBULA.muted,
                transition: reducedMotion ? 'none' : `${PRISM.motion.base}, transform ${PRISM.motion.base}`,
                transform: active && !reducedMotion ? 'translateY(-2px)' : 'none',
                '&:hover': { borderColor: NEBULA.accent, color: NEBULA.text },
              }}
            >
              <Box component="span" aria-hidden="true" sx={{ mr: 0.75, color: NEBULA.faint, fontFamily: ARCHIFY_FONTS.mono, fontSize: '0.6875rem' }}>
                {index + 1}
              </Box>
              {stage.name}
            </Button>
          </Box>
        );
      })}
    </Box>
  );
};

const WorkflowStudio: React.FC<WorkflowStudioProps> = ({ workflowId, compact = false, onWorkflowChange }) => {
  const [selectedId, setSelectedId] = useState(workflowId ?? DEFAULT_WORKFLOW_ID);
  const [stageIndex, setStageIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [reducedMotion, setReducedMotion] = useState(() => reducedMotionQuery()?.matches ?? true);
  const workflow = workflowById(selectedId);
  const stages = workflow.stages;
  const stage = stages[stageIndex] ?? stages[0];
  const progress = stages.length ? ((stageIndex + 1) / stages.length) * 100 : 0;
  const diagram = archifyDiagram(workflow.diagramId);
  const presentHref = archifyDiagramHref(diagram.file, 'present');
  const atEnd = stageIndex >= stages.length - 1;
  const stageKey = `${workflow.id}-${stage.id}`;
  const stageCard = (
    <Box
      sx={{
        ...nebulaPanelSx,
        p: compact ? 1.5 : 2.5,
        minWidth: 0,
        transition: reducedMotion ? 'none' : `transform ${PRISM.motion.slow}, opacity ${PRISM.motion.slow}`,
        transform: reducedMotion ? 'none' : 'translateY(0)',
      }}
    >
      <StageDetail stage={stage} />
    </Box>
  );

  useEffect(() => {
    const nextId = workflowId ?? DEFAULT_WORKFLOW_ID;
    setSelectedId(nextId);
    setStageIndex(0);
    setPlaying(false);
  }, [workflowId]);

  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return;
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange);
      return () => query.removeEventListener('change', handleChange);
    }
    if (typeof query.addListener === 'function') {
      query.addListener(handleChange);
      return () => query.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion || stages.length === 0) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStageIndex((current) => Math.min(current + 1, stages.length - 1)), STAGE_DURATION_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, atEnd, speed, stages.length]);

  const goToStage = (index: number) => {
    setStageIndex(Math.max(0, Math.min(index, stages.length - 1)));
    setPlaying(false);
  };

  const handleWorkflowChange = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setStageIndex(0);
    setPlaying(false);
    onWorkflowChange?.(id);
  };

  const handlePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) {
      setStageIndex(0);
    }
    setPlaying(true);
  };

  return (
    <Box
      data-component="workflow-studio"
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        p: compact ? 1 : { xs: 2, md: 3 },
        bgcolor: NEBULA.ink,
        color: NEBULA.text,
        fontFamily: ARCHIFY_FONTS.body,
      }}
    >
      <Paper elevation={0} sx={{ ...nebulaCardSx, minWidth: 0, maxWidth: '100%', p: compact ? 1.5 : { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }} justifyContent="space-between" useFlexGap sx={{ minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={eyebrowSx}>{workflow.eyebrow}</Typography>
              <Chip
                size="small"
                variant="outlined"
                color={workflow.mode === 'SIMULATED' ? 'info' : 'warning'}
                label={workflow.mode === 'SIMULATED' ? 'SIMULATED — no live telemetry' : 'INTEGRATION PENDING'}
              />
            </Stack>
            <Typography component="h1" sx={{ mt: 0.5, fontFamily: ARCHIFY_FONTS.title, fontWeight: 500, letterSpacing: '-0.03em', fontSize: compact ? '1.25rem' : { xs: '1.5rem', md: '2rem' } }}>
              {workflow.title}
            </Typography>
            {compact ? null : (
              <Typography sx={{ mt: 1, color: NEBULA.muted, fontSize: '0.875rem', maxWidth: 760 }}>
                {workflow.description}
              </Typography>
            )}
          </Box>
          <FormControl size="small" sx={{ minWidth: 220, maxWidth: '100%' }}>
            <InputLabel id="workflow-studio-select-label">Workflow</InputLabel>
            <Select
              native
              labelId="workflow-studio-select-label"
              id="workflow-studio-select"
              label="Workflow"
              value={selectedId}
              onChange={(event) => handleWorkflowChange(String(event.target.value))}
              inputProps={{ 'aria-label': 'Workflow' }}
            >
              {WORKFLOWS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Box sx={{ mt: compact ? 1.5 : 3, minWidth: 0 }}>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography aria-live="polite" sx={{ color: NEBULA.text, fontSize: '0.8125rem' }}>
              Stage {stageIndex + 1} of {stages.length}: {stage.name}
            </Typography>
            <Typography sx={{ color: NEBULA.faint, fontFamily: ARCHIFY_FONTS.mono, fontSize: '0.6875rem' }}>
              {Math.round(progress)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            aria-label="Workflow progress"
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: NEBULA.raised,
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: `linear-gradient(90deg, ${PRISM.brand.violet500}, ${PRISM.severity.info})`,
                transition: reducedMotion ? 'none' : `transform ${PRISM.motion.slow}`,
              },
            }}
          />
        </Box>

        <Box sx={{ mt: 2, minWidth: 0 }}>
          <StageRail stages={stages} activeIndex={stageIndex} reducedMotion={reducedMotion} onSelect={goToStage} />
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2, minWidth: 0 }}>
          <Button size="small" variant="outlined" onClick={() => goToStage(stageIndex - 1)} disabled={stageIndex === 0} sx={{ textTransform: 'none' }}>
            Previous
          </Button>
          <Button size="small" variant="contained" onClick={handlePlay} sx={proBlueContainedButtonSx}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button size="small" variant="outlined" onClick={() => goToStage(stageIndex + 1)} disabled={atEnd} sx={{ textTransform: 'none' }}>
            Next
          </Button>
          <Button size="small" variant="text" onClick={() => goToStage(0)} sx={{ color: NEBULA.muted, textTransform: 'none' }}>
            Restart
          </Button>
          <FormControl size="small" sx={{ minWidth: 96 }}>
            <InputLabel id="workflow-studio-speed-label">Speed</InputLabel>
            <Select
              native
              labelId="workflow-studio-speed-label"
              label="Speed"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value) as Speed)}
              inputProps={{ 'aria-label': 'Speed' }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </Select>
          </FormControl>
          {reducedMotion ? (
            <Typography sx={{ color: NEBULA.faint, fontSize: '0.75rem' }}>Motion reduced — autoplay paused</Typography>
          ) : null}
        </Stack>

        <Box sx={{ mt: compact ? 1.5 : 2.5, minWidth: 0 }}>
          {reducedMotion ? (
            <React.Fragment key={stageKey}>{stageCard}</React.Fragment>
          ) : (
            <Fade in appear key={stageKey} timeout={280}>
              {stageCard}
            </Fade>
          )}
        </Box>

        <Accordion
          disableGutters
          elevation={0}
          TransitionProps={{ timeout: reducedMotion ? 0 : 280 }}
          sx={{ ...nebulaPanelSx, mt: 2, bgcolor: 'transparent', '&:before': { display: 'none' } }}
        >
          <AccordionSummary aria-controls="workflow-static-stage-list">
            <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>Static stage list</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box component="ol" id="workflow-static-stage-list" data-testid="static-stage-list" sx={{ m: 0, pl: 3, color: NEBULA.muted, fontSize: '0.8125rem' }}>
              {stages.map((item) => (
                <Box component="li" key={item.id} sx={{ mb: 0.35 }}>
                  {item.name}
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          useFlexGap
          sx={{ ...nebulaPanelSx, mt: 2, p: compact ? 1 : 1.5, minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={eyebrowSx}>Archify map · {diagram.kind}</Typography>
            <Typography noWrap sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
              {diagram.question}
            </Typography>
          </Box>
          <Button
            size="small"
            href={presentHref}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flexShrink: 0, color: NEBULA.text, textTransform: 'none', minHeight: 32 }}
          >
            Open Archify map
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default WorkflowStudio;
