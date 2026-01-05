import * as k8s from '@kubernetes/client-node';
import express from 'express';
import { CBOMGenerator } from '../cbom/generator';
import { CryptoInterceptor } from '../interceptor/runtime';

export interface RivicConfig {
  namespace: string;
  quantumSafeMode: boolean;
  cbomEnabled: boolean;
  algorithms: {
    keyExchange: 'kyber-1024' | 'kyber-768' | 'kyber-512';
    signature: 'dilithium-5' | 'dilithium-3' | 'dilithium-2';
  };
  compliance: {
    eidas: boolean;
    dora: boolean;
  };
}

export class RivicOperator {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private customApi: k8s.CustomObjectsApi;
  private admissionApi: k8s.AdmissionregistrationV1Api;
  private cbomGenerator: CBOMGenerator;
  private interceptor: CryptoInterceptor;
  private environment: 'development' | 'staging' | 'production' = 'development';
  private edition: 'opensource' | 'enterprise' = 'opensource';

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    
    // Validate environment and edition
    this.environment = (process.env.RIVIC_ENV as any) || 'development';
    this.edition = (process.env.RIVIC_EDITION as any) || 'opensource';
    
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    this.admissionApi = this.kc.makeApiClient(k8s.AdmissionregistrationV1Api);
    
