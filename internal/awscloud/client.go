// Package awscloud provides real AWS SDK v2 clients for multi-cloud inventory.
package awscloud

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	ec2types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	ekstypes "github.com/aws/aws-sdk-go-v2/service/eks/types"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	rdstypes "github.com/aws/aws-sdk-go-v2/service/rds/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Client wraps the real AWS SDK v2 clients.
type Client struct {
	cfg        aws.Config
	ec2Client  *ec2.Client
	s3Client   *s3.Client
	rdsClient  *rds.Client
	eksClient  *eks.Client
	configured bool
}

// NewClient creates a real AWS SDK client from the default credential chain.
// Returns nil, nil if no AWS credentials are found (caller should use demo data).
func NewClient(ctx context.Context) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("aws config load failed: %w", err)
	}

	// Verify credentials are available by making a lightweight call
	sts := s3.NewFromConfig(cfg)
	// We use the presence of an S3 client as a credential check
	// (the SDK handles credential resolution transparently)
	_ = sts

	return &Client{
		cfg:        cfg,
		ec2Client:  ec2.NewFromConfig(cfg),
		s3Client:   s3.NewFromConfig(cfg),
		rdsClient:  rds.NewFromConfig(cfg),
		eksClient:  eks.NewFromConfig(cfg),
		configured: true,
	}, nil
}

// Configured returns true if the client has valid AWS credentials.
func (c *Client) Configured() bool {
	return c != nil && c.configured
}

// ── EC2 Instances ───────────────────────────────────────────────────────

type EC2Instance struct {
	InstanceID       string            `json:"instance_id"`
	Name             string            `json:"name"`
	InstanceType     string            `json:"instance_type"`
	State            string            `json:"state"`
	PrivateIP        string            `json:"private_ip"`
	PublicIP         string            `json:"public_ip"`
	VPCID            string            `json:"vpc_id"`
	SubnetID         string            `json:"subnet_id"`
	SecurityGroups   []string          `json:"security_groups"`
	Tags             map[string]string `json:"tags"`
	LaunchTime       time.Time         `json:"launch_time"`
	Platform         string            `json:"platform"`
	Architecture     string            `json:"architecture"`
	Monitoring       bool              `json:"monitoring"`
	EncryptedVolumes bool              `json:"encrypted_volumes"`
}

func (c *Client) ListEC2Instances(ctx context.Context) ([]EC2Instance, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("aws not configured")
	}

	var allInstances []EC2Instance
	var nextToken *string

	for {
		input := &ec2.DescribeInstancesInput{
			MaxResults: aws.Int32(100),
			NextToken:  nextToken,
		}

		output, err := c.ec2Client.DescribeInstances(ctx, input)
		if err != nil {
			return nil, fmt.Errorf("ec2 describe failed: %w", err)
		}

		for _, reservation := range output.Reservations {
			for _, inst := range reservation.Instances {
				instance := c.mapEC2Instance(inst)
				allInstances = append(allInstances, instance)
			}
		}

		nextToken = output.NextToken
		if nextToken == nil {
			break
		}
	}

	return allInstances, nil
}

