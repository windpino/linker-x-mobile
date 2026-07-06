import sys

def count_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    counts = {
        '{': 0, '}': 0,
        '(': 0, ')': 0,
        '[': 0, ']': 0
    }
    
    for char in content:
        if char in counts:
            counts[char] += 1
            
    print(f"Braces count for {filename}:")
    print(f"  {{ }}: {counts['{']} / {counts['}']} (Diff: {counts['{'] - counts['}']})")
    print(f"  ( ): {counts['(']} / {counts[')']} (Diff: {counts['('] - counts[')']})")
    print(f"  [ ]: {counts['[']} / {counts[']']} (Diff: {counts['['] - counts[']']})")

if __name__ == "__main__":
    count_braces(sys.argv[1])