    this.cbomGenerator = new CBOMGenerator();
    this.interceptor = new CryptoInterceptor();
  }

  private validateEnvironment(): void {
    const context = this.kc.getCurrentContext();
    let clusterName = '';
    
    if (typeof context === 'string') {
      clusterName = context;
    } else if (context && typeof context === 'object') {
      clusterName = (context as any).cluster || '';
    }
    
    const cluster = this.kc.getCluster(clusterName);
    
    if (!cluster?.server) {
      console.error('❌ No cluster server found in kubeconfig');
      process.exit(1);
    }

    const isInsecure = cluster.server.startsWith('http://');
    const isProduction = this.environment === 'production';
    const allowInsecure = process.env.RIVIC_ALLOW_INSECURE_DEV === 'true';

    if (isInsecure && isProduction) {
      console.error('\n❌ SECURITY ERROR: Cannot run production operator against insecure cluster!');
      console.error(`   Cluster: ${cluster.server}`);
      console.error(`   Environment: ${this.environment}`);
      console.error('\n💡 SOLUTIONS:');
      console.error('   1. Use HTTPS cluster: kubectl config set-cluster <cluster-name> --server=https://...');
      console.error('   2. Change environment: RIVIC_ENV=development npm run dev');
      console.error('   3. Use dev kubeconfig: export KUBECONFIG=~/.kube/dev-config\n');
      process.exit(1);
    }

    if (isInsecure && !allowInsecure && this.environment !== 'development') {
      console.warn('\n⚠️  WARNING: Running against insecure cluster in', this.environment, 'mode');
      console.warn('   Set RIVIC_ALLOW_INSECURE_DEV=true to continue (dev only)\n');
    }
  }

  async start(): Promise<void> {
    console.log('\n🚀 Starting Rivic Q-Runtime Operator...');
    console.log(`📋 Environment: ${this.environment}`);
    console.log(`🏢 Edition: ${this.edition}\n`);
    
    // Validate environment safety
    this.validateEnvironment();
    
    // Install CRDs
    await this.installCRDs();
    
    // Setup admission controller webhook (enterprise only)
    if (this.edition === 'enterprise') {
      await this.setupAdmissionWebhook();
    }
    
    // Start watching for RivicConfig resources
    this.watchRivicConfigs();
    
    // Start webhook server (enterprise only)
    if (this.edition === 'enterprise') {
      this.startWebhookServer();
    }
    
    console.log('✅ Rivic Operator is running');
  }

  private async installCRDs(): Promise<void> {
    console.log('📝 Installing Rivic CRDs...');
    
    const crd = {
      apiVersion: 'apiextensions.k8s.io/v1',
      kind: 'CustomResourceDefinition',
      metadata: {
        name: 'rivicconfigs.quantum.rivic.eu'
      },
      spec: {
        group: 'quantum.rivic.eu',
        versions: [{
          name: 'v1',
          served: true,
          storage: true,
          schema: {
            openAPIV3Schema: {
              type: 'object',
              properties: {
                spec: {
                  type: 'object',
                  properties: {
                    quantumSafeMode: { type: 'boolean' },
                    cbomEnabled: { type: 'boolean' },
                    algorithms: {
                      type: 'object',
                      properties: {
                        keyExchange: { type: 'string', enum: ['kyber-1024', 'kyber-768', 'kyber-512'] },
                        signature: { type: 'string', enum: ['dilithium-5', 'dilithium-3', 'dilithium-2'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }],
        scope: 'Namespaced',
        names: {
          plural: 'rivicconfigs',
          singular: 'rivicconfig',
          kind: 'RivicConfig'
        }
      }
    };

    try {
      const apiExtensions = this.kc.makeApiClient(k8s.ApiextensionsV1Api);
      await apiExtensions.createCustomResourceDefinition({ body: crd });
      console.log('✅ RivicConfig CRD installed');
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
      console.log('📋 RivicConfig CRD already exists');
    }
  }

  private async setupAdmissionWebhook(): Promise<void> {
    console.log('🔧 Setting up admission webhook...');
    
    // For demo purposes, we'll simulate the webhook setup
    // In production, this would create the actual MutatingAdmissionWebhook
    console.log('✅ Admission webhook configured (demo mode)');
  }

  private watchRivicConfigs(): void {
    console.log('👁️  Watching RivicConfig resources...');
    
    const watch = new k8s.Watch(this.kc);
    
    watch.watch('/apis/quantum.rivic.eu/v1/rivicconfigs',
      {},
      (type, apiObj) => {
        console.log(`🔄 RivicConfig ${type}:`, apiObj.metadata?.name);
        this.handleRivicConfigEvent(type, apiObj);
      },
      (err) => {
        console.error('❌ Watch error:', err);
        // Restart watch
        setTimeout(() => this.watchRivicConfigs(), 5000);
      }
    );
  }

  private handleRivicConfigEvent(type: string, config: any): void {
    const name = config.metadata?.name;
    const namespace = config.metadata?.namespace;
    
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        console.log(`✅ Applying quantum-safe config for ${namespace}/${name}`);
        this.applyQuantumConfig(config);
        break;
      case 'DELETED':
        console.log(`🗑️  Removing quantum-safe config for ${namespace}/${name}`);
        this.removeQuantumConfig(config);
        break;
    }
  }

  private async applyQuantumConfig(config: any): Promise<void> {
    const spec = config.spec as RivicConfig;
    
    // Generate CBOM if enabled
    if (spec.cbomEnabled) {
      const cbom = await this.cbomGenerator.generateForNamespace(
        config.metadata.namespace,
        spec.algorithms
      );
      
      // Store CBOM as ConfigMap
      await this.storeCBOM(config.metadata.namespace, cbom);
    }

    // Update interceptor configuration
    this.interceptor.updateConfig(spec);
  }

  private async removeQuantumConfig(config: any): Promise<void> {
    // Cleanup logic here
    console.log('🧹 Cleaning up quantum configuration...');
  }

  private async storeCBOM(namespace: string, cbom: any): Promise<void> {
    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'rivic-cbom',
        namespace: namespace,
        labels: {
          'app.kubernetes.io/managed-by': 'rivic-operator',
          'quantum.rivic.eu/cbom': 'true'
        }
      },
      data: {
        'cbom.json': JSON.stringify(cbom, null, 2)
      }
    };

    try {
      await this.k8sApi.createNamespacedConfigMap({ namespace, body: configMap });
    } catch (error: any) {
      if (error.response?.statusCode === 409) {
        await this.k8sApi.replaceNamespacedConfigMap({ name: 'rivic-cbom', namespace, body: configMap });
      } else {
        throw error;
      }
    }
  }

  private startWebhookServer(): void {
    const app = express();
    app.use(express.json());

    app.post('/mutate', (req: any, res: any) => {
      const admission = req.body;
      const pod = admission.request.object;
      
      // Check if namespace has rivic injection enabled
      const shouldInject = pod.metadata?.labels?.['rivic-injection'] === 'enabled' ||
                          pod.metadata?.namespace === 'rivic-enabled';

      if (shouldInject) {
        const patchedPod = this.injectRivicAgent(pod);
        
        const patch = this.createPatch(pod, patchedPod);
        
        res.json({
          apiVersion: 'admission.k8s.io/v1',
          kind: 'AdmissionResponse',
          response: {
            uid: admission.request.uid,
            allowed: true,
            patchType: 'JSONPatch',
            patch: Buffer.from(JSON.stringify(patch)).toString('base64')
          }
        });
      } else {
        res.json({
          apiVersion: 'admission.k8s.io/v1',
          kind: 'AdmissionResponse',
          response: {
            uid: admission.request.uid,
            allowed: true
          }
        });
      }
    });

    app.listen(8443, () => {
      console.log('🎣 Webhook server listening on port 8443');
    });
  }

  private injectRivicAgent(pod: any): any {
    const patchedPod = JSON.parse(JSON.stringify(pod));
    
    // Add init container for librivic.so
    if (!patchedPod.spec.initContainers) {
      patchedPod.spec.initContainers = [];
    }
    
    patchedPod.spec.initContainers.push({
      name: 'rivic-init',
      image: 'rivic/q-runtime-agent:v1.0.0',
      command: ['cp', '/usr/lib/librivic.so', '/shared/lib/'],
      volumeMounts: [{
        name: 'rivic-lib',
        mountPath: '/shared/lib'
      }]
    });

    // Add shared volume
    if (!patchedPod.spec.volumes) {
      patchedPod.spec.volumes = [];
    }
    
    patchedPod.spec.volumes.push({
      name: 'rivic-lib',
      emptyDir: {}
    });

    // Modify main container
    if (patchedPod.spec.containers && patchedPod.spec.containers.length > 0) {
      const mainContainer = patchedPod.spec.containers[0];
      
      // Add LD_PRELOAD environment variable
      if (!mainContainer.env) {
        mainContainer.env = [];
      }
      
      mainContainer.env.push({
        name: 'LD_PRELOAD',
        value: '/shared/lib/librivic.so'
      });

      mainContainer.env.push({
        name: 'RIVIC_MODE',
        value: 'quantum-safe'
      });

      // Add volume mount
      if (!mainContainer.volumeMounts) {
        mainContainer.volumeMounts = [];
      }
      
      mainContainer.volumeMounts.push({
        name: 'rivic-lib',
        mountPath: '/shared/lib',
        readOnly: true
      });
    }

    return patchedPod;
  }

  private createPatch(original: any, patched: any): any[] {
    // Simple patch creation - in production, use a proper JSON patch library
    const patches = [];
    
    if (!original.spec.initContainers && patched.spec.initContainers) {
      patches.push({
        op: 'add',
        path: '/spec/initContainers',
        value: patched.spec.initContainers
      });
    }
    
    if (!original.spec.volumes && patched.spec.volumes) {
      patches.push({
        op: 'add',
        path: '/spec/volumes',
        value: patched.spec.volumes
      });
    }

    return patches;
  }
}

// Start operator if run directly
if (require.main === module) {
  const operator = new RivicOperator();
  operator.start().catch(console.error);
}
