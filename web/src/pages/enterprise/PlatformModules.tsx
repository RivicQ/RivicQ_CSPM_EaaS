import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { ArrowForward, Category, LinkOff, Lock } from '@mui/icons-material';
import { tokens } from '../../theme/tokens';
import PageFrame from '../../components/PageFrame';
import { MODULES, MODULE_CATEGORIES } from '../../config/modules';
import { useAuth } from '../../context/AuthContext';
import { isPaidEdition } from '../../config/editions';

const PlatformModules: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();
  const locked = !isPaidEdition(edition);

  const grouped = MODULE_CATEGORIES.map((cat) => ({
    category: cat,
    modules: MODULES.filter((m) => m.category === cat),
  }));

  return (
    <PageFrame
      eyebrow="PLATFORM"
      title="Security Modules"
      subtitle="Config-driven, domain-focused modules across the full security lifecycle. Enable connectors to stream live findings or explore seeded baseline data."
      badge="MODULES"
      action={
        <Button variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/modules/cloud-security')}>
          Explore catalog
        </Button>
      }
    >
      {locked && (
        <Box sx={{ mb: 3, p: 2.5, borderRadius: 3, border: '1px solid rgba(212,175,55,0.3)', bgcolor: 'rgba(212,175,55,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Lock sx={{ color: tokens.colors.gold[400] }} />
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
            You are viewing the Community edition. Modules activate with Professional or Enterprise. Switch your edition to unlock.
          </Typography>
        </Box>
      )}

      {grouped.map(({ category, modules }) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Category sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{category}</Typography>
            <Chip size="small" label={`${modules.length} modules`} variant="outlined" />
          </Stack>
          <Grid container spacing={3}>
            {modules.map((m) => {
              const Icon = m.icon;
              const scoreColor = m.score >= 80 ? tokens.colors.crypto.low : m.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical;
              const openCount = m.findings.filter((f) => f.status === 'open' || f.status === 'investigating').length;
              return (
                <Grid item xs={12} sm={6} md={4} key={m.id}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': locked ? {} : { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(79,70,229,0.14)' },
                    }}
                    onClick={() => !locked && navigate(`/modules/${m.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: `${m.color}22`, color: m.color }}><Icon /></Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: tokens.colors.text.primary }} noWrap>{m.name}</Typography>
                          <Typography variant="caption" sx={{ color: tokens.colors.text.muted }} noWrap>{m.tagline}</Typography>
                        </Box>
                        <Chip size="small" label={`${m.score}%`} sx={{ bgcolor: `${scoreColor}22`, color: scoreColor, fontWeight: 800 }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 2, minHeight: 40 }}>
                        {m.description.length > 110 ? `${m.description.slice(0, 110)}…` : m.description}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <Chip size="small" label={`${openCount} open`} sx={{ color: tokens.colors.crypto.critical, bgcolor: `${tokens.colors.crypto.critical}18` }} />
                        {m.connected ? (
                          <Chip size="small" label="Live connector" color="success" />
                        ) : (
                          <Chip size="small" icon={<LinkOff sx={{ fontSize: 13 }} />} label="Seeded data" variant="outlined" />
                        )}
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ArrowForward />}
                        onClick={(e) => { e.stopPropagation(); if (!locked) navigate(`/modules/${m.id}`); }}
                      >
                        Open module
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </PageFrame>
  );
};

export default PlatformModules;
