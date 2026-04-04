#!/bin/sh
export PATH=/usr/local/bin:/usr/bin:/bin
export NODE=/usr/local/bin/node
cd "$(dirname "$0")"
exec /usr/local/bin/node node_modules/.bin/next dev
