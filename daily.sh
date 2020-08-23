#!/bin/bash
cd ~/Downloads/yachtworld-puppeteer/
NOW=$(date)
T="$(date +%s)"
/usr/local/bin/node index.js
$($NODEJS) 2>> log.txt
T="$(($(date +%s)-T))"
echo "$NOW ${T}" >> log.txt