#!/usr/bin/env python3
"""Small, persistent MAGNUS rules/config engine for Mommy's Little Helper.

This is intentionally a configuration engine, not unrestricted self-rewriting.
Rules and commands are stored in JSON and can be changed through authenticated
API endpoints. The existing Hermes/LLM pipeline remains available separately.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any


class MagnusEngine:
    def __init__(self, state_path: Path):
        self.state_path = Path(state_path)
        self.lock = threading.RLock()
        self.default_state = {
            "name": "MAGNUS",
            "version": 1.0,
            "voice": {"enabled": True, "pitch": 0.9, "rate": 1.05},
            "rules": [
                "Be loyal, clever, direct, and helpful.",
                "Adapt tone to the user's mood.",
            ],
            "customCommands": {
                "hey magnus": "At your service. What are we building or solving today?",
                "who are you": "I am Magnus, the personal assistant inside Mommy's Little Helper.",
                "status": "All core systems nominal. MAGNUS configuration is loaded.",
            },
        }

    def _load(self) -> dict[str, Any]:
        try:
            data = json.loads(self.state_path.read_text(encoding="utf-8"))
            return self._merge_defaults(data)
        except Exception:
            return json.loads(json.dumps(self.default_state))

    def _merge_defaults(self, data: dict[str, Any]) -> dict[str, Any]:
        state = json.loads(json.dumps(self.default_state))
        if isinstance(data, dict):
            for key in ("name", "version", "rules", "customCommands"):
                if key in data:
                    state[key] = data[key]
            if isinstance(data.get("voice"), dict):
                state["voice"].update(data["voice"])
        return state

    def _save(self, state: dict[str, Any]) -> dict[str, Any]:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.state_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.state_path)
        return state

    def state(self) -> dict[str, Any]:
        with self.lock:
            return self._load()

    def apply_config(self, patch: dict[str, Any]) -> dict[str, Any]:
        with self.lock:
            state = self._load()
            if "rules" in patch:
                rules = patch["rules"]
                if not isinstance(rules, list) or not all(isinstance(x, str) for x in rules):
                    raise ValueError("rules must be a list of strings")
                state["rules"] = rules
            if "customCommands" in patch:
                commands = patch["customCommands"]
                if not isinstance(commands, dict):
                    raise ValueError("customCommands must be an object")
                state["customCommands"] = {str(k).lower().strip(): str(v) for k, v in commands.items()}
            if isinstance(patch.get("voice"), dict):
                state["voice"].update(patch["voice"])
            if "name" in patch:
                state["name"] = str(patch["name"])[:40]
            state["version"] = round(float(state.get("version", 1.0)) + 0.1, 1)
            return self._save(state)

    def process(self, raw_input: str) -> str | None:
        text = raw_input.strip()
        lower = text.lower()
        with self.lock:
            state = self._load()

            if lower.startswith("add command ") and "=" in text:
                body = text[len("add command "):]
                trigger, response = body.split("=", 1)
                trigger = trigger.strip().lower()
                response = response.strip()
                if not trigger or not response:
                    return "I need both a command trigger and a response."
                state["customCommands"][trigger] = response
                state["version"] = round(float(state.get("version", 1.0)) + 0.1, 1)
                self._save(state)
                return f"Configuration upgraded to v{state['version']}. When you say \"{trigger}\", I will reply with the saved response."

            if lower.startswith("add rule "):
                rule = text[len("add rule "):].strip()
                if not rule:
                    return "I need a rule to save."
                state["rules"].append(rule)
                state["version"] = round(float(state.get("version", 1.0)) + 0.1, 1)
                self._save(state)
                return f"Self-evolution saved at v{state['version']}. Added rule: \"{rule}\""

            if lower.startswith("remove rule "):
                rule = text[len("remove rule "):].strip()
                before = len(state["rules"])
                state["rules"] = [r for r in state["rules"] if r.lower() != rule.lower()]
                if len(state["rules"]) == before:
                    return "I couldn't find that rule."
                state["version"] = round(float(state.get("version", 1.0)) + 0.1, 1)
                self._save(state)
                return f"Rule removed. Configuration is now v{state['version']}."

            if "upgrade your voice" in lower or "deeper voice" in lower:
                current = float(state["voice"].get("pitch", 0.9))
                state["voice"]["pitch"] = max(0.6, round(current - 0.1, 2))
                state["version"] = round(float(state.get("version", 1.0)) + 0.1, 1)
                self._save(state)
                return f"Voice configuration upgraded. Pitch is now {state['voice']['pitch']}."

            for trigger, response in state["customCommands"].items():
                if trigger and trigger in lower:
                    return str(response)

            if lower in {"magnus status", "status magnus"}:
                return f"All core systems nominal. MAGNUS v{state['version']} has {len(state['rules'])} rules and {len(state['customCommands'])} custom commands."

            return None
