---
id: 1044
module: string-matching
patterns: [binary search on the length, rolling hash]
signature: "def longestDupSubstring(self, s: str) -> str"
compare: validator
---

## Task

Return a longest substring of `s` (a run of consecutive letters) that occurs at least twice in `s`. The occurrences may overlap. If several substrings tie for the longest, return any of them; if no substring repeats, return `""`.

## Constraints

- `2 <= len(s) <= 30_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["mississippi"], "out": "issi", "why": "issi starts at index 1 and again at 4; the two copies share the i in the middle. Nothing longer appears twice."},
  {"args": ["aaaa"], "out": "aaa", "why": "Occurrences may overlap: aaa starts at index 0 and at index 1."},
  {"args": ["xyz"], "out": "", "why": "No letter repeats, so no substring does."}
]
```

```json edge
[
  {"name": "two equal letters", "args": ["zz"], "out": "z"},
  {"name": "two different letters", "args": ["zy"], "out": ""},
  {"name": "a repeat at both ends", "args": ["abcxyzabc"], "out": "abc"},
  {"name": "a long overlap", "args": ["abababab"], "out": "ababab"},
  {"name": "one repeated letter", "args": ["abcdefa"], "out": "a"}
]
```

```python validator
def check(data, got):
    s = data[0]
    if not isinstance(got, str):
        return False, "Return the substring itself, as a string."
    base, mod = 131, (1 << 61) - 1

    def has_repeat(length):  # does some substring of this length occur twice? (rolling hash, confirmed)
        if length == 0:
            return True
        h = 0
        for c in s[:length]:
            h = (h * base + ord(c)) % mod
        top = pow(base, length, mod)
        seen = {h: [0]}
        for i in range(1, len(s) - length + 1):
            h = (h * base - ord(s[i - 1]) * top + ord(s[i + length - 1])) % mod
            if any(s[j:j + length] == s[i:i + length] for j in seen.get(h, ())):
                return True
            seen.setdefault(h, []).append(i)
        return False

    lo, hi = 0, len(s) - 1  # the longest repeat length, by binary search
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if has_repeat(mid):
            lo = mid
        else:
            hi = mid - 1
    if len(got) != lo:
        return False, f"{got!r} has {len(got)} letters, but a substring of {lo} letters occurs twice."
    if lo and got not in s:
        return False, f"{got!r} isn't a substring of s."
    if lo and s.find(got) == s.rfind(got):
        return False, f"{got!r} occurs only once in s."
    return True, ""
```

```python oracle
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        for length in range(len(s) - 1, 0, -1):
            seen = set()
            for i in range(len(s) - length + 1):
                if s[i:i + length] in seen:
                    return s[i:i + length]
                seen.add(s[i:i + length])
        return ""
```

```python gen
def gen(rng, size):
    letters = "ab" if rng.random() < 0.5 else "abcd"
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    s = "".join(rng.choice(letters) for _ in range(n))
    if rng.random() < 0.3 and n > 4:  # copy a chunk somewhere else
        i, j = rng.randrange(n // 2), rng.randrange(n // 2, n)
        chunk = s[i:i + rng.randint(1, n // 3)]
        s = (s[:j] + chunk + s[j:])[:max(n, 2)]
    return [s]
```

```python perf
def perf(rng):
    # 15,000 random letters, written twice: the answer is about 15,000 letters long.
    half = "".join(rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(15_000))
    return [half + half]
```

## Hints

1. If some substring of length L occurs twice, so does a substring of every shorter length (cut a letter off both copies). So "is there a repeat of length L?" is yes up to the answer and no after it: binary search on L.
2. For one L, you need to know whether any two windows of length L are equal. Comparing them as strings costs O(L) each; a **rolling hash** gives every window a number in O(1) as the window slides.
3. Store the hashes seen in a dict from hash to start positions. On a repeated hash, compare the two windows directly to rule out a collision. About log n rounds of O(n) each.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        n, base, mod = len(s), 131, (1 << 61) - 1
        codes = [ord(c) for c in s]

        def repeat_of(length):  # a substring of this length that occurs twice, or None
            h = 0
            for c in codes[:length]:
                h = (h * base + c) % mod
            top = pow(base, length, mod)  # the weight of the letter that leaves the window
            seen = {h: [0]}
            for i in range(1, n - length + 1):
                h = (h * base - codes[i - 1] * top + codes[i + length - 1]) % mod
                for j in seen.get(h, ()):
                    if s[j:j + length] == s[i:i + length]:  # equal hashes: confirm
                        return s[i:i + length]
                seen.setdefault(h, []).append(i)
            return None

        best, lo, hi = "", 1, n - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            found = repeat_of(mid)
            if found is not None:
                best, lo = found, mid + 1  # a repeat this long exists: try longer
            else:
                hi = mid - 1
        return best
