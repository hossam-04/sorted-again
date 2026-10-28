---
id: tries
title: Tries
kicker: words as paths · the end-of-word flag · wildcards · many words at once
summary: "A trie stores words letter by letter as paths from a root, so words with the same beginning share nodes. Every prefix question costs the length of the prefix, however many words are stored, and one walk can look for thousands of words at once."
---

## Words as paths

A **trie** (from re*trie*val, usually said "try") is a tree whose edges are letters. The path from the root to a node spells a prefix, and the node's children are the letters that can follow it. Words that start the same way share the start of their path, so `card`, `care` and `car` all go through the nodes for `c`, `ca` and `car`.

Each node needs two things: its children, and a flag that says whether a stored word ends exactly there.

```python
class TrieNode:
    def __init__(self):
        self.children = {}  # letter -> TrieNode
        self.end = False    # does a stored word end here?
```

**Inserting** walks the word's letters from the root, creating any missing child on the way, and marks the last node. **Looking up** walks the same way and stops as soon as a letter has no child:

:::viz trie-insert-search
:::

Use "Edit input" to look up `car`, `cart` and `do`: one is a stored word, one has no path at all, and one is only the beginning of a word.

## Three questions, one walk

All the basic operations follow one path of L letters, so each costs O(L), whether the trie holds ten words or a million. They differ only in what they check at the end of the path ([[p:208]]):

- `search(word)`: the path exists **and** its last node is marked;
- `startsWith(prefix)`: the path exists;
- `insert(word)`: create the path, then mark its last node.

In the code below, `node.children.setdefault(ch, TrieNode())` returns the child for `ch`, adding a new node first if there isn't one yet.

```python run title=Search_versus_startsWith
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
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

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

trie = Trie()
for w in ["code", "coder", "cool"]:
    trie.insert(w)
for q in ["code", "cod", "co", "cola"]:
    print(f"{q:5}  search: {trie.search(q)!s:5}  starts_with: {trie.starts_with(q)}")
```

:::gotcha Forgetting the end-of-word flag
Paths alone can't tell `cod` from `code`: once `code` is stored, the path for `cod` exists too. Without an `end` flag, `search("cod")` finds the path and says yes. Mark the node where each inserted word ends, and make `search` check the mark. The same flag is what stops a wildcard pattern from matching only the beginning of a longer word ([[p:211]]).
:::

:::gotcha A class attribute shared by every node
Writing `children = {}` in the class body, outside `__init__`, creates **one** dict when the class is defined, and every node reads and writes that same dict. All nodes of all tries then share their children, and a brand-new trie "contains" words stored in another one. Create the dict in `__init__` with `self.children = {}`. It's the same trap as a mutable default argument.
:::

```python run title=One_dict_for_every_node
class SharedNode:
    children = {}  # created once, when the class is defined

class OwnNode:
    def __init__(self):
        self.children = {}  # a new dict for every node

a, b = SharedNode(), SharedNode()
a.children["x"] = "added to a"
print("shared:", b.children)

c, d = OwnNode(), OwnNode()
c.children["x"] = "added to c"
print("own:   ", d.children)
```

## Autocomplete: everything below a node

The node at the end of a prefix is the root of a subtree that holds exactly the words starting with that prefix. Walk to it, then collect the marked nodes below it with a depth-first search. Visiting the children in letter order lists the words alphabetically:

```python run title=Autocomplete_from_a_prefix
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

def insert(root, word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, TrieNode())
    node.end = True

def complete(root, prefix, limit=5):
    node = root
    for ch in prefix:  # walk down to the prefix's node
        node = node.children.get(ch)
        if node is None:
            return []
    out = []

    def collect(node, word):
        if len(out) == limit:
            return
        if node.end:
            out.append(word)
        for ch in sorted(node.children):  # letter order gives alphabetical order
            collect(node.children[ch], word + ch)

    collect(node, prefix)
    return out

root = TrieNode()
for w in ["tree", "trie", "trip", "triple", "trick", "track", "true"]:
    insert(root, w)
print(complete(root, "tri"))
print(complete(root, "tr", limit=3))
print(complete(root, "x"))
```

Real autocomplete ranks suggestions by popularity rather than alphabetically, often by storing the best few completions at each node, so a query doesn't have to explore the whole subtree.

## Wildcards: try every child

When a pattern can contain a dot that matches any letter ([[p:211]]), a letter still leaves one way down, but a dot leaves one for every child. The lookup becomes a depth-first search: at a dot, try each child in turn and stop at the first one that leads to a full match. Returning `False` from one child just moves on to the next, which is backtracking in its simplest form.

```python run title=Matching_with_wildcards
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

def insert(root, word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, TrieNode())
    node.end = True

def matches(node, pattern, i=0):
    if i == len(pattern):
        return node.end  # the pattern is used up: a word must end exactly here
    if pattern[i] == ".":
        for child in node.children.values():  # a dot: try every letter that exists here
            if matches(child, pattern, i + 1):
                return True
        return False
    child = node.children.get(pattern[i])
    return child is not None and matches(child, pattern, i + 1)

root = TrieNode()
for w in ["bad", "bed", "bead", "mad"]:
    insert(root, w)
for p in ["b.d", ".ad", "b..d", "..", "m.d.", "...."]:
    print(f"{p:5} {matches(root, p)}")
```

