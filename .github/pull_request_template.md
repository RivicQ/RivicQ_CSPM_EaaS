## Pull Request Checklist

**Please review before submitting your PR:**

### Description
<!-- What does this PR do? Why is it needed? -->

### Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Infrastructure / Terraform change
- [ ] Documentation update
- [ ] Security fix

### Testing
- [ ] Unit tests added or updated
- [ ] Integration tests added or updated (if applicable)
- [ ] Tested in a dev/staging environment
- [ ] Migration tested (if DB schema change)

### Security
- [ ] No secrets, credentials, or PII committed
- [ ] No new dependencies with known high/critical CVEs (`govulncheck` / Dependabot)
- [ ] Input validation and error handling reviewed
- [ ] Auth/authz logic reviewed (if applicable)
- [ ] Cryptographic changes reviewed by security team (if applicable)

### Infrastructure (Terraform)
- [ ] `terraform fmt -recursive` run
- [ ] `terraform validate` passes
- [ ] Sensitive variables use `sensitive = true`
- [ ] No hardcoded credentials or account IDs
- [ ] State backend configured correctly

### Documentation
- [ ] README updated (if applicable)
- [ ] Changelog entry added
- [ ] Inline comments added for complex logic

### Deployment Notes
<!-- Any special steps needed to deploy this change? DB migrations? Secret rotations? -->
