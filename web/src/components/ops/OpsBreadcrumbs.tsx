import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { breadcrumbFor } from '../../ops/navigation';

const OpsBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = breadcrumbFor(location.pathname);
  return (
    <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        if (last) {
          return (
            <Typography key={c.path + i} variant="caption" color="text.primary" fontWeight={700}>
              {c.label}
            </Typography>
          );
        }
        return (
          <Link
            key={c.path + i}
            component="button"
            variant="caption"
            underline="hover"
            color="text.secondary"
            onClick={() => navigate(c.path)}
          >
            {c.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default OpsBreadcrumbs;
