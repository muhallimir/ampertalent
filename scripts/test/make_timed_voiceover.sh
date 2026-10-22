#!/bin/bash
# Timed per-step voiceover for AmperTalent showcases: each narration line lands
# exactly on its video chapter. Modeled on aims-commerce
# make_showcase_timed_voiceover.sh.
# Usage:
#   ./scripts/test/make_timed_voiceover.sh <silent_mp4> <chapters_json> <final_mp4> <clips_dir>
set -euo pipefail

SILENT="${1:?silent mp4 required}"
CHAPTERS="${2:?chapters json required}"
FINAL="${3:?final mp4 required}"
CLIPS_DIR="${4:?clips dir required}"

if [ ! -f "$SILENT" ]; then echo "silent video not found: $SILENT"; exit 1; fi
if [ ! -f "$CHAPTERS" ]; then echo "chapters not found: $CHAPTERS"; exit 1; fi
if [ ! -f "$CLIPS_DIR/durations.json" ]; then echo "clips not found: $CLIPS_DIR"; exit 1; fi

TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT

cp "$CLIPS_DIR"/*.m4a "$TMPD/"
cp "$CLIPS_DIR/durations.json" "$TMPD/"

# De-overlap: mains keep their slots; a filler starting inside another clip is
# pushed to start when it ends, or dropped if it no longer fits before the
# next chapter. Guarantees never two voices at once.
python3 - "$CHAPTERS" "$TMPD/durations.json" > "$TMPD/todo.txt" <<'EOF'
import json, sys
ch = json.load(open(sys.argv[1]))
durs = json.load(open(sys.argv[2]))
mains = {s for s in durs if not (s.startswith("filler-") or s.endswith("-wait"))}
ev = sorted([(float(c["t"]), c["step"]) for c in ch])
last_end = 0.0
for i, (t, step) in enumerate(ev):
    dur = durs.get(step, 2500) / 1000.0
    start = t
    if step not in mains and start < last_end:
        start = last_end
        nxt = ev[i + 1][0] if i + 1 < len(ev) else float("inf")
        if start + dur > nxt - 0.3:
            print(f"drop overlapped filler {step} at {t:.1f}s", file=sys.stderr)
            continue
        print(f"push filler {step} {t:.1f}s -> {start:.1f}s", file=sys.stderr)
    print(f"{step}\t{int(start * 1000)}")
    last_end = max(last_end, start + dur)
EOF

INPUTS=()
FILTERS=""
IDX=1
LABELS=""
while IFS=$'\t' read -r step ms; do
  [ -f "$TMPD/$step.m4a" ] || { echo "missing clip $step, skipping"; continue; }
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMPD/$step.m4a")
  echo "clip $step at ${ms}ms dur ${dur}s"
  INPUTS+=(-i "$TMPD/$step.m4a")
  FILTERS="${FILTERS}[$IDX:a]adelay=${ms}:all=1[d$IDX];"
  LABELS="${LABELS}[d$IDX]"
  IDX=$((IDX + 1))
done < "$TMPD/todo.txt"

N=$((IDX - 1))
if [ "$N" -eq 0 ]; then echo "no clips placed"; exit 1; fi
FILTERS="${FILTERS}${LABELS}amix=inputs=$N:normalize=0[a]"

# shellcheck disable=SC2068
# No -shortest: keep the full video length even after the last voice line.
ffmpeg -y -loglevel error -i "$SILENT" ${INPUTS[@]} \
  -filter_complex "$FILTERS" -map 0:v:0 -map "[a]" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac "$FINAL"

echo "FINAL=$FINAL"
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$FINAL"
