import asyncio
import json
import math
import os
import random
import sqlite3
import time
import traceback
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from datetime import datetime
from pathlib import Path

from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="유펜 (Yupen) API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://yupen-7f5k.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR          = os.path.dirname(os.path.abspath(__file__))
DB_PATH           = Path(os.path.join(BASE_DIR, 'backend', 'data', 'personas.db'))
POLL_HISTORY_PATH = Path(os.path.join(BASE_DIR, 'backend', 'data', 'poll_history.json'))
CONTEXT_PATH      = Path(os.path.join(BASE_DIR, 'backend', 'data', 'context.md'))

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_context: str | None = None


# ─── DB 헬퍼 ─────────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


AGE_BAND_RANGES: dict[str, tuple[int, int]] = {
    "20대":    (18, 29),
    "30대":    (30, 39),
    "40대":    (40, 49),
    "50대":    (50, 59),
    "60대":    (60, 69),
    "70대이상": (70, 99),
}

_STRATA_CACHE: list[dict] | None = None
_STRATA_TOTAL: int = 0


def _load_strata() -> tuple[list[dict], int]:
    global _STRATA_CACHE, _STRATA_TOTAL
    if _STRATA_CACHE is None:
        conn = get_db()
        rows = conn.execute("""
            SELECT 거주동,
                CASE
                    WHEN 나이 < 30 THEN '20대'
                    WHEN 나이 < 40 THEN '30대'
                    WHEN 나이 < 50 THEN '40대'
                    WHEN 나이 < 60 THEN '50대'
                    WHEN 나이 < 70 THEN '60대'
                    ELSE '70대이상'
                END AS age_band,
                COUNT(*) AS cnt
            FROM voters
            GROUP BY 거주동, age_band
            ORDER BY 거주동, age_band
        """).fetchall()
        conn.close()
        _STRATA_CACHE = [dict(r) for r in rows]
        _STRATA_TOTAL = sum(r["cnt"] for r in _STRATA_CACHE)
    return _STRATA_CACHE, _STRATA_TOTAL


def stratified_sample(n: int) -> list[dict]:
    """동별·연령별 비율을 유지하는 층화추출."""
    strata, total_pop = _load_strata()
    result: list[dict] = []
    allocated = 0
    conn = get_db()

    for i, s in enumerate(strata):
        if i == len(strata) - 1:
            k = n - allocated
        else:
            k = round(n * s["cnt"] / total_pop)
            allocated += k
        if k <= 0:
            continue
        age_min, age_max = AGE_BAND_RANGES[s["age_band"]]
        rows = conn.execute("""
            SELECT * FROM voters
            WHERE 거주동 = ? AND 나이 >= ? AND 나이 <= ?
            ORDER BY RANDOM()
            LIMIT ?
        """, (s["거주동"], age_min, age_max, k)).fetchall()
        result.extend(dict(r) for r in rows)

    conn.close()
    random.shuffle(result)
    return result


def get_context() -> str:
    global _context
    if _context is None:
        _context = CONTEXT_PATH.read_text(encoding="utf-8") if CONTEXT_PATH.exists() else ""
    return _context


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SurveyRequest(BaseModel):
    voter_id: int
    question: str


class SurveyResponse(BaseModel):
    voter_id: int
    name: str
    response: str
    emotion: str
    persuasibility: float


class BatchSurveyRequest(BaseModel):
    question: str
    거주동: str | None = None
    연령대: str | None = None
    성별: str | None = None
    지지후보: str | None = None
    정치성향: str | None = None
    max_voters: int = 30


class BatchSurveyStats(BaseModel):
    total: int
    question: str
    candidate_reactions: dict[str, dict]
    undecided_reactions: list[dict]
    persuasible_count: int
    avg_persuasibility: float
    results: list[SurveyResponse]


class PollRequest(BaseModel):
    question: str
    sample_size: int


class PollUpdateRequest(BaseModel):
    version: int
    date: str
    results: dict  # { overall: {하정우: 35, 한동훈: 34, ...}, byAge: {...}, byDong: {...} }


# ─── Claude Helpers ───────────────────────────────────────────────────────────

