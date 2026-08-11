package gcpcloud

import (
	"context"
	"fmt"
	"os"
	"time"

	compute "cloud.google.com/go/compute/apiv1"
	"cloud.google.com/go/compute/apiv1/computepb"
	container "cloud.google.com/go/container/apiv1"
	"cloud.google.com/go/container/apiv1/containerpb"
	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type Client struct {
	projectID  string
	configured bool

	instancesClient *compute.InstancesClient
	bucketsClient   *storage.Client
	clustersClient  *container.ClusterManagerClient
}

func NewClient(ctx context.Context, projectID string) (*Client, error) {
	if projectID == "" {
		return nil, fmt.Errorf("gcp project id is required")
	}

	// Prefer explicit key file (GCP_KEY_FILE), then Application Default
	// Credentials. Unauthenticated clients are only used for emulators, never
	// by default, otherwise every real API call fails with permission errors.
	var opts []option.ClientOption
	if keyFile := os.Getenv("GCP_KEY_FILE"); keyFile != "" {
		opts = append(opts, option.WithAuthCredentialsFile(option.ServiceAccount, keyFile))
	} else if emulator := os.Getenv("STORAGE_EMULATOR_HOST"); emulator != "" {
		opts = append(opts, option.WithoutAuthentication(), option.WithEndpoint("http://"+emulator))
	}

	instancesClient, err := compute.NewInstancesRESTClient(ctx, opts...)
	if err != nil {
		// Fall back to default credentials only (no unauthenticated client).
		instancesClient, err = compute.NewInstancesRESTClient(ctx)
		if err != nil {
			return nil, fmt.Errorf("gcp compute client: %w", err)
		}
	}

	var storageClient *storage.Client
	if sc, err := storage.NewClient(ctx, opts...); err == nil {
		storageClient = sc
	}

	var clustersClient *container.ClusterManagerClient
	if cc, err := container.NewClusterManagerClient(ctx, opts...); err == nil {
		clustersClient = cc
	}

	return &Client{
		projectID:       projectID,
		configured:      true,
		instancesClient: instancesClient,
		bucketsClient:   storageClient,
		clustersClient:  clustersClient,
	}, nil
}

func (c *Client) Configured() bool {
	return c != nil && c.configured
}

type GCEInstance struct {
	Name            string            `json:"name"`
	Zone            string            `json:"zone"`
	MachineType     string            `json:"machine_type"`
	Status          string            `json:"status"`
	PrivateIP       string            `json:"private_ip"`
	PublicIP        string            `json:"public_ip"`
	Network         string            `json:"network"`
	Subnetwork      string            `json:"subnetwork"`
	Tags            map[string]string `json:"tags"`
	Labels          map[string]string `json:"labels"`
	CPUCores        int32             `json:"cpu_cores"`
	MemoryMB        int64             `json:"memory_mb"`
	DiskSizeGB      int64             `json:"disk_size_gb"`
	Confidentiality bool              `json:"confidentiality"`
	ServiceAccounts []string          `json:"service_accounts"`
	CreatedAt       time.Time         `json:"created_at"`
}

func (c *Client) ListGCEInstances(ctx context.Context) ([]GCEInstance, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("gcp not configured")
	}

	if c.instancesClient == nil {
		return nil, fmt.Errorf("gcp compute not initialized")
	}

	var allInstances []GCEInstance
	req := &computepb.AggregatedListInstancesRequest{
		Project: c.projectID,
	}

	it := c.instancesClient.AggregatedList(ctx, req)
	for {
		pair, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("gcp list instances: %w", err)
		}

		for _, inst := range pair.Value.Instances {
			instance := c.mapGCEInstance(inst, pair.Key)
			allInstances = append(allInstances, instance)
		}
	}

	return allInstances, nil
}

func (c *Client) mapGCEInstance(inst *computepb.Instance, zone string) GCEInstance {
	labels := make(map[string]string)
	for k, v := range inst.GetLabels() {
		labels[k] = v
	}

	machineType := ""
	if inst.GetMachineType() != "" {
		machineType = inst.GetMachineType()
	}

	privateIP := ""
	publicIP := ""
	network := ""
	subnetwork := ""

	for _, ni := range inst.GetNetworkInterfaces() {
		if ni.GetNetwork() != "" {
			network = ni.GetNetwork()
		}
		if ni.GetSubnetwork() != "" {
			subnetwork = ni.GetSubnetwork()
		}
		if ni.GetNetworkIP() != "" {
			privateIP = ni.GetNetworkIP()
		}
		for _, ac := range ni.GetAccessConfigs() {
			if ac.GetNatIP() != "" {
				publicIP = ac.GetNatIP()
				break
			}
		}
	}

	var sas []string
	for _, sa := range inst.GetServiceAccounts() {
		sas = append(sas, sa.GetEmail())
	}

	return GCEInstance{
		Name:            inst.GetName(),
		Zone:            zone,
		MachineType:     machineType,
		Status:          inst.GetStatus(),
		PrivateIP:       privateIP,
		PublicIP:        publicIP,
		Network:         network,
		Subnetwork:      subnetwork,
		Tags:            labels,
		Labels:          labels,
		CPUCores:        0,
		MemoryMB:        0,
		DiskSizeGB:      0,
		Confidentiality: inst.GetConfidentialInstanceConfig() != nil && inst.GetConfidentialInstanceConfig().GetEnableConfidentialCompute(),
		ServiceAccounts: sas,
		CreatedAt:       parseTime(inst.GetCreationTimestamp()),
	}
}

