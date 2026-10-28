---
id: 199
module: trees
patterns: [breadth-first search, last node of each level]
signature: "def rightSideView(self, root: Optional[TreeNode]) -> List[int]"
no_slow_wrong: breadth-first and depth-first versions are both linear; there is no natural slower approach
---

## Task

Picture a binary tree drawn with the root at the top and each level on its own row, and look at it from the right. On each row you see the rightmost node, which may well be a *left* child if nothing is to its right.

Return the values you see, from the top row to the bottom row.

## Constraints

- The tree has between `0` and `150_000` nodes
- `-100 <= node.val <= 100`

```json examples
[
  {"args": [[1, 2, 3, 4, 5, 6]], "out": [1, 3, 6], "why": "The rightmost nodes of the three levels are 1, 3 and 6."},
  {"args": [[1, 2, 3, 4]], "out": [1, 3, 4], "why": "On the third level the only node is 4, a left child, but nothing hides it."},
  {"args": [[7, null, 8, null, 9]], "out": [7, 8, 9], "why": "A chain to the right shows every node."}
]
```

```json edge
[
  {"name": "empty tree", "args": [[]], "out": []},
  {"name": "one node", "args": [[3]], "out": [3]},
  {"name": "left chain", "args": [[1, 2, null, 3]], "out": [1, 2, 3]},
  {"name": "right side shorter", "args": [[1, 2, 3, 4, null, null, null, 5, 6]], "out": [1, 3, 4, 6]},
  {"name": "negative values", "args": [[-1, -2, -3]], "out": [-1, -3]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-100, 100) for _ in range(n)])]


def tree_level(rng, vals):
    """A random binary tree holding vals, written level by level with None for missing children."""
    if not vals:
        return []
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
    # A complete tree of 131,071 nodes.
    return [[rng.randint(-100, 100) for _ in range(2**17 - 1)]]
```

## Hints

1. "What you see from the right" is one node per level: the last one when the level is read left to right.
2. Walk the tree level by level with a queue, and keep the last value of each level.
3. Depth-first works too: visit right children before left ones, and record a node when it's the first one you reach at its depth.

## Solution

```python solution time="n" space="w"
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out, queue = [], deque([root] if root else [])
        while queue:
            out.append(queue[-1].val)  # the queue holds exactly one level, left to right
            for _ in range(len(queue)):
                node = queue.popleft()
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        return out
```

This is the level-by-level walk from [[p:102]]. At the start of each round the queue holds exactly one level in left-to-right order, so its last element is the node you see from the right. Recording `queue[-1]` before processing the round gives one value per level.

Each node enters and leaves the queue once: O(n) time, and O(w) memory for the widest level.

## Alternatives

### Depth-first, right side first

```python alt time="n" space="h" oracle
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out, stack = [], [(root, 0)] if root else []
        while stack:
            node, depth = stack.pop()
            if depth == len(out):  # the first node reached at this depth
                out.append(node.val)
            for child in (node.left, node.right):  # right is pushed last, so it's visited first
                if child:
                    stack.append((child, depth + 1))
        return out
```

Visit right subtrees before left ones. Then the first node you reach at each depth is the rightmost one on that level, and `depth == len(out)` detects "first at this depth". It uses O(h) memory instead of O(w).

## Wrong answers

### Follows the right children only

```python wrong fails="example" test="Example 1"
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out = []
        while root:
            out.append(root.val)
            root = root.right  # the rightmost node of a level may be in a left subtree
        return out
```

Walking the right edge finds the right side only while the right edge is the longest. In Example 1, node 3 has only a left child, 6, so the walk stops at 3 and never sees the 6 that's visible from the right.

### Takes the first node of each level

```python wrong fails="example" test="Example 1"
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out, queue = [], deque([root] if root else [])
        while queue:
            out.append(queue[0].val)  # the leftmost node: the view from the left
            for _ in range(len(queue)):
                node = queue.popleft()
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        return out
```

The front of the queue is the leftmost node of the level, which is what you'd see from the *left* side. The view from the right needs the last node of each level.
