import re

with open('backend/data/context.md', encoding='utf-8') as f:
    content = f.read()

sections = re.split(r'\n(?=## \d+\.)', content)

files = {
    'context_base.md':   [1, 2],
    'context_polls.md':  [3, 4],
    'context_daily.md':  [5],
    'context_issues.md': [6],
    'context_static.md': [7, 8, 9, 10, 11],
}

parsed = {}
for s in sections:
    m = re.match(r'## (\d+)\.', s.strip())
    if m:
        parsed[int(m.group(1))] = s.strip()
    else:
        parsed[0] = s.strip()

for fname, nums in files.items():
    parts = []
    if fname == 'context_base.md' and 0 in parsed:
        parts.append(parsed[0])
    for n in nums:
        if n in parsed:
            parts.append(parsed[n])
    with open(f'backend/data/{fname}', 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(parts))
    print(f'✓ {fname} 생성 완료')

with open('app.py', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "CONTEXT_PATH      = Path(os.path.join(BASE_DIR, 'backend', 'data', 'context.md'))",
    "CONTEXT_DIR       = Path(os.path.join(BASE_DIR, 'backend', 'data'))"
)

content = content.replace(
    '''def get_context() -> str:
    global _context
    if _context is None:
        _context = CONTEXT_PATH.read_text(encoding="utf-8") if CONTEXT_PATH.exists() else ""
    return _context''',
    '''def get_context() -> str:
    global _context
    if _context is None:
        files = ["context_base.md", "context_polls.md", "context_daily.md", "context_issues.md", "context_static.md"]
        parts = []
        for fname in files:
            p = CONTEXT_DIR / fname
            if p.exists():
                parts.append(p.read_text(encoding="utf-8"))
        _context = "\n\n".join(parts)
    return _context'''
)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ app.py 수정 완료")
print("✓ 전체 작업 완료!")
