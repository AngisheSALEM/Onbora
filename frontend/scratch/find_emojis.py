import re

file_path = r"C:\Users\Salem\Documents\projet\Onbora\frontend\src\app\client\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Match standard ranges of emojis, including specific ones
emoji_pattern = re.compile(r"[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|✨|📦|💬|👤|📋|⚙️|⚠️|🛠️|✅")

for line_idx, line in enumerate(lines):
    line_num = line_idx + 1
    matches = emoji_pattern.findall(line)
    if matches:
        hex_matches = []
        for m in matches:
            if len(m) == 1:
                hex_matches.append(f"U+{ord(m):X}")
            else:
                hex_matches.append(f"U+{ord(m[0]):X}_U+{ord(m[1]):X}")
        print(f"Line {line_num}: {hex_matches}")
