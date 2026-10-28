---
id: 337
module: advanced-dp
patterns: [tree DP, two states per node]
signature: "def rob(self, root: Optional[TreeNode]) -> int"
---

## Task

The houses in a neighbourhood form a binary tree: each house has a value, and is linked to its parent and children. You may take the values of any houses, except that you can never take two houses that are directly linked (a parent and its child).

Return the largest total you can take.

## Constraints

- The tree has between `1` and `10_000` nodes
- `0 <= node.val <= 10_000`

```json examples
[
  {"args": [[4, 1, null, 2, null, 9]], "out": 13, "why": "The houses form a chain 4 → 1 → 2 → 9. Take 4 and 9, skipping the two houses between them."},
  {"args": [[3, 7, 1, 2, 5]], "out": 10, "why": "3 + 2 + 5 = 10: the root and its grandchildren. Taking 7 would rule out both 3 and its own children."},
  {"args": [[10, 1, 1, 1, 1, 1, 1]], "out": 14, "why": "The root and the four leaves are never linked to each other: 10 + 4."}
]
```

```json edge
[
  {"name": "one house", "args": [[7]], "out": 7},
  {"name": "all zeros", "args": [[0, 0, 0]], "out": 0},
  {"name": "a chain of four", "args": [[1, 2, null, 3, null, 4]], "out": 6},
  {"name": "a valuable child", "args": [[1, 100]], "out": 100},
  {"name": "skipping two levels", "args": [[10, 1, null, 1, null, 10]], "out": 20},
  {"name": "children beat the parent", "args": [[5, 4, 4]], "out": 8}
]
```

```python oracle
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        nodes, parent = [], {}
        stack = [root]
        while stack:
            node = stack.pop()
            nodes.append(node)
            for child in (node.left, node.right):
                if child:
                    parent[child] = node
                    stack.append(child)
        best = 0
        for mask in range(1 << len(nodes)):  # every set of houses
            chosen = {nodes[i] for i in range(len(nodes)) if mask >> i & 1}
            if all(parent.get(n) not in chosen for n in chosen):
                best = max(best, sum(n.val for n in chosen))
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(7, 12)
    vals = [rng.randint(0, 20 if size == "small" else 10_000) for _ in range(n)]
    kids = {0: [None, None]}
    for v in range(1, n):
        while True:
            p, side = rng.randrange(v), rng.randrange(2)
            if kids[p][side] is None:
                kids[p][side] = v
                kids[v] = [None, None]
                break
    level, queue, head = [], [0], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        level.append(None if v is None else vals[v])
        if v is not None:
            queue += kids[v]
    while level[-1] is None:
        level.pop()
    return [level]
```

```python perf
def perf(rng):
    # A chain of 10,000 houses, each the left child of the one before.
    level = [rng.randint(0, 10_000)]
    for _ in range(9_999):
        level += [rng.randint(0, 10_000), None]
    return [level]
```

## Hints

1. For a single node, the best total of its subtree depends on one decision: take the node or not. If you take it, its children must be skipped; if not, each child is free to be taken or skipped.
2. So let each node report **two** numbers: the best total of its subtree if the node is taken, and if it isn't. A parent can combine its children's pairs without looking any deeper.
3. Visit children before parents (post-order). `take = val + skip(left) + skip(right)` and `skip = best(left) + best(right)`, where `best` is the larger of a child's two numbers. The answer is the root's larger number.

## Solution

```python solution time="n" space="h"
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        def visit(node):  # (best if node is taken, best if it isn't)
            if node is None:
                return 0, 0
            left_take, left_skip = visit(node.left)
            right_take, right_skip = visit(node.right)
            take = node.val + left_skip + right_skip
            skip = max(left_take, left_skip) + max(right_take, right_skip)
            return take, skip

        return max(visit(root))
```

This is [[p:198]] on a tree. In a row, each house needed the best totals of the two houses before it; in a tree, each node needs two numbers from each child: its best with the child taken and with it skipped. Returning both as a pair lets every node be solved from its children alone, in a single post-order pass.

That's O(n) time, and the recursion is as deep as the tree is tall: 10,000 levels for a chain, which is within this page's limit. For deeper trees, the same pairs can be computed with an explicit stack in post-order.

## Alternatives

### Memoise the best total of each subtree

```python alt time="n" space="n"
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        memo = {}

        def best(node):
            if node is None:
                return 0
            if node not in memo:
                take = node.val
                for child in (node.left, node.right):
                    if child:
                        take += best(child.left) + best(child.right)  # skip the child, use the grandchildren
                memo[node] = max(take, best(node.left) + best(node.right))
            return memo[node]

        return best(root)
```

The more direct recurrence: a node's best is either its value plus the best of its four grandchildren, or the best of its two children. Without the memo, the same subtrees are solved again and again; with it, each node is solved once. The two-number version avoids the grandchildren and the dict.

## Wrong answers

### Takes every other level

```python wrong fails="example" test="Example 1"
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        sums = [0, 0]  # even levels, odd levels
        level, depth = [root], 0
        while level:
            sums[depth % 2] += sum(node.val for node in level)
            level = [c for node in level for c in (node.left, node.right) if c]
            depth += 1
        return max(sums)
```

Alternate levels never take two linked houses, but they can't skip two levels in a row, and sometimes that's what pays. In Example 1 the best plan skips the two middle houses of the chain: 4 + 9 = 13, while the levels give at most 10.

### Lets a child be taken with its parent

```python wrong fails="example" test="Example 1"
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        def visit(node):
            if node is None:
                return 0, 0
            left_take, left_skip = visit(node.left)
            right_take, right_skip = visit(node.right)
            take = node.val + max(left_take, left_skip) + max(right_take, right_skip)  # the children may be taken too
            skip = max(left_take, left_skip) + max(right_take, right_skip)
            return take, skip

        return max(visit(root))
```

When a node is taken, its children must be skipped, so only their "skip" numbers can be added. Taking each child's best instead allows a parent and child together, and in the end every house gets taken: Example 1 comes out as 4 + 1 + 2 + 9 = 16.

### Plain recursion over grandchildren

```python wrong fails="perf"
class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        def best(node):  # no memory of earlier answers
            if node is None:
                return 0
            take = node.val
            for child in (node.left, node.right):
                if child:
                    take += best(child.left) + best(child.right)
            return max(take, best(node.left) + best(node.right))

        return best(root)
```

The recurrence is right, but each node is solved again by its parent and by its grandparent. On a chain that's the Fibonacci pattern: the number of calls grows exponentially with the length, and 10,000 houses never finish. Memoise, or return two numbers per node.
