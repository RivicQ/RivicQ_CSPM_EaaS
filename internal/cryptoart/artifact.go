// Package cryptoart defines the vendor-neutral cryptographic artifact and
// relationship model shared by every RivicQ domain profile (embedded, telecom,
// identity, automotive, industrial, cloud).
//
// It is the single provenance-bearing object graph consumed by CBOM, PQC and
// NEXUS. It does not replace discovery.ScanResult, intelligence.Finding or
// bom.Unified; those adapt into it. No secrets, private keys or SIM/SE secret
// material are ever represented here — only metadata and evidence.
package cryptoart

import (
	"sort"
	"strings"
	"time"
)

// Kind is the type of a cryptographic artifact.
type Kind string

const (
	KindAlgorithm    Kind = "algorithm"
	KindKey          Kind = "key"
	KindCertificate  Kind = "certificate"
	KindCertChain    Kind = "certificate_chain"
	KindCryptoLib    Kind = "crypto_library"
	KindCryptoAPI    Kind = "crypto_api"
	KindProtocol     Kind = "protocol"
	KindIdentity     Kind = "identity"
	KindDevice       Kind = "device"
	KindFirmware     Kind = "firmware"
	KindHardware     Kind = "hardware"
	KindApplication  Kind = "application"
	KindCloudService Kind = "cloud_service"
	KindNetwork      Kind = "network"
	KindPKI          Kind = "pki"
	KindHSM          Kind = "hsm"
	KindSecureElem   Kind = "secure_element"
	KindSIM          Kind = "sim"
)

// Object is one provenance-bearing cryptographic artifact. The field set matches
// the mandated minimum contract from the partner specification (§9).
type Object struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenant_id,omitempty"`
	Type        Kind              `json:"type"`
	Name        string            `json:"name"`
	Version     string            `json:"version,omitempty"`
	Source      string            `json:"source"`
	Location    string            `json:"location,omitempty"`
	AssetID     string            `json:"asset_id,omitempty"`
	ComponentID string            `json:"component_id,omitempty"`
	Confidence  float64           `json:"confidence"`
	Evidence    []string          `json:"evidence,omitempty"`
	Risk        string            `json:"risk,omitempty"`
	QuantumRisk string            `json:"quantum_risk,omitempty"`
	PQCStatus   string            `json:"pqc_status,omitempty"`
	Timestamp   time.Time         `json:"timestamp"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// RelationType is a directed cryptographic dependency edge.
type RelationType string

const (
	RelUses       RelationType = "uses"
	RelImplements RelationType = "implements"
	RelIssuedBy   RelationType = "issued_by"
	RelBelongsTo  RelationType = "belongs_to"
	RelContains   RelationType = "contains"
	RelConnectsTo RelationType = "connects_to"
	RelServes     RelationType = "serves"
	RelDependsOn  RelationType = "depends_on"
)

// Relation is a directed edge between two objects.
type Relation struct {
	From     string       `json:"from"`
	To       string       `json:"to"`
	Type     RelationType `json:"type"`
	Evidence string       `json:"evidence,omitempty"`
}

// Graph is an ordered, de-duplicated artifact graph.
type Graph struct {
	Objects   []Object   `json:"objects"`
	Relations []Relation `json:"relations"`
	index     map[string]int
	edges     map[string]struct{}
}

// NewGraph returns an empty graph.
func NewGraph() *Graph {
	return &Graph{
		index: map[string]int{},
		edges: map[string]struct{}{},
	}
}

// Len returns the number of objects.
func (g *Graph) Len() int {
	if g == nil {
		return 0
	}
	return len(g.Objects)
}

// Add inserts or updates an object by ID. Empty IDs are ignored.
func (g *Graph) Add(obj Object) {
	if g == nil || strings.TrimSpace(obj.ID) == "" {
		return
	}
	if g.index == nil {
		g.index = map[string]int{}
	}
	if i, ok := g.index[obj.ID]; ok {
		g.Objects[i] = obj
		return
	}
	g.index[obj.ID] = len(g.Objects)
	g.Objects = append(g.Objects, obj)
}

// Get returns the object with the given ID.
func (g *Graph) Get(id string) (Object, bool) {
	if g == nil {
		return Object{}, false
	}
	i, ok := g.index[id]
	if !ok {
		return Object{}, false
	}
	return g.Objects[i], true
}

// Relate adds a directed edge if both endpoints exist and the edge is new.
func (g *Graph) Relate(from, to string, t RelationType, evidence string) {
	if g == nil || from == "" || to == "" || from == to {
		return
	}
	if _, ok := g.index[from]; !ok {
		return
	}
	if _, ok := g.index[to]; !ok {
		return
	}
	if g.edges == nil {
		g.edges = map[string]struct{}{}
	}
	key := string(t) + "\x00" + from + "\x00" + to
	if _, ok := g.edges[key]; ok {
		return
	}
	g.edges[key] = struct{}{}
	g.Relations = append(g.Relations, Relation{From: from, To: to, Type: t, Evidence: evidence})
}

// Merge copies all objects and relations from other into g (deduplicated).
func (g *Graph) Merge(other *Graph) {
	if g == nil || other == nil {
		return
	}
	for _, o := range other.Objects {
		g.Add(o)
	}
	for _, r := range other.Relations {
		g.Relate(r.From, r.To, r.Type, r.Evidence)
	}
}

// Filters narrows a graph for a partner view (Embedded, Identity, Device→Cloud,
// PQC impact) without a second graph engine.
type Filters struct {
	Kinds       []Kind
	MinRisk     string
	QuantumOnly bool
	PQCStatus   []string
	Source      string
}

var riskOrder = map[string]int{"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

// View returns a subgraph containing only objects matching the filters and the
// relations whose endpoints are both retained.
func (g *Graph) View(f Filters) *Graph {
	if g == nil {
		return NewGraph()
	}
	out := NewGraph()
	kindSet := map[Kind]bool{}
	for _, k := range f.Kinds {
		kindSet[k] = true
	}
	pqcSet := map[string]bool{}
	for _, s := range f.PQCStatus {
		pqcSet[s] = true
	}
	minRisk := 0
	if f.MinRisk != "" {
		minRisk = riskOrder[strings.ToUpper(f.MinRisk)]
	}
	for _, o := range g.Objects {
		if len(kindSet) > 0 && !kindSet[o.Type] {
			continue
		}
		if f.Source != "" && o.Source != f.Source {
			continue
		}
		if f.QuantumOnly && strings.ToUpper(o.QuantumRisk) == "" {
			continue
		}
		if minRisk > 0 && riskOrder[strings.ToUpper(o.Risk)] < minRisk {
			continue
		}
		if len(pqcSet) > 0 && !pqcSet[o.PQCStatus] {
			continue
		}
		out.Add(o)
	}
	for _, r := range g.Relations {
		out.Relate(r.From, r.To, r.Type, r.Evidence)
	}
	return out
}

// SortedObjects returns objects ordered by type then name for deterministic output.
func (g *Graph) SortedObjects() []Object {
	if g == nil {
		return nil
	}
	out := make([]Object, len(g.Objects))
	copy(out, g.Objects)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Type != out[j].Type {
			return out[i].Type < out[j].Type
		}
		return out[i].Name < out[j].Name
	})
	return out
}
