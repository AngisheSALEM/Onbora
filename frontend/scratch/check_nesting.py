file_path = r"C:\Users\Salem\Documents\projet\Onbora\frontend\src\app\client\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

paren_stack = []
brace_stack = []

for line_idx in range(len(lines)):
    line_num = line_idx + 1
    line = lines[line_idx]
    for char_idx, char in enumerate(line):
        if char == '(':
            paren_stack.append(line_num)
        elif char == ')':
            if paren_stack:
                popped = paren_stack.pop()
                if line_num >= 1640:
                    print(f"Line {line_num}: Popped paren from line {popped}")
            else:
                print(f"Extra closing parenthesis on line {line_num}")
        elif char == '{':
            brace_stack.append(line_num)
        elif char == '}':
            if brace_stack:
                popped = brace_stack.pop()
                if line_num >= 1640:
                    print(f"Line {line_num}: Popped brace from line {popped}")
            else:
                print(f"Extra closing brace on line {line_num}")
