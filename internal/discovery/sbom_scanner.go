package discovery

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type SBOMComponent struct {
	Name     string `json:"name"`
	Version  string `json:"version"`
	Type     string `json:"type"`
	License  string `json:"license,omitempty"`
	PURL     string `json:"purl,omitempty"`
	FilePath string `json:"file_path,omitempty"`
}

type SBOMResult struct {
	Components []SBOMComponent `json:"components"`
	Format     string          `json:"format"`
	Total      int             `json:"total"`
}

func ScanDirectoryForSBOM(path string) (*SBOMResult, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("cannot access path %s: %w", path, err)
	}
	if !info.IsDir() {
		return scanSingleFile(path)
	}
	return scanDirectory(path)
}

func scanDirectory(root string) (*SBOMResult, error) {
	components := []SBOMComponent{}
	seen := map[string]bool{}

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			base := filepath.Base(path)
			if base == "node_modules" || base == ".git" || base == "vendor" ||
				base == "__pycache__" || base == ".next" || base == "dist" ||
				base == "build" || base == ".terraform" {
				return filepath.SkipDir
			}
			return nil
		}

		parsed := parseDepFile(path)
		for _, c := range parsed {
			key := c.Name + "@" + c.Version
			if !seen[key] {
				seen[key] = true
				components = append(components, c)
			}
		}
		return nil
	})

	return &SBOMResult{
		Components: components,
		Format:     "cyclonedx",
		Total:      len(components),
	}, err
}

func scanSingleFile(path string) (*SBOMResult, error) {
	components := parseDepFile(path)
	return &SBOMResult{
		Components: components,
		Format:     "cyclonedx",
		Total:      len(components),
	}, nil
}

func parseDepFile(path string) []SBOMComponent {
	filename := filepath.Base(path)
	switch {
	case filename == "go.mod":
		return parseGoMod(path)
	case filename == "package.json":
		return parsePackageJSON(path)
	case filename == "requirements.txt" || filename == "Pipfile":
		return parseRequirementsTxt(path)
	case filename == "Cargo.toml":
		return parseCargoToml(path)
	case filename == "pom.xml":
		return parsePomXML(path)
	case filename == "build.gradle" || filename == "build.gradle.kts":
		return parseGradle(path)
	case strings.HasSuffix(filename, ".csproj"):
		return parseCSProj(path)
	case filename == "Gemfile":
		return parseGemfile(path)
	case filename == "cargo.lock" || filename == "Cargo.lock":
		return parseCargoLock(path)
	case filename == "yarn.lock":
		return parseYarnLock(path)
	case filename == "package-lock.json":
		return parsePackageLockJSON(path)
	case strings.HasSuffix(filename, ".sln"):
		return parseSolutionFile(path)
	}
	return nil
}

func parseGoMod(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	lines := strings.Split(string(data), "\n")
	inRequire := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "require (" {
			inRequire = true
			continue
		}
		if inRequire && trimmed == ")" {
			inRequire = false
			continue
		}
		if inRequire {
			parts := strings.Fields(trimmed)
			if len(parts) >= 2 {
				components = append(components, SBOMComponent{
					Name:    parts[0],
					Version: strings.TrimSuffix(parts[1], "// indirect"),
					Type:    "library",
					PURL:    fmt.Sprintf("pkg:golang/%s@%s", parts[0], parts[1]),
				})
			}
		}
		if strings.HasPrefix(trimmed, "go ") {
			components = append(components, SBOMComponent{
				Name:    "go",
				Version: strings.TrimPrefix(trimmed, "go "),
				Type:    "language",
			})
		}
	}
	return components
}

func parsePackageJSON(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var pkg struct {
		Name         string            `json:"name"`
		Version      string            `json:"version"`
		Dependencies map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil
	}
	var components []SBOMComponent
	for name, version := range pkg.Dependencies {
		version = strings.TrimPrefix(version, "^")
		version = strings.TrimPrefix(version, "~")
		components = append(components, SBOMComponent{
			Name:    name,
			Version: version,
			Type:    "library",
			PURL:    fmt.Sprintf("pkg:npm/%s@%s", name, version),
		})
	}
	for name, version := range pkg.DevDependencies {
		version = strings.TrimPrefix(version, "^")
		version = strings.TrimPrefix(version, "~")
		components = append(components, SBOMComponent{
			Name:    name,
			Version: version,
			Type:    "library",
			PURL:    fmt.Sprintf("pkg:npm/%s@%s", name, version),
		})
	}
	if pkg.Name != "" {
		components = append([]SBOMComponent{{
			Name:    pkg.Name,
			Version: pkg.Version,
			Type:    "application",
		}}, components...)
	}
	return components
}

