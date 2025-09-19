#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  debug() {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky: $*"
  }
  husky_dir=$(dirname "$0")/..
  hook_name=$(basename "$0")
  debug "current working directory is $(pwd)"
  if [ -f $husky_dir/.huskyrc ]; then
    debug "reading $husky_dir/.huskyrc"
    . "$husky_dir/.huskyrc"
  fi
  export husky_skip_init=1
  sh -e "$husky_dir/$hook_name" "$@"
  exit $?
fi
