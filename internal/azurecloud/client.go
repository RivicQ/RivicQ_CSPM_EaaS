package azurecloud

import (
	"context"
	"fmt"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/compute/armcompute/v6"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerservice/armcontainerservice/v6"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storage/armstorage"
)

type Client struct {
	subscriptionID string
	configured     bool

	cred      *azidentity.DefaultAzureCredential
	vmClient  *armcompute.VirtualMachinesClient
	aksClient *armcontainerservice.ManagedClustersClient
	saClient  *armstorage.AccountsClient
}

func NewClient(subscriptionID string) (*Client, error) {
	if subscriptionID == "" {
		return nil, fmt.Errorf("azure subscription id is required")
	}

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("azure credential: %w", err)
	}

	vmClient, err := armcompute.NewVirtualMachinesClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("azure compute client: %w", err)
	}

	aksClient, err := armcontainerservice.NewManagedClustersClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("azure aks client: %w", err)
	}

	saClient, err := armstorage.NewAccountsClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("azure storage client: %w", err)
	}

	return &Client{
		subscriptionID: subscriptionID,
		configured:     true,
		cred:           cred,
		vmClient:       vmClient,
		aksClient:      aksClient,
		saClient:       saClient,
	}, nil
}

func (c *Client) Configured() bool {
	return c != nil && c.configured
}

type AzureVM struct {
	Name              string            `json:"name"`
	ResourceGroup     string            `json:"resource_group"`
	Location          string            `json:"location"`
	VMSize            string            `json:"vm_size"`
	Status            string            `json:"status"`
	PrivateIP         string            `json:"private_ip"`
	PublicIP          string            `json:"public_ip"`
	VNetName          string            `json:"vnet_name"`
	SubnetName        string            `json:"subnet_name"`
	OSType            string            `json:"os_type"`
	OSDiskSizeGB      int32             `json:"os_disk_size_gb"`
	DataDiskCount     int32             `json:"data_disk_count"`
	ManagedDisks      bool              `json:"managed_disks"`
	AcceleratedNet    bool              `json:"accelerated_networking"`
	Tags              map[string]string `json:"tags"`
	CreatedAt         time.Time         `json:"created_at"`
	AvailabilityZones []string          `json:"availability_zones"`
}

func (c *Client) ListAzureVMs(ctx context.Context) ([]AzureVM, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("azure not configured")
	}

	var allVMs []AzureVM

	pager := c.vmClient.NewListAllPager(&armcompute.VirtualMachinesClientListAllOptions{})
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("azure list vms: %w", err)
		}

		for _, vm := range page.Value {
			azureVM := c.mapAzureVM(vm)
			allVMs = append(allVMs, azureVM)
		}
	}

	return allVMs, nil
}

func (c *Client) mapAzureVM(vm *armcompute.VirtualMachine) AzureVM {
	tags := make(map[string]string)
	for k, v := range vm.Tags {
		tags[k] = *v
	}

	vmSize := ""
	acceleratedNet := false
	if vm.Properties != nil && vm.Properties.HardwareProfile != nil && vm.Properties.HardwareProfile.VMSize != nil {
		vmSize = string(*vm.Properties.HardwareProfile.VMSize)
	}
	if vm.Properties != nil && vm.Properties.NetworkProfile != nil && vm.Properties.NetworkProfile.NetworkInterfaceConfigurations != nil {
		for _, nic := range vm.Properties.NetworkProfile.NetworkInterfaceConfigurations {
			if nic.Properties != nil && nic.Properties.EnableAcceleratedNetworking != nil && *nic.Properties.EnableAcceleratedNetworking {
				acceleratedNet = true
				break
			}
		}
	}

	privateIP, publicIP, vnet, subnet := c.extractVMNetworking(vm)

	osType := ""
	osDiskSizeGB := int32(0)
	if vm.Properties != nil && vm.Properties.StorageProfile != nil {
		if vm.Properties.StorageProfile.OSDisk != nil {
			if vm.Properties.StorageProfile.OSDisk.OSType != nil {
				osType = string(*vm.Properties.StorageProfile.OSDisk.OSType)
			}
			if vm.Properties.StorageProfile.OSDisk.DiskSizeGB != nil {
				osDiskSizeGB = *vm.Properties.StorageProfile.OSDisk.DiskSizeGB
			}
		}
	}

	dataDiskCount := int32(0)
	managedDisks := true
	if vm.Properties != nil && vm.Properties.StorageProfile != nil {
		if vm.Properties.StorageProfile.DataDisks != nil {
			dataDiskCount = int32(len(vm.Properties.StorageProfile.DataDisks))
		}
		if vm.Properties.StorageProfile.OSDisk != nil && vm.Properties.StorageProfile.OSDisk.ManagedDisk == nil {
			managedDisks = false
		}
	}

	var zones []string
	if vm.Zones != nil {
		for _, z := range vm.Zones {
			if z != nil {
				zones = append(zones, *z)
			}
		}
	}

	status := "unknown"
	if vm.Properties != nil && vm.Properties.ProvisioningState != nil {
		status = *vm.Properties.ProvisioningState
	}

	return AzureVM{
		Name:              *vm.Name,
		ResourceGroup:     c.extractResourceGroup(*vm.ID),
		Location:          *vm.Location,
		VMSize:            vmSize,
		Status:            status,
		PrivateIP:         privateIP,
		PublicIP:          publicIP,
		VNetName:          vnet,
		SubnetName:        subnet,
		OSType:            osType,
		OSDiskSizeGB:      osDiskSizeGB,
		DataDiskCount:     dataDiskCount,
		ManagedDisks:      managedDisks,
		AcceleratedNet:    acceleratedNet,
		Tags:              tags,
		CreatedAt:         time.Time{},
		AvailabilityZones: zones,
	}
}

