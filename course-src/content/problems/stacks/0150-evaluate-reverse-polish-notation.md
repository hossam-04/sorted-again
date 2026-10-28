---
id: 150
module: stacks
patterns: [operand stack, postfix evaluation]
signature: "def evalRPN(self, tokens: List[str]) -> int"
---

## Task

You get an arithmetic expression in *reverse Polish notation* (postfix): each operator comes after its two operands. For example, `["3", "4", "+"]` means 3 + 4, and `["3", "4", "+", "2", "*"]` means (3 + 4) × 2.

`tokens` is a list of strings, each either an integer or one of the operators `+`, `-`, `*`, `/`. Return the value of the expression as an integer.

Division **truncates towards zero**: 7 / 2 is 3, and -7 / 2 is -3. The expression is always valid, never divides by zero, and every intermediate value fits in a 32-bit signed integer.

## Constraints

- `1 <= len(tokens) <= 100_000`
- Each token is `+`, `-`, `*`, `/` or an integer between -200 and 200
- The expression is valid, and every intermediate result fits in 32 bits

```json examples
[
  {"args": [["3", "4", "+", "2", "*"]], "out": 14, "why": "(3 + 4) × 2 = 14."},
  {"args": [["10", "2", "8", "*", "-"]], "out": -6, "why": "The minus applies to 10 and the product 2 × 8, in that order: 10 − 16 = −6."},
  {"args": [["5"]], "out": 5, "why": "A single number is already the whole expression."}
]
```

```json edge
[
  {"name": "exact division", "args": [["8", "4", "/"]], "out": 2},
  {"name": "negative divided by positive", "args": [["-7", "2", "/"]], "out": -3},
  {"name": "positive divided by negative", "args": [["9", "-4", "/"]], "out": -2},
  {"name": "both negative", "args": [["-9", "-2", "/"]], "out": 4},
  {"name": "quotient below one", "args": [["3", "5", "/"]], "out": 0},
  {"name": "operand order matters", "args": [["2", "9", "-"]], "out": -7},
  {"name": "deep stack", "args": [["1", "2", "3", "4", "+", "+", "+"]], "out": 10},
  {"name": "large result", "args": [["200", "200", "*", "200", "*"]], "out": 8000000}
]
```

```python gen
def gen(rng, size):
    count = rng.randint(1, 4) if size == "small" else rng.randint(10, 100)

    def build(n):  # an expression with n operands, as tokens and its exact value
        if n == 1:
            v = rng.randint(-20, 20)
            return [str(v)], v
        k = rng.randint(1, n - 1)
        lt, lv = build(k)
        rt, rv = build(n - k)
        ops = ["+", "-"] + (["*"] if abs(lv * rv) < 2**20 else []) + (["/"] if rv != 0 else [])
        op = rng.choice(ops)
        v = lv + rv if op == "+" else lv - rv if op == "-" else lv * rv if op == "*" else int(lv / rv)
        return lt + rt + [op], v

    return [build(count)[0]]
```

```python perf
def perf(rng):
    # 50,001 numbers followed by 50,000 operators (+ and -): valid, and the first operator is far from the
    # start, so any approach that searches for it from the start of the list does it 50,000 times.
    numbers = [str(rng.randint(-200, 200)) for _ in range(50_001)]
    return [numbers + [rng.choice("+-") for _ in range(50_000)]]
```

## Hints

1. Read the tokens left to right. A number has nothing to do yet, so keep it until an operator needs it.
2. An operator always applies to the two most recent values that haven't been used: a stack.
3. Pop the right operand first, then the left one, and push the result. For division, Python's `//` rounds down, which differs from truncation for negative results; use `int(a / b)`.

## Solution

```python solution time="n" space="n"
class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for tok in tokens:
            if tok in ("+", "-", "*", "/"):
                b = stack.pop()  # the right operand was pushed last
                a = stack.pop()
                if tok == "+":
                    stack.append(a + b)
                elif tok == "-":
                    stack.append(a - b)
                elif tok == "*":
                    stack.append(a * b)
                else:
                    stack.append(int(a / b))  # truncate towards zero
            else:
                stack.append(int(tok))
        return stack[0]
```

In postfix, an operator's operands are the two values computed most recently that haven't been used yet, which is exactly the top two entries of a stack. Popping them, combining them and pushing the result keeps the stack holding "values waiting for an operator". At the end, the whole expression has collapsed into one value.

The order of the pops matters for `-` and `/`: the right operand is on top. `int(a / b)` divides as a float and cuts off the fraction, which truncates towards zero; it's exact here because the values are small. Each token is handled once: O(n) time and up to O(n) stack space.

## Alternatives

### Replace the first operator and its operands, repeatedly

```python alt time="n²" space="n" slow oracle
class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        tokens = list(tokens)
        while len(tokens) > 1:
            i = next(k for k, t in enumerate(tokens) if t in ("+", "-", "*", "/"))
            a, b, op = int(tokens[i - 2]), int(tokens[i - 1]), tokens[i]
            v = a + b if op == "+" else a - b if op == "-" else a * b if op == "*" else int(a / b)
            tokens[i - 2 : i + 1] = [str(v)]  # three tokens become one
        return int(tokens[0])
```

The way you might do it on paper: find the first operator, combine it with the two tokens before it, write the result back, repeat. It's correct, but every round searches from the start and shifts the rest of the list, so it does O(n) work per operator.

## Wrong answers

### Pops the operands in the wrong order

```python wrong fails="example" test="Example 2"
class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for tok in tokens:
            if tok in ("+", "-", "*", "/"):
                a, b = stack.pop(), stack.pop()  # a is actually the right operand
                if tok == "+":
                    stack.append(a + b)
                elif tok == "-":
                    stack.append(a - b)
                elif tok == "*":
                    stack.append(a * b)
                else:
                    stack.append(int(a / b))
            else:
                stack.append(int(tok))
        return stack[0]
```

Addition and multiplication don't care about order, so the first example still passes. For `-` and `/` they do: the top of the stack is the *right* operand, so this computes 16 − 10 instead of 10 − 16.

### Divides with //

```python wrong fails="edge" test="negative divided by positive"
class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for tok in tokens:
            if tok in ("+", "-", "*", "/"):
                b, a = stack.pop(), stack.pop()
                if tok == "+":
                    stack.append(a + b)
                elif tok == "-":
                    stack.append(a - b)
                elif tok == "*":
                    stack.append(a * b)
                else:
                    stack.append(a // b)  # rounds down, not towards zero
            else:
                stack.append(int(tok))
        return stack[0]
```

Python's `//` rounds towards negative infinity, so `-7 // 2` is -4. The task asks for truncation towards zero, which gives -3. The two only differ when the result is negative and not whole, so positive tests won't catch it.

### Rebuilds the token list for every operator

```python wrong fails="perf"
class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        while len(tokens) > 1:
            i = 0
            while tokens[i] not in ("+", "-", "*", "/"):  # searches from the start every time
                i += 1
            a, b, op = int(tokens[i - 2]), int(tokens[i - 1]), tokens[i]
            v = a + b if op == "+" else a - b if op == "-" else a * b if op == "*" else int(a / b)
            tokens = tokens[: i - 2] + [str(v)] + tokens[i + 1 :]  # copies the whole list
        return int(tokens[0])
```

Simulating the paper method searches from the start for every operator and then copies the whole list. When the numbers come first and the operators last, each search walks over tens of thousands of tokens, 50,000 times. The stack does the same job with one push or pop per token.
