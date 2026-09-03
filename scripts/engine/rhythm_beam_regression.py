#!/usr/bin/env python3
"""Rhythm beaming regression checks for 3/4 and 4/4.

This script validates a reference beaming model that matches the current renderer
strategy in scripts/engine/tabulature.js:
- Beamable values: eighth, sixteenth, thirty-second.
- Rests and bar boundaries break beaming continuity.
- Groups are split at beat boundaries according to simple-meter readability.

Run:
  python scripts/engine/rhythm_beam_regression.py
"""

from __future__ import annotations

import itertools
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

EPS = 1e-4
SYMBOLS = ("e", "s", "f", "q", "h", "ep", "sp", "fp")


@dataclass
class NoteEvent:
    rhythm: str
    start_beat: float
    end_beat: float


def base_rhythm(rhythm: str) -> str:
    return rhythm.replace(".", "").replace("t", "").replace("p", "") if rhythm else ""


def is_triplet(rhythm: str) -> bool:
    return "t" in rhythm if rhythm else False


def duration(rhythm: str) -> float:
    base = base_rhythm(rhythm)
    value = {
        "w": 4.0,
        "h": 2.0,
        "q": 1.0,
        "e": 0.5,
        "s": 0.25,
        "f": 0.125,
        "t": 0.0625,
    }.get(base, 0.0)

    if "." in rhythm:
        value *= 1.5

    if is_triplet(rhythm):
        value = value * 2.0 / 3.0

    return value


def can_beam(rhythm: str) -> bool:
    return base_rhythm(rhythm) in {"e", "s", "f"}


def is_whole_number(value: float) -> bool:
    return abs(value - round(value)) < EPS


def crosses_internal_beat_boundary(start_beat: float, end_beat: float, beats_per_bar: int) -> bool:
    for beat in range(1, beats_per_bar):
        if start_beat < (beat - EPS) and end_beat > (beat + EPS):
            return True
    return False


def should_break_beam(group_rhythms: Sequence[str], current_rhythm: str, current_beat_pos: float, beats_per_bar: int) -> bool:
    if not group_rhythms:
        return False

    current_duration = duration(current_rhythm)
    current_start = current_beat_pos - current_duration
    prev_rhythm = group_rhythms[-1]
    prev_duration = duration(prev_rhythm)
    prev_beat_pos = current_start
    prev_start = prev_beat_pos - prev_duration

    if crosses_internal_beat_boundary(current_start, current_beat_pos, beats_per_bar):
        return True

    half_bar = beats_per_bar / 2
    if beats_per_bar == 4 and prev_beat_pos <= half_bar and current_start >= half_bar:
        prev_base = base_rhythm(prev_rhythm)
        curr_base = base_rhythm(current_rhythm)
        is_e_dot_s = "." in prev_rhythm and prev_base == "e" and curr_base == "s"
        if is_e_dot_s and prev_start >= half_bar:
            return False
        return True

    if (
        is_whole_number(prev_beat_pos)
        and is_whole_number(current_start)
        and abs(prev_beat_pos - current_start) < EPS
        and current_start > 0
    ):
        prev_base = base_rhythm(prev_rhythm)
        curr_base = base_rhythm(current_rhythm)
        is_simple_eighths = "." not in prev_rhythm and "." not in current_rhythm and prev_base == "e" and curr_base == "e"
        if beats_per_bar != 4 or not is_simple_eighths:
            return True

    prev_start_beat = int(prev_start)
    prev_end_beat = int(prev_beat_pos)
    if prev_start_beat != prev_end_beat and not is_whole_number(prev_beat_pos):
        return True

    return False


def split_beam_group_by_meter(group: Sequence[NoteEvent], beats_per_bar: int) -> List[List[NoteEvent]]:
    if len(group) <= 1:
        return [list(group)] if group else []

    all_simple_eighths = all(
        base_rhythm(note.rhythm) == "e" and "." not in note.rhythm and not is_triplet(note.rhythm)
        for note in group
    )

    out: List[List[NoteEvent]] = []
    current: List[NoteEvent] = [group[0]]

    for note in group[1:]:
        boundary_beat = note.start_beat
        should_split = False

        if is_whole_number(boundary_beat) and 0 < boundary_beat < beats_per_bar:
            should_split = True

            if beats_per_bar == 4 and all_simple_eighths and (abs(boundary_beat - 1) < EPS or abs(boundary_beat - 3) < EPS):
                half_start = 0 if boundary_beat < 2 else 2
                half_end = half_start + 2
                segment_start = current[0].start_beat
                segment_can_fill_half = abs(segment_start - half_start) < EPS and group[-1].end_beat >= (half_end - EPS)
                if segment_can_fill_half:
                    should_split = False

        if should_split:
            out.append(current)
            current = [note]
        else:
            current.append(note)

    if current:
        out.append(current)

    return out