A pattern with d dots explores at most 26ᵈ paths, and far fewer in practice, because only children that exist are tried.

## Many words at once

In [[p:212]] you get a letter grid and thousands of words, and must report every word that can be traced through adjacent cells. Searching for each word separately repeats the same grid exploration over and over: every word starting with `aaa` walks all the `aaa` paths again.

Put all the words in a trie instead, and run **one** depth-first search from each cell that follows the grid and the trie together. The trie answers "can this path still become a word?" with one lookup, so a path stops the moment no word continues it. The grid part is ordinary backtracking ([[m:backtracking]] covers it in detail): mark a cell as used, explore its neighbours, then unmark it. Two kinds of pruning keep it fast:

- **Remove a word once found.** Each word is reported once, however many ways it can be traced.
- **Delete branches that become empty.** When a node has no words left below it, cut it from its parent, so later searches don't even enter it.

```python
def dfs(r, c, parent):
    ch = board[r][c]
    node = parent[ch]          # parent has a child for this letter: the caller checked
    if "$" in node:
        found.append(node.pop("$"))  # the word that ends here, reported once
    board[r][c] = "#"          # used on this path
    for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
        if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in node:
            dfs(nr, nc, node)
    board[r][c] = ch           # free again for other paths
    if not node:
        del parent[ch]         # nothing left to find below: prune
```

This version stores the trie as nested dicts, with the word itself under a `"$"` key at the node where it ends. It's a common compact style: the dict's keys are the children, and the `"$"` entry plays the role of the end flag.

## Memory and alternatives

A trie trades memory for speed. In Python every node is an object with its own dict, so a trie of a million letters can take a hundred megabytes or more, far more than a list of the same words. Some ways to pay less:

- **An array of 26 children** instead of a dict is the classic layout in C and Java: fast to index, but every node reserves all 26 slots, even when it uses one.
- **A compressed trie** (a radix tree) merges chains of single-child nodes into one edge labelled with a whole string. Routing tables and many web frameworks' URL routers use them.
- **A sorted list with binary search** answers prefix questions too: the words that start with a prefix sit together, right where the prefix would be inserted. [[p:208]] shows this version. It's compact and fast when words arrive in batches.

Reach for a real trie when you walk prefixes letter by letter: wildcards, grid searches, autocomplete over a large vocabulary, or any search that should stop the moment a prefix leads nowhere.

## Complexity

| Operation | Time | Extra space |
|---|---|---|
| Insert a word of length L | `O(L)` | up to `L` new nodes |
| `search` or `startsWith` | `O(L)` | `O(1)` |
| Build from words with T letters in total | `O(T)` | `O(T)` nodes at most |
| Autocomplete a prefix of length P | `O(P + size of the subtree visited)` | `O(depth)` |
| Wildcard search with d dots | `O(26ᵈ · L)` worst case | `O(L)` recursion |
| Word search on an m × n grid | `O(m·n · 4·3^(L−1))` worst case, far less with pruning | `O(T)` for the trie |

L is a word's length; none of these depend on how many words are stored.

:::interview
Describe the node first ("a dict of children plus an end-of-word flag"), then say why a trie fits: every operation costs the length of the word, not the number of words, and shared prefixes are stored and explored once. If the question only needs exact lookups, say a hash set is simpler. For grid problems with many words, mention the two prunings: remove found words, and delete empty branches.
:::

:::work
Tries power autocomplete in search boxes and code editors, spell checkers that suggest corrections, the longest-prefix matching in network routers, and the URL routers of many web frameworks. For a few thousand words, a sorted list or a database prefix query is usually simpler. Hand-write a trie when you need to walk prefixes letter by letter over a large vocabulary that's already in memory.
:::

## Quick check

:::quiz
? A trie holds only the word `code`. What do `search("cod")` and `startsWith("cod")` return?
- [ ] Both `True`
- [x] `False` and `True`
- [ ] Both `False`
> The path for `cod` exists, so it's a prefix of a stored word. But `cod` itself was never inserted, so its last node isn't marked as the end of a word.

? A trie holds a million words. How long does `startsWith(prefix)` take, for a prefix of length L?
- [ ] `O(log n)`, like binary search
- [x] `O(L)`, however many words are stored
- [ ] `O(n · L)`, since every word may need checking
> The lookup follows one path of L letters from the root. The number of stored words never enters into it.

? A `TrieNode` class has `children = {}` written in the class body instead of in `__init__`. What goes wrong?
- [ ] Nothing, each node still gets its own dict
- [x] Every node shares one dict, so all nodes of all tries mix their children
- [ ] Python raises an error on the second node
> Code in a class body runs once, so it creates one dict that every instance reads and writes. `self.children = {}` in `__init__` creates a new dict per node.

? In a wildcard search, what does the trie do at a `.` in the pattern?
- [ ] It skips one level and follows the first child
- [x] It tries every child, and succeeds if any of them leads to a full match
- [ ] It gives up, since a dot isn't a letter
> A dot matches any letter, so every existing child is a possible continuation. The search tries them one by one and returns `True` at the first success.

? In the grid word search, why remove a word from the trie as soon as it's found?
- [ ] To save memory before the search ends
- [x] So it's reported once, and branches with nothing left to find can be pruned
- [ ] Because the trie would break otherwise
> A word can often be traced in several ways. Removing it makes the answer list it once, and once a branch holds no more words, deleting it stops later paths from entering it.
:::
