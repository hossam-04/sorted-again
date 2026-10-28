---
id: 269
title: Recover the Alphabet
own: true
module: graphs
patterns: [constraints from neighbours, topological sort, invalid input]
signature: "def alienOrder(self, words: List[str]) -> str"
compare: validator
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

A language uses some lowercase letters in an alphabetical order nobody remembers. You get a list of its words, sorted the way a dictionary of that language sorts them: compare two words letter by letter, and at the first position where they differ, the letter that comes first in the alphabet decides; if one word runs out first, the shorter word comes first.

Return a string holding every letter that appears in the words, each exactly once, in an order consistent with the list. If several orders fit, return any of them. If no order can make the list sorted, return `""`.

## Constraints

- `1 <= len(words) <= 5_000`
- `1 <= len(word) <= 10`
- Only the letters `a` to `z`

```json examples
[
  {"args": [["bca", "aaa", "acb"]], "out": "bac", "why": "Comparing neighbours: bca before aaa gives b before a, and aaa before acb gives a before c (their first letters match, so the second ones decide). The only order is b, a, c."},
  {"args": [["dog", "do"]], "out": "", "why": "do is a prefix of dog, so in any alphabet do comes first. A list with dog first can't be sorted, so the answer is empty."},
  {"args": [["ca", "cb"]], "out": "cab", "why": "The only rule is that a comes before b. c can go anywhere, so cab, acb and abc are all accepted."}
]
```

```json edge
[
  {"name": "a single letter", "args": [["z"]], "out": "z"},
  {"name": "a single word", "args": [["abc"]], "out": "abc"},
  {"name": "a prefix first is fine", "args": [["aa", "aab"]], "out": "ab"},
  {"name": "contradicting words", "args": [["ab", "ba", "aa"]], "out": ""},
  {"name": "rules that chain", "args": [["xy", "xz", "y"]], "out": "xyz"},
  {"name": "the same word twice", "args": [["ab", "ab"]], "out": "ab"}
]
```

```python validator
def check(data, got):
    words = data[0]
    letters = set("".join(words))
    before = set()  # (x, y): x comes before y
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                before.add((x, y))
                break
        else:
            if len(a) > len(b):
                return (got == "", "A word comes before its own prefix, so no order works: the answer must be \"\".")
    after = {c: set() for c in letters}
    waiting = {c: 0 for c in letters}
    for x, y in before:
        after[x].add(y)
        waiting[y] += 1
    queue = [c for c in letters if waiting[c] == 0]
    for c in queue:  # Kahn's algorithm: is there any order at all?
        for d in after[c]:
            waiting[d] -= 1
            if waiting[d] == 0:
                queue.append(d)
    if len(queue) < len(letters):
        return (got == "", "The words contradict each other, so the answer must be \"\".")
    if not isinstance(got, str) or sorted(got) != sorted(letters):
        return False, f"The answer must contain each of the {len(letters)} letters in the words exactly once."
    pos = {c: i for i, c in enumerate(got)}
    for x, y in sorted(before):
        if pos[x] > pos[y]:
            return False, f"The words show that {x} comes before {y}."
    return True, ""
```

```python oracle
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        letters = sorted(set("".join(words)))
        for order in permutations(letters):  # try every alphabet
            rank = {c: i for i, c in enumerate(order)}
            keys = [[rank[c] for c in w] for w in words]
            if all(keys[i] <= keys[i + 1] for i in range(len(keys) - 1)):
                return "".join(order)
        return ""
```

```python gen
def gen(rng, size):
    letters = rng.sample("abcdefgh", rng.randint(1, 3) if size == "small" else rng.randint(3, 5))
    rank = {c: i for i, c in enumerate(letters)}  # a secret alphabet
    words = ["".join(rng.choice(letters) for _ in range(rng.randint(1, 3 if size == "small" else 4)))
             for _ in range(rng.randint(1, 4) if size == "small" else rng.randint(4, 10))]
    words.sort(key=lambda w: [rank[c] for c in w])
    if len(words) > 1 and rng.random() < 0.3:  # sometimes break the order
        i = rng.randrange(len(words) - 1)
        words[i], words[i + 1] = words[i + 1], words[i]
    return [words]
```

```python perf
def perf(rng):
    # 5,000 words sorted by a shuffled 26-letter alphabet.
    letters = list("abcdefghijklmnopqrstuvwxyz")
    rng.shuffle(letters)
    rank = {c: i for i, c in enumerate(letters)}
    words = {"".join(rng.choice(letters) for _ in range(rng.randint(1, 10))) for _ in range(5_000)}
    return [sorted(words, key=lambda w: [rank[c] for c in w])]
```

## Hints