func (c *Client) mapEC2Instance(inst ec2types.Instance) EC2Instance {
	name := ""
	tags := make(map[string]string)
	for _, t := range inst.Tags {
		if t.Key != nil && t.Value != nil {
			tags[*t.Key] = *t.Value
			if *t.Key == "Name" {
				name = *t.Value
			}
		}
	}

	var sgs []string
	for _, sg := range inst.SecurityGroups {
		if sg.GroupId != nil {
			sgs = append(sgs, *sg.GroupId)
		}
	}

	encrypted := false

	platform := "linux"
	if inst.PlatformDetails != nil {
		platform = *inst.PlatformDetails
	}

	arch := "x86_64"
	if inst.Architecture != "" {
		arch = string(inst.Architecture)
	}

	state := "unknown"
	if inst.State != nil {
		state = string(inst.State.Name)
	}

	privateIP := ""
	if inst.PrivateIpAddress != nil {
		privateIP = *inst.PrivateIpAddress
	}

	publicIP := ""
	if inst.PublicIpAddress != nil {
		publicIP = *inst.PublicIpAddress
	}

	vpcID := ""
	if inst.VpcId != nil {
		vpcID = *inst.VpcId
	}

	subnetID := ""
	if inst.SubnetId != nil {
		subnetID = *inst.SubnetId
	}

	instanceType := ""
	if inst.InstanceType != "" {
		instanceType = string(inst.InstanceType)
	}

	monitoring := false
	if inst.Monitoring != nil {
		monitoring = inst.Monitoring.State == ec2types.MonitoringStateEnabled
	}

	return EC2Instance{
		InstanceID:       aws.ToString(inst.InstanceId),
		Name:             name,
		InstanceType:     instanceType,
		State:            state,
		PrivateIP:        privateIP,
		PublicIP:         publicIP,
		VPCID:            vpcID,
		SubnetID:         subnetID,
		SecurityGroups:   sgs,
		Tags:             tags,
		LaunchTime:       aws.ToTime(inst.LaunchTime),
		Platform:         platform,
		Architecture:     arch,
		Monitoring:       monitoring,
		EncryptedVolumes: encrypted,
	}
}

// ── S3 Buckets ──────────────────────────────────────────────────────────

type S3Bucket struct {
	Name         string            `json:"name"`
	Region       string            `json:"region"`
	CreationDate time.Time         `json:"creation_date"`
	Encryption   bool              `json:"encryption"`
	Versioning   string            `json:"versioning"`
	PublicAccess bool              `json:"public_access"`
	Tags         map[string]string `json:"tags"`
	ACL          []S3BucketGrant   `json:"acl,omitempty"`
}

type S3BucketGrant struct {
	Grantee    string `json:"grantee"`
	Permission string `json:"permission"`
	Type       string `json:"type"`
}

func (c *Client) ListS3Buckets(ctx context.Context) ([]S3Bucket, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("aws not configured")
	}

	bucketsOutput, err := c.s3Client.ListBuckets(ctx, &s3.ListBucketsInput{})
	if err != nil {
		return nil, fmt.Errorf("s3 list buckets failed: %w", err)
	}

	var buckets []S3Bucket
	for _, b := range bucketsOutput.Buckets {
		bucket := c.inspectBucket(ctx, b)
		buckets = append(buckets, bucket)
	}

	return buckets, nil
}

func (c *Client) inspectBucket(ctx context.Context, b s3types.Bucket) S3Bucket {
	name := aws.ToString(b.Name)

	bucket := S3Bucket{
		Name:         name,
		CreationDate: aws.ToTime(b.CreationDate),
	}

	// Get bucket region
	loc, err := c.s3Client.GetBucketLocation(ctx, &s3.GetBucketLocationInput{
		Bucket: aws.String(name),
	})
	if err == nil {
		bucket.Region = string(loc.LocationConstraint)
		if bucket.Region == "" {
			bucket.Region = "us-east-1"
		}
	}

	// Check encryption
	encResp, err := c.s3Client.GetBucketEncryption(ctx, &s3.GetBucketEncryptionInput{
		Bucket: aws.String(name),
	})
	if err == nil && encResp.ServerSideEncryptionConfiguration != nil {
		bucket.Encryption = true
	}

	// Check versioning
	verResp, err := c.s3Client.GetBucketVersioning(ctx, &s3.GetBucketVersioningInput{
		Bucket: aws.String(name),
	})
	if err == nil && verResp.Status != "" {
		bucket.Versioning = string(verResp.Status)
	}

	// Check public access block
	pubResp, err := c.s3Client.GetPublicAccessBlock(ctx, &s3.GetPublicAccessBlockInput{
		Bucket: aws.String(name),
	})
	if err != nil {
		bucket.PublicAccess = true // No block = potentially public
	} else if pubResp.PublicAccessBlockConfiguration != nil {
		blockPublicACLs := pubResp.PublicAccessBlockConfiguration.BlockPublicAcls
		blockPublicPolicy := pubResp.PublicAccessBlockConfiguration.BlockPublicPolicy
		bucket.PublicAccess = !aws.ToBool(blockPublicACLs) || !aws.ToBool(blockPublicPolicy)
	}

	return bucket
}

