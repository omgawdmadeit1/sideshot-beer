#!/usr/bin/env python3
"""Guardrails for the SMI-147 §5.2 warning-card draft. Not a legal review."""

from pathlib import Path

CARD = Path(__file__).with_name("warning-card.html")
REQUIRED = (
    "21+",
    "Not a toy",
    "pointed tip",
    "puncture metal",
    "Keep away from children",
    "Risk of cuts",
    "Do not use on glass",
    "Do not use as a knife or weapon",
    "Rapid drinking",
    "binge drinking",
    "forced consumption",
    "Do not drink and drive",
    "User assumes all risk",
    "Drink responsibly",
    "DRAFT",
    "counsel",
)


def main() -> int:
    text = CARD.read_text(encoding="utf-8")
    missing = [phrase for phrase in REQUIRED if phrase not in text]
    if missing:
        print("FAIL missing phrases:", ", ".join(missing))
        return 1
    if "safer" in text.lower() and "do not claim" not in text.lower():
        # Card itself must not market unsourced "safer"
        body = text.split("<body", 1)[1]
        if ">safer<" in body.lower() or "safer." in body.lower():
            print("FAIL card body uses unsourced safer claim")
            return 1
    print(f"OK {CARD.name} contains {len(REQUIRED)} required phrases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
