---
id: 236
module: binary-lifting
patterns: [parent pointers, ancestors of one node, iterative DFS]
signature: "def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode'"
params: {p: TreeNodeRef, q: TreeNodeRef}
ret: TreeNode.val
---

## Task

You get the root of a binary tree (not a search tree: values are in no particular order) and two different nodes of it, `p` and `q`. Return their **lowest common ancestor**: the deepest node that has both `p` and `q` in its subtree. A node counts as part of its own subtree, so if `p` is an ancestor of `q`, the answer is `p`.

Tests give the tree in level order and identify `p` and `q` by their values, which are all different. The checker compares the value of the node you return.

## Constraints

- The tree has between `2` and `150_000` nodes, with distinct values
- `-10**9 <= node.val <= 10**9`
- `p` and `q` are different nodes of the tree
- The tree can be up to `150_000` levels deep

```json examples
[
  {"args": [[8, 4, 15, 7, 2, null, 9, null, null, 5, 1], 5, 1], "out": 2, "why": "5 and 1 are the two children of 2."},
  {"args": [[8, 4, 15, 7, 2, null, 9, null, null, 5, 1], 7, 9], "out": 8, "why": "7 is on the left of the root and 9 on the right, so the paths split at the root."},
  {"args": [[8, 4, 15, 7, 2, null, 9, null, null, 5, 1], 4, 1], "out": 4, "why": "4 is an ancestor of 1, and a node counts as being in its own subtree."}
]
```

```json edge
[
  {"name": "the root and a leaf", "args": [[3, 6, 2, 11, 0], 3, 0], "out": 3},
  {"name": "two nodes", "args": [[10, -4], -4, 10], "out": 10},
  {"name": "values not in search order", "args": [[1, 9, 2, 0, 8], 0, 8], "out": 9},
  {"name": "a chain", "args": [[5, null, 4, null, 3, null, 2], 2, 4], "out": 4},
  {"name": "cousins deep down", "args": [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 8, 11], "out": 2},
  {"name": "negative values", "args": [[-1, -2, -3, -4, -5], -4, -3], "out": -1}
]
```

```python oracle
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        def path(target):
            stack = [(root, [root])]
            while stack:
                node, way = stack.pop()
                if node is target:
                    return way
                for child in (node.left, node.right):
                    if child:
                        stack.append((child, way + [child]))
        a, b = path(p), path(q)
        i = 0
        while i < min(len(a), len(b)) and a[i] is b[i]:
            i += 1
        return a[i - 1]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    vals = rng.sample(range(-20, 21) if size == "small" else range(-10**6, 10**6), n)
    kids = {vals[0]: [None, None]}
    for v in vals[1:]:  # attach each value under a random node with a free side
        while True:
            parent = rng.choice(list(kids))
            side = rng.randrange(2)
            if kids[parent][side] is None:
                kids[parent][side] = v
                kids[v] = [None, None]
                break
    level, queue, head = [], [vals[0]], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        level.append(v)
        if v is not None:
            queue += kids[v]
    while level[-1] is None:
        level.pop()
    p, q = rng.sample(vals, 2)
    return [level, p, q]
```

```python perf
def perf(rng):
    # 150,000 nodes: a path 140,000 levels deep with short branches hanging off it. p and q sit on two
    # branches near the bottom.
    depth, n = 140_000, 150_000
    kids = {0: [None, None]}
    for v in range(1, depth):
        kids[v - 1][0] = v  # the long path goes left
        kids[v] = [None, None]
    nxt = depth
    while nxt < n:
        at = rng.randrange(depth - 1)
        if kids[at][1] is None:  # a branch of one node on the right
            kids[at][1] = nxt
            kids[nxt] = [None, None]
            nxt += 1
    branches = [kids[v][1] for v in range(depth - 2000, depth) if kids[v][1] is not None]
    level, queue, head = [], [0], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        level.append(v)
        if v is not None:
            queue += kids[v]
    while level[-1] is None:
        level.pop()
    return [level, branches[0], branches[-1]]
```

