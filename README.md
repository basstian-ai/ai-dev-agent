# ai-dev-agent

**Dummy JavaScript Action (no external deps).**
It echoes inputs so you can wire TARGET_REPOs.
Later, swap `dist/index.js` for a bundled build that includes your real logic.

## Requirements

For the action to open pull requests, target repositories must enable the
following under **Settings → Actions → General**:

- **Workflow permissions:** set to **Read and write**
- **Allow GitHub Actions to create and approve pull requests**

The agent fails clearly if `.ai/agent.yml` is missing—add this file in your target
repository.

## Development

Install dependencies and build the action locally before committing:

```bash
npm install
npm run build
```

Commit `dist/` after `npm run build`, since Actions runners fetch prebundled code.

## Release & tagging

This is a JavaScript Action. Consumers should reference
`basstian-ai/ai-dev-agent@v1`.

After merging changes to `main`, update the tags:

```bash
git checkout main && git pull --ff-only
git tag -a v1.1.0 -m "v1.1.0"
git tag -f v1
git push origin v1.1.0 v1 --force
```
