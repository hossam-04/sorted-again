---
id: 208
module: tries
patterns: [trie, dict of children, end-of-word flag]
kind: design
class: Trie
---

## Task

Build a class `Trie` that stores words and answers prefix questions quickly:

- `Trie()` creates an empty trie.
- `insert(word)` adds `word`.
- `search(word)` returns `True` if `word` itself was inserted before, and `False` otherwise.
- `startsWith(prefix)` returns `True` if some inserted word begins with `prefix` (a word counts as a prefix of itself), and `False` otherwise.

All words and prefixes are made of lowercase letters. Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `insert`).

## Constraints

- `1 <= len(word), len(prefix) <= 2000`
- Only the letters `a` to `z`
- At most `100_000` calls in total

```python starter
class Trie:
    def __init__(self):
        pass

    def insert(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass

    def startsWith(self, prefix: str) -> bool:
        pass
```

```json examples
[
  {"ops": ["Trie", "insert", "search", "search", "startsWith", "startsWith"], "args": [[], ["code"], ["code"], ["cod"], ["cod"], ["cot"]], "out": [null, null, true, false, true, false], "why": "\"cod\" begins the stored word \"code\" but was never inserted itself, so search says no and startsWith says yes."},
  {"ops": ["Trie", "insert", "insert", "search", "search", "startsWith"], "args": [[], ["car"], ["card"], ["car"], ["ca"], ["card"]], "out": [null, null, null, true, false, true], "why": "A word can be a prefix of another word and still be a word in its own right."},
  {"ops": ["Trie", "search", "startsWith"], "args": [[], ["code"], ["c"]], "out": [null, false, false], "why": "A new trie is empty: nothing inserted earlier, anywhere, may show up in it."}
]
```

```json edge
[
  {"name": "a word inserted twice", "ops": ["Trie", "insert", "insert", "search"], "args": [[], ["x"], ["x"], ["x"]], "out": [null, null, null, true]},
  {"name": "prefix equal to a whole word", "ops": ["Trie", "insert", "startsWith"], "args": [[], ["dog"], ["dog"]], "out": [null, null, true]},
  {"name": "a longer word than any stored", "ops": ["Trie", "insert", "search", "startsWith"], "args": [[], ["go"], ["goal"], ["goal"]], "out": [null, null, false, false]},
  {"name": "one-letter words", "ops": ["Trie", "insert", "search", "startsWith"], "args": [[], ["a"], ["a"], ["a"]], "out": [null, null, true, true]},
  {"name": "words sharing a prefix", "ops": ["Trie", "insert", "insert", "insert", "search", "search", "startsWith", "startsWith"], "args": [[], ["team"], ["tea"], ["ten"], ["te"], ["tea"], ["te"], ["tem"]], "out": [null, null, null, null, false, true, true, false]},
  {"name": "a long word", "ops": ["Trie", "insert", "search", "startsWith"], "args": [[], ["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx"], ["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvw"], ["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvw"]], "out": [null, null, false, true]}
]
```

```python oracle
class Trie:
    def __init__(self):
        self.words = set()

    def insert(self, word: str) -> None:
        self.words.add(word)

    def search(self, word: str) -> bool:
        return word in self.words

    def startsWith(self, prefix: str) -> bool:
        return any(w.startswith(prefix) for w in self.words)
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    letters = "ab" if size == "small" else "abcd"
    longest = 3 if size == "small" else 6
    ops, args = ["Trie"], [[]]
    for _ in range(calls):
        op = rng.choice(["insert", "search", "startsWith"])
        word = "".join(rng.choice(letters) for _ in range(rng.randint(1, longest)))
        ops.append(op)
        args.append([word])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 50,000 inserts, then 25,000 searches and 25,000 prefix checks, over words with many shared prefixes.
    def word():
        return "".join(rng.choice("abcdefgh") for _ in range(rng.randint(5, 12)))
    ops, args = ["Trie"], [[]]
    for _ in range(50_000):
        ops.append("insert")
        args.append([word()])
    for _ in range(25_000):
        ops += ["search", "startsWith"]
        args += [[word()], [word()[: rng.randint(2, 6)]]]
    return {"ops": ops, "args": args}
```

