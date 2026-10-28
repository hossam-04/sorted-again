---
id: 100
module: trees
patterns: [simultaneous traversal]
signature: "def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool"
no_slow_wrong: one simultaneous walk is already the simplest approach; there is no natural slower way
---

## Task

You get the roots of two binary trees, `p` and `q` (either may be empty). Return `True` if they are the same tree: the same shape, with equal values in matching positions. Otherwise return `False`.

## Constraints

- Each tree has between `0` and `70_000` nodes
- `-10**4 <= node.val <= 10**4`

```json examples
[
  {"args": [[4, 2, 6, 1, 3], [4, 2, 6, 1, 3]], "out": true, "why": "Same shape, same values, node for node."},
  {"args": [[5, 7], [5, null, 7]], "out": false, "why": "The same two values, but 7 is a left child in one tree and a right child in the other."},
  {"args": [[2, 1, 3], [2, 3, 1]], "out": false, "why": "Same shape, but the children's values are swapped."}
]
```

```json edge
[
  {"name": "both empty", "args": [[], []], "out": true},
  {"name": "one tree empty", "args": [[1], []], "out": false},
  {"name": "one node each, equal", "args": [[9], [9]], "out": true},
  {"name": "one node each, different", "args": [[9], [8]], "out": false},
  {"name": "same in-order, different shape", "args": [[1, 2], [2, null, 1]], "out": false},
  {"name": "deep and equal", "args": [[1, 2, null, 3, null, 4], [1, 2, null, 3, null, 4]], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 6) if size == "small" else rng.randint(20, 200)
    a = tree_level(rng, [rng.randint(-3, 3) for _ in range(n)])
    roll = rng.random()
    if roll < 0.5:
        b = list(a)  # the same tree
    elif roll < 0.75 and a:
        b = list(a)
        k = rng.choice([i for i, v in enumerate(b) if v is not None])
        b[k] += 1  # one value differs
    else:
        b = tree_level(rng, [rng.randint(-3, 3) for _ in range(rng.randint(0, 6) if size == "small" else n)])
    return [a, b]


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
    # Two identical complete trees of 65,535 nodes: every pair of nodes has to be compared.
    vals = [rng.randint(-10**4, 10**4) for _ in range(2**16 - 1)]
    return [vals, list(vals)]
```

## Hints

1. Two trees are the same exactly when their roots match and their left subtrees are the same and their right subtrees are the same.
2. Handle the empty cases first: two empty trees are the same; one empty and one not are different.
3. Walk both trees in step, comparing node by node, and stop at the first difference.

## Solution

```python solution time="n" space="h"
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if p is None or q is None:
            return p is q  # same only if both are empty
        return p.val == q.val and self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
```

The definition of "same tree" is recursive: equal roots and same subtrees on both sides. The first line handles the empty cases in one comparison: if at least one tree is empty, they're the same only when both are (`p is q` is then `None is None`). After that, both nodes exist and their values and subtrees can be compared.

`and` stops at the first `False`, so the walk ends at the first difference. In the worst case (identical trees) every pair of nodes is compared once: O(n) time and O(h) stack.

## Alternatives

### Compare the two trees level by level

```python alt time="n" space="w" oracle
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        queue = deque([(p, q)])
        while queue:
            a, b = queue.popleft()
            if a is None and b is None:
                continue
            if a is None or b is None or a.val != b.val:
                return False
            queue.append((a.left, b.left))
            queue.append((a.right, b.right))
        return True
```

The same comparison without recursion: keep pairs of matching positions in a queue. It's handy when the trees could be deep enough to overflow the call stack.

## Wrong answers

### Compares the in-order values

```python wrong fails="edge" test="same in-order, different shape"
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        def inorder(node, out):
            if node:
                inorder(node.left, out)
                out.append(node.val)
                inorder(node.right, out)
            return out

        return inorder(p, []) == inorder(q, [])  # different shapes can give the same list
```

A list of values loses the shape. A root 1 with left child 2 and a root 2 with right child 1 both read `[2, 1]` in order. Comparing serialisations only works if they record the missing children too, for example with `None` markers.

### Assumes both nodes exist

```python wrong fails="example" test="Example 2" how="error"
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if p is None and q is None:
            return True
        if p.val != q.val:  # one of them may be None here
            return False
        return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
```

The first check only covers both trees being empty. When exactly one is empty, `p.val` or `q.val` reads an attribute of `None` and raises `AttributeError`. In Example 2 that happens as soon as one tree has a left child and the other doesn't.