## Hints

1. A node's ancestors are the nodes on its path from the root. The answer is the last node the two paths share.
2. Walk the tree once, recording each node's parent, until both `p` and `q` have been seen. Use an explicit stack: the tree can be far too deep for recursion.
3. Climb from `p` to the root, putting every node in a set. Then climb from `q`; the first node already in the set is the answer.

## Solution

```python solution time="n" space="n"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        parent = {root: None}
        stack = [root]
        while p not in parent or q not in parent:  # explore until both have been reached
            node = stack.pop()
            for child in (node.left, node.right):
                if child:
                    parent[child] = node
                    stack.append(child)
        ancestors = set()
        while p:  # every ancestor of p, including p
            ancestors.add(p)
            p = parent[p]
        while q not in ancestors:  # climb from q until the paths meet
            q = parent[q]
        return q
```

Parent pointers turn the tree into something you can climb. The first loop explores from the root with a stack, recording each node's parent, and stops as soon as both nodes are known. Then every ancestor of `p` goes into a set, and climbing from `q` stops at the first one: the deepest node on both paths.

Everything is O(n) time and space, and nothing is recursive, so a tree 140,000 levels deep is no problem. For a single query, O(n) is the best possible, since the nodes could be anywhere. With many queries on the same tree, binary lifting answers each in O(log n) after O(n log n) preparation; see the lesson.

## Alternatives

### Two root paths, compared

```python alt time="n" space="n"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        def path(target):  # the nodes from the root down to target
            stack = [(root, 0)]
            way = []
            while stack:
                node, depth = stack.pop()
                del way[depth:]  # back up to this node's depth
                way.append(node)
                if node is target:
                    return way
                for child in (node.right, node.left):
                    if child:
                        stack.append((child, depth + 1))

        a, b = path(p), path(q)
        i = 0
        while i < min(len(a), len(b)) and a[i] is b[i]:
            i += 1
        return a[i - 1]
```

Find the path from the root to each node, then walk both paths together until they differ: the last shared node is the answer. The stack holds each node with its depth, so `way` can be cut back to the current depth before extending it, which keeps exactly the current root path. Two searches, O(n) each.

## Wrong answers

### Assumes a search tree

```python wrong fails="example" test="Example 1"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while True:  # the method for a binary search tree
            if p.val < node.val and q.val < node.val:
                node = node.left
            elif p.val > node.val and q.val > node.val:
                node = node.right
            else:
                return node
```

This is the answer to [[p:235]], which relies on smaller values being on the left. Here values are in no particular order. In Example 1 both nodes are below 2, but by value 5 and 1 fall on either side of 4, so this stops at 4.

### Returns whichever node it finds first

```python wrong fails="example" test="Example 1"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        stack = [root]
        while stack:
            node = stack.pop()
            if node is p or node is q:
                return node  # an ancestor only if the other node is below it
            for child in (node.right, node.left):
                if child:
                    stack.append(child)
```

Stopping at the first of `p` or `q` is right only when the other one is in its subtree, as in Example 3. When they're in different branches, the answer is higher up: in Example 1, 5 and 1 are siblings, so their ancestor is 2, not 5. The well-known recursive solution gets this right by combining the results from both subtrees.

### Recursion on a very deep tree

```python wrong fails="perf" how="error"
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        if root is None or root is p or root is q:
            return root
        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)
        if left and right:
            return root  # p and q are on different sides
        return left or right
```

The classic recursive answer, and it's correct: each call reports whether its subtree holds `p`, `q` or their ancestor. But it goes one call deeper per level, and the test tree is 140,000 levels deep: more nested calls than the 100,000 this page allows, let alone plain Python's default limit of 1,000. Python raises `RecursionError`. An explicit stack has no such limit.
