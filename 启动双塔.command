#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "${0:A:h}" || exit 1
printf '\n泉州双塔：http://127.0.0.1:5179\n保持此窗口打开，按 Control+C 停止服务。\n\n'
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund || exit 1
fi
npm run dev -- --port 5179 --strictPort