DISTRICT_CONTEXT = {
    "구포1동": (
        "【2선거 추이】 21대 국힘 우세(-127표) → 22대 민주 역전(+48표). "
        "전재수 효과로 겨우 뒤집혔지만 하정우로 바뀌면 다시 국힘으로 돌아갈 수 있는 지역. "
        "서민·자영업자 중심. 매 선거마다 결과가 바뀌는 만큼 이 동네 주민들은 "
        "'어느 쪽이 실제로 우리 동네를 잘 챙겨줬냐'에 매우 민감하며 부동층 비율이 가장 높음. "
        "100표 차이로 승부가 갈리는 초박빙 경합지."
    ),
    "구포2동": (
        "【2선거 추이】 21대 민주 미세 우세(+55표) → 22대 민주 우세(+604표, +2.1%p 강화). "
        "구포역 상권 중심, 배달기사·일용직·소상공인 많음. "
        "민주 우세가 강화 추세이나 하정우의 '외지인' 이미지가 전재수 지지층 이탈을 유발할 경우 "
        "21대 수준의 초박빙으로 되돌아갈 수 있어 결집 여부가 중요한 지역."
    ),
    "구포3동": (
        "【2선거 추이】 21대 사실상 동률(+10표) → 22대 민주 우세(+540표, +2.9%p 전환). "
        "서민 주거지로 투표율 61.0%로 전 동 중 가장 낮음. "
        "민주 우세로 전환됐지만 저투표율 지역이라 결집 여부에 따라 크게 흔들리며, "
        "하정우가 전재수만큼 동네를 누비지 않으면 다시 동률로 돌아갈 수 있는 지역."
    ),
    "덕천1동": (
        "【2선거 추이】 21대 국힘 명확 우세(-547표) → 22대 박빙(-101표, +2.8%p 좁혀짐). "
        "중산층 아파트 단지. 원래 국힘 기반이 탄탄하던 지역이었는데 전재수 개인 경쟁력으로 "
        "4년 만에 격차가 크게 좁혀졌음. "
        "하정우로 교체되면 원래 보수 성향으로 되돌아갈 가능성이 높으며, "
        "이 동네 주민들 사이에서는 '전재수니까 찍었지 민주당이 좋아서가 아니다'는 정서가 강함."
    ),
    "덕천2동": (
        "【2선거 추이】 21대 국힘 우세(-174표) → 22대 거의 동률(-25표, +1.1%p 좁혀짐). "
        "아파트 중심 중산층 지역. 전재수 효과로 간격이 좁혀졌으나 기저는 보수 성향. "
        "하정우로 교체 시 다시 국힘 우세로 회귀할 수 있으며, "
        "이 동네 주민들은 '전재수는 우리 동네 사람 같았는데 하정우는 모르겠다'는 반응이 많음. "
        "보수 단일화 성사 여부가 결과를 가르는 핵심 변수."
    ),
    "덕천3동": (
        "【2선거 추이】 21대 국힘 우세(-271표) → 22대 거의 동률(-41표, +1.7%p 좁혀짐). "
        "아파트 단지. 덕천권 중 21대→22대 개선폭이 두 번째로 크지만 여전히 국힘 우세 기조. "
        "전재수 개인 매력으로 흔들렸던 보수 성향 지역이며, "
        "'민주당이 좋다기보다 전재수 의원 개인이 좋았다'는 정서가 남아 있음. "
        "부동층 비율이 덕천권에서 가장 높고 보수 단일화 시 가장 극적으로 바뀔 수 있는 동."
    ),
    "만덕2동": (
        "【2선거 추이】 21대 민주 우세(+709표) → 22대 민주 강세(+1,502표, +2.7%p, 격차 두 배). "
        "유권자 22,812명으로 전 동 중 최대. 두 선거 모두 투표율 70%대로 참여 의식 높음. "
        "하정우의 핵심 텃밭으로 이 동네 주민들은 민주당 지지 의식이 강하고 "
        "'전재수 가신 게 아쉽다'면서도 민주당 후보를 밀어주는 경향. "
        "단, 하정우가 외지인이라는 것에 불만을 표하는 경우도 있음."
    ),
    "만덕3동": (
        "【2선거 추이】 21대 초박빙(+45표) → 22대 민주 소폭 우세(+212표, +0.5%p). "
        "고지대 서민층 지역으로 투표율 72.1%로 높음. "
        "두 선거 모두 초박빙~소폭 우세를 유지하는 핵심 스윙 지역으로, "
        "이 동네 주민들은 특정 정당보다 '누가 더 우리 생활에 도움이 되냐'를 따지며 "
        "부동층이 캐스팅보트 역할을 함. 보수 단일화 시 결과가 뒤집힐 수 있는 요주의 지역."
    ),
}

