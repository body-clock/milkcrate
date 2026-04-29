# Deploying Milkcrate to Hetzner with Kamal

## Prerequisites

- Hetzner Cloud account
- milkcrate.fm domain with DNS control
- GitHub account with access to `body-clock/milkcrate`

## 1. Create Hetzner Server

```bash
# Install hcloud CLI if not present
brew install hcloud

# Create an API token at https://console.hetzner.cloud/projects → Security → API Tokens
hcloud context create milkcrate

# Create the server (CX22: 2 vCPU, 4GB RAM, €4/mo)
hcloud server create \
  --name milkcrate \
  --type cx22 \
  --image ubuntu-24.04 \
  --location nbg1 \
  --ssh-key your-ssh-key-name
```

Note the server IP from the output.

## 2. DNS Setup

Add these DNS records for milkcrate.fm:

```
Type: A
Name: @
Value: <server-ip>
TTL: 3600
```

Wait for DNS propagation (~5 minutes).

## 3. Fill In Secrets

Edit `.kamal/secrets`:

```bash
KAMAL_REGISTRY_PASSWORD=ghp_...  # GitHub token with write:packages scope
RAILS_MASTER_KEY=...             # From config/master.key
DISCOGS_TOKEN=...                # From discogs.com/settings/developers
```

Create the GitHub token at `github.com/settings/tokens` with `write:packages` scope.

## 4. Update Server IP

Edit `config/deploy.yml` line 11 — replace `1.2.3.4` with your server IP.

## 5. Deploy

```bash
# First-time setup (installs Docker, pulls base images)
bin/kamal setup

# Push code and deploy
bin/kamal deploy
```

## 6. Verify

Open `https://milkcrate.fm` in your browser. It will be empty until you add a store.

## Useful Commands

```bash
bin/kamal logs                # Tail logs
bin/kamal app details         # Show container info
bin/kamal app exec -i bash    # SSH into container
bin/kamal deploy              # Deploy new version
bin/kamal rollback            # Revert to previous deploy
```
