from pathlib import Path
import sys

path = Path(sys.argv[1])
sentinel = sys.argv[2]
chunks = []
while True:
    line = sys.stdin.readline()
    if line == '':
        break
    if line.rstrip('\r\n') == sentinel:
        break
    chunks.append(line)
path.write_text(''.join(chunks), encoding='utf-8')
