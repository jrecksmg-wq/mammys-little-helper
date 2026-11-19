"""Safe improvement proposal API for the Magnus fork.

This module records proposed changes and owner decisions. It deliberately does
not execute shell commands, write source files, merge branches, or deploy code.
"""
from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/magnus/improvements", tags=["Magnus improvements"])
_STORE = Path(__file__).resolve().parent / "logs" / "magnus_improvements.json"
_LOCK = threading.Lock()


class ProposalInput(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=4000)
    proposed_changes: str = Field(default="", max_length=12000)
    risk: Literal["low", "medium", "high"] = "medium"


class DecisionInput(BaseModel):
    decision: Literal["approve", "reject"]
    note: str = Field(default="", max_length=2000)


def _read() -> list[dict]:
    try:
        data = json.loads(_STORE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=500, detail="Improvement proposal store is unreadable")


def _write(items: list[dict]) -> None:
    _STORE.parent.mkdir(parents=True, exist_ok=True)
    temporary = _STORE.with_suffix(".tmp")
    temporary.write_text(json.dumps(items, indent=2), encoding="utf-8")
    temporary.replace(_STORE)


@router.get("")
def list_improvements() -> JSONResponse:
    with _LOCK:
        return JSONResponse({"proposals": _read()})


@router.post("", status_code=201)
def create_improvement(proposal: ProposalInput) -> JSONResponse:
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "id": str(uuid.uuid4()),
        "title": proposal.title.strip(),
        "description": proposal.description.strip(),
        "proposed_changes": proposal.proposed_changes.strip(),
        "risk": proposal.risk,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "decision_note": "",
    }
    with _LOCK:
        items = _read()
        items.insert(0, item)
        _write(items)
    return JSONResponse({"proposal": item}, status_code=201)


@router.post("/{proposal_id}/decision")
def decide_improvement(proposal_id: str, decision: DecisionInput) -> JSONResponse:
    with _LOCK:
        items = _read()
        for item in items:
            if item["id"] == proposal_id:
                if item["status"] != "pending":
                    raise HTTPException(status_code=409, detail="This proposal already has a decision")
                item["status"] = "approved_for_review" if decision.decision == "approve" else "rejected"
                item["decision_note"] = decision.note.strip()
                item["updated_at"] = datetime.now(timezone.utc).isoformat()
                _write(items)
                return JSONResponse({"proposal": item})
    raise HTTPException(status_code=404, detail="Improvement proposal not found")
