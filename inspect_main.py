from pathlib import Path
p = Path('app/main.py')
text = p.read_text(encoding='utf-8', errors='replace')
lines = text.splitlines()
for i, line in enumerate(lines[:220], 1):
    print(f'{i:03}: {line}')
