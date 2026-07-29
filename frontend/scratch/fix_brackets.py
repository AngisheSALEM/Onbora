import os

file_path = r"C:\Users\Salem\Documents\projet\Onbora\frontend\src\app\client\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Verify line 1595 (0-indexed 1594)
target_line = lines[1594]
print("Target line before:", repr(target_line))

if "})" in target_line and "})}" not in target_line:
    lines[1594] = target_line.replace("})", "})}")
    print("Target line after:", repr(lines[1594]))
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Success!")
else:
    print("Brackets already correct or target line did not match.")
