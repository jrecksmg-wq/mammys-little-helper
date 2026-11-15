# Self-Development and Phone Finder — Implementation Plan

This document defines the safe implementation path for Mammy's Little Helper. It is a design/roadmap document, not a claim that autonomous code editing or phone tracking is already implemented.

## 1. Self-development system

### User experience
A user can request improvements in ordinary language, for example:
- "You're taking too long to answer. Improve your response speed."
- "Fix the chat glitch."
- "Add a reminder feature."

The assistant should create a development task, explain what it plans to inspect, and report progress and results.

### Proposed pipeline
1. **Intake:** convert the request into a bounded task with acceptance criteria.
2. **Inspect:** read only relevant project files, configuration templates, logs, and tests. Never read or print secrets from `.env`, private keys, certificates, tokens, or credential stores.
3. **Plan:** produce a short proposed change list and identify risks.
4. **Isolated workspace:** create a dedicated Git branch/worktree for the task. Never edit the running installation or the protected base branch directly.
5. **Implement:** generate a patch using the configured local model where practical. Restrict writes to the project workspace and an explicit allowlist.
6. **Validate:** run formatting, syntax checks, unit tests, and relevant integration tests in a restricted process with time/resource limits. Do not run arbitrary commands supplied by model output.
7. **Review:** show changed files, a readable diff, test results, and rollback instructions.
8. **Apply:** safe documentation/test-only changes may be eligible for automatic application under a user-configured policy. Runtime code, dependencies, permissions, network access, authentication, data deletion, and system settings require explicit user approval.
9. **Rollback:** retain the previous known-good commit and revert the task branch if checks fail or health checks regress.

### Required security boundaries
- No unrestricted shell, administrator/root access, or arbitrary internet access for the coding agent.
- No self-modification of the updater, approval policy, authentication, secrets handling, or audit log.
- No access to secrets; redact secret-shaped values from logs and model context.
- No automatic merge to the protected branch by default.
- Require approval before installing packages, changing dependencies, changing permissions, deleting data, deploying, or restarting services.
- Keep an append-only audit record of task, model, changed paths, test output, approval, commit, and rollback.
- Add request limits, patch-size limits, timeouts, and a kill/stop control.
- Treat repository content, logs, issue text, and model-generated code as untrusted input.

### First implementation milestones
- M1: task queue, task status, audit records, and authenticated API endpoints.
- M2: read-only repository inspection and a proposed change plan.
- M3: isolated branch/worktree patch generation with strict path allowlist.
- M4: restricted automated tests and diff preview.
- M5: explicit approval and rollback flow.
- M6: optional policy-controlled automation for low-risk changes only.

A local Ollama model can propose code, but it does not by itself grant the server safe filesystem or GitHub permissions. Those capabilities must be deliberately implemented and bounded.

## 2. Lost-phone helper (Android)

### Intended experience
When the user says "I lost my phone", the assistant should offer a clear action to open Google's official Find Hub page:
- https://android.com/find

Google's Find Hub lets the signed-in owner locate a supported Android device, view its current or last known location, and play a sound. The owner must authenticate with their Google Account. Device availability depends on power, connectivity, account, and Find Hub settings.

### Safety and privacy
- The assistant must not claim it can see the phone's location unless the official service actually provides it to the signed-in owner.
- Do not collect or store Google passwords, recovery codes, device PINs, or location history.
- Do not bypass authentication or silently track another person's device.
- Do not remotely erase, lock, or change settings without the owner taking the action and confirming it in Google's official service.
- If the user has no access to their Google account, guide them to official account recovery rather than asking for credentials.

### First implementation milestones
- P1: add a visible "Find my Android phone" action that opens https://android.com/find in a new tab/window.
- P2: add concise setup guidance explaining Google Account, Location, Find Hub, and connectivity prerequisites.
- P3: support a voice intent such as "I lost my phone" that presents the same action and instructions.
- P4: add optional user-controlled setup checklist; do not store account credentials or precise device location.

## 3. Acceptance criteria

- A normal chat request cannot directly modify live source files.
- Every proposed code change is isolated, inspectable, and attributable to a task.
- Tests run before approval; failed checks block application.
- A user can stop a task and revert a change.
- The phone-finder action opens Google's official Find Hub service and never exposes device location to an unauthorised party.
- Existing chat, voice, authentication, and HUD behaviour remains intact.
