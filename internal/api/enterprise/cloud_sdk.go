package enterprise

import (
	"context"
	"fmt"
	"os"

	"github.com/rivic-q/cryptobom-saas/internal/awscloud"
	"github.com/rivic-q/cryptobom-saas/internal/azurecloud"
	"github.com/rivic-q/cryptobom-saas/internal/gcpcloud"
)

type cloudSDKs struct {
	aws   *awscloud.Client
	gcp   *gcpcloud.Client
	azure *azurecloud.Client
}

func newCloudSDKs(ctx context.Context) *cloudSDKs {
	sdks := &cloudSDKs{}

	awsClient, err := awscloud.NewClient(ctx)
	if err == nil && awsClient.Configured() {
		sdks.aws = awsClient
	}

	gcpProject := os.Getenv("GCP_PROJECT_ID")
	if gcpProject != "" {
		gcpClient, err := gcpcloud.NewClient(ctx, gcpProject)
		if err == nil && gcpClient.Configured() {
			sdks.gcp = gcpClient
		}
	}

	azureSub := os.Getenv("AZURE_SUBSCRIPTION_ID")
	if azureSub != "" {
		azureClient, err := azurecloud.NewClient(azureSub)
		if err == nil && azureClient.Configured() {
			sdks.azure = azureClient
		}
	}

	return sdks
}

// ── AWS inventory via real SDK with demo fallback ───────────────────────

type awsInventoryResult struct {
	EC2Instances []awscloud.EC2Instance `json:"ec2_instances,omitempty"`
	S3Buckets    []awscloud.S3Bucket    `json:"s3_buckets,omitempty"`
	RDSInstances []awscloud.RDSInstance `json:"rds_instances,omitempty"`
	EKSClusters  []awscloud.EKSCluster  `json:"eks_clusters,omitempty"`
	Total        int                    `json:"total"`
}

func (c *cloudSDKs) fetchAWSInventory(ctx context.Context) (*awsInventoryResult, error) {
	result := &awsInventoryResult{}

	if c.aws == nil {
		return result, nil
	}

	instances, err := c.aws.ListEC2Instances(ctx)
	if err != nil {
		return nil, fmt.Errorf("aws ec2: %w", err)
	}
	result.EC2Instances = instances
	result.Total += len(instances)

	buckets, err := c.aws.ListS3Buckets(ctx)
	if err != nil {
		return nil, fmt.Errorf("aws s3: %w", err)
	}
	result.S3Buckets = buckets
	result.Total += len(buckets)

	rdsInstances, err := c.aws.ListRDSInstances(ctx)
	if err != nil {
		return nil, fmt.Errorf("aws rds: %w", err)
	}
	result.RDSInstances = rdsInstances
	result.Total += len(rdsInstances)

	clusters, err := c.aws.ListEKSClusters(ctx)
	if err != nil {
		return nil, fmt.Errorf("aws eks: %w", err)
	}
	result.EKSClusters = clusters
	result.Total += len(clusters)

	return result, nil
}

// ── GCP inventory via real SDK with demo fallback ───────────────────────

type gcpInventoryResult struct {
	GCEInstances []gcpcloud.GCEInstance `json:"gce_instances,omitempty"`
	GCSBuckets   []gcpcloud.GCSBucket   `json:"gcs_buckets,omitempty"`
	GKEClusters  []gcpcloud.GKECluster  `json:"gke_clusters,omitempty"`
	Total        int                    `json:"total"`
}

func (c *cloudSDKs) fetchGCPInventory(ctx context.Context) (*gcpInventoryResult, error) {
	result := &gcpInventoryResult{}

	if c.gcp == nil {
		return result, nil
	}

	instances, err := c.gcp.ListGCEInstances(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcp compute: %w", err)
	}
	result.GCEInstances = instances
	result.Total += len(instances)

	buckets, err := c.gcp.ListGCSBuckets(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcp storage: %w", err)
	}
	result.GCSBuckets = buckets
	result.Total += len(buckets)

	clusters, err := c.gcp.ListGKEClusters(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcp gke: %w", err)
	}
	result.GKEClusters = clusters
	result.Total += len(clusters)

	return result, nil
}

// ── Azure inventory via real SDK with demo fallback ─────────────────────

type azureInventoryResult struct {
	VMs             []azurecloud.AzureVM             `json:"virtual_machines,omitempty"`
	StorageAccounts []azurecloud.AzureStorageAccount `json:"storage_accounts,omitempty"`
	AKSClusters     []azurecloud.AKSCluster          `json:"aks_clusters,omitempty"`
	Total           int                              `json:"total"`
}

func (c *cloudSDKs) fetchAzureInventory(ctx context.Context) (*azureInventoryResult, error) {
	result := &azureInventoryResult{}

	if c.azure == nil {
		return result, nil
	}

	vms, err := c.azure.ListAzureVMs(ctx)
	if err != nil {
		return nil, fmt.Errorf("azure vm: %w", err)
	}
	result.VMs = vms
	result.Total += len(vms)

	storage, err := c.azure.ListAzureStorageAccounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("azure storage: %w", err)
	}
	result.StorageAccounts = storage
	result.Total += len(storage)

	clusters, err := c.azure.ListAKSClusters(ctx)
	if err != nil {
		return nil, fmt.Errorf("azure aks: %w", err)
	}
	result.AKSClusters = clusters
	result.Total += len(clusters)

	return result, nil
}
