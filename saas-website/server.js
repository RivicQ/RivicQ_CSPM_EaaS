const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/components', express.static(path.join(__dirname, 'components')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/enterprise', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'enterprise.html'));
});

app.get('/github-integration', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'github-integration.html'));
});

// API Routes
app.post('/api/contact', (req, res) => {
  const { name, email, plan, message } = req.body;
  
  console.log('📧 Contact Form Submission:', {
    name, email, plan, message,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    message: 'Thank you for your interest! Our team will contact you within 24 hours.'
  });
});

app.post('/api/trial', (req, res) => {
  const { email, plan, company } = req.body;
  
  console.log('🚀 Trial Request:', {
    email, plan, company,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    trialId: `trial_${Date.now()}`,
    message: 'Trial environment is being set up. Check your email for access details.'
  });
});

app.get('/api/github-repos', (req, res) => {
  res.json([
    {
      name: 'rivic-q-runtime',
      description: 'Quantum-Safe Cloud-Native Infrastructure',
      url: 'https://github.com/rivic/q-runtime',
      stars: 2847,
      language: 'TypeScript',
      license: 'Apache-2.0'
    },
    {
      name: 'rivic-cbom-tools',
      description: 'Cryptographic Bill of Materials Generator',
      url: 'https://github.com/rivic/cbom-tools',
      stars: 1523,
      language: 'Go',
      license: 'MIT'
    },
    {
      name: 'rivic-k8s-operator',
      description: 'Kubernetes Operator for Quantum-Safe Deployments',
      url: 'https://github.com/rivic/k8s-operator',
      stars: 892,
      language: 'Go',
      license: 'Apache-2.0'
    }
  ]);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('🌐 Rivic SaaS Website running at http://localhost:' + PORT);
  console.log('🚀 Features:');
  console.log('   - Homepage with pricing tiers');
  console.log('   - Interactive documentation'); 
  console.log('   - GitHub integration');
  console.log('   - Enterprise contact forms');
  console.log('   - Trial signup');
});

module.exports = app;
