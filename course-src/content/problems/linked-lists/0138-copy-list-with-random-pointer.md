---
id: 138
module: linked-lists
patterns: [old-to-new map, deep copy]
signature: "def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]'"
adapter: random-list
node: random
---

## Task

Each node of this linked list has a value, a `next` pointer and a second pointer, `random`, that points to any node of the list or to `None`. Build a *deep copy*: a new list of brand-new nodes with the same values, where each copy's `next` and `random` point to the corresponding *copies*. No pointer in the copy may lead back into the original list.

Return the head of the copy. The node class is `Node(x, next=None, random=None)`.

Tests describe a list as `[value, random_index]` pairs from first to last, where `random_index` is the position of the node that `random` points to, or `null`.

## Constraints

- The list has between `0` and `20_000` nodes
- `-10**4 <= node.val <= 10**4`
- Every `random` is `None` or points to a node of the same list

```json examples
[
  {"args": [[[4, 2], [9, null], [1, 0]]], "out": [[4, 2], [9, null], [1, 0]], "why": "The copy has the same shape: the first node's random points to the third copy, and the third's to the first copy."},
  {"args": [[[5, 0]]], "out": [[5, 0]], "why": "A single node whose random points to itself: the copy's random must point to the copy."},
  {"args": [[[8, 1], [8, 1]]], "out": [[8, 1], [8, 1]], "why": "Two nodes with the same value, both pointing at the second node."}
]
```

```json edge
[
  {"name": "empty list", "args": [[]], "out": []},
  {"name": "no random pointers", "args": [[[1, null], [2, null], [3, null]]], "out": [[1, null], [2, null], [3, null]]},
  {"name": "every random points to the head", "args": [[[1, 0], [2, 0], [3, 0]]], "out": [[1, 0], [2, 0], [3, 0]]},
  {"name": "every random points to itself", "args": [[[6, 0], [7, 1]]], "out": [[6, 0], [7, 1]]},
  {"name": "random points backwards", "args": [[[1, null], [2, 0], [3, 1]]], "out": [[1, null], [2, 0], [3, 1]]},
  {"name": "repeated values", "args": [[[2, 2], [2, 0], [2, 1]]], "out": [[2, 2], [2, 0], [2, 1]]},
  {"name": "extreme values", "args": [[[-10000, 1], [10000, null]]], "out": [[-10000, 1], [10000, null]]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 6) if size == "small" else rng.randint(20, 300)
    vals = [rng.randint(-5, 5) if size == "small" else rng.randint(-10**4, 10**4) for _ in range(n)]
    return [[[v, rng.randrange(n) if rng.random() < 0.7 else None] for v in vals]]
```

```python perf
def perf(rng):
    # 20,000 nodes, each with a random pointer.
    n = 20_000
    return [[[rng.randint(-10**4, 10**4), rng.randrange(n)] for _ in range(n)]]
```

## Hints

1. Copying `next` is easy. The problem is `random`: it may point to a node whose copy doesn't exist yet.
2. Do it in two passes. First create a copy of every node and remember which copy belongs to which original, in a dict.
3. In the second pass, set each copy's `next` and `random` by looking up the copies of the original's `next` and `random`.

## Solution

```python solution time="n" space="n"
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        copy = {None: None}  # original node -> its copy (None maps to None)
        node = head
        while node:  # pass 1: a copy of every node
            copy[node] = Node(node.val)
            node = node.next
        node = head
        while node:  # pass 2: wire the copies to each other
            copy[node].next = copy[node.next]
            copy[node].random = copy[node.random]
            node = node.next
        return copy[head]
```

The first pass creates every copy before any pointer is set, so in the second pass the copy of any node, including whatever `random` points to, already exists. The dict maps each original node to its copy, and mapping `None` to `None` handles missing `next` and `random` pointers without special cases.

Nodes are used as dict keys by identity, which is what you want here: two nodes with equal values are still different nodes. Two passes and one dict entry per node: O(n) time and O(n) space.

## Alternatives

### Index every node, then rebuild

```python alt time="n" space="n" oracle
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        originals = []
        node = head
        while node:
            originals.append(node)
            node = node.next
        position = {id(n): i for i, n in enumerate(originals)}
        copies = [Node(n.val) for n in originals]
        for i, n in enumerate(originals):
            copies[i].next = copies[i + 1] if i + 1 < len(copies) else None
            copies[i].random = copies[position[id(n.random)]] if n.random else None
        return copies[0] if copies else None
```

The same two-pass idea expressed with positions: number the originals, create the copies in a list, and translate each `random` into a position and back. It mirrors the test format and is easy to check.

### Weave the copies into the original list

```python alt time="n" space="1"
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        node = head
        while node:  # A -> A' -> B -> B' -> ...
            node.next = Node(node.val, node.next)
            node = node.next.next
        node = head
        while node:  # the copy of X.random is X.random.next
            node.next.random = node.random.next if node.random else None
            node = node.next.next
        dummy = tail = Node(0)
        node = head
        while node:  # separate the two lists again
            tail.next = node.next
            tail = tail.next
            node.next = node.next.next
            node = node.next
        return dummy.next
```

Insert each copy right after its original. Then the copy of any node X is simply `X.next`, so `random` pointers can be copied without a dict. A final pass unweaves the lists and restores the original. It uses O(1) extra space, which is the usual follow-up question.

## Wrong answers

### Copies random pointers as they are

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        dummy = tail = Node(0)
        node = head
        while node:
            tail.next = Node(node.val, None, node.random)  # random still points into the original list
            tail = tail.next
            node = node.next
        return dummy.next
```

The `next` pointers are copied correctly because each new node is appended as it's created. But `random` is copied as is, so it points at an *original* node. The copy and the original are now tangled together; the checker reports a random pointer that leads into the original list.

### Maps nodes by their value

```python wrong fails="example" test="Example 3"
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        copy = {}  # value -> copy: two nodes with the same value share an entry
        node = head
        while node:
            copy[node.val] = Node(node.val)
            node = node.next
        dummy = tail = Node(0)
        node = head
        while node:
            new = copy[node.val]
            new.random = copy[node.random.val] if node.random else None
            tail.next = new
            tail = new
            node = node.next
        tail.next = None
        return dummy.next
```

Values aren't identities. When two nodes hold the same value, as in Example 3, they share one copy, so the copied list has fewer distinct nodes than the original and its pointers end up wrong. Key the dict by the node itself.

### Finds each random target by searching from the head

```python wrong fails="perf"
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        copies = []
        node = head
        while node:
            copies.append(Node(node.val))
            node = node.next
        for i in range(len(copies) - 1):
            copies[i].next = copies[i + 1]
        node, i = head, 0
        while node:
            if node.random:
                j, probe = 0, head
                while probe is not node.random:  # walks from the head to find the target's position
                    probe, j = probe.next, j + 1
                copies[i].random = copies[j]
            node, i = node.next, i + 1
        return copies[0] if copies else None
```

Every `random` lookup walks from the head to find the target's position, which averages half the list. With 20,000 nodes that's about 200 million steps. A dict from node to copy (or to position) answers each lookup in O(1).