AGE_BAND_CONTEXT = {
    "20대": (
        "【부산시장 분리투표 패턴】 20대는 부산시장에서 전재수·박형준 팽팽(34% vs 36~43%). "
        "국회의원 투표도 뚜렷한 정당 쏠림 없이 후보 개인 이미지로 결정하는 경향. "
        "정치 무관심층 비율이 높아 '어차피 다 똑같다'는 반응도 흔함."
    ),
    "30대": (
        "【부산시장 분리투표 패턴】 30대는 부산시장 전재수 소폭 우세(43~45% vs 34~38%). "
        "국회의원 선거도 민주 방향이나 한동훈 개인 팬덤에 끌리는 경우도 있음. "
        "경제·일자리 이슈에 민감하며 '실제로 먹고살기 나아지는지'를 기준으로 판단."
    ),
    "40대": (
        "【부산시장 분리투표 패턴】 40대는 부산시장 전재수 강세(56% vs 27~34%). "
        "국회의원도 하정우 방향으로 민주당 동반 지지 성향이 강함. "
        "두 장 모두 민주 쪽으로 찍을 가능성이 가장 높은 세대. "
        "부동산·교육 이슈에 민감하고 이재명 정부 국정 운영에 관심이 많음."
    ),
    "50대": (
        "【부산시장 분리투표 패턴】 50대는 부산시장 전재수 우세(53~55% vs 34~39%). "
        "국회의원 하정우 지지 성향이 있으나 전재수 지지가 하정우 지지보다 더 강함. "
        "복지·의료 이슈에 관심이 높고 '누가 실제로 일 잘하는지'를 중시."
    ),
    "60대": (
        "【부산시장 분리투표 패턴】 60대는 부산시장 박형준 우세(44~50% vs 43%). "
        "그러나 국회의원은 아직 고민 중인 경우가 많아 분리투표 가능성이 가장 높은 세대. "
        "'시장은 박형준, 국회의원은 한동훈 또는 박민식' 식으로 보수 쪽으로 정리하거나, "
        "'시장은 전재수, 국회의원은 모르겠다' 식으로 갈릴 수 있음. "
        "안보·복지 이슈에 민감하고 경험 있는 후보를 선호."
    ),
    "70대이상": (
        "【부산시장 분리투표 패턴】 70대 이상은 부산시장 박형준 압도(56% vs 31~33%). "
        "국회의원도 보수 후보로 일관되게 결집하는 세대. "
        "두 장 모두 보수 쪽으로 찍을 가능성이 가장 높으며 '나라가 바로 서야 한다'는 "
        "안보·질서 가치관이 투표 결정에 강하게 작용."
    ),
}


def get_age_band(age: int) -> str:
    if age < 30:
        return "20대"
    elif age < 40:
        return "30대"
    elif age < 50:
        return "40대"
    elif age < 60:
        return "50대"
    elif age < 70:
        return "60대"
    else:
        return "70대이상"


SPEECH_GUIDE = {
    "적극적": "목소리가 크고 단호하며 의견을 먼저 내세운다. 짧고 강한 어투.",
    "소극적": "말끝을 흐리고 망설이며 조용히 대답한다. '글쎄요…', '잘 모르겠어요'.",
    "감정적": "감정이 앞서고 '솔직히', '억울하다', '답답하다' 같은 표현을 쓴다.",
    "논리적": "이유와 근거를 들어 차분하게 설명한다. 숫자나 사실을 언급한다.",
    "무관심": "짧게 답하고 빨리 끊으려 한다. '그냥요', '잘 모르겠어요', '바빠서요'.",
}