1. Two neighbouring words in the list teach you one rule at most: at the first position where they differ, the first word's letter comes earlier. Words further apart teach nothing new.
2. The rules form a directed graph on the letters, and an alphabet consistent with them is a topological order. A cycle means the words contradict each other.
3. Watch for one more contradiction: a word followed by its own prefix, like `"dog"` before `"do"`. And remember the letters that appear in no rule: they must be in the answer too.

## Solution

```python solution time="C + 26²" space="26²"
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        after = {c: set() for w in words for c in w}  # letter -> letters that must come after it
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    after[x].add(y)  # the first difference decides
                    break
            else:
                if len(a) > len(b):
                    return ""  # a word before its own prefix: impossible
        waiting = {c: 0 for c in after}
        for x in after:
            for y in after[x]:
                waiting[y] += 1
        queue = deque(c for c in after if waiting[c] == 0)
        order = []
        while queue:  # Kahn's algorithm on the letters
            c = queue.popleft()
            order.append(c)
            for d in after[c]:
                waiting[d] -= 1
                if waiting[d] == 0:
                    queue.append(d)
        return "".join(order) if len(order) == len(after) else ""  # leftovers sit on a cycle
```

Each pair of neighbouring words gives at most one rule, at their first difference. Those rules are a directed graph on at most 26 letters, and Kahn's algorithm turns it into an order or finds a cycle. Every letter starts in `after`, even if no rule mentions it, so it gets into the order with nothing to wait for.

The comparisons cost O(C) for C letters in all the words, and the graph has at most 26² edges.

## Alternatives

### Depth-first search for the order

```python alt time="C + 26²" space="26²"
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        after = {c: set() for w in words for c in w}
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    after[x].add(y)
                    break
            else:
                if len(a) > len(b):
                    return ""
        state, finished = {}, []  # 1 = on the current path, 2 = done

        def visit(c):  # at most 26 levels deep
            state[c] = 1
            for d in after[c]:
                if state.get(d) == 1:
                    return False  # a cycle
                if d not in state and not visit(d):
                    return False
            state[c] = 2
            finished.append(c)
            return True

        for c in after:
            if c not in state and not visit(c):
                return ""
        return "".join(reversed(finished))
```

The depth-first version from [[p:210]], on letters. With at most 26 letters, recursion is safe here.

## Wrong answers

### Ignores a word followed by its own prefix

```python wrong fails="example" test="Example 2"
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        after = {c: set() for w in words for c in w}
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    after[x].add(y)
                    break  # and if no difference is found, nothing is checked
        waiting = {c: 0 for c in after}
        for x in after:
            for y in after[x]:
                waiting[y] += 1
        queue = deque(c for c in after if waiting[c] == 0)
        order = []
        while queue:
            c = queue.popleft()
            order.append(c)
            for d in after[c]:
                waiting[d] -= 1
                if waiting[d] == 0:
                    queue.append(d)
        return "".join(order) if len(order) == len(after) else ""
```

When two neighbouring words agree on every position of the shorter one, there's no rule to learn, but there is something to check: the shorter word must come first. "dog" before "do" breaks every alphabet, so the answer is `""`, not some order of d, o and g.

### Leaves out letters that no rule mentions

```python wrong fails="example" test="Example 3"
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        after, waiting = defaultdict(set), defaultdict(int)
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    if y not in after[x]:
                        after[x].add(y)
                        waiting[y] += 1
                    break
            else:
                if len(a) > len(b):
                    return ""
        letters = set(after) | set(waiting)  # only the letters in some rule
        queue = deque(c for c in letters if waiting[c] == 0)
        order = []
        while queue:
            c = queue.popleft()
            order.append(c)
            for d in after[c]:
                waiting[d] -= 1
                if waiting[d] == 0:
                    queue.append(d)
        return "".join(order) if len(order) == len(letters) else ""
```

Building the graph only from the rules forgets the letters that appear in words but in no rule: in Example 3, c is in both words but in no rule, so it's missing from the answer. Start with every letter of every word as a node.

### Compares every pair of words

```python wrong fails="perf"
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        after = {c: set() for w in words for c in w}
        for i in range(len(words)):
            for j in range(i + 1, len(words)):  # all pairs, not just neighbours
                a, b = words[i], words[j]
                for x, y in zip(a, b):
                    if x != y:
                        after[x].add(y)
                        break
                else:
                    if len(a) > len(b):
                        return ""
        waiting = {c: 0 for c in after}
        for x in after:
            for y in after[x]:
                waiting[y] += 1
        queue = deque(c for c in after if waiting[c] == 0)
        order = []
        while queue:
            c = queue.popleft()
            order.append(c)
            for d in after[c]:
                waiting[d] -= 1
                if waiting[d] == 0:
                    queue.append(d)
        return "".join(order) if len(order) == len(after) else ""
```

Comparing every pair gives the same rules, since in a sorted list each pair's rule already follows from the neighbours between them. But it costs O(N²·L): 12.5 million comparisons for 5,000 words, where neighbours need 4,999.
