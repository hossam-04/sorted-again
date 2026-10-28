---
id: 72
module: dp
patterns: [two-string table, insert delete replace]
signature: "def minDistance(self, word1: str, word2: str) -> int"
---

## Task

Turn `word1` into `word2` using three kinds of edits, each counting as one step: insert a letter, delete a letter, or replace a letter with another. Return the fewest steps needed.

## Constraints

- `0 <= len(word1), len(word2) <= 500`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["kitten", "sitting"], "out": 3, "why": "Replace k with s, replace e with i, and insert g at the end."},
  {"args": ["", "abc"], "out": 3, "why": "Starting from nothing, insert the three letters."},
  {"args": ["same", "same"], "out": 0, "why": "The words are already equal."}
]
```

```json edge
[
  {"name": "delete everything", "args": ["abc", ""], "out": 3},
  {"name": "a shift by one letter", "args": ["flaw", "lawn"], "out": 2},
  {"name": "two days of the week", "args": ["sunday", "saturday"], "out": 3},
  {"name": "swapped letters", "args": ["ab", "ba"], "out": 2},
  {"name": "one replacement", "args": ["a", "b"], "out": 1}
]
```

```python oracle
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        def D(a, b):  # the textbook definition, tried in full (fine for short words)
            if not a or not b:
                return len(a) + len(b)
            if a[0] == b[0]:
                return D(a[1:], b[1:])
            return 1 + min(D(a[1:], b[1:]), D(a[1:], b), D(a, b[1:]))

        return D(word1, word2)
```

```python gen
def gen(rng, size):
    n, m = (rng.randint(0, 3), rng.randint(0, 3)) if size == "small" else (rng.randint(2, 4), rng.randint(2, 4))
    return ["".join(rng.choice("abc") for _ in range(n)), "".join(rng.choice("abc") for _ in range(m))]
```

```python perf
def perf(rng):
    # Two random words of 300 letters.
    return ["".join(rng.choice("abcdefghij") for _ in range(300)), "".join(rng.choice("abcdefghij") for _ in range(300))]
```

## Hints

1. Compare the last letters. If they're equal, they can stay, and the answer is the same as for both words without them.
2. If not, the last step of an optimal edit is one of three: replace `word1`'s last letter with `word2`'s, delete `word1`'s last letter, or insert `word2`'s last letter. Each leaves a smaller pair of prefixes.
3. Fill a table `D[i][j]` for the first i letters of `word1` and the first j of `word2`. Turning a prefix into the empty word, or the empty word into a prefix, takes as many steps as its length.

## Solution

```python solution time="n·m" space="n·m"
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        n, m = len(word1), len(word2)
        D = [[0] * (m + 1) for _ in range(n + 1)]  # D[i][j]: edits to turn word1[:i] into word2[:j]
        for i in range(n + 1):
            D[i][0] = i  # delete all i letters
        for j in range(m + 1):
            D[0][j] = j  # insert all j letters
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if word1[i - 1] == word2[j - 1]:
                    D[i][j] = D[i - 1][j - 1]  # the last letters already match
                else:
                    D[i][j] = 1 + min(D[i - 1][j - 1],  # replace
                                      D[i - 1][j],      # delete word1's last letter
                                      D[i][j - 1])      # insert word2's last letter
        return D[n][m]
```

This is the **Levenshtein distance**. Each cell considers how the two prefixes' last letters are handled: kept for free if they match, or by one of the three edits, each of which leaves a smaller pair of prefixes whose answer is already in the table. The first row and column cover the empty prefixes. O(n·m) time and space; keeping two rows would cut the space to O(m).

## Alternatives

### Two rows

```python alt time="n·m" space="m"
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        prev = list(range(len(word2) + 1))  # the row for the empty prefix of word1
        for i, a in enumerate(word1, start=1):
            cur = [i]
            for j, b in enumerate(word2, start=1):
                cur.append(prev[j - 1] if a == b else 1 + min(prev[j - 1], prev[j], cur[j - 1]))
            prev = cur
        return prev[-1]
```

Each row only reads the row above, so two rows are enough, and memory drops to O(m).

## Wrong answers

### Counts the positions that differ

```python wrong fails="edge" test="a shift by one letter"
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        diff = sum(a != b for a, b in zip(word1, word2))  # compares letter i with letter i
        return diff + abs(len(word1) - len(word2))
```

Comparing letter by letter only allows replacements in place, plus additions at the end. When the words are shifted, as in `flaw` and `lawn`, every position differs, while deleting the f and appending an n takes just 2 steps.

### Forgets about replacing

```python wrong fails="example" test="Example 1"
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        n, m = len(word1), len(word2)
        D = [[0] * (m + 1) for _ in range(n + 1)]
        for i in range(n + 1):
            D[i][0] = i
        for j in range(m + 1):
            D[0][j] = j
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if word1[i - 1] == word2[j - 1]:
                    D[i][j] = D[i - 1][j - 1]
                else:
                    D[i][j] = 1 + min(D[i - 1][j], D[i][j - 1])  # only delete or insert
        return D[n][m]
```

Without replacement, changing one letter costs two steps, a delete and an insert. `kitten` to `sitting` then takes 5 instead of 3.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        def D(i, j):  # edits to turn word1[i:] into word2[j:]
            if i == len(word1):
                return len(word2) - j
            if j == len(word2):
                return len(word1) - i
            if word1[i] == word2[j]:
                return D(i + 1, j + 1)
            return 1 + min(D(i + 1, j + 1), D(i + 1, j), D(i, j + 1))  # three branches, heavily overlapping

        return D(0, 0)
```

The recurrence is right, but three overlapping branches at every mismatch make the number of calls grow exponentially. Two words of 300 letters have only 301 × 301 different pairs of suffixes; a table solves each once.
