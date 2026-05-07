#!/bin/bash
set -e

echo "=== 유펜 Railway 시작 ==="

# Node.js 의존성 설치 (better-sqlite3)
if [ ! -d backend/data/node_modules ]; then
  echo "Node 패키지 설치 중..."
  cd backend/data
  npm install
  cd ../..
fi

# personas.db 없으면 생성
if [ ! -f backend/data/personas.db ]; then
  echo "personas.db 생성 중 (122,440명)..."
  cd backend/data
  node generate_personas_122440.js
  cd ../..
  echo "personas.db 생성 완료!"
fi

# 백엔드 실행
echo "백엔드 시작..."
python app.py
