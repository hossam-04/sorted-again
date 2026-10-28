---
id: 49
module: arrays
patterns: [canonical key, hash map of lists]
signature: "def groupAnagrams(self, strs: List[str]) -> List[List[str]]"
compare: unordered-deep
---

## Task

You get a list of lowercase words `strs`. Two words belong together when one is a rearrangement of the other (they use the same letters the same number of times).

Split the words into groups of words that belong together and return the groups as a list of lists. Every word goes into exactly one group, and a word that appears twice goes into its group twice. The groups can come in any order, and so can the words inside each group.

## Constraints

- `1 <= len(strs) <= 20_000`
- `0 <= len(strs[i]) <= 50`
- Words contain only the letters `a` to `z`

```json examples
[
  {"args": [["note", "tone", "cat", "act", "dog"]], "out": [["note", "tone"], ["cat", "act"], ["dog"]], "why": "note and tone share e, n, o and t; cat and act share a, c and t; dog has no partner."},
  {"args": [["", "b", ""]], "out": [["", ""], ["b"]], "why": "Two empty words use the same (zero) letters, so they form a group."},
  {"args": [["ab", "ba", "ab"]], "out": [["ab", "ba", "ab"]], "why": "A repeated word stays in the answer, in the same group as its copy."}
]
```

```json edge
[
  {"name": "one word", "args": [["word"]], "out": [["word"]]},
  {"name": "all anagrams", "args": [["rat", "tar", "art"]], "out": [["rat", "tar", "art"]]},
  {"name": "no anagrams", "args": [["a", "b", "c"]], "out": [["a"], ["b"], ["c"]]},
  {"name": "same letters, different counts", "args": [["aab", "abb", "ab"]], "out": [["aab"], ["abb"], ["ab"]]},
  {"name": "equal letter sums", "args": [["ad", "bc", "da"]], "out": [["ad", "da"], ["bc"]]},
  {"name": "different lengths of one letter", "args": [["a", "aa", "aaa"]], "out": [["a"], ["aa"], ["aaa"]]},
  {"name": "only empty words", "args": [["", ""]], "out": [["", ""]]},
  {"name": "long words", "args": [["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx", "xwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcba"]], "out": [["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx", "xwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcba"]]}
]
```

```python gen
def gen(rng, size):
    count = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    letters = "abc" if size == "small" else "abcdefgh"
    bases = [[rng.choice(letters) for _ in range(rng.randint(0, 4))] for _ in range(max(1, count // 3))]
    words = []
    for _ in range(count):
        w = rng.choice(bases)[:]
        rng.shuffle(w)
        if rng.random() < 0.2 and w:
            w[rng.randrange(len(w))] = rng.choice(letters)
        words.append("".join(w))
    return [words]
```

```python perf
def perf(rng):
    # 20,000 words of 10 to 20 letters in about 8,000 groups.
    words = []
    for _ in range(8_000):
        base = [rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(rng.randint(10, 20))]
        for _ in range(rng.choice((1, 2, 2, 3, 4))):
            w = base[:]
            rng.shuffle(w)
            words.append("".join(w))
    rng.shuffle(words)
    return [words[:20_000]]
```

## Hints

1. Anagrams look different, but you can turn each word into a "key" that is the same for every rearrangement.
2. Two possible keys: the word's letters in sorted order, or a tuple of 26 letter counts.
3. Use a dict from key to the list of words with that key. The dict's values are the groups.

## Solution

```python solution time="n·k" space="n·k"
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for w in strs:
            counts = [0] * 26
            for c in w:
                counts[ord(c) - ord("a")] += 1
            groups[tuple(counts)].append(w)  # a tuple can be a dict key; a list can't
        return list(groups.values())
```

Every rearrangement of a word has the same 26 letter counts, and two words with the same counts are rearrangements of each other. So the tuple of counts is a key that identifies a group exactly. Grouping by that key in a dict puts each word in its group in O(1) average time.

Counting the letters of a word of length k takes O(k), so the total is O(n·k) for n words. The dict stores every word once plus one key per group.

The key must be a tuple: dict keys have to be hashable, and lists aren't.

## Alternatives

### Sorted letters as the key

```python alt time="n·k log k" space="n·k" oracle
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for w in strs:
            groups["".join(sorted(w))].append(w)
        return list(groups.values())
```

Sorting a word's letters gives the same string for every rearrangement, so it works as a key too. Each sort costs O(k log k) instead of O(k), but `sorted` runs in C, so for short words this version is often the faster one in Python. Both are fine answers in an interview.

## Wrong answers

### Uses the set of letters as the key

```python wrong fails="edge" test="same letters, different counts"
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for w in strs:
            groups[frozenset(w)].append(w)  # forgets how often each letter appears
        return list(groups.values())
```

A set only records which letters appear, so `"aab"`, `"abb"` and `"ab"` all get the key `{a, b}`. Anagrams need equal counts.

### Uses a list as the key

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = {}
        for w in strs:
            key = sorted(w)  # sorted() returns a list
            groups.setdefault(key, []).append(w)
        return list(groups.values())
```

`sorted(w)` returns a list, and lists can't be dict keys: Python raises `TypeError: unhashable type: 'list'`. Join the letters into a string or convert the list to a tuple.

### Compares every word with every other word

```python wrong fails="perf"
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        used = [False] * len(strs)
        groups = []
        for i, w in enumerate(strs):
            if used[i]:
                continue
            key, group = sorted(w), [w]
            for j in range(i + 1, len(strs)):  # every later word, for every group
                if not used[j] and sorted(strs[j]) == key:
                    used[j] = True
                    group.append(strs[j])
            groups.append(group)
        return groups
```

The grouping is correct, but each new group compares its word with every later word, and sorts that word again each time. With thousands of groups that is O(n²) comparisons. A dict finds a word's group in one step.