func parseRequirementsTxt(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "-") {
			continue
		}
		parts := strings.SplitN(trimmed, "==", 2)
		name := strings.TrimSpace(parts[0])
		version := ""
		if len(parts) == 2 {
			version = strings.TrimSpace(parts[1])
		}
		if name != "" {
			components = append(components, SBOMComponent{
				Name:    name,
				Version: version,
				Type:    "library",
				PURL:    fmt.Sprintf("pkg:pypi/%s@%s", name, version),
			})
		}
	}
	return components
}

func parseCargoToml(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	lines := strings.Split(string(data), "\n")
	inDeps := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "[dependencies]" {
			inDeps = true
			continue
		}
		if inDeps && strings.HasPrefix(trimmed, "[") {
			break
		}
		if inDeps && strings.Contains(trimmed, "=") {
			parts := strings.SplitN(trimmed, "=", 2)
			name := strings.TrimSpace(parts[0])
			version := strings.Trim(strings.TrimSpace(parts[1]), "\" ")
			version = strings.TrimPrefix(version, "\"")
			version = strings.TrimSuffix(version, "\"")
			if name != "" && version != "" {
				components = append(components, SBOMComponent{
					Name:    name,
					Version: version,
					Type:    "library",
					PURL:    fmt.Sprintf("pkg:cargo/%s@%s", name, version),
				})
			}
		}
	}
	return components
}

func parsePomXML(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	content := string(data)

	projectParts := extractXML(content, "artifactId")
	versionParts := extractXML(content, "version")
	groupParts := extractXML(content, "groupId")

	for i, name := range projectParts {
		if i == 0 {
			continue
		}
		version := ""
		if i < len(versionParts) {
			version = versionParts[i]
		}
		group := ""
		if i < len(groupParts) {
			group = groupParts[i]
		}
		purl := fmt.Sprintf("pkg:maven/%s/%s@%s", group, name, version)
		components = append(components, SBOMComponent{
			Name:    group + ":" + name,
			Version: version,
			Type:    "library",
			PURL:    purl,
		})
	}
	return components
}

func parseGradle(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.Contains(trimmed, "implementation") || strings.Contains(trimmed, "api ") {
			start := strings.Index(trimmed, "'")
			if start == -1 {
				start = strings.Index(trimmed, "\"")
			}
			if start != -1 {
				end := strings.LastIndex(trimmed, "'")
				if end == -1 || end == start {
					end = strings.LastIndex(trimmed, "\"")
				}
				if end > start {
					dep := trimmed[start+1 : end]
					parts := strings.Split(dep, ":")
					if len(parts) >= 3 {
						components = append(components, SBOMComponent{
							Name:    parts[0] + ":" + parts[1],
							Version: parts[2],
							Type:    "library",
							PURL:    fmt.Sprintf("pkg:maven/%s/%s@%s", parts[0], parts[1], parts[2]),
						})
					}
				}
			}
		}
	}
	return components
}

func parseCSProj(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	content := string(data)

	refs := extractXML(content, "PackageReference")
	for _, ref := range refs {
		include := extractAttr(ref, "Include")
		version := extractAttr(ref, "Version")
		if include != "" {
			components = append(components, SBOMComponent{
				Name:    include,
				Version: version,
				Type:    "library",
				PURL:    fmt.Sprintf("pkg:nuget/%s@%s", include, version),
			})
		}
	}
	return components
}

func parseGemfile(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "gem ") {
			parts := strings.Split(trimmed, ",")
			name := strings.Trim(strings.TrimPrefix(parts[0], "gem "), "\"' ")
			version := ""
			if len(parts) > 1 {
				version = strings.Trim(strings.TrimSpace(parts[1]), "\"' ")
				version = strings.TrimPrefix(version, "~> ")
				version = strings.TrimPrefix(version, ">= ")
			}
			if name != "" {
				components = append(components, SBOMComponent{
					Name:    name,
					Version: version,
					Type:    "library",
					PURL:    fmt.Sprintf("pkg:gem/%s@%s", name, version),
				})
			}
		}
	}
	return components
}

