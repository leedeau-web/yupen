import asyncio, os, traceback
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
from anthropic import AsyncAnthropic

load_dotenv()

CSV_PATH = Path(__file__).parent.parent / "data" / "bukgu_gap.csv"

SPEECH_GUIDE = {
    "적극적": "목소리가 크고 단호하며 의견을 먼저 내세운다.",
    "소극적": "말끝을 흐리고 망설이며 조용히 대답한다.",
    "감정적": "감정이 앞서고 솔직히, 억울하다 같은 표현을 쓴다.",
    "논리적": "이유와 근거를 들어 차분하게 설명한다.",
    "무관심": "짧게 답하고 빨리 끊으려 한다.",
}

SYSTEM_PROMPT = """당신은 전화 여론조사 시뮬레이터입니다. 주어진 유권자 페르소나를 연기하여 실제 응답자처럼 대답하세요.
부산 사투리를 자연스럽게 섞고, 2-4문장으로 짧게 답하세요.
반드시 아래 JSON 형식으로만 응답하세요:
{"response": "...", "emotion": "긍정|부정|중립|불안|분노|기대", "persuasibility": 0.0}"""


async def test():
    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    voter = df[df["id"] == 1].iloc[0]

    print(f"voter: {voter['이름']}, {voter['나이']}세, {voter['말투특성']}, {voter['지지후보']}")

    speech = SPEECH_GUIDE.get(voter["말투특성"], "")
    persona = (
        f"유권자 페르소나:\n"
        f"- 이름: {voter['이름']}, {voter['나이']}세 {voter['성별']}\n"
        f"- 거주동: {voter['거주동']}, 직업: {voter['직업']}\n"
        f"- 지지후보: {voter['지지후보']} (지지강도: {voter['지지강도']}/5)\n"
        f"- 정치성향: {voter['정치성향']}, 과거투표정당: {voter['과거투표정당']}\n"
        f"- 주요관심이슈: {voter['주요관심이슈']}\n"
        f"- 말투특성: {voter['말투특성']} — {speech}\n"
        f"- 투표의향: {voter['투표의향']}\n"
    )

    try:
        msg = await client.messages.create(
            model="claude-opus-4-7",
            max_tokens=512,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": persona + "\n조사원 질문: 세 후보 중 누가 가장 지역 경제에 도움이 될 것 같으세요?",
                }
            ],
        )
        print("CLAUDE RESPONSE:", msg.content[0].text)
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e)[:500])
        traceback.print_exc()


asyncio.run(test())