func (c *Client) extractResourceGroup(id string) string {
	parts := splitPath(id)
	for i, p := range parts {
		if p == "resourceGroups" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}

func (c *Client) extractVMNetworking(vm *armcompute.VirtualMachine) (privateIP, publicIP, vnet, subnet string) {
	if vm.Properties == nil || vm.Properties.NetworkProfile == nil {
		return
	}

	for _, nicRef := range vm.Properties.NetworkProfile.NetworkInterfaces {
		if nicRef.Properties == nil {
			continue
		}
		if nicRef.ID == nil {
			continue
		}
		subnetParts := splitPath(*nicRef.ID)
		for i, p := range subnetParts {
			if p == "virtualNetworks" && i+1 < len(subnetParts) && vnet == "" {
				vnet = subnetParts[i+1]
			}
			if p == "subnets" && i+1 < len(subnetParts) && subnet == "" {
				subnet = subnetParts[i+1]
			}
		}
	}
	return
}

func splitPath(s string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '/' {
			if i > start {
				parts = append(parts, s[start:i])
			}
			start = i + 1
		}
	}
	if start < len(s) {
		parts = append(parts, s[start:])
	}
	return parts
}

type AzureStorageAccount struct {
	Name              string            `json:"name"`
	ResourceGroup     string            `json:"resource_group"`
	Location          string            `json:"location"`
	Kind              string            `json:"kind"`
	SKU               string            `json:"sku"`
	Status            string            `json:"status"`
	Encryption        bool              `json:"encryption"`
	HTTPSOnly         bool              `json:"https_only"`
	MinimumTLSVersion string            `json:"minimum_tls_version"`
	Tags              map[string]string `json:"tags"`
	CreatedAt         time.Time         `json:"created_at"`
	BlobCount         int64             `json:"blob_count,omitempty"`
}

func (c *Client) ListAzureStorageAccounts(ctx context.Context) ([]AzureStorageAccount, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("azure not configured")
	}

	var accounts []AzureStorageAccount

	pager := c.saClient.NewListPager(&armstorage.AccountsClientListOptions{})
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("azure list storage accounts: %w", err)
		}

		for _, sa := range page.Value {
			account := c.mapStorageAccount(sa)
			accounts = append(accounts, account)
		}
	}

	return accounts, nil
}

