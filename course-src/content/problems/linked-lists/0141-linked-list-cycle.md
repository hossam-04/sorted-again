---
id: 141
module: linked-lists
patterns: [fast and slow pointers, Floyd's cycle detection]
signature: "def hasCycle(self, head: Optional[ListNode]) -> bool"
adapter: cycle-list
---

## Task

You get the head of a linked list. Return `True` if following `next` pointers from the head eventually returns to a node you've already visited (the list has a *cycle*), and `False` if it reaches the end (`None`).

Tests describe the list with its values and a number `pos`: the position of the node that the last node points back to, or -1 if the last node points to `None`. Your function only receives `head`.

## Constraints

- The list has between `0` and `100_000` nodes
- `-10**5 <= node.val <= 10**5`
- `pos` is -1 or a valid position in the list

```json examples
[
  {"args": [[4, 8, 15, 16, 23], 2], "out": true, "why": "The last node, 23, points back to 15, so the walk circles 15 → 16 → 23 forever."},
  {"args": [[4, 8], -1], "out": false, "why": "The walk reaches None after 8."},
  {"args": [[9], 0], "out": true, "why": "A single node pointing to itself is a cycle."}
]
```

```json edge
[
  {"name": "empty list", "args": [[], -1], "out": false},
  {"name": "one node, no cycle", "args": [[1], -1], "out": false},
  {"name": "three nodes, no cycle", "args": [[1, 2, 3], -1], "out": false},
  {"name": "cycle back to the head", "args": [[1, 2, 3, 4], 0], "out": true},
  {"name": "the last node points to itself", "args": [[1, 2, 3], 2], "out": true},
  {"name": "repeated values, no cycle", "args": [[7, 7, 7], -1], "out": false},
  {"name": "two nodes in a loop", "args": [[5, 6], 0], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 7) if size == "small" else rng.randint(20, 300)
    vals = [rng.randint(-5, 5) if size == "small" else rng.randint(-10**5, 10**5) for _ in range(n)]
    pos = rng.randrange(n) if n and rng.random() < 0.5 else -1
    return [vals, pos]
```

```python perf
def perf(rng):
    # 100,000 nodes; the last one points back to the middle.
    return [[rng.randint(-10**5, 10**5) for _ in range(100_000)], 50_000]
```

## Hints

1. You could remember every node you've visited in a set, and stop at the first repeat. Can you do it with O(1) memory?
2. Send two pointers down the list, one moving one step at a time and one moving two.
3. Without a cycle, the fast one reaches the end. With a cycle, both end up going round it, and the fast one gains one node per step, so it must land on the slow one.

## Solution

```python solution time="n" space="1"
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:  # the same node, not just the same value
                return True
        return False
```

This is Floyd's "tortoise and hare". If the list ends, the fast pointer gets there first, and the loop condition (`fast and fast.next`) stops before it steps off the end. If there's a cycle, both pointers eventually enter it. Inside the cycle, each step closes the distance between them by exactly one node (fast moves two, slow one), so the fast pointer can't jump over the slow one: they meet within one lap.

The comparison uses `is` because the question is about the same node, not equal values. The slow pointer walks at most the list's length before they meet: O(n) time, with two pointers of extra space.

## Alternatives

### Remember visited nodes in a set

```python alt time="n" space="n" oracle
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        seen = set()
        while head:
            if head in seen:  # nodes hash by identity
                return True
            seen.add(head)
            head = head.next
        return False
```

The straightforward way: a node seen twice means a cycle. Node objects hash by identity, so a set of nodes works directly. It's O(n) time like Floyd's, but O(n) memory.

## Wrong answers

### Watches for repeated values

```python wrong fails="edge" test="repeated values, no cycle"
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        seen = set()
        while head:
            if head.val in seen:  # equal values, but maybe different nodes
                return True
            seen.add(head.val)
            head = head.next
        return False
```

A repeated value doesn't mean a repeated node. Any list with two equal values, cycle or not, makes this return `True`. Track the nodes themselves.

### Steps off the end of an odd-length list

```python wrong fails="edge" test="one node, no cycle" how="error"
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow = fast = head
        while fast:  # fast.next may be None
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True
        return False
```

The fast pointer moves two steps, so the loop must check that both steps exist. With a single node and no cycle, `fast.next` is `None`, so `fast.next.next` raises `AttributeError`. Any list that ends after an odd number of steps fails the same way.

### Keeps visited nodes in a list

```python wrong fails="perf"
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        seen = []
        while head:
            if head in seen:  # a linear search through every node visited so far
                return True
            seen.append(head)
            head = head.next
        return False
```

The idea is the same as the set version, but `in` on a list compares against every element. With 100,000 nodes that's billions of comparisons before the first repeat appears.
