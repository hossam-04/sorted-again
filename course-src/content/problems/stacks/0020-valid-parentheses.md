---
id: 20
module: stacks
patterns: [stack of openers, matching pairs]
signature: "def isValid(self, s: str) -> bool"
---

## Task

You get a string `s` made only of the bracket characters `(`, `)`, `[`, `]`, `{` and `}`. Return `True` if the brackets are properly matched, and `False` otherwise.

Properly matched means: every closing bracket closes the most recently opened bracket that is still open, and it is of the same type; and when the string ends, no bracket is left open.

## Constraints

- `1 <= len(s) <= 100_000`
- `s` contains only the characters `()[]{}`

```json examples
[
  {"args": ["{[()()]}"], "out": true, "why": "Each closing bracket closes the most recent bracket that is still open."},
  {"args": ["[(])"], "out": false, "why": "The ] arrives while ( is still the most recently opened bracket."},
  {"args": ["(("], "out": false, "why": "Two brackets are opened and never closed."}
]
```

```json edge
[
  {"name": "one pair", "args": ["{}"], "out": true},
  {"name": "a lone opener", "args": ["["], "out": false},
  {"name": "a lone closer", "args": [")"], "out": false},
  {"name": "closer before opener", "args": [")("], "out": false},
  {"name": "mismatched types", "args": ["{)"], "out": false},
  {"name": "pairs side by side", "args": ["()[]{}()"], "out": true},
  {"name": "deep nesting", "args": ["(((((((((([]))))))))))"], "out": true},
  {"name": "extra closer at the end", "args": ["()]"], "out": false},
  {"name": "one opener too many", "args": ["((()"], "out": false}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    if rng.random() < 0.5:  # build a valid string, then maybe break it
        out, stack = [], []
        while len(out) + len(stack) < n:
            if stack and rng.random() < 0.5:
                out.append({"(": ")", "[": "]", "{": "}"}[stack.pop()])
            else:
                c = rng.choice("([{")
                stack.append(c)
                out.append(c)
        out += [{"(": ")", "[": "]", "{": "}"}[c] for c in reversed(stack)]
        if rng.random() < 0.5:
            out[rng.randrange(len(out))] = rng.choice("()[]{}")
        return ["".join(out)]
    return ["".join(rng.choice("()[]{}") for _ in range(n))]
```

```python perf
def perf(rng):
    # 50,000 nested openers, then their closers: 100,000 characters, nested 50,000 deep.
    openers = [rng.choice("([{") for _ in range(50_000)]
    closers = [{"(": ")", "[": "]", "{": "}"}[c] for c in reversed(openers)]
    return ["".join(openers + closers)]
```

## Hints

1. A closing bracket must match the most recent bracket that is still open. "Most recent first" is what a stack gives you.
2. Push every opening bracket. For a closing bracket, the top of the stack must be its partner; pop it.
3. Don't forget the two ways to fail besides a mismatch: a closer with nothing open, and openers left over at the end.

## Solution

```python solution time="n" space="n"
class Solution:
    def isValid(self, s: str) -> bool:
        partner = {")": "(", "]": "[", "}": "{"}
        stack = []
        for c in s:
            if c in partner:  # a closing bracket
                if not stack or stack[-1] != partner[c]:
                    return False
                stack.pop()
            else:
                stack.append(c)
        return not stack  # anything still open is unmatched
```

The stack holds the brackets that are open right now, with the most recent on top. A closing bracket is only legal if the top of the stack is its partner, which is exactly the "most recently opened" rule. Checking `not stack` before looking at the top handles a closer with nothing open, and the final `not stack` catches openers that never got closed.

Each character is pushed or popped at most once, so the time is O(n). In the worst case (all openers) the stack holds n characters.

## Alternatives

### Delete matched pairs until nothing changes

```python alt time="n²" space="n" slow oracle
class Solution:
    def isValid(self, s: str) -> bool:
        while "()" in s or "[]" in s or "{}" in s:
            s = s.replace("()", "").replace("[]", "").replace("{}", "")
        return s == ""
```

A properly matched string always has an adjacent pair somewhere, and removing it leaves a properly matched string. So deleting pairs until none are left decides the question. Each round rebuilds the string, and deeply nested input needs one round per level: 50,000 rounds over 100,000 characters on the performance test.

## Wrong answers

### Counts brackets but ignores their order

```python wrong fails="example" test="Example 2"
class Solution:
    def isValid(self, s: str) -> bool:
        balance = {"(": 0, "[": 0, "{": 0}
        partner = {")": "(", "]": "[", "}": "{"}
        for c in s:
            if c in partner:
                balance[partner[c]] -= 1
                if balance[partner[c]] < 0:
                    return False
            else:
                balance[c] += 1
        return all(v == 0 for v in balance.values())  # equal counts, but in any order
```

Counting each type works for a single kind of bracket, but with several kinds the order matters too. `"[(])"` has one of each bracket and never closes more than it opened, yet the `]` closes a `[` while a `(` is still open inside it.

### Forgets to check for leftovers

```python wrong fails="example" test="Example 3"
class Solution:
    def isValid(self, s: str) -> bool:
        partner = {")": "(", "]": "[", "}": "{"}
        stack = []
        for c in s:
            if c in partner:
                if not stack or stack.pop() != partner[c]:
                    return False
            else:
                stack.append(c)
        return True  # brackets still on the stack were never closed
```

Every closer is checked, but openers that are never closed simply stay on the stack. `"(("` has no wrong closer, so the loop finishes happily. Return `not stack` instead.

### Scans back for the partner

```python wrong fails="perf"
class Solution:
    def isValid(self, s: str) -> bool:
        partner = {")": "(", "]": "[", "}": "{"}
        used = [False] * len(s)
        for i, c in enumerate(s):
            if c in partner:
                j = i - 1
                while j >= 0 and used[j]:  # steps over every bracket already matched
                    j -= 1
                if j < 0 or s[j] != partner[c]:
                    return False
                used[i] = used[j] = True
        return all(used)
```

Without a stack, each closer walks back over everything already matched to find the nearest open bracket. That's correct, but with brackets nested 50,000 deep the walks get longer and longer: about 2.5 billion steps in total. The stack keeps the nearest open bracket on top, so no walking is needed.