func parseCargoLock(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	lines := strings.Split(string(data), "\n")
	for i := 0; i < len(lines); i++ {
		trimmed := strings.TrimSpace(lines[i])
		if strings.HasPrefix(trimmed, "[[package]]") {
			var name, version string
			for j := i + 1; j < len(lines) && j < i+10; j++ {
				l := strings.TrimSpace(lines[j])
				if strings.HasPrefix(l, "name = ") {
					name = strings.Trim(strings.TrimPrefix(l, "name = "), "\" ")
				}
				if strings.HasPrefix(l, "version = ") {
					version = strings.Trim(strings.TrimPrefix(l, "version = "), "\" ")
				}
				if strings.HasPrefix(l, "[") && !strings.HasPrefix(l, "[[") {
					break
				}
			}
			if name != "" {
				components = append(components, SBOMComponent{
					Name:    name,
					Version: version,
					Type:    "library",
					PURL:    fmt.Sprintf("pkg:cargo/%s@%s", name, version),
				})
			}
		}
	}
	return components
}

func parseYarnLock(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "\"") && strings.Contains(trimmed, "@") {
			parts := strings.SplitN(trimmed, "@", 2)
			name := strings.Trim(parts[0], "\"")
			rest := strings.Fields(strings.Trim(parts[1], "\":"))
			version := ""
			if len(rest) > 0 {
				version = rest[0]
			}
			if name != "" {
				components = append(components, SBOMComponent{
					Name:    name,
					Version: version,
					Type:    "library",
				})
			}
		}
	}
	return components
}

func parsePackageLockJSON(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var lock struct {
		Packages map[string]struct {
			Version string `json:"version"`
		} `json:"packages"`
		Dependencies map[string]struct {
			Version string `json:"version"`
		} `json:"dependencies"`
	}
	if err := json.Unmarshal(data, &lock); err != nil {
		return nil
	}
	var components []SBOMComponent
	seen := map[string]bool{}

	for name, pkg := range lock.Packages {
		if name == "" {
			continue
		}
		key := name + "@" + pkg.Version
		if !seen[key] {
			seen[key] = true
			components = append(components, SBOMComponent{
				Name:    name,
				Version: pkg.Version,
				Type:    "library",
				PURL:    fmt.Sprintf("pkg:npm/%s@%s", name, pkg.Version),
			})
		}
	}
	for name, dep := range lock.Dependencies {
		key := name + "@" + dep.Version
		if !seen[key] {
			seen[key] = true
			components = append(components, SBOMComponent{
				Name:    name,
				Version: dep.Version,
				Type:    "library",
				PURL:    fmt.Sprintf("pkg:npm/%s@%s", name, dep.Version),
			})
		}
	}
	return components
}

func parseSolutionFile(path string) []SBOMComponent {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var components []SBOMComponent
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "Project(") {
			parts := strings.Split(trimmed, "=")
			if len(parts) == 2 {
				details := strings.Split(parts[1], ",")
				if len(details) >= 2 {
					name := strings.Trim(strings.TrimSpace(details[0]), "\" ")
					components = append(components, SBOMComponent{
						Name: name,
						Type: "project",
					})
				}
			}
		}
	}
	return components
}

func extractXML(content, tag string) []string {
	var results []string
	startTag := "<" + tag + ">"
	endTag := "</" + tag + ">"
	remaining := content
	for {
		start := strings.Index(remaining, startTag)
		if start == -1 {
			break
		}
		start += len(startTag)
		end := strings.Index(remaining[start:], endTag)
		if end == -1 {
			break
		}
		results = append(results, remaining[start:start+end])
		remaining = remaining[start+end+len(endTag):]
	}
	return results
}

func extractAttr(xml, attr string) string {
	marker := attr + "=\""
	start := strings.Index(xml, marker)
	if start == -1 {
		return ""
	}
	start += len(marker)
	end := strings.Index(xml[start:], "\"")
	if end == -1 {
		return ""
	}
	return xml[start : start+end]
}
