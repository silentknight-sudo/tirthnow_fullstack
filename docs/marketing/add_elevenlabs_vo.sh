#!/usr/bin/env bash
# Lay ElevenLabs voice-over clips onto the music-only ad video.
#
# Usage: ./add_elevenlabs_vo.sh TirthNow_App_Ad_music_only.mp4 vo_dir out.mp4
#   vo_dir holds 01.mp3 … 17.mp3 (one clip per scene, see AD_SCRIPT_HINGLISH.md).
# Each clip starts 0.35 s after its scene starts; music is ducked under the voice.
set -euo pipefail
video=$1; dir=$2; out=$3
starts=(0.00 6.47 16.68 22.05 32.77 43.91 52.26 67.12 73.64 80.62 92.16 107.77 118.33 125.49 135.88 142.86 147.77)
inputs=(); parts=""; mix=""
for i in $(seq 1 17); do
  f=$(printf "%s/%02d.mp3" "$dir" "$i")
  inputs+=(-i "$f")
  ms=$(awk -v s="${starts[$((i-1))]}" 'BEGIN{printf "%d",(s+0.35)*1000}')
  parts+="[$i:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v$i];"
  mix+="[v$i]"
done
ffmpeg -y -i "$video" "${inputs[@]}" -filter_complex \
  "${parts}${mix}amix=inputs=17:normalize=0,asplit=2[vo][vo2];[0:a][vo]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[md];[md][vo2]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$out"
