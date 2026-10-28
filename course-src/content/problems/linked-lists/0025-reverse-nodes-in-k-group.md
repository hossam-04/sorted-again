---
id: 25
module: linked-lists
patterns: [reverse a sublist, dummy head, count ahead]
signature: "def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]"
---

## Task

You get the head of a linked list and a positive integer `k`. Split the list into groups of `k` consecutive nodes, from the start, and reverse the order of the nodes inside each group. If the last group has fewer than `k` nodes, leave it as it is.

Rearrange the nodes themselves (don't just swap values), and return the new head.

## Constraints

- The list has `n` nodes, `1 <= k <= n <= 50_000`
- `0 <= node.val <= 1000`

```json examples
[
  {"args": [[10, 20, 30, 40, 50, 60, 70], 3], "out": [30, 20, 10, 60, 50, 40, 70], "why": "Two full groups of three are reversed. The last node is a group of one, shorter than k, so it stays."},
  {"args": [[1, 2, 3, 4], 4], "out": [4, 3, 2, 1], "why": "With k equal to the length, the whole list is one group."},
  {"args": [[5, 6, 7], 1], "out": [5, 6, 7], "why": "Groups of one don't change anything."}
]
```

```json edge
[
  {"name": "one node", "args": [[9], 1], "out": [9]},
  {"name": "two nodes, one group", "args": [[1, 2], 2], "out": [2, 1]},
  {"name": "length a multiple of k", "args": [[1, 2, 3, 4, 5, 6], 2], "out": [2, 1, 4, 3, 6, 5]},
  {"name": "a short group at the end", "args": [[1, 2, 3, 4, 5, 6, 7, 8], 3], "out": [3, 2, 1, 6, 5, 4, 7, 8]},
  {"name": "k is one less than the length", "args": [[1, 2, 3, 4, 5], 4], "out": [4, 3, 2, 1, 5]},
  {"name": "repeated values", "args": [[1, 1, 2, 2], 2], "out": [1, 1, 2, 2]},
  {"name": "groups of one on a longer list", "args": [[4, 3, 2, 1], 1], "out": [4, 3, 2, 1]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 9) if size == "small" else rng.randint(20, 300)
    return [[rng.randint(0, 20 if size == "small" else 1000) for _ in range(n)], rng.randint(1, n if size == "small" else min(n, 12))]
```

```python perf
def perf(rng):
    # 50,000 nodes in groups of 2.
    return [[rng.randint(0, 1000) for _ in range(50_000)], 2]
```

## Hints

1. Handle one group at a time. Before reversing, check that k nodes are actually left; if not, you're done.
2. Reversing a group is the reversal from [[p:206]], stopped after k nodes. Afterwards the group's old first node is its last.
3. Keep a pointer to the node just before the current group (start with a dummy node before the head). After reversing, link it to the group's new first node, and link the group's new last node to whatever follows.

## Solution

```python solution time="n" space="1"
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        before = dummy  # the node just before the current group
        while True:
            end = before
            for _ in range(k):  # is there a full group?
                end = end.next
                if end is None:
                    return dummy.next
            after = end.next
            prev, cur = after, before.next  # reverse the group, pointing its first node at `after`
            while cur is not after:
                cur.next, prev, cur = prev, cur, cur.next
            first = before.next  # the old first node is now the group's last
            before.next = prev   # the old last node is now the group's first
            before = first
```

Each round looks k nodes ahead from `before`. If the list ends first, the remaining nodes form a short group and stay as they are. Otherwise the group runs from `before.next` to `end`, and `after` is the node that follows it.

The reversal is the classic three-pointer loop, with one twist: `prev` starts at `after` instead of `None`, so the group's old first node (which becomes its last) points straight at the rest of the list. Then `before` is linked to the group's new first node, and the old first node becomes `before` for the next group. Each node is visited a constant number of times: O(n) time and O(1) extra space.

## Alternatives

### Collect the nodes, then relink

```python alt time="n" space="n" oracle
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        nodes = []
        while head:
            nodes.append(head)
            head = head.next
        for start in range(0, len(nodes) - k + 1, k):  # only full groups
            nodes[start : start + k] = nodes[start : start + k][::-1]
        for a, b in zip(nodes, nodes[1:]):
            a.next = b
        nodes[-1].next = None
        return nodes[0]
```

With the nodes in a Python list, reversing a group is a slice, and relinking is one pass. It's easy to get right, at the cost of O(n) memory. A good stepping stone in an interview before the pointer version.

## Wrong answers

### Reverses the short group too

```python wrong fails="edge" test="a short group at the end"
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        before = dummy
        while before.next:  # no check that k nodes are left
            prev, cur, count = None, before.next, 0
            while cur and count < k:
                cur.next, prev, cur = prev, cur, cur.next
                count += 1
            first = before.next
            before.next = prev
            first.next = cur
            before = first
        return dummy.next
```

Reversing "up to k" nodes also reverses a final group with fewer than k nodes, which the task says to leave alone. The examples don't catch it because their short groups have a single node, which looks the same reversed. Count k nodes ahead before reversing anything.

### Loses the link between groups

```python wrong fails="example" test="Example 1"
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        new_head, cur = None, head
        while True:
            probe = cur
            for _ in range(k):
                if probe is None:
                    return new_head or head
                probe = probe.next
            prev, first = None, cur
            for _ in range(k):
                cur.next, prev, cur = prev, cur, cur.next
            if new_head is None:
                new_head = prev
            first.next = cur  # the previous group's last node is never pointed at this group
```

Each group is reversed and attached to whatever follows it, but nothing updates the *previous* group's last node, which still points at this group's old first node. The second group is cut off from the list. Keeping a `before` pointer (with a dummy node for the first group) fixes it.

### Counts the rest of the list before every group

```python wrong fails="perf"
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        before = dummy
        while True:
            remaining, probe = 0, before.next
            while probe:  # counts all the nodes that are left, every time
                remaining += 1
                probe = probe.next
            if remaining < k:
                return dummy.next
            prev, cur = None, before.next
            for _ in range(k):
                cur.next, prev, cur = prev, cur, cur.next
            first = before.next
            before.next = prev
            first.next = cur
            before = first
```

To know whether a full group is left you only need to look k nodes ahead, but this counts everything that remains. With k = 2 and 50,000 nodes that's 25,000 counts averaging 25,000 nodes each: over 600 million steps.
