---
id: 127
module: graphs
patterns: [breadth-first search on an implicit graph, wildcard buckets]
signature: "def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int"
---

## Task

You want to turn `beginWord` into `endWord` by changing one letter at a time. Every word you pass through, `endWord` included, must be in `wordList`; `beginWord` itself doesn't have to be.

Return the number of words in the shortest such sequence, counting both `beginWord` and `endWord`, or 0 if it can't be done.

## Constraints

- `1 <= len(beginWord) <= 10`, and every word has the same length
- `1 <= len(wordList) <= 5_000`, all different
- Only the letters `a` to `z`; `beginWord != endWord`

```json examples
[
  {"args": ["cold", "warm", ["cord", "card", "ward", "warm", "word", "worm"]], "out": 5, "why": "cold → cord → card → ward → warm changes one letter at a time: 5 words in all. No shorter sequence exists."},
  {"args": ["pin", "pan", ["pan"]], "out": 2, "why": "pin and pan differ in one letter, so the sequence is just those two words."},
  {"args": ["pin", "pen", ["pan", "pun"]], "out": 0, "why": "pen isn't in the word list, so it can't be reached."}
]
```

```json edge
[
  {"name": "beginWord in the list", "args": ["ab", "cb", ["ab", "cb"]], "out": 2},
  {"name": "one-letter words", "args": ["a", "c", ["a", "b", "c"]], "out": 2},
  {"name": "a detour is needed", "args": ["lead", "gold", ["load", "goad", "gold", "lend", "bold"]], "out": 4},
  {"name": "every letter changes", "args": ["abc", "xyz", ["xbc", "xyc", "xyz", "abz"]], "out": 4},
  {"name": "no way through", "args": ["aa", "bb", ["ab", "ba", "cc"]], "out": 0}
]
```

```python oracle
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        def one_apart(x, y):
            return sum(a != b for a, b in zip(x, y)) == 1

        words = set(wordList)
        if endWord not in words:
            return 0
        frontier, seen, length = [beginWord], {beginWord}, 1
        while frontier:  # breadth-first, comparing words letter by letter
            if endWord in frontier:
                return length
            frontier = [w for x in frontier for w in words if w not in seen and one_apart(x, w)]
            seen.update(frontier)
            frontier = list(dict.fromkeys(frontier))
            length += 1
        return 0
```

```python gen
def gen(rng, size):
    length = rng.randint(1, 3) if size == "small" else rng.randint(3, 4)
    letters = "abc" if size == "small" else "abcd"
    pool = sorted({"".join(rng.choice(letters) for _ in range(length)) for _ in range(12 if size == "small" else 60)})
    begin = "".join(rng.choice(letters) for _ in range(length))
    end = rng.choice(pool)
    if end == begin:
        end = begin[:-1] + ("z" if begin[-1] != "z" else "y")
    if rng.random() < 0.8:
        pool.append(end)
    return [begin, end, sorted(set(pool) - {begin} if rng.random() < 0.5 else set(pool))]
```

```python perf
def perf(rng):
    # 5,000 six-letter words over a, b, c, d, e, and an endWord with no neighbours: the search must
    # explore every word it can reach before giving up.
    words = set()
    while len(words) < 4_999:
        words.add("".join(rng.choice("abcde") for _ in range(6)))
    words = sorted(words)
    begin = words.pop(rng.randrange(len(words)))
    return [begin, "zzzzzz", words + ["zzzzzz"]]
```

## Hints

1. Think of every word as a node, with an edge between words that differ in exactly one letter. The shortest sequence is a shortest path, which breadth-first search finds in a graph without weights.
2. Comparing every word with every other word to build the edges costs O(N²·L). Instead, generate a word's neighbours: for each position, try replacing that letter.
3. Group words by *patterns* with one letter blanked out: `cold` belongs to `*old`, `c*ld`, `co*d` and `col*`. Two words are neighbours exactly when they share a pattern.

## Solution

