#!/usr/bin/env bash
# Replace body color:
convert balloon_prototype.png -fill $2 -opaque rgb(237,28,36) PNG:out/balloon_$1.png

# Replace light color:
convert out/balloon_$1.png -fill $3 -opaque rgb(255,174,201) PNG:out/balloon_$1.png