SURVEY_SYSTEM_PROMPT = """당신은 전화 여론조사 시뮬레이터입니다. 주어진 유권자 페르소나를 완벽하게 연기하여 실제 전화 여론조사 응답자처럼 대답하세요.

규칙:
1. 부산 사투리(경상도 사투리)를 자연스럽게 섞어 씁니다.
2. 전화 응답이므로 2-4문장 이내로 짧게 답합니다.
3. 지지강도 1-2면 흔들릴 수 있는 부동층처럼, 3이면 보통, 4-5면 확고하게 답합니다.
4. 말투특성을 그대로 반영합니다.
5. 이재명 대통령 국정지지도가 투표 선택의 핵심 갈림길입니다:
   - 이재명 "잘함" 성향 유권자(진보·민주 지지층): 하정우 63% 지지 → 강하게 지지 표현
   - 이재명 "못함" 성향 유권자(보수층): 박민식 53% / 한동훈 39% → 보수 후보 결집
   - 최신 다자대결 지지율: 하정우 34.3% / 한동훈 33.5% / 박민식 21.5% (5/1~3 한길리서치 5차, n=584) — 하정우·한동훈 오차범위 내 초박빙
6. 연령대별 분리투표 패턴을 반영합니다:
   - 40~50대: 부산시장 전재수 + 국회의원 하정우 동반 지지 가능성 높음
   - 60대: 부산시장·국회의원 분리투표 성향 — "시장은 몰라도 의원은 고민 중" 뉘앙스 자연스럽게
   - 70대+: 두 장 모두 보수 결집 — 안보·질서 가치관 우선
7. 한동훈 지지자 특성을 반영합니다 (소극적 지지층):
   - 적극 투표 의향 55.1% — 하정우(79%)·박민식(60%) 지지자보다 낮음 → 다소 소극적으로 연기
   - 부산시장은 박형준 64.7% 지지하는 분리투표 성향 → 시장 질문 시 박형준 언급 가능
   - 단일화에 가장 적극 찬성(68.2%) → 단일화 관련 질문 시 찬성 뉘앙스
8. 공항 이슈(가덕도 신공항 vs 김해공항 확장) 질문 시: 민주 지지자라도 현실론(김해공항 확장)을 선호하는 경우가 많음. 무조건 가덕도를 지지하지 않아도 됨.
9. 반드시 아래 JSON 형식으로만 응답하세요:
{"response": "...", "emotion": "긍정|부정|중립|불안|분노|기대", "persuasibility": 0.0~1.0}

persuasibility는 이 유권자가 다른 후보로 설득될 가능성입니다 (지지강도 낮을수록, 미정일수록 높음)."""

POLL_SYSTEM_PROMPT = """당신은 전화 여론조사 응답자입니다. 주어진 유권자 페르소나로 간단히 응답하세요.

반드시 아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{"choice": "후보명"}

선택지: "하정우", "한동훈", "박민식", "무응답"
- 지지후보가 있으면 해당 후보 선택
- 지지강도 1-2이고 말투가 무관심/소극적이면 "무응답" 가능
- 이재명 지지도가 갈림길: 진보·민주 지지층 → 하정우, 보수·이재명 반대층 → 박민식/한동훈
- 한동훈 지지자는 소극적 지지층 — 지지강도 낮으면 무응답 가능성이 다른 후보 지지자보다 높음
- 60대 중도 성향은 분리투표 경향 — 다른 후보 선택 가능
- 그 외에는 지지후보 그대로 답변"""


async def call_claude_survey(voter: dict, question: str) -> dict:
    speech = SPEECH_GUIDE.get(voter["말투특성"], "")
    intensity = int(voter["지지강도"])
    candidate = voter["지지후보"]
    is_undecided = candidate == "미정"
    undecided_note = "아직 지지후보를 정하지 못한 부동층입니다." if is_undecided else ""

    dong_ctx = DISTRICT_CONTEXT.get(voter["거주동"], "")
    age_band = get_age_band(int(voter["나이"]))
    age_ctx = AGE_BAND_CONTEXT.get(age_band, "")
    persona_text = (
        f"[거주 지역 맥락] {voter['거주동']}: {dong_ctx}\n"
        f"[연령대 맥락] {age_band}: {age_ctx}\n\n"
        f"유권자 페르소나:\n"
        f"- 이름: {voter['이름']}, {voter['나이']}세 {voter['성별']}\n"
        f"- 거주동: {voter['거주동']}, 직업: {voter['직업']}\n"
        f"- 지지후보: {candidate} (지지강도: {intensity}/5)\n"
        f"- 정치성향: {voter['정치성향']}, 과거투표정당: {voter['과거투표정당']}\n"
        f"- 주요관심이슈: {voter['주요관심이슈']}\n"
        f"- 말투특성: {voter['말투특성']} — {speech}\n"
        f"- 투표의향: {voter['투표의향']}\n"
        f"{undecided_note}"
    )

    message = await client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        system=[
            {"type": "text", "text": get_context(), "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": SURVEY_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
        ],
        messages=[{"role": "user", "content": f"{persona_text}\n\n조사원 질문: {question}"}],
    )

    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except Exception:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            return json.loads(m.group())
        return {"response": raw, "emotion": "중립", "persuasibility": 0.5}


