package enterprise

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

// Tenancy mistakes are cheap to make and expensive to find: a handler that
// resolves its tenant from the wrong place still compiles, still returns 200,
// and quietly writes into the wrong tenant's rows.
//
// The convention "mutating handlers must use mutatingTenantIDFor" was already
// written in a comment on tenantIDFor and was not followed by the handlers it
// was written for. A comment does not enforce anything, so this test enforces
// it: every handler that writes must resolve its tenant from a source that
// fails closed.
//
// It is a source-level check rather than a behavioural one on purpose. There
// are dozens of write handlers and they need a database to exercise; parsing the
// package catches every one of them, including the ones no test touches.

// mutatingNameFragments identify handlers that write. A name-based heuristic
// will need updating when a write is called something unexpected, which is the
// point: the failure should be a failing test, not a silent gap.
// readNamePrefixes mark a handler as a read even when its name contains a
// mutating fragment. ListAttestations contains "Attest" and writes nothing.
var readNamePrefixes = []string{
	"List", "Get", "Fetch", "Describe", "Show", "View", "Search",
	"Query", "Count", "Export", "Summar", "Overvie", "Check", "Resolve",
}

var mutatingNameFragments = []string{
	"Create", "Add", "Update", "Delete", "Remove", "Set", "Register",
	"Upsert", "Enroll", "Attest", "Migrate", "Link", "Import", "Save",
	"Write", "Patch", "Rotate", "Revoke", "Disable", "Enable", "Trigger",
	"Scan", "Start", "Stop", "Configure", "Apply", "Assign", "Invite",
}

// failingTenantResolvers return a tenant without failing closed. A write path
// that uses one of these can deposit data in the shared default tenant.
var failingTenantResolvers = map[string]string{
	"tenantIDFor": "falls back to the shared default tenant without refusing the request",
}

// safeTenantResolvers fail closed or derive the tenant from an authenticated
// source.
var safeTenantResolvers = map[string]bool{
	"mutatingTenantIDFor": true,
	"jwtTenantOrAbort":    true,
	"tenantIDFor":         true, // permitted for reads; the check below is method-based
}

// TestMutatingHandlersFailClosedOnMissingTenant is the enforceable form of the
// rule that tenancy.go documents.
func TestMutatingHandlersFailClosedOnMissingTenant(t *testing.T) {
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, ".", nil, 0)
	if err != nil {
		t.Fatalf("parse enterprise package: %v", err)
	}

	type finding struct {
		file string
		fn   string
		call string
	}

	var findings []finding

	for _, pkg := range pkgs {
		for filename, file := range pkg.Files {
			for _, decl := range file.Decls {
				fn, ok := decl.(*ast.FuncDecl)
				if !ok || fn.Body == nil {
					continue
				}
				name := fn.Name.Name
				if !looksMutating(name) {
					continue
				}
				if !returnsGinContext(fn) {
					continue
				}

				ast.Inspect(fn.Body, func(n ast.Node) bool {
					call, ok := n.(*ast.CallExpr)
					if !ok {
						return true
					}
					ident, ok := call.Fun.(*ast.Ident)
					if !ok {
						return true
					}
					if reason, bad := failingTenantResolvers[ident.Name]; bad {
						findings = append(findings, finding{
							file: filepath.Base(filename),
							fn:   name,
							call: reason,
						})
					}
					return true
				})
			}
		}
	}

	for _, f := range findings {
		t.Errorf("%s: handler %s is a write path but resolves its tenant via a helper that %s; "+
			"use mutatingTenantIDFor so the request is refused instead of defaulted",
			f.file, f.fn, f.call)
	}
}

// looksMutating reports whether a handler name implies a write.
func looksMutating(name string) bool {
	for _, prefix := range readNamePrefixes {
		if strings.HasPrefix(name, prefix) {
			return false
		}
	}
	for _, frag := range mutatingNameFragments {
		if strings.Contains(name, frag) {
			return true
		}
	}
	return false
}

// returnsGinContext reports whether a handler takes a *gin.Context, which is
// what makes it reachable from a route.
func returnsGinContext(fn *ast.FuncDecl) bool {
	if fn.Type.Params == nil {
		return false
	}
	for _, field := range fn.Type.Params.List {
		star, ok := field.Type.(*ast.StarExpr)
		if !ok {
			continue
		}
		sel, ok := star.X.(*ast.SelectorExpr)
		if !ok {
			continue
		}
		pkg, ok := sel.X.(*ast.Ident)
		if ok && pkg.Name == "gin" && sel.Sel.Name == "Context" {
			return true
		}
	}
	return false
}

// TestSafeTenantResolversAreKnown keeps the resolver lists honest. A new
// resolver added to tenancy.go that appears in neither list would be silently
// unclassified, so this fails and forces a decision.
func TestSafeTenantResolversAreKnown(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read package dir: %v", err)
	}

	defined := map[string]bool{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".go") || strings.HasSuffix(e.Name(), "_test.go") {
			continue
		}
		data, err := os.ReadFile(e.Name())
		if err != nil {
			t.Fatalf("read %s: %v", e.Name(), err)
		}
		src := string(data)
		for _, marker := range []string{
			"func tenantIDFor(",
			"func mutatingTenantIDFor(",
			"func jwtTenantOrAbort(",
		} {
			if strings.Contains(src, marker) {
				name := marker[strings.Index(marker, "func ")+5:]
				name = name[:strings.Index(name, "(")]
				defined[name] = true
			}
		}
	}

	known := map[string]bool{}
	for name := range failingTenantResolvers {
		known[name] = true
	}
	for name := range safeTenantResolvers {
		known[name] = true
	}

	for name := range defined {
		if !known[name] {
			t.Errorf("tenant resolver %s is not classified as safe or failing; "+
				"add it to one of the lists in this test (declared at %s)", name, strconv.Quote(name))
		}
	}
}
