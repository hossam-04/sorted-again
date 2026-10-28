---
id: 211
module: tries
patterns: [trie, depth-first search for wildcards]
kind: design
class: WordDictionary
---

## Task

Build a class `WordDictionary` that stores words and searches them with a wildcard:

- `WordDictionary()` creates an empty dictionary.
- `addWord(word)` stores `word` (lowercase letters).
- `search(pattern)` returns `True` if some stored word matches `pattern`. The pattern has letters and dots; a dot matches any single letter, and a match must have exactly the pattern's length.

Tests list the method names called in order, their arguments, and what each call returns.

## Constraints

- `1 <= len(word), len(pattern) <= 25`
- Words use `a` to `z`; patterns use `a` to `z` and at most 3 dots
- At most `40_000` calls in total

```python starter
class WordDictionary:
    def __init__(self):
        pass

    def addWord(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass
```

```json examples
[
  {"ops": ["WordDictionary", "addWord", "addWord", "addWord", "search", "search", "search"], "args": [[], ["cat"], ["car"], ["bat"], ["ca."], ["b.r"], [".at"]], "out": [null, null, null, null, true, false, true], "why": "\"ca.\" matches cat and car; nothing stored fits \"b.r\"; \".at\" matches cat and bat."},
  {"ops": ["WordDictionary", "addWord", "search", "search", "search"], "args": [[], ["go"], ["g"], ["go."], ["g."]], "out": [null, null, false, false, true], "why": "A match needs exactly the pattern's length, so \"g\" and \"go.\" fail while \"g.\" fits go."},
  {"ops": ["WordDictionary", "search"], "args": [[], ["."]], "out": [null, false], "why": "Nothing is stored yet."}
]
```

```json edge
[
  {"name": "an exact word", "ops": ["WordDictionary", "addWord", "search"], "args": [[], ["moon"], ["moon"]], "out": [null, null, true]},
  {"name": "all dots", "ops": ["WordDictionary", "addWord", "search", "search"], "args": [[], ["abc"], ["..."], [".."]], "out": [null, null, true, false]},
  {"name": "the first branch fails", "ops": ["WordDictionary", "addWord", "addWord", "search"], "args": [[], ["cab"], ["cod"], ["c.d"]], "out": [null, null, null, true]},
  {"name": "a word inside another", "ops": ["WordDictionary", "addWord", "addWord", "search", "search", "search", "search"], "args": [[], ["an"], ["ant"], ["an"], ["a."], ["a.."], ["a..."]], "out": [null, null, null, true, true, true, false]},
  {"name": "dot at the end", "ops": ["WordDictionary", "addWord", "search", "search"], "args": [[], ["hello"], ["hell."], ["hel.p"]], "out": [null, null, true, false]},
  {"name": "same word twice", "ops": ["WordDictionary", "addWord", "addWord", "search"], "args": [[], ["z"], ["z"], ["."]], "out": [null, null, null, true]}
]
```

```python oracle
class WordDictionary:
    def __init__(self):
        self.words = []

    def addWord(self, word: str) -> None:
        self.words.append(word)

    def search(self, word: str) -> bool:
        return any(len(w) == len(word) and all(p == "." or p == c for p, c in zip(word, w)) for w in self.words)
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    letters = "ab" if size == "small" else "abcd"
    longest = 3 if size == "small" else 5
    ops, args = ["WordDictionary"], [[]]
    for _ in range(calls):
        word = [rng.choice(letters) for _ in range(rng.randint(1, longest))]
        if rng.random() < 0.4:
            ops.append("addWord")
        else:
            ops.append("search")
            for _ in range(rng.randint(0, min(3, len(word)))):
                word[rng.randrange(len(word))] = "."
        args.append(["".join(word)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 20,000 words of 4 to 8 letters, then 20,000 searches with one or two dots.
    def word():
        return [rng.choice("abcdefghijklmnop") for _ in range(rng.randint(4, 8))]
    ops, args = ["WordDictionary"], [[]]
    for _ in range(20_000):
        ops.append("addWord")
        args.append(["".join(word())])
    for _ in range(20_000):
        w = word()
        for _ in range(rng.randint(1, 2)):
            w[rng.randrange(len(w))] = "."
        ops.append("search")
        args.append(["".join(w)])
    return {"ops": ops, "args": args}
```

