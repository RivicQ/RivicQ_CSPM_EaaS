import React from 'react';
import { Box, GlobalStyles } from '@mui/material';

type ArchifySurfaceProps = {
  placement?: 'both' | 'backdrop' | 'rail';
  variant?: 'public' | 'console';
};

const STAGES = ['Finding', 'Analysis', 'Engineering', 'DevSecOps', 'Evidence'];

const archifySurfaceCss = `
  @keyframes rvqSurfaceGridPan {
    from { background-position: 0 0, 0 0; }
    to { background-position: 44px 44px, 44px 44px; }
  }
  @keyframes rvqSurfaceAuraDrift {
    0% { transform: translate3d(-3%, -2%, 0) scale(1.04); opacity: 0.72; }
    50% { transform: translate3d(2%, 1%, 0) scale(1.1); opacity: 1; }
    100% { transform: translate3d(-3%, -2%, 0) scale(1.04); opacity: 0.72; }
  }
  @keyframes rvqSurfaceTrace {
    from { transform: translateX(-120%); }
    to { transform: translateX(230%); }
  }
  @keyframes rvqSurfacePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.34); opacity: 0.68; }
    50% { box-shadow: 0 0 0 5px rgba(167, 139, 250, 0); opacity: 1; }
  }
  .rvq-surface-backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    opacity: 0.42;
    mix-blend-mode: screen;
  }
  .rvq-surface-backdrop::before {
    content: "";
    position: absolute;
    inset: -20%;
    background-image:
      linear-gradient(rgba(167, 139, 250, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(167, 139, 250, 0.09) 1px, transparent 1px);
    background-size: 44px 44px;
    transform: rotate(-8deg) scale(1.3);
    opacity: 0.72;
    animation: rvqSurfaceGridPan 28s linear infinite;
    mask-image: radial-gradient(circle at 50% 38%, #000 0%, transparent 72%);
  }
  .rvq-surface-backdrop::after {
    content: "";
    position: absolute;
    inset: -30%;
    background:
      radial-gradient(circle at 18% 22%, rgba(124, 58, 237, 0.2), transparent 32%),
      radial-gradient(circle at 82% 16%, rgba(56, 189, 248, 0.12), transparent 28%),
      radial-gradient(circle at 60% 82%, rgba(167, 139, 250, 0.14), transparent 34%);
    filter: blur(18px);
    animation: rvqSurfaceAuraDrift 20s ease-in-out infinite;
  }
  .rvq-surface-rail {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(124, 58, 237, 0.12), rgba(10, 10, 15, 0.72) 42%, rgba(56, 189, 248, 0.08));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
  }
  .rvq-surface-rail[data-variant="console"] {
    padding: 4px 8px;
    border-radius: 8px;
  }
  .rvq-surface-rail-item {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    min-width: 0;
  }
  .rvq-surface-rail-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #a78bfa;
    animation: rvqSurfacePulse 2.8s ease-in-out infinite;
  }
  .rvq-surface-rail-item:nth-of-type(2) .rvq-surface-rail-dot { animation-delay: 0.28s; }
  .rvq-surface-rail-item:nth-of-type(3) .rvq-surface-rail-dot { animation-delay: 0.56s; }
  .rvq-surface-rail-item:nth-of-type(4) .rvq-surface-rail-dot { animation-delay: 0.84s; }
  .rvq-surface-rail-item:nth-of-type(5) .rvq-surface-rail-dot { animation-delay: 1.12s; }
  .rvq-surface-rail-label {
    margin-left: 6px;
    color: rgba(226, 232, 240, 0.82);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: clamp(7px, 1.1vw, 9px);
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .rvq-surface-rail-link {
    position: relative;
    flex: 1 1 auto;
    height: 1px;
    min-width: 10px;
    margin: 0 8px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.16);
  }
  .rvq-surface-rail-link::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 45%;
    background: linear-gradient(90deg, transparent, #a78bfa, transparent);
    animation: rvqSurfaceTrace 2.6s linear infinite;
  }
  .rvq-surface-rail-link:nth-of-type(2)::after { animation-delay: 0.2s; }
  .rvq-surface-rail-link:nth-of-type(4)::after { animation-delay: 0.4s; }
  .rvq-surface-rail-link:nth-of-type(6)::after { animation-delay: 0.6s; }
  .rvq-surface-rail-link:nth-of-type(8)::after { animation-delay: 0.8s; }
  @media (prefers-reduced-motion: reduce) {
    .rvq-surface-backdrop::before,
    .rvq-surface-backdrop::after,
    .rvq-surface-rail-dot,
    .rvq-surface-rail-link::after {
      animation: none !important;
    }
  }
  @media print {
    .rvq-surface-backdrop,
    .rvq-surface-rail { display: none !important; }
  }
`;

const ArchifySurface: React.FC<ArchifySurfaceProps> = ({ placement = 'both', variant = 'public' }) => (
  <>
    <GlobalStyles styles={archifySurfaceCss} />
    {placement !== 'rail' && <Box className="rvq-surface-backdrop" data-archify-surface="backdrop" aria-hidden="true" />}
    {placement !== 'backdrop' && (
      <Box className="rvq-surface-rail" data-archify-surface="rail" data-variant={variant} aria-hidden="true">
        {STAGES.map((stage, index) => (
          <React.Fragment key={stage}>
            <Box className="rvq-surface-rail-item">
              <Box className="rvq-surface-rail-dot" />
              <Box className="rvq-surface-rail-label" component="span">{stage}</Box>
            </Box>
            {index < STAGES.length - 1 && <Box className="rvq-surface-rail-link" />}
          </React.Fragment>
        ))}
      </Box>
    )}
  </>
);

export default ArchifySurface;