```

Binary search on the length works because repeats are *monotone*: a repeat of length L contains repeats of every shorter length. Each probe slides a window of that length across `s` and keeps its **Rabin–Karp** hash, the window read as a number in base 131 modulo a large prime; sliding removes the leaving letter's contribution, shifts, and adds the new letter, all in O(1).

Two equal windows always have equal hashes. Different windows collide very rarely with a modulus near 2⁶¹, and each collision is caught by comparing the windows themselves, so the answer is always right. That's about log₂ n probes of O(n) expected time each.

## Alternatives

### A suffix array

```python alt time="n log² n" space="n"
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        n = len(s)
        rank = [ord(c) for c in s]
        order = list(range(n))  # suffixes, to be sorted
        k = 1
        while True:  # sort by the first 2k letters, using the ranks of the first k letters twice
            key = [(rank[i], rank[i + k] if i + k < n else -1) for i in range(n)]
            order.sort(key=key.__getitem__)
            new = [0] * n
            for a, b in zip(order, order[1:]):
                new[b] = new[a] + (key[a] != key[b])
            rank = new
            if rank[order[-1]] == n - 1 or k >= n:
                break
            k *= 2
        where = [0] * n  # each suffix's place in the sorted order
        for i, p in enumerate(order):
            where[p] = i
        best_len = best_at = h = 0
        for p in range(n):  # Kasai: the common prefix with the previous suffix in sorted order
            if where[p] == 0:
                h = 0
                continue
            q = order[where[p] - 1]
            while p + h < n and q + h < n and s[p + h] == s[q + h]:
                h += 1
            if h > best_len:
                best_len, best_at = h, p
            if h:
                h -= 1
        return s[best_at:best_at + best_len]
```

Sort all suffixes of `s`: a repeated substring is a common prefix of two suffixes, and the longest one is shared by two suffixes that end up *next to each other* in sorted order. The **suffix array** is built by prefix doubling, sorting by 1, 2, 4, … letters using the previous round's ranks, and Kasai's algorithm then finds the common prefix of each neighbouring pair in O(n) total. It needs no hashing, and the same array answers many other substring questions.

## Wrong answers

### Ignores overlapping copies

```python wrong fails="example" test="Example 1"
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        for length in range(len(s) // 2, 0, -1):  # two copies must fit side by side, it assumes
            for i in range(len(s) - length + 1):
                piece = s[i:i + length]
                if piece in s[i + length:]:  # looks for the second copy only after the first ends
                    return piece
        return ""
```

Requiring the second copy to start after the first one ends rules out overlaps, and caps the length at half the string. In Example 1 the two copies of `issi` share a letter, so this settles for a shorter repeat such as `iss`.

### Keeps the shorter length when the search succeeds

```python wrong fails="example" test="Example 1"
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        def repeat_of(length):
            seen = set()
            for i in range(len(s) - length + 1):
                if s[i:i + length] in seen:
                    return s[i:i + length]
                seen.add(s[i:i + length])
            return None

        best, lo, hi = "", 1, len(s) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            found = repeat_of(mid)
            if found is not None:
                best, lo = found, mid + 1
            else:
                hi = mid - 1
        return best  # the loop stops before testing lo itself
```

The search keeps `lo` as "the next length to try" but stops when `lo == hi`, without trying it. When the answer is that last untested length, the result is one letter short: in Example 1 it returns a repeat of 3 letters instead of `issi`. Loop while `lo <= hi`, or test the final length after the loop.

### Tries every length, longest first

```python wrong fails="perf"
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        for length in range(len(s) - 1, 0, -1):  # every length, from the top
            seen = set()
            for i in range(len(s) - length + 1):
                if s[i:i + length] in seen:
                    return s[i:i + length]
                seen.add(s[i:i + length])
        return ""
```

Correct, and fast when the answer is long. But the lengths above the answer are all tried in full, each building a set of whole substrings. In the test the answer is about half the string, so 15,000 lengths are tried before it, each copying and hashing thousands of windows of thousands of letters. Binary search needs about 15 lengths.
