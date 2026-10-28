---
id: 297
module: trees
patterns: [pre-order with null markers, rebuild with an iterator]
kind: codec
codec: tree
---

## Task

Write a class `Codec` with two methods:

- `serialize(root)` turns a binary tree into a string.
- `deserialize(data)` takes a string made by `serialize` and rebuilds the tree, returning its root.

The rebuilt tree must be identical to the original: same shape, same values. The format of the string is up to you. The checker serialises with one `Codec` object and deserialises with another, so the string must carry everything.

## Constraints

- The tree has between `0` and `200_000` nodes
- `-1000 <= node.val <= 1000`

```python starter
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        """Encode a tree to a single string."""

    def deserialize(self, data: str) -> Optional[TreeNode]:
        """Decode a string made by serialize back into the tree."""
```

```json examples
[
  {"args": [[1, 2, 3, null, 4]], "why": "Any format works as long as the tree comes back with 4 as the right child of 2."},
  {"args": [[]], "why": "The empty tree has to survive the round trip too."},
  {"args": [[-5, null, 10]], "why": "Negative and two-digit values must come back intact."}
]
```

```json edge
[
  {"name": "one node", "args": [[0]]},
  {"name": "left chain", "args": [[1, 2, null, 3, null, 4]]},
  {"name": "right chain", "args": [[1, null, 2, null, 3]]},
  {"name": "multi-digit values", "args": [[1000, -1000, 12, 1]]},
  {"name": "full tree", "args": [[1, 2, 3, 4, 5, 6, 7]]},
  {"name": "repeated values", "args": [[7, 7, 7, null, 7]]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-1000, 1000) for _ in range(n)])]


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
    # A random tree of 120,000 nodes.
    return [tree_level(rng, [rng.randint(-1000, 1000) for _ in range(120_000)])]


def tree_level(rng, vals):
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

## Hints

1. A list of values alone doesn't fix a tree's shape. Record the missing children too, with a marker such as `#`.
2. Pre-order with markers works well: write the node, then its left subtree, then its right subtree, and `#` for every empty subtree.
3. To rebuild, read the tokens in the same order: a value creates a node whose left and right subtrees are the next things read; `#` means `None`. Read from an iterator so each token is consumed once.

## Solution

```python solution time="n" space="n"
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, stack = [], [root]
        while stack:  # pre-order; "#" marks every missing child
            node = stack.pop()
            if node is None:
                out.append("#")
            else:
                out.append(str(node.val))
                stack.append(node.right)
                stack.append(node.left)
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(data.split(","))
        root = self._node(next(tokens))
        stack = [(root, "left")] if root else []
        while stack:  # fill each open slot with the next token, in pre-order
            parent, side = stack.pop()
            child = self._node(next(tokens))
            setattr(parent, side, child)
            if side == "left":
                stack.append((parent, "right"))  # the right slot waits until the left subtree is done
            if child:
                stack.append((child, "left"))
        return root

    def _node(self, token):
        return None if token == "#" else TreeNode(int(token))
```

Pre-order with a `#` for every empty subtree is enough to rebuild a tree: when you read a value, you know its left subtree comes next, then its right subtree, and each `#` ends a branch. Commas separate the tokens, so negative and multi-digit values can't run together.

Both methods avoid recursion: `serialize` uses a stack for the pre-order walk, and `deserialize` keeps a stack of open child slots, filling them in the same pre-order. That way even a 200,000-node chain can't hit the recursion limit. Each node and each marker is handled once: O(n) time and O(n) space for the string.

## Alternatives

### Level order, like the tests

