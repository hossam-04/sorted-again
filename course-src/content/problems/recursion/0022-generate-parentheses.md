---
id: 22
module: recursion
patterns: [build with choices, prune invalid prefixes]
signature: "def generateParenthesis(self, n: int) -> List[str]"
compare: unordered
---

## Task

You get an integer `n`. Return every string made of `n` opening brackets `(` and `n` closing brackets `)` that is properly matched: reading left to right, the number of `)` never gets ahead of the number of `(`, and they're equal at the end.

Return each string once, in any order.

## Constraints

- `1 <= n <= 12`

```json examples
[
  {"args": [2], "out": ["(())", "()()"], "why": "With two pairs there are two ways: one pair inside the other, or one after the other."},
  {"args": [4], "out": ["(((())))", "((()()))", "((())())", "((()))()", "(()(()))", "(()()())", "(()())()", "(())(())", "(())()()", "()((()))", "()(()())", "()(())()", "()()(())", "()()()()"], "why": "Fourteen strings: the count grows quickly with n."},
  {"args": [1], "out": ["()"], "why": "One pair can only be written one way."}
]
```

```json edge
[
  {"name": "three pairs", "args": [3], "out": ["((()))", "(()())", "(())()", "()(())", "()()()"]},
  {"name": "five pairs", "args": [5], "out": ["((((()))))", "(((()())))", "(((())()))", "(((()))())", "(((())))()", "((()(())))", "((()()()))", "((()())())", "((()()))()", "((())(()))", "((())()())", "((())())()", "((()))(())", "((()))()()", "(()((())))", "(()(()()))", "(()(())())", "(()(()))()", "(()()(()))", "(()()()())", "(()()())()", "(()())(())", "(()())()()", "(())((()))", "(())(()())", "(())(())()", "(())()(())", "(())()()()", "()(((())))", "()((()()))", "()((())())", "()((()))()", "()(()(()))", "()(()()())", "()(()())()", "()(())(())", "()(())()()", "()()((()))", "()()(()())", "()()(())()", "()()()(())", "()()()()()"]},
  {"name": "six pairs", "args": [6], "out": ["(((((())))))", "((((()()))))", "((((())())))", "((((()))()))", "((((())))())", "((((()))))()", "(((()(()))))", "(((()()())))", "(((()())()))", "(((()()))())", "(((()())))()", "(((())(())))", "(((())()()))", "(((())())())", "(((())()))()", "(((()))(()))", "(((()))()())", "(((()))())()", "(((())))(())", "(((())))()()", "((()((()))))", "((()(()())))", "((()(())()))", "((()(()))())", "((()(())))()", "((()()(())))", "((()()()()))", "((()()())())", "((()()()))()", "((()())(()))", "((()())()())", "((()())())()", "((()()))(())", "((()()))()()", "((())((())))", "((())(()()))", "((())(())())", "((())(()))()", "((())()(()))", "((())()()())", "((())()())()", "((())())(())", "((())())()()", "((()))((()))", "((()))(()())", "((()))(())()", "((()))()(())", "((()))()()()", "(()(((()))))", "(()((()())))", "(()((())()))", "(()((()))())", "(()((())))()", "(()(()(())))", "(()(()()()))", "(()(()())())", "(()(()()))()", "(()(())(()))", "(()(())()())", "(()(())())()", "(()(()))(())", "(()(()))()()", "(()()((())))", "(()()(()()))", "(()()(())())", "(()()(()))()", "(()()()(()))", "(()()()()())", "(()()()())()", "(()()())(())", "(()()())()()", "(()())((()))", "(()())(()())", "(()())(())()", "(()())()(())", "(()())()()()", "(())(((())))", "(())((()()))", "(())((())())", "(())((()))()", "(())(()(()))", "(())(()()())", "(())(()())()", "(())(())(())", "(())(())()()", "(())()((()))", "(())()(()())", "(())()(())()", "(())()()(())", "(())()()()()", "()((((()))))", "()(((()())))", "()(((())()))", "()(((()))())", "()(((())))()", "()((()(())))", "()((()()()))", "()((()())())", "()((()()))()", "()((())(()))", "()((())()())", "()((())())()", "()((()))(())", "()((()))()()", "()(()((())))", "()(()(()()))", "()(()(())())", "()(()(()))()", "()(()()(()))", "()(()()()())", "()(()()())()", "()(()())(())", "()(()())()()", "()(())((()))", "()(())(()())", "()(())(())()", "()(())()(())", "()(())()()()", "()()(((())))", "()()((()()))", "()()((())())", "()()((()))()", "()()(()(()))", "()()(()()())", "()()(()())()", "()()(())(())", "()()(())()()", "()()()((()))", "()()()(()())", "()()()(())()", "()()()()(())", "()()()()()()"]}
]
```

