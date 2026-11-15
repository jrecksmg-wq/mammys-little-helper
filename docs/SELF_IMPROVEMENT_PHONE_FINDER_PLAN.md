# Mammy's Little Helper — Code Assistant and Phone Finder

## Current code-assistant scope

The first code-assistant release is **read-only**. It investigates the local repository, explains relevant code in plain language, and returns a bibliography with file paths, line ranges, and GitHub links.

It does not edit, delete, commit, deploy, or run project code. It can recommend a fix, but a person must make the change separately.

### How to use it

In the HUD chat, start a message with `code:`:

- `code: Why is typed chat slow?`
- `code: Find the voice recognition code and explain how it works.`
- `code: What does the /api/chat endpoint do?`
- `code: Investigate this error: [paste the error message]`

Normal messages without the `code:` prefix continue to use ordinary chat.

### Investigation flow

1. The authenticated HUD sends the question to `POST /api/code-assistant`.
2. The server scans text-based source and documentation files under the repository root.
3. It excludes virtual environments, dependency/build folders, logs, hidden directories, symlinks, oversized files, and likely secret/config files (including `.env` and `server.yaml`).
4. It ranks files by keyword overlap and sends a bounded set of focused line excerpts to the configured local Ollama model.
5. The model explains what the supplied code does, separates verified facts from hypotheses, and suggests a next step.
6. The server attaches a deterministic bibliography with source IDs, paths, exact line ranges, and GitHub links.

### Safety and limits

- Read-only: no repository writes or shell commands are available to this feature.
- The endpoint is protected by the existing HUD API authentication middleware.
- Only the local Ollama provider is supported by this first version. Other providers receive a clear unavailable response.
- The scan is keyword-based, not a full semantic index. If a file is missed, ask with a more specific function, filename, feature, or error phrase.
- It inspects the repository available on the machine running the server. It does not automatically fetch newer GitHub commits.
- The model may make mistakes. Verify important conclusions against the cited source lines.
- The bibliography identifies the source excerpts supplied to the model; it does not mean every statement is independently proven.

## Future code-editing capability (not included yet)

A later version may prepare code patches in a separate branch, run tests in a restricted environment, show a diff, and request approval before applying changes. No autonomous code editing or self-repair is enabled in this release.

## Android phone finder

The HUD includes a Find Phone shortcut to Google's official Android Find Hub:
- https://android.com/find

The owner must sign in to their Google Account. Device location and sound features depend on device power, connectivity, account, and Find Hub settings. The assistant does not collect passwords, recovery codes, PINs, or location history, and does not silently track another person's device.
