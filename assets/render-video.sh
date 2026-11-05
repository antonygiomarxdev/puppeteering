#!/usr/bin/env bash
# Renders assets/how-it-works.svg to assets/puppeteering.mp4, for sites that take no SVG.
# Needs chromium and ffmpeg. One browser per frame: slower, but a hung browser costs one frame.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

frame() {
  local i=$1 n t profile
  n=$(printf '%04d' "$i")
  t=$(awk "BEGIN { print $i / 20 }")
  profile=$(mktemp -d)
  sed "s|</style>|*{animation-delay:-${t}s!important;animation-play-state:paused!important}</style>|; 0,/width=\"1200\" height=\"675\"/s//width=\"1280\" height=\"720\"/" \
    "$here/how-it-works.svg" > "$work/t_$n.svg"
  timeout 60 chromium --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$profile" \
    --window-size=1280,720 --screenshot="$work/f_$n.png" "file://$work/t_$n.svg" >/dev/null 2>&1 || true
  rm -rf "$profile" "$work/t_$n.svg"
}
export -f frame
export here work

seq 0 479 | xargs -P 8 -I{} bash -c 'frame {}'
# A browser can die under load: render what is missing, one at a time.
for i in $(seq 0 479); do
  [ -s "$work/f_$(printf '%04d' "$i").png" ] || frame "$i"
done
count=$(find "$work" -name 'f_*.png' -size +0 | wc -l)
[ "$count" -eq 480 ] || { echo "only $count of 480 frames" >&2; exit 1; }

ffmpeg -y -loglevel error -framerate 20 -i "$work/f_%04d.png" -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart "$here/puppeteering.mp4"
echo "wrote assets/puppeteering.mp4"
