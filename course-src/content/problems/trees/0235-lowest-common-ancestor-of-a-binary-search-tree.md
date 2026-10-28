---
id: 235
module: trees
patterns: [BST ordering, walk down from the root]
signature: "def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode'"
params: {p: TreeNodeRef, q: TreeNodeRef}
ret: TreeNode.val
perf_repeat: 2000
---

## Task

You get the root of a binary search tree (every value in a node's left subtree is smaller than the node's value, every value in its right subtree is larger, and all values are different) and two different nodes of that tree, `p` and `q`.

Return their *lowest common ancestor*: the deepest node that has both `p` and `q` in its subtree. A node counts as part of its own subtree, so if `p` is an ancestor of `q`, the answer is `p`.

Tests give the tree in level order and identify `p` and `q` by their values. The checker compares the value of the node you return.

## Constraints

- The tree has between `2` and `100_000` nodes, with distinct values
- `-10**9 <= node.val <= 10**9`
- `p` and `q` are different nodes of the tree

```json examples
[
  {"args": [[20, 10, 30, 5, 15, 25, 35], 5, 15], "out": 10, "why": "5 and 15 are both below 10, on different sides."},
  {"args": [[20, 10, 30, 5, 15, 25, 35], 15, 25], "out": 20, "why": "15 is left of the root and 25 is right of it, so they part ways at the root."},
  {"args": [[20, 10, 30, 5, 15], 5, 10], "out": 10, "why": "10 is an ancestor of 5, and a node counts as its own descendant."}
]
```

```json edge
[
  {"name": "the root and a leaf", "args": [[20, 10, 30, 5, 15, 25, 35], 20, 35], "out": 20},
  {"name": "p larger than q", "args": [[20, 10, 30, 5, 15, 25, 35], 35, 25], "out": 30},
  {"name": "a chain", "args": [[1, null, 2, null, 3, null, 4], 3, 4], "out": 3},
  {"name": "deep in the right subtree", "args": [[8, 3, 13, null, null, 10, 17, 9, 12], 9, 12], "out": 10},
  {"name": "negative values", "args": [[-5, -10, 0, -12, -7], -12, -7], "out": -10},
  {"name": "two nodes", "args": [[7, 3], 3, 7], "out": 7}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    vals = rng.sample(range(-50, 51) if size == "small" else range(-10**6, 10**6), n)
    p, q = rng.sample(vals, 2)
    return [bst_level(vals), p, q]


def bst_level(vals):
    """Insert vals into a BST in this order and write it level by level."""
    kids = {vals[0]: [None, None]}
    for v in vals[1:]:
        cur = vals[0]
        while True:
            side = 0 if v < cur else 1
            if kids[cur][side] is None:
                kids[cur][side] = v
                kids[v] = [None, None]
                break
            cur = kids[cur][side]
    out, queue, head = [], [vals[0]], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        if v is None:
            out.append(None)
        else:
            out.append(v)
            queue += kids[v]
    while out[-1] is None:
        out.pop()
    return out
```

```python perf
def perf(rng):
    # A random BST of 100,000 values (about 40 levels deep), and two leaves far apart. Asked 2,000 times.
    vals = rng.sample(range(-10**9, 10**9), 100_000)
    level = bst_level(vals)
    p, q = sorted(vals)[1], sorted(vals)[-2]
    return [level, p, q]


def bst_level(vals):
    kids = {vals[0]: [None, None]}
    for v in vals[1:]:
        cur = vals[0]
        while True:
            side = 0 if v < cur else 1
            if kids[cur][side] is None:
                kids[cur][side] = v
                kids[v] = [None, None]
                break
            cur = kids[cur][side]
    out, queue, head = [], [vals[0]], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        if v is None:
            out.append(None)
        else:
            out.append(v)
            queue += kids[v]
    while out[-1] is None:
        out.pop()
    return out
```

## Hints

1. In a BST you can tell which side of a node another value lives on just by comparing.
2. Start at the root. If both `p` and `q` are smaller than the current node, their common ancestor is in the left subtree; if both are larger, it's in the right subtree.
3. Otherwise they split here (or one of them *is* this node), so this node is the answer.

## Solution

```python solution time="h" space="1"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while True:
            if p.val < node.val and q.val < node.val:
                node = node.left  # both are in the left subtree
            elif p.val > node.val and q.val > node.val:
                node = node.right  # both are in the right subtree
            else:
                return node  # they split here, or one of them is this node
```

The BST ordering tells you where `p` and `q` are relative to any node. While both are on the same side, every common ancestor is on that side too, so the walk goes down that way. The first node where they are *not* on the same side (one smaller and one larger, or one equal to the node) is where their paths from the root separate: it's an ancestor of both, and nothing below it is.

The walk follows a single path from the root, so it takes O(h) steps, where h is the height: about 40 for a random tree of 100,000 nodes. It uses no extra memory.

## Alternatives

### Find both paths, then compare

```python alt time="h" space="h" oracle
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        def path(target):
            node, out = root, []
            while node is not target:
                out.append(node)
                node = node.left if target.val < node.val else node.right
            return out + [node]

        a, b = path(p), path(q)
        answer = root
        for x, y in zip(a, b):
            if x is not y:
                break
            answer = x  # the last node the two paths share
        return answer
```

Record the path from the root to each node (easy in a BST: compare and step), then the answer is the last node both paths share. It's more steps than the single walk, but it spells out what "lowest common ancestor" means.

## Wrong answers

### Uses strict comparisons only

```python wrong fails="example" test="Example 3"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while node:
            if p.val < node.val < q.val or q.val < node.val < p.val:
                return node  # never true when node is p or q itself
            node = node.left if p.val < node.val else node.right
        return root
```

When one of the nodes is an ancestor of the other, the answer is that node, but neither strict inequality holds there. The walk steps past it and finally falls back to the root. The split condition has to include equality.

### Assumes p is smaller than q

```python wrong fails="edge" test="p larger than q" how="error"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while True:
            if q.val < node.val:  # "both smaller", assuming p < q
                node = node.left
            elif p.val > node.val:  # "both larger", assuming p < q
                node = node.right
            else:
                return node
```

The two shortcuts are only right when `p.val < q.val`. Nothing guarantees that order, and when it's reversed the walk goes the wrong way and runs off the bottom of the tree. Compare both values, or swap them first.

### Ignores the ordering and searches the whole tree

```python wrong fails="perf"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        parent, stack = {root: None}, [root]
        while p not in parent or q not in parent:  # explores the tree without using the BST order
            node = stack.pop()
            for child in (node.left, node.right):
                if child:
                    parent[child] = node
                    stack.append(child)
        ancestors = set()
        while p:
            ancestors.add(p)
            p = parent[p]
        while q not in ancestors:
            q = parent[q]
        return q
```

This is the general method for *any* binary tree (see [[m:trees]]), and it's correct here too. But it may explore every node before finding both, which is O(n) per call, while the BST order leads straight down one path in O(h). Asked 2,000 times on a tree of 100,000 nodes, the difference is fatal.