type GCSBucket struct {
	Name         string            `json:"name"`
	Location     string            `json:"location"`
	LocationType string            `json:"location_type"`
	StorageClass string            `json:"storage_class"`
	Versioning   bool              `json:"versioning"`
	Encryption   bool              `json:"encryption"`
	PublicAccess bool              `json:"public_access"`
	Labels       map[string]string `json:"labels"`
	CreatedAt    time.Time         `json:"created_at"`
	Project      string            `json:"project"`
}

func (c *Client) ListGCSBuckets(ctx context.Context) ([]GCSBucket, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("gcp not configured")
	}

	if c.bucketsClient == nil {
		return nil, fmt.Errorf("gcp storage not initialized")
	}

	var buckets []GCSBucket
	it := c.bucketsClient.Buckets(ctx, c.projectID)
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("gcp list buckets: %w", err)
		}

		bucket := GCSBucket{
			Name:         attrs.Name,
			Location:     attrs.Location,
			LocationType: attrs.LocationType,
			StorageClass: attrs.StorageClass,
			Versioning:   attrs.VersioningEnabled,
			Encryption:   attrs.Encryption != nil && attrs.Encryption.DefaultKMSKeyName != "",
			PublicAccess: !attrs.BucketPolicyOnly.Enabled,
			Labels:       attrs.Labels,
			CreatedAt:    attrs.Created,
			Project:      c.projectID,
		}
		buckets = append(buckets, bucket)
	}

	return buckets, nil
}

type GKECluster struct {
	Name             string            `json:"name"`
	Location         string            `json:"location"`
	Status           string            `json:"status"`
	Version          string            `json:"version"`
	Endpoint         string            `json:"endpoint"`
	Network          string            `json:"network"`
	Subnetwork       string            `json:"subnetwork"`
	NodeCount        int32             `json:"node_count"`
	Labels           map[string]string `json:"labels"`
	MasterAuthorized bool              `json:"master_authorized_networks"`
	PrivateCluster   bool              `json:"private_cluster"`
	ReleaseChannel   string            `json:"release_channel"`
	CreatedAt        time.Time         `json:"created_at"`
}

func (c *Client) ListGKEClusters(ctx context.Context) ([]GKECluster, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("gcp not configured")
	}

	if c.clustersClient == nil {
		return nil, fmt.Errorf("gcp container not initialized")
	}

	req := &containerpb.ListClustersRequest{
		Parent: fmt.Sprintf("projects/%s/locations/-", c.projectID),
	}

	resp, err := c.clustersClient.ListClusters(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("gcp list clusters: %w", err)
	}

	var clusters []GKECluster
	for _, cluster := range resp.Clusters {
		c := c.mapGKECluster(cluster)
		clusters = append(clusters, c)
	}

	return clusters, nil
}

func (c *Client) mapGKECluster(cluster *containerpb.Cluster) GKECluster {
	labels := make(map[string]string)
	for k, v := range cluster.GetResourceLabels() {
		labels[k] = v
	}

	releaseChannel := ""
	if cluster.GetReleaseChannel() != nil {
		releaseChannel = cluster.GetReleaseChannel().GetChannel().String()
	}

	nodeCount := int32(0)
	for _, np := range cluster.GetNodePools() {
		nodeCount += np.GetInitialNodeCount()
	}

	return GKECluster{
		Name:             cluster.GetName(),
		Location:         cluster.GetLocation(),
		Status:           cluster.GetStatus().String(),
		Version:          cluster.GetCurrentMasterVersion(),
		Endpoint:         cluster.GetEndpoint(),
		Network:          cluster.GetNetwork(),
		Subnetwork:       cluster.GetSubnetwork(),
		NodeCount:        nodeCount,
		Labels:           labels,
		MasterAuthorized: cluster.GetControlPlaneEndpointsConfig().GetIpEndpointsConfig().GetAuthorizedNetworksConfig().GetEnabled(),
		PrivateCluster:   cluster.GetControlPlaneEndpointsConfig().GetIpEndpointsConfig().GetPrivateEndpoint() != "",
		ReleaseChannel:   releaseChannel,
		CreatedAt:        parseTime(cluster.GetCreateTime()),
	}
}

func (c *Client) Close() error {
	if c.instancesClient != nil {
		_ = c.instancesClient.Close()
	}
	if c.bucketsClient != nil {
		_ = c.bucketsClient.Close()
	}
	if c.clustersClient != nil {
		_ = c.clustersClient.Close()
	}
	return nil
}

func parseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05.999-07:00", s)
		if err != nil {
			return time.Time{}
		}
	}
	return t
}