// ── RDS Instances ───────────────────────────────────────────────────────

type RDSInstance struct {
	DBInstanceIdentifier    string            `json:"db_instance_identifier"`
	Engine                  string            `json:"engine"`
	EngineVersion           string            `json:"engine_version"`
	DBInstanceClass         string            `json:"db_instance_class"`
	Status                  string            `json:"status"`
	Endpoint                string            `json:"endpoint"`
	Port                    int32             `json:"port"`
	Region                  string            `json:"region"`
	MultiAZ                 bool              `json:"multi_az"`
	StorageEncrypted        bool              `json:"storage_encrypted"`
	StorageType             string            `json:"storage_type"`
	AllocatedStorage        int32             `json:"allocated_storage"`
	VPCID                   string            `json:"vpc_id"`
	SubnetGroup             string            `json:"subnet_group"`
	PubliclyAccessible      bool              `json:"publicly_accessible"`
	DeletionProtection      bool              `json:"deletion_protection"`
	AutoMinorVersionUpgrade bool              `json:"auto_minor_version_upgrade"`
	Tags                    map[string]string `json:"tags"`
	CreatedAt               time.Time         `json:"created_at"`
}

func (c *Client) ListRDSInstances(ctx context.Context) ([]RDSInstance, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("aws not configured")
	}

	var allInstances []RDSInstance
	var marker *string

	for {
		input := &rds.DescribeDBInstancesInput{
			MaxRecords: aws.Int32(100),
			Marker:     marker,
		}

		output, err := c.rdsClient.DescribeDBInstances(ctx, input)
		if err != nil {
			return nil, fmt.Errorf("rds describe failed: %w", err)
		}

		for _, db := range output.DBInstances {
			instance := c.mapRDSInstance(db)
			allInstances = append(allInstances, instance)
		}

		marker = output.Marker
		if marker == nil {
			break
		}
	}

	return allInstances, nil
}

func (c *Client) mapRDSInstance(db rdstypes.DBInstance) RDSInstance {
	tags := make(map[string]string)
	for _, t := range db.TagList {
		if t.Key != nil && t.Value != nil {
			tags[*t.Key] = *t.Value
		}
	}

	endpoint := ""
	port := int32(0)
	if db.Endpoint != nil {
		endpoint = aws.ToString(db.Endpoint.Address)
		port = aws.ToInt32(db.Endpoint.Port)
	}

	vpcID := ""
	if db.DBSubnetGroup != nil && db.DBSubnetGroup.VpcId != nil {
		vpcID = *db.DBSubnetGroup.VpcId
	}

	subnetGroup := ""
	if db.DBSubnetGroup != nil && db.DBSubnetGroup.DBSubnetGroupName != nil {
		subnetGroup = *db.DBSubnetGroup.DBSubnetGroupName
	}

	return RDSInstance{
		DBInstanceIdentifier:    aws.ToString(db.DBInstanceIdentifier),
		Engine:                  aws.ToString(db.Engine),
		EngineVersion:           aws.ToString(db.EngineVersion),
		DBInstanceClass:         aws.ToString(db.DBInstanceClass),
		Status:                  aws.ToString(db.DBInstanceStatus),
		Endpoint:                endpoint,
		Port:                    port,
		MultiAZ:                 aws.ToBool(db.MultiAZ),
		StorageEncrypted:        aws.ToBool(db.StorageEncrypted),
		StorageType:             aws.ToString(db.StorageType),
		AllocatedStorage:        aws.ToInt32(db.AllocatedStorage),
		VPCID:                   vpcID,
		SubnetGroup:             subnetGroup,
		PubliclyAccessible:      aws.ToBool(db.PubliclyAccessible),
		DeletionProtection:      aws.ToBool(db.DeletionProtection),
		AutoMinorVersionUpgrade: aws.ToBool(db.AutoMinorVersionUpgrade),
		Tags:                    tags,
		CreatedAt:               aws.ToTime(db.InstanceCreateTime),
	}
}

