# CLAUDE.md

## 프로젝트 개요

**유펜 (Yupen)** — 유권자 페르소나 분석 시스템

전화 여론조사 및 유권자 데이터를 기반으로 선거구별 유권자 페르소나를 분석·시각화하는 도구.

## 프로젝트 구조

```
yupen/
├── frontend/       # Vite + React + Tailwind CSS v4
├── backend/        # FastAPI (Python)
├── data/           # 유권자 데이터 파일 (.csv 등)
└── CLAUDE.md
```

## Frontend

- **스택**: Vite 6, React 19, Tailwind CSS v4 (`@tailwindcss/vite` 플러그인)
- **개발 서버 실행**: `cd frontend && npm run dev` → http://localhost:5173
- **빌드**: `cd frontend && npm run build`
- **Tailwind 설정**: `vite.config.js`에 플러그인으로 등록, `src/index.css`에 `@import "tailwindcss"` 사용 (v4 방식, tailwind.config.js 불필요)

## Backend

- **스택**: FastAPI, Uvicorn, Pydantic v2
- **개발 서버 실행**: `cd backend && uvicorn main:app --reload` → http://localhost:8000
- **의존성 설치**: `cd backend && pip install -r requirements.txt`
- **API 문서**: http://localhost:8000/docs (Swagger UI 자동 생성)
- **CORS**: `http://localhost:5173` 허용

## Data

- `data/` 폴더에 선거구별 유권자 CSV 데이터 저장
- 파일 명명 규칙: `{선거구}_voters_mock.csv`
- 현재 데이터: `bukgu_gap.csv` — 부산 북구갑 200명
  - 선거인수·동별비율: 22대 총선 선관위 공개 데이터 (총 122,440명)
  - 연령별 분포: 부산 북구 주민등록 인구통계 (18세+ 기준)
  - 지지율: 미디어토마토 2026-04-24~25, n=802

### CSV 컬럼 구조

| 컬럼 | 설명 |
|------|------|
| id | 고유 번호 |
| 이름 | 한국어 이름 |
| 성별 | 남/여 |
| 나이 | 만 나이 |
| 거주동 | 구포1동/구포2동/구포3동/덕천1동/덕천2동/덕천3동/만덕2동/만덕3동 |
| 직업 | 직업 분류 |
| 학력 | 중졸/고졸/전문대졸/대졸/대학원졸 |
| 가구형태 | 단독주택/아파트/빌라·연립/원룸·고시원 |
| 주요관심이슈 | 부동산/일자리/복지/교육/안보 |
| 지지후보 | 하정우/한동훈/박민식/미정 |
| 지지강도 | 1~5 (미정=1~2, 지지=3~5) |
| 투표의향 | 반드시/아마도/모름/안할것 |
| 정치성향 | 진보/중도/보수 |
| 과거투표정당 | 민주당/국민의힘/정의당/기타/없음(첫투표) |
| 말투특성 | 적극적/소극적/감정적/논리적/무관심 |
