# ai-dev-agent

**Dummy JavaScript Action (no external deps).**
It echoes inputs so you can wire TARGET_REPOs.
Later, swap `dist/index.js` for a bundled build that includes your real logic.

## Requirements

For the action to open pull requests, target repositories must enable the
following under **Settings → Actions → General**:

- **Workflow permissions:** set to **Read and write**
- **Allow GitHub Actions to create and approve pull requests**

## Development

Install dependencies and build the action locally before committing:

```bash
npm install
npm run build
```