func (c *Client) mapStorageAccount(sa *armstorage.Account) AzureStorageAccount {
	tags := make(map[string]string)
	for k, v := range sa.Tags {
		tags[k] = *v
	}

	sku := ""
	if sa.SKU != nil && sa.SKU.Name != nil {
		sku = string(*sa.SKU.Name)
	}

	kind := ""
	if sa.Kind != nil {
		kind = string(*sa.Kind)
	}

	encryption := false
	httpsOnly := false
	minTLS := ""
	if sa.Properties != nil {
		encryption = sa.Properties.Encryption != nil
		if sa.Properties.EnableHTTPSTrafficOnly != nil {
			httpsOnly = *sa.Properties.EnableHTTPSTrafficOnly
		}
		if sa.Properties.MinimumTLSVersion != nil {
			minTLS = string(*sa.Properties.MinimumTLSVersion)
		}
	}

	return AzureStorageAccount{
		Name:              *sa.Name,
		ResourceGroup:     c.extractResourceGroup(*sa.ID),
		Location:          *sa.Location,
		Kind:              kind,
		SKU:               sku,
		Status:            "available",
		Encryption:        encryption,
		HTTPSOnly:         httpsOnly,
		MinimumTLSVersion: minTLS,
		Tags:              tags,
		CreatedAt:         time.Time{},
	}
}

type AKSCluster struct {
	Name              string            `json:"name"`
	ResourceGroup     string            `json:"resource_group"`
	Location          string            `json:"location"`
	Status            string            `json:"status"`
	Version           string            `json:"version"`
	DNSPrefix         string            `json:"dns_prefix"`
	FQDN              string            `json:"fqdn"`
	NodeCount         int32             `json:"node_count"`
	VMSize            string            `json:"vm_size"`
	NetworkPlugin     string            `json:"network_plugin"`
	PrivateCluster    bool              `json:"private_cluster"`
	RBACEnabled       bool              `json:"rbac_enabled"`
	Tags              map[string]string `json:"tags"`
	CreatedAt         time.Time         `json:"created_at"`
}

func (c *Client) ListAKSClusters(ctx context.Context) ([]AKSCluster, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("azure not configured")
	}

	var clusters []AKSCluster

	pager := c.aksClient.NewListPager(&armcontainerservice.ManagedClustersClientListOptions{})
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("azure list aks clusters: %w", err)
		}

		for _, cluster := range page.Value {
			aks := c.mapAKSCluster(cluster)
			clusters = append(clusters, aks)
		}
	}

	return clusters, nil
}

func (c *Client) mapAKSCluster(cluster *armcontainerservice.ManagedCluster) AKSCluster {
	tags := make(map[string]string)
	for k, v := range cluster.Tags {
		tags[k] = *v
	}

	version := ""
	dnsPrefix := ""
	fqdn := ""
	networkPlugin := ""
	privateCluster := false
	rbacEnabled := false
	nodeCount := int32(0)
	vmSize := ""

	if cluster.Properties != nil {
		if cluster.Properties.KubernetesVersion != nil {
			version = *cluster.Properties.KubernetesVersion
		}
		if cluster.Properties.DNSPrefix != nil {
			dnsPrefix = *cluster.Properties.DNSPrefix
		}
		if cluster.Properties.Fqdn != nil {
			fqdn = *cluster.Properties.Fqdn
		}
		if cluster.Properties.NetworkProfile != nil && cluster.Properties.NetworkProfile.NetworkPlugin != nil {
			networkPlugin = string(*cluster.Properties.NetworkProfile.NetworkPlugin)
		}
		if cluster.Properties.APIServerAccessProfile != nil && cluster.Properties.APIServerAccessProfile.EnablePrivateCluster != nil {
			privateCluster = *cluster.Properties.APIServerAccessProfile.EnablePrivateCluster
		}
		if cluster.Properties.EnableRBAC != nil {
			rbacEnabled = *cluster.Properties.EnableRBAC
		}
		if cluster.Properties.AgentPoolProfiles != nil {
			for _, pool := range cluster.Properties.AgentPoolProfiles {
				if pool.Count != nil {
					nodeCount += *pool.Count
				}
				if pool.VMSize != nil && vmSize == "" {
					vmSize = *pool.VMSize
				}
			}
		}
	}

	return AKSCluster{
		Name:           *cluster.Name,
		ResourceGroup:  c.extractResourceGroup(*cluster.ID),
		Location:       *cluster.Location,
		Status:         "running",
		Version:        version,
		DNSPrefix:      dnsPrefix,
		FQDN:           fqdn,
		NodeCount:      nodeCount,
		VMSize:         vmSize,
		NetworkPlugin:  networkPlugin,
		PrivateCluster: privateCluster,
		RBACEnabled:    rbacEnabled,
		Tags:           tags,
		CreatedAt:      time.Time{},
	}
}