```python solution time="N · L²" space="N · L²"
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        if endWord not in wordList:
            return 0
        buckets = defaultdict(list)  # "c*ld" -> every word matching it
        for w in wordList:
            for i in range(len(w)):
                buckets[w[:i] + "*" + w[i + 1:]].append(w)
        queue, seen = deque([(beginWord, 1)]), {beginWord}
        while queue:
            word, length = queue.popleft()
            if word == endWord:
                return length
            for i in range(len(word)):
                pattern = word[:i] + "*" + word[i + 1:]
                for nxt in buckets[pattern]:
                    if nxt not in seen:
                        seen.add(nxt)  # mark when queued
                        queue.append((nxt, length + 1))
                buckets[pattern] = []  # every word in this bucket is queued now
        return 0
```

The graph is never built as a whole. The buckets list, for every pattern, the words that match it, and a word's neighbours are the words in its L buckets. Breadth-first search visits words in order of distance from `beginWord`, so the first time it takes `endWord` out of the queue, the length is the shortest possible.

Building the buckets creates N·L patterns of length L, which is where the O(N·L²) comes from. Emptying a bucket once it's been used means each bucket is scanned only once, however many words share it.

## Alternatives

### Try every letter in every position

```python alt time="N · L² · 26" space="N · L"
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        words = set(wordList)
        if endWord not in words:
            return 0
        queue, length = deque([beginWord]), 1
        words.discard(beginWord)
        while queue:
            for _ in range(len(queue)):  # one level at a time
                word = queue.popleft()
                if word == endWord:
                    return length
                for i in range(len(word)):
                    for ch in "abcdefghijklmnopqrstuvwxyz":
                        nxt = word[:i] + ch + word[i + 1:]
                        if nxt in words:
                            words.remove(nxt)  # removing from the set marks it as visited
                            queue.append(nxt)
            length += 1
        return 0
```

Instead of buckets, generate all 25·L possible one-letter changes of a word and keep those in the word set. Removing a word from the set when it's queued doubles as the visited mark. It does a little more work per word, but needs no extra structure.

## Wrong answers

### Counts the changes instead of the words

```python wrong fails="example" test="Example 1"
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        if endWord not in wordList:
            return 0
        buckets = defaultdict(list)
        for w in wordList:
            for i in range(len(w)):
                buckets[w[:i] + "*" + w[i + 1:]].append(w)
        queue, seen = deque([(beginWord, 0)]), {beginWord}  # starts at 0: counts steps
        while queue:
            word, steps = queue.popleft()
            if word == endWord:
                return steps
            for i in range(len(word)):
                pattern = word[:i] + "*" + word[i + 1:]
                for nxt in buckets[pattern]:
                    if nxt not in seen:
                        seen.add(nxt)
                        queue.append((nxt, steps + 1))
        return 0
```

The search is right, but it counts the letter changes (the edges) rather than the words (the nodes). A sequence of 5 words has 4 changes, so every answer is one too small. Start the count at 1, for `beginWord` itself.

### Lets the last word skip the list

```python wrong fails="example" test="Example 3"
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        words = set(wordList) | {endWord}  # endWord is always allowed
        queue, seen = deque([(beginWord, 1)]), {beginWord}
        while queue:
            word, length = queue.popleft()
            if word == endWord:
                return length
            for i in range(len(word)):
                for ch in "abcdefghijklmnopqrstuvwxyz":
                    nxt = word[:i] + ch + word[i + 1:]
                    if nxt in words and nxt not in seen:
                        seen.add(nxt)
                        queue.append((nxt, length + 1))
        return 0
```

`endWord` has to be in the list like every other word of the sequence. Adding it to the set makes pin → pen look valid in Example 3, though pen isn't allowed. Return 0 straight away when `endWord` isn't in `wordList`.

### Compares each word with every other word

```python wrong fails="perf"
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        if endWord not in wordList:
            return 0
        queue, seen = deque([(beginWord, 1)]), {beginWord}
        while queue:
            word, length = queue.popleft()
            if word == endWord:
                return length
            for nxt in wordList:  # every word, for every word taken from the queue
                if nxt not in seen and sum(a != b for a, b in zip(word, nxt)) == 1:
                    seen.add(nxt)
                    queue.append((nxt, length + 1))
        return 0
```

Checking every word in the list for each word taken from the queue finds the right neighbours, but costs O(N·L) per word, O(N²·L) in all. With 5,000 words and an `endWord` that can't be reached, the search compares about 25 million pairs. The buckets find a word's neighbours by looking up its L patterns.
