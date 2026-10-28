---
id: 572
module: trees
patterns: [serialise with markers, substring search]
signature: "def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool"
no_slow_wrong: the natural slower approach, comparing at every node, is the standard accepted answer on LeetCode's smaller inputs, so it is shown as a slow alternative instead
---

## Task

You get the roots of two non-empty binary trees, `root` and `subRoot`. Return `True` if some node of `root`, together with **all** of its descendants, forms a tree identical to `subRoot` (same shape, same values). A tree counts as a subtree of itself.

## Constraints

- `root` has between `1` and `30_000` nodes; `subRoot` between `1` and `15_000`
- `-10**4 <= node.val <= 10**4`

```json examples
[
  {"args": [[7, 3, 9, 1, 4], [3, 1, 4]], "out": true, "why": "The node 3 with its children 1 and 4 is exactly subRoot."},
  {"args": [[7, 3, 9, 1, 4, null, null, null, null, null, 5], [3, 1, 4]], "out": false, "why": "Node 3's subtree now also contains a 5 under the 4, so it isn't identical to subRoot."},
  {"args": [[2, 2, 2], [2]], "out": true, "why": "Either leaf, a single node 2, matches subRoot."}
]
```

```json edge
[
  {"name": "identical trees", "args": [[1, 2, 3], [1, 2, 3]], "out": true},
  {"name": "subRoot is a leaf", "args": [[5, 6, 7], [7]], "out": true},
  {"name": "subRoot bigger than root", "args": [[1], [1, 2]], "out": false},
  {"name": "a value made of another's digits", "args": [[12], [2]], "out": false},
  {"name": "the second copy matches", "args": [[1, 1, null, 1, null, 1, 2], [1, 1, 2]], "out": true},
  {"name": "same values, different shape", "args": [[4, 5], [4, null, 5]], "out": false},
  {"name": "negative values", "args": [[-1, -2, -3], [-3]], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 7) if size == "small" else rng.randint(20, 200)
    vals = [rng.randint(0, 3) for _ in range(n)]
    root = tree_level(rng, vals)
    if rng.random() < 0.5:  # take a real subtree, sometimes altered slightly
        sub = subtree_at(root, rng.choice([i for i, v in enumerate(root) if v is not None]))
        if rng.random() < 0.3:
            k = rng.choice([i for i, v in enumerate(sub) if v is not None])
            sub[k] += 1
    else:
        sub = tree_level(rng, [rng.randint(0, 3) for _ in range(rng.randint(1, 4))])
    return [root, sub]


def subtree_at(level, start):
    """The level-order list of the subtree rooted at position start of a level-order list."""
    kids, slot = {}, 1
    for i, v in enumerate(level):
        if v is not None:
            kids[i] = (slot if slot < len(level) else None, slot + 1 if slot + 1 < len(level) else None)
            slot += 2
    out, queue, head = [], [start], 0
    while head < len(queue):
        i = queue[head]
        head += 1
        if i is None or level[i] is None:
            out.append(None)
        else:
            out.append(level[i])
            queue += kids[i]
    while out[-1] is None:
        out.pop()
    return out


def tree_level(rng, vals):
    """A random binary tree holding vals, written level by level with None for missing children."""
    kids = [[None, None] for _ in vals]
    free = [(0, 0), (0, 1)]
    for i in range(1, len(vals)):
        k = rng.randrange(len(free))
        parent, side = free[k]
        free[k] = free[-1]
        free.pop()
        kids[parent][side] = i
        free += [(i, 0), (i, 1)]
    out, queue, head = [], [0], 0
    while head < len(queue):
        i = queue[head]
        head += 1
        if i is None:
            out.append(None)
        else:
            out.append(vals[i])
            queue += kids[i]
    while out[-1] is None:
        out.pop()
    return out
```

```python perf
def perf(rng):
    # root: a chain of 30,000 nodes that are all 1. subRoot: a chain of 15,000 that are all 1 except the last.
    # Comparing from every node of root matches thousands of nodes before each mismatch.
    def chain(vals):
        level = []
        for v in vals:
            level += [v, None]
        return level[:-1]
    return [chain([1] * 30_000), chain([1] * 14_999 + [2])]
```

## Hints

1. Comparing `subRoot` with the subtree at every node works, but each comparison can cost O(m), for O(n·m) in total.
2. Write each tree as a string in pre-order, *including a marker for every missing child*. With the markers, a tree's string determines its shape completely.
3. Then `subRoot` is a subtree of `root` exactly when its string appears inside `root`'s string, as long as values are separated so `2` can't match inside `12`.

## Solution

```python solution time="n + m" space="n + m"
class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def encode(node):
            out, stack = [], [node]
            while stack:  # pre-order without recursion
                cur = stack.pop()
                if cur is None:
                    out.append("#")  # a missing child
                else:
                    out.append(str(cur.val))
                    stack.append(cur.right)
                    stack.append(cur.left)
            return "," + ",".join(out) + ","  # commas on both sides of every value

        return encode(subRoot) in encode(root)
```

A pre-order listing that writes `#` for every missing child describes a tree completely: two trees have the same listing exactly when they are identical. And the listing of any node's subtree is a contiguous piece of the whole tree's listing. So `subRoot` is a subtree exactly when its listing appears inside `root`'s.

The commas around every value matter: without them, the listing of `2` would be found inside the listing of `12`. Python's substring search runs in linear time here, so the whole check is O(n + m), plus O(n + m) memory for the two strings.

## Alternatives

### Compare at every node

```python alt time="n·m" space="h" slow oracle
class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def same(a, b):
            if a is None or b is None:
                return a is b
            return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)

        stack = [root]
        while stack:
            node = stack.pop()
            if same(node, subRoot):
                return True
            stack += [c for c in (node.left, node.right) if c]
        return False
```

For every node, run the same-tree check from [[p:100]]. It's the answer most people write first, and on LeetCode's sizes it passes. Its worst case is O(n·m): when many nodes match a long way before differing, as in the performance test, each check walks deep before failing.

## Wrong answers

### Lists values without markers or separators

```python wrong fails="example" test="Example 2"
class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def pre(node):
            return "" if node is None else str(node.val) + pre(node.left) + pre(node.right)

        return pre(subRoot) in pre(root)  # loses the shape, and "2" is found inside "12"
```

Without markers for missing children, different shapes can produce the same listing, and a subtree's listing can appear inside a bigger subtree's. In Example 2, "314" is found inside "73145…" even though node 3's subtree has an extra 5. Without separators, values also run together.

### Lets the tree go deeper than subRoot

```python wrong fails="example" test="Example 2"
class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def starts_like(a, b):
            if b is None:
                return True  # but a may still have nodes below
            if a is None:
                return False
            return a.val == b.val and starts_like(a.left, b.left) and starts_like(a.right, b.right)

        stack = [root]
        while stack:
            node = stack.pop()
            if starts_like(node, subRoot):
                return True
            stack += [c for c in (node.left, node.right) if c]
        return False
```

This checks that `subRoot` matches the *top* of some subtree, but a subtree includes all descendants. When `subRoot` runs out, the matching part of `root` must run out too. Returning `True` when `b` is `None` regardless of `a` accepts node 3 in Example 2 despite the extra 5.

## Notes

On LeetCode, `root` has at most 2,000 nodes, so the compare-at-every-node approach is accepted there; the larger tests here show why the encoding approach scales better. The same "serialise with markers, then search" trick finds duplicate subtrees too: count the encodings of all subtrees in a dict.