async def call_claude_poll(voter: dict, question: str) -> dict:
    """갤럽식 여론조사용 단순 후보 선택 호출"""
    intensity = int(voter["지지강도"])
    candidate = voter["지지후보"]

    dong_ctx = DISTRICT_CONTEXT.get(voter["거주동"], "")
    age_band = get_age_band(int(voter["나이"]))
    age_ctx = AGE_BAND_CONTEXT.get(age_band, "")
    persona = (
        f"[지역] {voter['거주동']}: {dong_ctx}\n"
        f"[연령대] {age_band}: {age_ctx}\n"
        f"유권자: {voter['나이']}세 {voter['성별']}, {voter['직업']}\n"
        f"지지후보: {candidate} (지지강도: {intensity}/5)\n"
        f"정치성향: {voter['정치성향']}, 말투특성: {voter['말투특성']}, 투표의향: {voter['투표의향']}"
    )

    try:
        msg = await client.messages.create(
            model="claude-opus-4-7",
            max_tokens=32,
            system=[
                {"type": "text", "text": get_context(), "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": POLL_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
            ],
            messages=[{"role": "user", "content": f"{persona}\n\n조사원 질문: {question}"}],
        )
        raw = msg.content[0].text.strip()
        data = json.loads(raw)
        choice = data.get("choice", "무응답")
        if choice not in ["하정우", "한동훈", "박민식", "무응답"]:
            choice = "무응답"

        u = msg.usage
        cost = (
            getattr(u, "input_tokens", 0) * 5 / 1_000_000
            + getattr(u, "output_tokens", 0) * 25 / 1_000_000
            + getattr(u, "cache_read_input_tokens", 0) * 0.5 / 1_000_000
            + getattr(u, "cache_creation_input_tokens", 0) * 6.25 / 1_000_000
        )
        return {"choice": choice, "cost": cost}

    except Exception:
        fallback = candidate if candidate in ["하정우", "한동훈", "박민식"] else "무응답"
        return {"choice": fallback, "cost": 0.0}


# ─── Poll History Helpers ─────────────────────────────────────────────────────

def load_poll_history() -> list:
    if not POLL_HISTORY_PATH.exists():
        return []
    try:
        return json.loads(POLL_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_poll_history(history: list) -> None:
    try:
        POLL_HISTORY_PATH.write_text(
            json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except OSError:
        pass


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "유펜 (Yupen) API"}


@app.get("/health")
def health():
    db_ok = DB_PATH.exists()
    return {"status": "ok", "db": str(DB_PATH), "db_exists": db_ok}


@app.get("/api/voters")
def get_voters(
    거주동: str | None = Query(None),
    연령대: str | None = Query(None),
    성별: str | None = Query(None),
    지지후보: str | None = Query(None),
    정치성향: str | None = Query(None),
    limit: int = Query(200, ge=1, le=2000),
):
    query = "SELECT * FROM voters WHERE 1=1"
    params: list = []

    if 거주동:
        query += " AND 거주동=?"
        params.append(거주동)
    if 성별:
        query += " AND 성별=?"
        params.append(성별)
    if 지지후보:
        query += " AND 지지후보=?"
        params.append(지지후보)
    if 정치성향:
        query += " AND 정치성향=?"
        params.append(정치성향)
    if 연령대 and 연령대 in AGE_BAND_RANGES:
        lo, hi = AGE_BAND_RANGES[연령대]
        query += " AND 나이>=? AND 나이<=?"
        params.extend([lo, hi])

    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    conn = get_db()
    total = conn.execute(count_query, params).fetchone()[0]
    rows = conn.execute(query + f" ORDER BY RANDOM() LIMIT {limit}", params).fetchall()
    conn.close()
    return {"total": total, "returned": len(rows), "voters": [dict(r) for r in rows]}


@app.post("/api/survey", response_model=SurveyResponse)
async def survey(req: SurveyRequest):
    try:
        conn = get_db()
        row = conn.execute("SELECT * FROM voters WHERE id=?", (req.voter_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="유권자를 찾을 수 없습니다.")
        voter = dict(row)
        result = await call_claude_survey(voter, req.question)
        return SurveyResponse(
            voter_id=req.voter_id,
            name=str(voter["이름"]),
            response=result.get("response", ""),
            emotion=result.get("emotion", "중립"),
            persuasibility=float(result.get("persuasibility", 0.5)),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")


@app.post("/api/batch-survey", response_model=BatchSurveyStats)
async def batch_survey(req: BatchSurveyRequest):
    query = "SELECT * FROM voters WHERE 1=1"
    params: list = []

    if req.거주동:
        query += " AND 거주동=?"
        params.append(req.거주동)
    if req.성별:
        query += " AND 성별=?"
        params.append(req.성별)
    if req.지지후보:
        query += " AND 지지후보=?"
        params.append(req.지지후보)
    if req.정치성향:
        query += " AND 정치성향=?"
        params.append(req.정치성향)
    if req.연령대 and req.연령대 in AGE_BAND_RANGES:
        lo, hi = AGE_BAND_RANGES[req.연령대]
        query += " AND 나이>=? AND 나이<=?"
        params.extend([lo, hi])

    query += f" ORDER BY RANDOM() LIMIT {req.max_voters}"

    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="조건에 맞는 유권자가 없습니다.")

    voters_list = [dict(r) for r in rows]
    voters_by_id = {v["id"]: v for v in voters_list}

    semaphore = asyncio.Semaphore(5)

    async def bounded_call(voter: dict) -> SurveyResponse:
        async with semaphore:
            result = await call_claude_survey(voter, req.question)
            return SurveyResponse(
                voter_id=int(voter["id"]),
                name=str(voter["이름"]),
                response=result.get("response", ""),
                emotion=result.get("emotion", "중립"),
                persuasibility=float(result.get("persuasibility", 0.5)),
            )

    results: list[SurveyResponse] = await asyncio.gather(
        *[bounded_call(v) for v in voters_list]
    )

    candidate_reactions: dict[str, dict] = {}
    undecided_reactions: list[dict] = []
    persuasible_count = 0
    total_persuasibility = 0.0

    for r in results:
        voter_row = voters_by_id[r.voter_id]
        candidate = str(voter_row["지지후보"])
        total_persuasibility += r.persuasibility
        if r.persuasibility >= 0.6:
            persuasible_count += 1
        if candidate == "미정":
            undecided_reactions.append({
                "voter_id": r.voter_id, "name": r.name,
                "response": r.response, "emotion": r.emotion,
                "persuasibility": r.persuasibility,
            })
        else:
            if candidate not in candidate_reactions:
                candidate_reactions[candidate] = {
                    "count": 0, "emotions": {}, "avg_persuasibility": 0.0, "_total_p": 0.0,
                }
            cr = candidate_reactions[candidate]
            cr["count"] += 1
            cr["emotions"][r.emotion] = cr["emotions"].get(r.emotion, 0) + 1
            cr["_total_p"] += r.persuasibility

    for cr in candidate_reactions.values():
        if cr["count"] > 0:
            cr["avg_persuasibility"] = round(cr["_total_p"] / cr["count"], 3)
        del cr["_total_p"]

    return BatchSurveyStats(
        total=len(results),
        question=req.question,
        candidate_reactions=candidate_reactions,
        undecided_reactions=undecided_reactions,
        persuasible_count=persuasible_count,
        avg_persuasibility=round(total_persuasibility / len(results), 3) if results else 0.0,
        results=results,
    )


@app.post("/api/poll")
async def run_poll(req: PollRequest):
    """갤럽식 여론조사: 층화추출(동별·연령별 비율 유지) 후 병렬 Claude 호출"""
    if req.sample_size < 1 or req.sample_size > 2000:
        raise HTTPException(status_code=400, detail="sample_size는 1~2000 사이여야 합니다.")

    sample = stratified_sample(req.sample_size)

    semaphore = asyncio.Semaphore(10)

    async def bounded_poll(voter: dict) -> dict:
        async with semaphore:
            return await call_claude_poll(voter, req.question)

    start_time = time.time()
    poll_results = await asyncio.gather(*[bounded_poll(v) for v in sample])
    duration = round(time.time() - start_time, 1)

    counts = {"하정우": 0, "한동훈": 0, "박민식": 0, "무응답": 0}
    total_cost = 0.0
    for r in poll_results:
        counts[r["choice"]] = counts.get(r["choice"], 0) + 1
        total_cost += r.get("cost", 0.0)

    actual_size = len(poll_results)
    results = {
        c: {"count": cnt, "pct": round(cnt / actual_size * 100, 1)}
        for c, cnt in counts.items()
    }

    moe = round(196 / math.sqrt(actual_size), 1)

    record = {
        "id": str(uuid.uuid4())[:8],
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "question": req.question,
        "sample_size": actual_size,
        "sampling": "stratified",
        "results": results,
        "moe": moe,
        "total_cost": round(total_cost, 4),
        "duration_sec": duration,
    }

    history = load_poll_history()
    history.append(record)
    save_poll_history(history)

    return record


@app.get("/api/poll-history")
async def get_poll_history():
    """지금까지 실시한 여론조사 히스토리 반환"""
    return load_poll_history()


@app.post("/api/update-poll")
def update_poll(req: PollUpdateRequest):
    """새 여론조사 데이터로 personas.db의 지지후보를 갱신한다.

    volatility 높은 페르소나부터 delta만큼 지지후보를 변경하고
    poll_version / last_updated를 전체 업데이트한다.
    """
    global _STRATA_CACHE

    overall = req.results.get("overall", {})
    if not overall:
        raise HTTPException(status_code=400, detail="results.overall 필드가 필요합니다.")

    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM voters").fetchone()[0]

    current = {
        r["지지후보"]: r["cnt"]
        for r in conn.execute(
            "SELECT 지지후보, COUNT(*) as cnt FROM voters GROUP BY 지지후보"
        ).fetchall()
    }

    CANDS = ["하정우", "한동훈", "박민식", "미정"]
    target: dict[str, int] = {}
    for c in CANDS:
        target[c] = round(total * overall.get(c, 0) / 100)
    # 반올림 오차 보정
    target["미정"] += total - sum(target.values())

    delta = {c: target.get(c, 0) - current.get(c, 0) for c in CANDS}

    losers  = sorted([c for c in CANDS if delta[c] < 0], key=lambda x: delta[x])
    gainers = sorted([c for c in CANDS if delta[c] > 0], key=lambda x: -delta[x])

    if not losers or not gainers:
        conn.close()
        return {"changed": 0, "message": "변경 불필요 — 목표치와 현재치가 동일합니다."}

    from_to: dict[str, int] = {}
    total_changed = 0

    try:
        with conn:
            update_stmt = "UPDATE voters SET 지지후보=?, poll_version=?, last_updated=? WHERE id=?"

            g_idx = 0
            g_remain = delta[gainers[0]]

            for loser in losers:
                needed = -delta[loser]
                switchers = conn.execute("""
                    SELECT id FROM voters
                    WHERE 지지후보 = ?
                    ORDER BY volatility DESC
                    LIMIT ?
                """, (loser, needed)).fetchall()

                for s in switchers:
                    while g_remain <= 0 and g_idx < len(gainers) - 1:
                        g_idx += 1
                        g_remain = delta[gainers[g_idx]]
                    new_cand = gainers[g_idx]
                    conn.execute(update_stmt, (new_cand, req.version, req.date, s["id"]))
                    g_remain -= 1
                    key = f"{loser}→{new_cand}"
                    from_to[key] = from_to.get(key, 0) + 1
                    total_changed += 1

            # poll_version / last_updated 전체 갱신
            conn.execute(
                "UPDATE voters SET poll_version=?, last_updated=?",
                (req.version, req.date)
            )

    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    conn.close()
    _STRATA_CACHE = None  # 층화 캐시 무효화

    return {
        "changed": total_changed,
        "from_to": from_to,
        "new_version": req.version,
        "updated_at": req.date,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=False, log_level="info")