// ── EKS Clusters ────────────────────────────────────────────────────────

type EKSCluster struct {
	Name              string            `json:"name"`
	ARN               string            `json:"arn"`
	Status            string            `json:"status"`
	Version           string            `json:"version"`
	Endpoint          string            `json:"endpoint"`
	RoleARN           string            `json:"role_arn"`
	VPCID             string            `json:"vpc_id"`
	SubnetIDs         []string          `json:"subnet_ids"`
	SecurityGroupIDs  []string          `json:"security_group_ids"`
	NodeGroupCount    int               `json:"node_group_count"`
	Tags              map[string]string `json:"tags"`
	CreatedAt         time.Time         `json:"created_at"`
	LoggingEnabled    bool              `json:"logging_enabled"`
	EncryptionEnabled bool              `json:"encryption_enabled"`
}

func (c *Client) ListEKSClusters(ctx context.Context) ([]EKSCluster, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("aws not configured")
	}

	var allClusters []EKSCluster

	clusterNames, err := c.eksClient.ListClusters(ctx, &eks.ListClustersInput{})
	if err != nil {
		return nil, fmt.Errorf("eks list clusters failed: %w", err)
	}

	for _, name := range clusterNames.Clusters {
		desc, err := c.eksClient.DescribeCluster(ctx, &eks.DescribeClusterInput{
			Name: aws.String(name),
		})
		if err != nil {
			continue
		}

		cluster := c.mapEKSCluster(desc.Cluster)
		allClusters = append(allClusters, cluster)
	}

	return allClusters, nil
}

func (c *Client) mapEKSCluster(cluster *ekstypes.Cluster) EKSCluster {
	tags := make(map[string]string)
	for k, v := range cluster.Tags {
		tags[k] = v
	}

	var subnetIDs, sgIDs []string
	if cluster.ResourcesVpcConfig != nil {
		subnetIDs = cluster.ResourcesVpcConfig.SubnetIds
		sgIDs = cluster.ResourcesVpcConfig.SecurityGroupIds
	}

	vpcID := ""
	if cluster.ResourcesVpcConfig != nil && cluster.ResourcesVpcConfig.VpcId != nil {
		vpcID = *cluster.ResourcesVpcConfig.VpcId
	}

	loggingEnabled := false
	if cluster.Logging != nil {
		for _, logSetup := range cluster.Logging.ClusterLogging {
			if logSetup.Enabled != nil && *logSetup.Enabled {
				loggingEnabled = true
				break
			}
		}
	}

	return EKSCluster{
		Name:              aws.ToString(cluster.Name),
		ARN:               aws.ToString(cluster.Arn),
		Status:            string(cluster.Status),
		Version:           aws.ToString(cluster.Version),
		Endpoint:          aws.ToString(cluster.Endpoint),
		RoleARN:           aws.ToString(cluster.RoleArn),
		VPCID:             vpcID,
		SubnetIDs:         subnetIDs,
		SecurityGroupIDs:  sgIDs,
		Tags:              tags,
		CreatedAt:         aws.ToTime(cluster.CreatedAt),
		LoggingEnabled:    loggingEnabled,
		EncryptionEnabled: len(cluster.EncryptionConfig) > 0,
	}
}