## Hints

1. Store the words as a tree of letters: each node has up to 26 children, one per possible next letter, and a path from the root spells a prefix.
2. A dict per node (`letter -> child node`) is the simplest way to store the children.
3. Paths alone can't tell "cod" from "code": mark the node where each inserted word ends. `search` needs that mark; `startsWith` only needs the path to exist.

## Solution

```python solution time="L" space="total letters"
class TrieNode:
    def __init__(self):
        self.children = {}  # letter -> TrieNode
        self.end = False    # does an inserted word end here?


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.end = True

    def _walk(self, s):  # the node at the end of the path s, or None
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.end

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None
```

Each node stands for the prefix spelled by the path to it, and its `children` dict leads to the prefixes one letter longer. Inserting walks the word's letters, creating missing nodes, and marks the last one with `end`. Words with a common prefix share the nodes of that prefix, which is what makes prefix queries cheap.

`startsWith` only needs the path to exist. `search` also needs the `end` mark, because the path for "cod" exists as soon as "code" is stored. Every operation follows one path of L letters: O(L) time regardless of how many words are stored. Memory is one node per distinct prefix, at most the total number of inserted letters.

## Alternatives

### Nested dicts with an end marker

```python alt time="L" space="total letters"
class Trie:
    END = "$"  # a key that can't be a letter

    def __init__(self):
        self.root = {}

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node[self.END] = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and self.END in node

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None
```

The same trie without a node class: every node is a dict, and a special key marks the end of a word. It's compact and popular in Python solutions; the node class is easier to read and extend.

### A sorted list and binary search

```python alt time="log n + L" space="total letters"
class Trie:
    def __init__(self):
        self.words = []  # kept sorted

    def insert(self, word: str) -> None:
        i = bisect_left(self.words, word)
        if i == len(self.words) or self.words[i] != word:
            self.words.insert(i, word)

    def search(self, word: str) -> bool:
        i = bisect_left(self.words, word)
        return i < len(self.words) and self.words[i] == word

    def startsWith(self, prefix: str) -> bool:
        i = bisect_left(self.words, prefix)  # the first word >= prefix starts with it, if any does
        return i < len(self.words) and self.words[i].startswith(prefix)
```

In sorted order, every word that begins with a prefix sits right where the prefix would be inserted, so binary search answers both questions. Inserting into the middle of a list is O(n), but it's a fast block move, so this is a practical alternative when words arrive in batches.

## Wrong answers

### Forgets to mark where words end

```python wrong fails="example" test="Example 1"
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})

    def search(self, word: str) -> bool:
        node = self.root
        for ch in word:
            if ch not in node:
                return False
            node = node[ch]
        return True  # every prefix of a stored word passes as a word

    def startsWith(self, prefix: str) -> bool:
        return self.search(prefix)
```

Without an end marker, the trie only knows which prefixes exist. After inserting "code", the path for "cod" exists too, so `search("cod")` wrongly returns `True`. Mark the last node of every inserted word.

### Keeps the children in a class attribute

```python wrong fails="example" test="Example 3"
class TrieNode:
    children = {}  # one dict, shared by every node of every trie
    end = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True

    def search(self, word: str) -> bool:
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.end

    def startsWith(self, prefix: str) -> bool:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True
```

`children = {}` written in the class body creates *one* dict, shared by every `TrieNode` ever made, instead of one per node. All the nodes of all the tries write into the same dict, so letters from earlier tests are still there: a brand-new trie "finds" words it never stored. Create the dict in `__init__` (`self.children = {}`), as with mutable default arguments.

### Checks prefixes against every word

```python wrong fails="perf"
class Trie:
    def __init__(self):
        self.words = set()

    def insert(self, word: str) -> None:
        self.words.add(word)

    def search(self, word: str) -> bool:
        return word in self.words

    def startsWith(self, prefix: str) -> bool:
        return any(w.startswith(prefix) for w in self.words)  # scans every stored word
```

A set answers `search` in O(1), but `startsWith` compares the prefix with every stored word. With 50,000 words and 25,000 prefix checks, that's over a billion comparisons. The trie answers by walking a path as long as the prefix.