```python alt time="n" space="n" oracle
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, queue = [], deque([root])
        while queue:
            node = queue.popleft()
            out.append("#" if node is None else str(node.val))
            if node:
                queue.append(node.left)
                queue.append(node.right)
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = data.split(",")
        if tokens[0] == "#":
            return None
        root = TreeNode(int(tokens[0]))
        queue, i = deque([root]), 1
        while queue:
            node = queue.popleft()
            for side in ("left", "right"):  # each node takes the next two tokens
                if tokens[i] != "#":
                    child = TreeNode(int(tokens[i]))
                    setattr(node, side, child)
                    queue.append(child)
                i += 1
        return root
```

The level-order format the tests use: a breadth-first walk writes each node and its two child slots, and rebuilding consumes the tokens in the same order with a queue. It's a natural choice, and equally linear.

### Recursive pre-order

```python alt time="n" space="n"
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out = []

        def walk(node):
            if node is None:
                out.append("#")
                return
            out.append(str(node.val))
            walk(node.left)
            walk(node.right)

        walk(root)
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(data.split(","))

        def build():
            token = next(tokens)
            if token == "#":
                return None
            node = TreeNode(int(token))
            node.left = build()
            node.right = build()
            return node

        return build()
```

The same format with recursion, which is how most people write it. It's shorter, but its depth equals the tree's height, so a very deep tree would need a high recursion limit.

## Wrong answers

### Writes the values without null markers

```python wrong fails="example" test="Example 1"
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, queue = [], deque([root] if root else [])
        while queue:  # level order, skipping the missing children
            node = queue.popleft()
            out.append(str(node.val))
            for child in (node.left, node.right):
                if child:
                    queue.append(child)
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        if not data:
            return None
        nodes = [TreeNode(int(t)) for t in data.split(",")]
        for i, node in enumerate(nodes):  # assumes a complete tree
            if 2 * i + 1 < len(nodes):
                node.left = nodes[2 * i + 1]
            if 2 * i + 2 < len(nodes):
                node.right = nodes[2 * i + 2]
        return nodes[0]
```

Without markers, the string only keeps the values. Rebuilding then has to guess the shape, here as a complete tree, so a missing child shifts every later node into the wrong place. In Example 1, 4 comes back as 2's left child instead of its right child.

### Joins the values without separators

```python wrong fails="example" test="Example 3" how="error"
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, stack = [], [root]
        while stack:
            node = stack.pop()
            if node is None:
                out.append("#")
            else:
                out.append(str(node.val))
                stack += [node.right, node.left]
        return "".join(out)  # "-5#10##" can't be split back into values

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(list(data))  # one character per token
        def build():
            token = next(tokens)
            if token == "#":
                return None
            node = TreeNode(int(token))
            node.left = build()
            node.right = build()
            return node
        return build()
```

The markers are right, but without a separator nothing says where one value ends and the next begins. Reading one character at a time breaks on `-5` and `10`. Put a comma (or any character that can't appear in a value) between tokens.

### Passes the remaining tokens around as slices

```python wrong fails="perf"
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, stack = [], [root]
        while stack:
            node = stack.pop()
            if node is None:
                out.append("#")
            else:
                out.append(str(node.val))
                stack += [node.right, node.left]
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        def build(tokens):  # returns the subtree and the tokens left over
            if tokens[0] == "#":
                return None, tokens[1:]  # copies all the remaining tokens
            node = TreeNode(int(tokens[0]))
            node.left, rest = build(tokens[1:])
            node.right, rest = build(rest)
            return node, rest

        return build(data.split(","))[0]
```

Returning "the subtree and what's left of the input" is a tidy way to write a parser, but `tokens[1:]` copies everything that remains, at every node and every marker. A tree of 120,000 nodes has about 240,000 tokens, so that's around 29 billion copied references. Share one iterator (or an index) instead.

## Notes

Taking tokens with `tokens.pop(0)` is a classic slow version too: each call shifts every remaining element, O(n²) in all. The shift is a single fast block copy, so depending on the machine it may pass the performance test or narrowly miss it; `collections.deque.popleft()` or an iterator is O(1) per token. LeetCode's own tree format is the level-order one used in these tests.