```python gen
def gen(rng, size):
    return [rng.randint(1, 4) if size == "small" else rng.randint(5, 8)]
```

```python perf
def perf(rng):
    # n = 12: 208,012 strings.
    return [12]
```

```python oracle
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        def valid(s):
            depth = 0
            for c in s:
                depth += 1 if c == "(" else -1
                if depth < 0:
                    return False
            return depth == 0

        return ["".join(p) for p in itertools.product("()", repeat=2 * n) if valid(p)]
```

## Hints

1. Build each string one character at a time. At every step you choose `(` or `)`, so the choices form a tree.
2. Not every choice is allowed: you can add `(` only while fewer than n have been used, and `)` only while it would close an open bracket (fewer `)` than `(` so far).
3. With those two checks, every path that reaches length 2n is a valid answer, and no time is spent on strings that can't work.

## Solution

```python solution time="4^n / n^1.5" space="n"
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        out, path = [], []

        def build(opened, closed):
            if closed == n:  # all n pairs used, and every prefix was valid
                out.append("".join(path))
                return
            if opened < n:
                path.append("(")
                build(opened + 1, closed)
                path.pop()  # undo the choice before trying the next one
            if closed < opened:
                path.append(")")
                build(opened, closed + 1)
                path.pop()

        build(0, 0)
        return out
```

The recursion builds strings left to right. Two counters decide what may come next: another `(` as long as fewer than n are open in total, and a `)` only when it closes something (`closed < opened`). Those rules are exactly "no prefix has more `)` than `(`", so every string that reaches 2n characters is valid, and every valid string is reached once, by the unique sequence of choices that spells it.

`path` is shared by all calls: each choice is appended, explored, then popped. That's the backtracking pattern you'll see throughout the next modules. The number of results is the n-th Catalan number, about 4ⁿ / n^1.5, and the work is proportional to the output size; the recursion is 2n levels deep.

## Alternatives

### Build from smaller answers

```python alt time="4^n / n^1.5" space="4^n / n^1.5"
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        @cache
        def gen(k):
            if k == 0:
                return [""]
            # the first "(" closes after i pairs: ( inside ) rest
            return [f"({inside}){rest}" for i in range(k) for inside in gen(i) for rest in gen(k - 1 - i)]

        return gen(n)
```

Every valid string starts with `(`, and that bracket closes somewhere. Whatever sits inside it is a valid string with i pairs, and whatever follows is a valid string with k − 1 − i pairs. Combining smaller answers this way builds each string exactly once, and caching `gen` reuses the lists for smaller k.

## Wrong answers

### Inserts a pair everywhere, duplicates included

```python wrong fails="example" test="Example 1"
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        results = [""]
        for _ in range(n):
            results = [s[:i] + "()" + s[i:] for s in results for i in range(len(s) + 1)]  # the same string, many times
        return results
```

Inserting `()` at every position of every smaller answer does reach all valid strings, but many of them several times: `"()()"` comes from inserting before and after `"()"`. The answer must list each string once; a set would fix it, at the cost of generating far more strings than needed.

### Closes brackets that were never opened

```python wrong fails="example" test="Example 1"
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        out = []

        def build(s, opened, closed):
            if len(s) == 2 * n:
                out.append(s)
                return
            if opened < n:
                build(s + "(", opened + 1, closed)
            if closed < n:  # should be closed < opened
                build(s + ")", opened, closed + 1)

        build("", 0, 0)
        return out
```

Allowing `)` whenever fewer than n have been used produces every arrangement of n of each bracket, including `")()("` and `"))(("`. The check that keeps prefixes valid is `closed < opened`.

### Checks every string of the right length

```python wrong fails="perf"
class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        out = []
        for bits in range(1 << (2 * n)):  # all 4**n strings, valid or not
            s = "".join("(" if bits >> i & 1 else ")" for i in range(2 * n))
            depth = 0
            for c in s:
                depth += 1 if c == "(" else -1
                if depth < 0:
                    break
            if depth == 0:
                out.append(s)
        return out
```

Enumerating all 4ⁿ strings and filtering is correct, but most of the work is spent on strings that were hopeless from their first character. For n = 12 that's 16.8 million strings to keep 208,012. Pruning while building avoids ever creating them.