## Hints

1. Store the words in a trie (see [[p:208]]). Without dots, a search is a single walk down the trie.
2. A dot can be any letter, so at that position the walk has to try every child. That's a depth-first search.
3. Write `search` as a recursive function `dfs(node, i)`: at a letter, follow that child; at a dot, try each child and return `True` as soon as one succeeds. At the end of the pattern, the node must mark the end of a word.

## Solution

```python solution time="26^d · L" space="total letters"
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.end = True

    def search(self, word: str) -> bool:
        def dfs(node, i):
            if i == len(word):
                return node.end  # the pattern is used up: a word must end exactly here
            ch = word[i]
            if ch == ".":
                for child in node.children.values():  # try every possible letter
                    if dfs(child, i + 1):
                        return True
                return False
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)
```

Letters leave only one way forward in the trie, so they cost O(1) each. A dot branches into every child, and the search must try them until one leads to a full match, which is a depth-first search with backtracking: returning `False` from one child just moves on to the next.

The match must also have the right length, so at the end of the pattern the node must mark the end of a word. Without dots a search is O(L). With d dots it explores at most 26ᵈ paths of length L, and in practice far fewer, since only existing children are tried.

## Alternatives

### Track every node the pattern could be at

```python alt time="26^d · L" space="total letters"
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.end = True

    def search(self, word: str) -> bool:
        frontier = [self.root]  # all trie nodes the prefix read so far could have led to
        for ch in word:
            if ch == ".":
                frontier = [child for node in frontier for child in node.children.values()]
            else:
                frontier = [node.children[ch] for node in frontier if ch in node.children]
            if not frontier:
                return False
        return any(node.end for node in frontier)
```

Instead of exploring branches one at a time, keep the set of all trie nodes the pattern could have reached so far, and advance all of them together, letter by letter. It's breadth-first instead of depth-first, with no recursion, and it visits the same nodes.

## Wrong answers

### Gives up after the first branch

```python wrong fails="edge" test="the first branch fails"
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.end = True

    def search(self, word: str) -> bool:
        def dfs(node, i):
            if i == len(word):
                return node.end
            if word[i] == ".":
                for child in node.children.values():
                    return dfs(child, i + 1)  # returns the first child's answer, even if it's False
                return False
            child = node.children.get(word[i])
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)
```

The loop returns on its first iteration, so a dot only ever tries one letter. With "cab" and "cod" stored, `c.d` tries `a` first, fails at `b`, and never gets to `o`. Return `True` from inside the loop, and `False` only after every child has failed.

### Accepts a pattern that ends inside a word

```python wrong fails="example" test="Example 2"
class TrieNode:
    def __init__(self):
        self.children = {}


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())

    def search(self, word: str) -> bool:
        def dfs(node, i):
            if i == len(word):
                return True  # but no stored word needs to end here
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)
```

Reaching the end of the pattern only shows that some stored word *begins* this way. Without an end-of-word flag, "g" matches because "go" is stored. The search has to finish exactly where a word ends.

### Compares the pattern with every word

```python wrong fails="perf"
class WordDictionary:
    def __init__(self):
        self.words = []

    def addWord(self, word: str) -> None:
        self.words.append(word)

    def search(self, word: str) -> bool:
        for w in self.words:  # every stored word, for every search
            if len(w) == len(word) and all(p == "." or p == c for p, c in zip(word, w)):
                return True
        return False
```

Checking every stored word is correct, and fine for a few hundred words. With 20,000 words and 20,000 searches it's 400 million comparisons. The trie only follows branches that can still match.
