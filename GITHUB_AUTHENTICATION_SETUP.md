# 🔐 GitHub Authentication Setup Guide

## Problem
Push failed with error: "Permission to rivic-q/cryptobom-saas.git denied to Reva-1"

## Solution: GitHub Personal Access Token (PAT)

GitHub no longer accepts passwords for HTTPS authentication. You need a Personal Access Token.

---

## Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Click "Generate new token" → "Generate new token (classic)"
3. Set permissions:
   - ✅ repo (full control of private repositories)
   - ✅ workflow (update GitHub Action workflows)
4. Set expiration: 90 days or custom
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)

---

## Step 2: Store Token in Keychain (macOS)

```bash
# Open Keychain Access
open /Applications/Utilities/Keychain\ Access.app

# Or use terminal to add it directly:
git credential approve
# Then type:
# host=github.com
# protocol=https
# username=rivic-q
# password=<YOUR_TOKEN_HERE>
# (Press Ctrl+D twice when done)
```

---

## Step 3: Configure Git to Use Token

### Option A: Use Git Credential Helper (Recommended)

```bash
# Enable credential caching
git config --global credential.helper osxkeychain

# Or for this repo only:
git config credential.helper osxkeychain
```

### Option B: Use SSH Instead (Alternative)

If you prefer SSH (more secure):

```bash
# Check if you have SSH key
ls -la ~/.ssh/id_rsa

# If not, generate one:
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Add to SSH agent:
ssh-add ~/.ssh/id_rsa

# Add public key to GitHub:
# 1. Copy: cat ~/.ssh/id_rsa.pub
# 2. Go to: https://github.com/settings/keys
# 3. Click "New SSH key"
# 4. Paste and save

# Change git remote from HTTPS to SSH:
git remote set-url origin git@github.com:rivic-q/cryptobom-saas.git

# Test SSH connection:
ssh -T git@github.com
```

---

## Step 4: Try Push Again

```bash
cd "/Users/ande/Desktop/Rivic - V1.1/RivicQ"

# If using HTTPS with PAT:
git push -u origin main

# If using SSH:
git push -u origin main
```

---

## Troubleshooting

### If still getting 403 error:

1. **Check if you have push access:**
   - Go to: https://github.com/rivic-q/cryptobom-saas
   - Settings → Collaborators
   - Verify your GitHub account has "Maintain" or "Admin" access

2. **Verify token has correct permissions:**
   - Go to: https://github.com/settings/tokens
   - Check that `repo` scope is enabled

3. **Try clearing credentials and re-entering:**
   ```bash
   # Remove cached credentials
   git credential reject
   # host=github.com
   # protocol=https
   # (Press Ctrl+D twice)
   
   # Try push again (will prompt for token)
   git push -u origin main
   ```

4. **Check GitHub organization membership:**
   - Go to: https://github.com/rivic-q?tab=members
   - Verify your account is in the organization

---

## Quick Reference Commands

```bash
# View current remote
git remote -v

# Change remote to SSH
git remote set-url origin git@github.com:rivic-q/cryptobom-saas.git

# Change remote back to HTTPS
git remote set-url origin https://github.com/rivic-q/cryptobom-saas.git

# Test SSH connection
ssh -T git@github.com

# View git config
git config --list

# Clear cached credentials (if needed)
git credential reject
```

---

## Recommended: SSH Setup (Most Secure)

1. Generate SSH key (one-time)
2. Add to GitHub (Settings → SSH Keys)
3. Use SSH remote: `git@github.com:rivic-q/cryptobom-saas.git`
4. All future pushes work without entering credentials

---

**Status:** Changes are committed locally ✅  
**Next:** Authenticate with GitHub and push  
**Timeline:** 5 minutes to set up authentication

After authentication is working:
```bash
git push -u origin main
```

Then enable GitHub Pages in repository settings.
