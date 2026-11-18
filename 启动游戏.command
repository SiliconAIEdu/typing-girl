#!/bin/zsh
cd "${0:A:h}"
if curl --silent --fail http://127.0.0.1:4178/ 2>/dev/null | head -c 1000 | grep -q 'Luna'; then
  open 'http://127.0.0.1:4178'
  exit 0
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo '需要 Python 3 或 Node.js。安装后请按 README 的步骤启动。'
  read '?按回车关闭'
  exit 1
fi
python3 -m http.server 4178 --bind 127.0.0.1 &
game_server_pid=$!
trap 'kill "$game_server_pid" 2>/dev/null' EXIT INT TERM
sleep 1
open 'http://127.0.0.1:4178'
echo 'Luna & Keys 已打开。关闭这个窗口或按 Control+C 结束服务。'
wait "$game_server_pid"
