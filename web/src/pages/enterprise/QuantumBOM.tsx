import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import QBOMViewer from '../../components/QBOMViewer';
import PageFrame from '../../components/PageFrame';

const QuantumBOMPage: React.FC = () => {
  const { scan_id } = useParams<{ scan_id: string }>();
  const [qbom, setQBOM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQBOM = async () => {
      try {
        const response = await fetch(`/api/v1/scans/${scan_id}/qbom`);
        if (!response.ok) throw new Error('Failed to fetch QBOM');
        const data = await response.json();
        setQBOM(data);
      } catch (err) {
        console.error('Failed to fetch QBOM:', err);
        setError('Failed to load quantum risk assessment. Try again or go back to results.');
      } finally {
        setLoading(false);
      }
    };

    if (scan_id) fetchQBOM();
  }, [scan_id]);

  if (loading) {
    return (
      <PageFrame title="Loading...">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageFrame>
    );
  }

  if (error) {
    return (
      <PageFrame title="Quantum Bill of Materials">
        <Alert severity="error">{error}</Alert>
      </PageFrame>
    );
  }

  if (!qbom) {
    return (
      <PageFrame title="Quantum Bill of Materials">
        <Alert severity="warning">No QBOM data available for this scan</Alert>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      eyebrow="Enterprise"
      title="Quantum Bill of Materials"
      subtitle="Assess quantum computing threats and plan migration to post-quantum cryptography"
    >
      <QBOMViewer
        qbom={qbom}
        onExport={() => {
          const dataStr = JSON.stringify(qbom, null, 2);
          const element = document.createElement('a');
          element.setAttribute('href', `data:text/json;charset=utf-8,${encodeURIComponent(dataStr)}`);
          element.setAttribute('download', `qbom-export.json`);
          element.click();
        }}
        onShareMigrationPlan={() => {
          const link = `${window.location.origin}/enterprise/quantum-bom/${scan_id}`;
          navigator.clipboard.writeText(link).then(() => {
            alert('Link copied to clipboard!');
          });
        }}
      />
    </PageFrame>
  );
};

export default QuantumBOMPage;
