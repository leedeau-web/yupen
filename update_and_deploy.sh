#!/bin/bash
echo "=== 유펜 배포 시작 ==="
cd C:/Users/User/voter-persona-analyzer

git add backend/data/context_daily.md backend/data/context_polls.md backend/data/context_issues.md
git commit -m "업데이트: $(date '+%Y-%m-%d %H:%M')"
git push origin master

echo "=== Railway 자동 재배포 시작됨 ==="
echo "=== 약 1~2분 후 반영 완료 ==="
