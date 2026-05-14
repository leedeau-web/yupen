# 유펜(Yupen) 프로젝트 브리핑

## 프로젝트 개요
- 북구갑 보궐선거 AI 여론조사 시뮬레이터
- GitHub: leedeau-web/yupen
- 배포: https://yupen-7f5k.vercel.app
- 로컬 경로: C:/Users/User/voter-persona-analyzer/

## 기술 스택
- 프론트엔드: React + Vite + TailwindCSS + Recharts (Vercel 배포)
- 백엔드: Python/FastAPI app.py (Railway 배포)
- 데이터: backend/data/ 하위 context 파일들

## 선거 기본 구도 (2026 6.3 지방선거)
- 북구갑 보궐: 하정우(민주) vs 한동훈(무소속) vs 박민식(국힘) 3자 구도
- 부산시장: 전재수(민주) vs 박형준(국힘) vs 정이한(개혁신당)

## 데이터 파일 구조 (2026-05-12 분리)
- context_base.md   : 섹션 1~2 (선거구도, 후보 포지셔닝) — 거의 수정 안 함
- context_polls.md  : 섹션 3~4 (북구갑/부산시장 여론조사) — 여론조사 추가 시
- context_daily.md  : 섹션 5 (일별 부산 동향) — 매일 추가
- context_issues.md : 섹션 6 (주요 현안) — 가끔 추가
- context_static.md : 섹션 7~11 (지역특성, 개표결과 등) — 수정 안 함

## 업데이트 방식
### 일별 동향 추가
- context_daily.md 끝에 추가
- 추가 후 AboutTab.jsx REFERENCE_DATA 일별 부산 동향 items[0] 날짜 범위 갱신
- 형식 예시:
  ### 5/13 (수) 부산 동향
  - 항목1
  - 항목2
- AboutTab 수정 예시 (날짜 범위 갱신):
  "5/1~5/12 부산 선거 동향 누적 수집" → "5/1~5/13 부산 선거 동향 누적 수집"

### 북구갑 여론조사 추가 (8차~)
1. polls.json surveys 배열 끝에 새 차수 데이터 추가
2. node backend/data/update_all.js 실행
   → personas.db / AboutTab.jsx / context_polls.md 자동 반영
3. AboutTab.jsx 자동 반영 항목:
   - POLL_WEIGHTS 배열에 새 차수 행 추가됨 (차수별 신뢰점수 표)
   - 가중 평균결과 표기 "1~7차" → "1~8차" 자동 갱신
   - personas.db 구성 poll_version, 마지막 업데이트, 지지후보 배분 자동 갱신
4. 수동 확인 필요: REFERENCE_DATA 부산시장 여론조사 items (최신 조사로 교체)

### 부산시장 여론조사 추가
- context_polls.md 섹션 4 끝부분에 추가
- AboutTab.jsx REFERENCE_DATA 부산시장 여론조사 items 수동 갱신
- 형식: 기관명/날짜/n수 + 후보 지지율 + 핵심 해석

### 주요 현안 추가
- context_issues.md 끝에 추가
- AboutTab.jsx REFERENCE_DATA 주요 현안 이슈 items 수동 갱신
- 형식: [날짜] 현안명 + 사건요약 + 감성영향 + AI시뮬레이션 반영지침

## 배포 방법
- 내용 수정 후 터미널에서: bash update_and_deploy.sh
- Railway 자동 재배포 → 1~2분 후 yupen-7f5k.vercel.app 반영

## AboutTab.jsx 위치별 수동 갱신 항목 정리
| 위치 | 항목 | 갱신 시점 |
|------|------|----------|
| POLL_WEIGHTS 배열 | 차수별 신뢰점수 표 | 여론조사 추가 시 (update_all.js 자동) |
| REFERENCE_DATA[0] | 부산시장 여론조사 최신 수치 | 부산시장 조사 추가 시 |
| REFERENCE_DATA[1] items[0] | 일별 동향 날짜 범위 | 동향 추가할 때마다 |
| REFERENCE_DATA[2] | 주요 현안 이슈 목록 | 현안 추가 시 |
| personas.db 구성 | poll_version, 날짜, 배분 | 여론조사 추가 시 (update_all.js 자동) |

## 모든 명령어는 클로드 코드 터미널에 입력
- 파일 확인: cat, sed, tail, grep
- 내용 추가: cat >> 파일경로 << 'EOF' ... EOF
- 줄 수정: Python 스크립트 권장 (한글/따옴표 충돌 방지)
