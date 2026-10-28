---
id: 105
module: trees
patterns: [divide and conquer, index map]
signature: "def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]"
no_slow_wrong: the common slicing version is O(n²) only in theory here; its copies and index() searches run in C and pass at these sizes, so it appears as an alternative instead
---

## Task

You get two lists describing the same binary tree, whose values are all different: `preorder` lists the values in pre-order (node, then left subtree, then right subtree) and `inorder` in in-order (left subtree, then node, then right subtree).

Rebuild the tree and return its root.

## Constraints

- `1 <= len(preorder) == len(inorder) <= 50_000`
- `-10**5 <= value <= 10**5`, all values distinct
- Both lists come from the same tree

```json examples
[
  {"args": [[8, 4, 2, 6, 12, 10, 14], [2, 4, 6, 8, 10, 12, 14]], "out": [8, 4, 12, 2, 6, 10, 14], "why": "8 comes first in pre-order, so it's the root; in in-order, 2, 4, 6 come before it (the left subtree) and 10, 12, 14 after it."},
  {"args": [[1, 2, 3], [3, 2, 1]], "out": [1, 2, null, 3], "why": "In-order lists 1 last, so everything is in its left subtree: a chain to the left."},
  {"args": [[5, 9], [5, 9]], "out": [5, null, 9], "why": "Nothing comes before 5 in in-order, so 9 must be its right child."}
]
```

```json edge
[
  {"name": "one node", "args": [[7], [7]], "out": [7]},
  {"name": "right chain", "args": [[1, 2, 3, 4], [1, 2, 3, 4]], "out": [1, null, 2, null, 3, null, 4]},
  {"name": "negative values", "args": [[-1, -2, -3], [-2, -1, -3]], "out": [-1, -2, -3]},
  {"name": "zigzag", "args": [[1, 2, 3, 4], [2, 4, 3, 1]], "out": [1, 2, null, null, 3, 4]},
  {"name": "root with one child each side", "args": [[5, 3, 8], [3, 5, 8]], "out": [5, 3, 8]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    vals = rng.sample(range(-50, 51) if size == "small" else range(-10**5, 10**5), n)
    kids = [[None, None] for _ in vals]
    free = [(0, 0), (0, 1)]
    for i in range(1, n):  # a random tree shape
        k = rng.randrange(len(free))
        parent, side = free[k]
        free[k] = free[-1]
        free.pop()
        kids[parent][side] = i
        free += [(i, 0), (i, 1)]
    pre, ino, stack, node = [], [], [], 0
    order = [0]
    while order:  # pre-order
        i = order.pop()
        pre.append(vals[i])
        order += [c for c in (kids[i][1], kids[i][0]) if c is not None]
    while stack or node is not None:  # in-order
        while node is not None:
            stack.append(node)
            node = kids[node][0]
        node = stack.pop()
        ino.append(vals[node])
        node = kids[node][1]
    return [pre, ino]
```

```python perf
def perf(rng):
    # A random tree of 50,000 nodes.
    n = 50_000
    vals = rng.sample(range(-10**5, 10**5), n)
    kids = [[None, None] for _ in vals]
    free = [(0, 0), (0, 1)]
    for i in range(1, n):
        k = rng.randrange(len(free))
        parent, side = free[k]
        free[k] = free[-1]
        free.pop()
        kids[parent][side] = i
        free += [(i, 0), (i, 1)]
    pre, ino, stack, node = [], [], [], 0
    order = [0]
    while order:
        i = order.pop()
        pre.append(vals[i])
        order += [c for c in (kids[i][1], kids[i][0]) if c is not None]
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = kids[node][0]
        node = stack.pop()
        ino.append(vals[node])
        node = kids[node][1]
    return [pre, ino]
```

## Hints

1. The first value of `preorder` is the root. Find it in `inorder`: everything to its left is the left subtree, everything to its right is the right subtree.
2. The left subtree has as many values as there are to the left of the root in `inorder`, and in `preorder` they come right after the root. That splits both lists for the recursion.
3. Searching `inorder` with `index()` each time is slow on deep trees. Build a dict from value to in-order position once, and pass index ranges instead of slicing lists.

## Solution

```python solution time="n" space="n"
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        where = {v: i for i, v in enumerate(inorder)}  # value -> position in inorder
        next_root = iter(preorder)  # pre-order hands out the roots in exactly the order we build them

        def build(lo, hi):  # the subtree whose values are inorder[lo..hi]
            if lo > hi:
                return None
            node = TreeNode(next(next_root))
            mid = where[node.val]
            node.left = build(lo, mid - 1)   # built first, as pre-order lists it first
            node.right = build(mid + 1, hi)
            return node

        return build(0, len(inorder) - 1)
```

Pre-order lists a node before its subtrees, so the next unused value in `preorder` is always the root of the subtree being built. Its position in `inorder` splits that subtree's values into the left part (before it) and the right part (after it). Building the left subtree before the right one consumes `preorder` in exactly its own order, so a single iterator replaces all the slicing.

The dict makes each lookup O(1), and every value becomes one node: O(n) time. The dict, the nodes and the recursion use O(n) space; the recursion is as deep as the tree, about 40 levels for a random tree of 50,000 nodes.

## Alternatives

### Slice the lists at each level

```python alt time="n²" space="n²" oracle
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None
        root = TreeNode(preorder[0])
        mid = inorder.index(root.val)  # the size of the left subtree
        root.left = self.buildTree(preorder[1 : mid + 1], inorder[:mid])
        root.right = self.buildTree(preorder[mid + 1 :], inorder[mid + 1 :])
        return root
```

The definition, nearly word for word: find the root, split both lists, recurse. `index()` and the slices copy and search, which is O(n) per level and O(n²) for a long chain. They run in C, though, so for random trees of this size it still passes; the index-range version is the one to aim for.

## Wrong answers

### Gives the subtrees each other's lists

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None
        root = TreeNode(preorder[0])
        mid = inorder.index(root.val)
        root.left = self.buildTree(preorder[1 : mid + 1], inorder[mid + 1 :])  # in-order halves swapped
        root.right = self.buildTree(preorder[mid + 1 :], inorder[:mid])
        return root
```

The pre-order part and the in-order part passed to each call must describe the same subtree. With the in-order halves swapped, a call looks for its root among values that belong to the other subtree, and `index()` raises `ValueError`.

### Slices the pre-order list one value short

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None
        root = TreeNode(preorder[0])
        mid = inorder.index(root.val)
        root.left = self.buildTree(preorder[1:mid], inorder[:mid])  # mid values belong to the left subtree
        root.right = self.buildTree(preorder[mid:], inorder[mid + 1 :])
        return root
```

The left subtree has `mid` values, which sit at positions 1 to `mid` in `preorder`, so the slice is `preorder[1 : mid + 1]`. One short, the left subtree's last value slides into the right subtree's list, where `index()` can't find it in that subtree's in-order values. Off-by-one errors in slices are the usual bug in this problem.
