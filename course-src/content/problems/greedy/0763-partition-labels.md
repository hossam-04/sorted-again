---
id: 763
module: greedy
patterns: [last occurrence, extend the current part]
signature: "def partitionLabels(self, s: str) -> List[int]"
---

## Task

Cut the string `s` into as many parts as possible so that each letter appears in at most one part. The parts, put back together in order, must give `s`. Return the sizes of the parts, from left to right.

## Constraints

- `1 <= len(s) <= 100_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["abacdcde"], "out": [3, 4, 1], "why": "aba holds every a and b. c and d are interleaved, so cdcd stays together. e is on its own."},
  {"args": ["xyz"], "out": [1, 1, 1], "why": "No letter repeats, so each letter can be its own part."},
  {"args": ["abca"], "out": [4], "why": "a appears at both ends, so the whole string is a single part."}
]
```

```json edge
[
  {"name": "one letter", "args": ["q"], "out": [1]},
  {"name": "one letter repeated", "args": ["aaaa"], "out": [4]},
  {"name": "pairs", "args": ["aabbcc"], "out": [2, 2, 2]},
  {"name": "nested", "args": ["abcba"], "out": [5]},
  {"name": "a letter returns at the end", "args": ["abcdefgabc"], "out": [10]}
]
```

```python oracle
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        sizes, start = [], 0
        for i in range(len(s)):  # cut wherever nothing on the left appears on the right
            if not set(s[start:i + 1]) & set(s[i + 1:]):
                sizes.append(i - start + 1)
                start = i + 1
        return sizes
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(8, 40)
    letters = "abc" if size == "small" else "abcdefgh"
    return ["".join(rng.choice(letters) for _ in range(n))]
```

```python perf
def perf(rng):
    # 100,000 letters: runs of five copies of one letter, cycling through the alphabet, so every letter
    # keeps coming back until near the end.
    return ["".join("abcdefghijklmnopqrstuvwxyz"[b % 26] * 5 for b in range(20_000))]
```

## Hints

1. A part that contains some letter must reach that letter's *last* occurrence in the string.
2. Record each letter's last index. Then scan from the left, keeping the farthest last index of any letter in the current part.
3. When the scan reaches that farthest index, nothing in the part appears later: cut there and start a new part.

## Solution

```python solution time="n" space="1"
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        last = {ch: i for i, ch in enumerate(s)}  # later indices overwrite earlier ones
        sizes, start, end = [], 0, 0
        for i, ch in enumerate(s):
            end = max(end, last[ch])  # the part must reach this letter's last occurrence
            if i == end:  # every letter seen so far is complete: cut
                sizes.append(end - start + 1)
                start = i + 1
        return sizes
```

The first part has to contain the first letter's last occurrence, and every letter in between pulls the end further, up to its own last occurrence. As soon as the scan reaches the current end, every letter inside the part is complete, and cutting there gives the smallest possible first part, which leaves the most room for more parts. Repeating that from the next index gives the answer. Two passes, O(n) time; the dict holds at most 26 letters.

## Alternatives

### Merge each letter's span

```python alt time="n" space="1"
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        span = {}
        for i, ch in enumerate(s):
            span[ch] = [span[ch][0], i] if ch in span else [i, i]  # first and last occurrence
        sizes, cur = [], None
        for lo, hi in sorted(span.values()):  # merging overlapping spans gives the parts
            if cur and lo <= cur[1]:
                cur[1] = max(cur[1], hi)
            else:
                if cur:
                    sizes.append(cur[1] - cur[0] + 1)
                cur = [lo, hi]
        sizes.append(cur[1] - cur[0] + 1)
        return sizes
```

Each letter occupies the span from its first to its last occurrence, and a part is a group of overlapping spans: this is [[p:56]] in disguise. With at most 26 spans, the sort is free.

## Wrong answers

### Cuts at the current letter's last occurrence

```python wrong fails="example" test="Example 1"
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        last = {ch: i for i, ch in enumerate(s)}
        sizes, start = [], 0
        for i, ch in enumerate(s):
            if i == last[ch]:  # only this letter is checked, not the others in the part
                sizes.append(i - start + 1)
                start = i + 1
        return sizes
```

Reaching the last occurrence of the *current* letter isn't enough: other letters already in the part may still appear later. In Example 1, the scan reaches the only b at index 1 and cuts, though the part `ab` has an a that comes again at index 2. Track the farthest last occurrence of every letter in the part.

### Counts the size one short

```python wrong fails="example" test="Example 1"
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        last = {ch: i for i, ch in enumerate(s)}
        sizes, start, end = [], 0, 0
        for i, ch in enumerate(s):
            end = max(end, last[ch])
            if i == end:
                sizes.append(end - start)  # indices start..end hold end - start + 1 letters
                start = i + 1
        return sizes
```

A part from index `start` to index `end`, both included, has `end − start + 1` letters. This counts the gaps between them instead, so every size is one too small.

### Checks both sides of every cut

```python wrong fails="perf"
class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        sizes, start = [], 0
        for i in range(len(s)):
            if not set(s[start:i + 1]) & set(s[i + 1:]):  # rebuilds both sets at every index
                sizes.append(i - start + 1)
                start = i + 1
        return sizes
```

Cutting wherever the left part and the rest share no letter is exactly right, but building the set of the rest of the string at every index costs O(n) each time, O(n²) in total: billions of steps for 100,000 letters. Each letter's last index answers the same question in O(1).