def render_groups(sequence: Sequence[str], beats_per_bar: int) -> List[List[NoteEvent]]:
    beat_pos = 0.0
    beam_group: List[NoteEvent] = []
    beam_group_rhythms: List[str] = []
    interrupted_by_rest = False
    rendered: List[List[NoteEvent]] = []

    def flush() -> None:
        nonlocal beam_group, beam_group_rhythms
        if beam_group:
            rendered.extend(split_beam_group_by_meter(beam_group, beats_per_bar))
            beam_group = []
            beam_group_rhythms = []

    for rhythm in sequence:
        if "p" in rhythm:
            flush()
            interrupted_by_rest = True
            beat_pos += duration(rhythm)
            continue

        if can_beam(rhythm):
            end_beat = beat_pos + duration(rhythm)
            if beam_group and should_break_beam(beam_group_rhythms, rhythm, end_beat, beats_per_bar):
                flush()

            event = NoteEvent(rhythm=rhythm, start_beat=beat_pos, end_beat=end_beat)

            if interrupted_by_rest and not beam_group:
                rendered.append([event])
                interrupted_by_rest = False
            else:
                beam_group.append(event)
                beam_group_rhythms.append(rhythm)

            beat_pos = end_beat
            continue

        flush()
        interrupted_by_rest = False
        beat_pos += duration(rhythm)

    flush()
    return rendered


def find_boundary_violations(groups: Sequence[Sequence[NoteEvent]], beats_per_bar: int) -> List[Tuple[List[str], float, float, int]]:
    violations: List[Tuple[List[str], float, float, int]] = []

    for group in groups:
        if len(group) < 2:
            continue

        start = group[0].start_beat
        end = group[-1].end_beat
        rhythms = [note.rhythm for note in group]

        for beat in range(1, beats_per_bar):
            if start < beat - EPS and end > beat + EPS:
                allowed = False

                if beats_per_bar == 4 and beat in (1, 3):
                    all_simple_eighths = all(
                        base_rhythm(rhythm) == "e" and "." not in rhythm and not is_triplet(rhythm)
                        for rhythm in rhythms
                    )
                    half_start = 0 if beat < 2 else 2
                    half_end = half_start + 2
                    if all_simple_eighths and abs(start - half_start) < EPS and end >= half_end - EPS:
                        allowed = True

                if not allowed:
                    violations.append((rhythms, start, end, beat))

    return violations


def check_key_signatures() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    js_path = repo_root / "scripts" / "engine" / "tabulature.js"
    source = js_path.read_text(encoding="utf-8")

    required_snippets = [
        r"function splitBeamGroupByMeter\(",
        r"function finalizeBeamGroup\(",
        r"function crossesInternalBeatBoundary\(",
        r"beamGroupInterruptedByRest",
        r"crossesInternalBeatBoundary\(currentStartPos, currentBeatPos, beatsPerBar\)",
    ]

    missing = [pattern for pattern in required_snippets if re.search(pattern, source) is None]
    if missing:
        joined = "\n  - ".join(missing)
        raise AssertionError(f"Missing expected beaming logic in tabulature.js:\n  - {joined}")


def check_targeted_cases() -> None:
    expected = [
        (("ep", "e", "e", "e", "e", "e", "e", "e"), 4, [1, 2, 4]),
        (("ep", "e", "e", "e", "e", "e"), 3, [1, 2, 2]),
        (("e", "e", "e", "h", "e"), 4, [2, 1, 1]),
        (("e", "s", "e", "e", "s", "h"), 4, [2, 1, 2]),
        (("e", "s", "e", "e", "s", "q"), 3, [2, 1, 2]),
    ]

    for sequence, beats, expected_lengths in expected:
        groups = render_groups(sequence, beats)
        lengths = [len(group) for group in groups]
        if lengths != expected_lengths:
            raise AssertionError(
                f"Unexpected grouping for {beats}/4 {sequence}: expected {expected_lengths}, got {lengths}"
            )


def exhaustive_check(beats_per_bar: int) -> Tuple[int, List[Tuple[Tuple[str, ...], Tuple[List[str], float, float, int]]]]:
    tested = 0
    violations: List[Tuple[Tuple[str, ...], Tuple[List[str], float, float, int]]] = []

    for length in range(3, 7):
        for sequence in itertools.product(SYMBOLS, repeat=length):
            total = sum(duration(symbol) for symbol in sequence)
            if abs(total - beats_per_bar) > 1e-6:
                continue

            tested += 1
            groups = render_groups(sequence, beats_per_bar)
            bad = find_boundary_violations(groups, beats_per_bar)
            if bad:
                violations.append((sequence, bad[0]))

    return tested, violations


def main() -> int:
    check_key_signatures()
    check_targeted_cases()

    summary = []
    for beats in (3, 4):
        tested, violations = exhaustive_check(beats)
        summary.append((beats, tested, len(violations), violations[:3]))

    print("Rhythm beaming regression summary")
    print("--------------------------------")
    for beats, tested, count, samples in summary:
        print(f"{beats}/4 tested valid-duration sequences: {tested}")
        if count:
            print(f"{beats}/4 violations found: {count}")
            for sequence, sample in samples:
                print(f"  seq={sequence} bad={sample}")
        else:
            print(f"{beats}/4 no boundary-rule violations found")

    has_violations = any(count > 0 for _, _, count, _ in summary)
    if has_violations:
        return 1

    print("\nAll rhythm beaming regression checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
