# ai-dev-agent (Quickstart)

This is a **quickstart composite action**. It just echoes inputs so you can wire TARGET_REPOs easily.
Later, upgrade to a JavaScript Action with a bundled `dist/`.

## Inputs
- `config` (default `.ai/agent.yml`)
- `repair-only` (default `false`)
- `max-diff-lines` (default `400`)

## Usage
```yml
- name: Run Agent (pinned)
  uses: basstian-ai/ai-dev-agent@v1
  with:
    config: .ai/agent.yml
