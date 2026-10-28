---
id: 206
module: linked-lists
patterns: [pointer reversal, prev and next]
signature: "def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]"
---

## Task

You get the first node `head` of a singly linked list (or `None` for an empty list). Reverse the list, so the last node comes first and every `next` pointer points the other way, and return the new first node.

Tests show a list as the values of its nodes from first to last.

## Constraints

- The list has between `0` and `50_000` nodes
- `-5_000 <= node.val <= 5_000`

```json examples
[
  {"args": [[3, 8, 1, 6]], "out": [6, 1, 8, 3], "why": "The last node, 6, becomes the first, and every link points back the other way."},
  {"args": [[4, 7]], "out": [7, 4], "why": "Two nodes simply swap places."},
  {"args": [[5]], "out": [5], "why": "A single node is its own reverse."}
]
```

```json edge
[
  {"name": "empty list", "args": [[]], "out": []},
  {"name": "two equal values", "args": [[2, 2]], "out": [2, 2]},
  {"name": "negative values", "args": [[-5, 0, 5]], "out": [5, 0, -5]},
  {"name": "a palindrome", "args": [[1, 2, 1]], "out": [1, 2, 1]},
  {"name": "extreme values", "args": [[-5000, 5000]], "out": [5000, -5000]},
  {"name": "ten nodes", "args": [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], "out": [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    return [[rng.randint(-20, 20) if size == "small" else rng.randint(-5000, 5000) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 50,000 nodes.
    return [[rng.randint(-5000, 5000) for _ in range(50_000)]]
```

## Hints

1. Walk the list once. At each node, point its `next` at the node *before* it.
2. Once you overwrite `cur.next`, you can't reach the rest of the list any more, so save it first.
3. Keep three names: `prev` (the reversed part), `cur` (the node being moved) and `nxt` (the rest). When `cur` runs off the end, `prev` is the new head.

## Solution

```python solution time="n" space="1"
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev, cur = None, head
        while cur:
            nxt = cur.next   # save the rest of the list
            cur.next = prev  # point this node backwards
            prev = cur       # the reversed part now starts at cur
            cur = nxt
        return prev
```

The loop keeps two lists: `prev` is the part already reversed, and `cur` is the part still to go. Each step moves one node from the front of the second to the front of the first, by pointing its `next` at `prev`. Saving `cur.next` in `nxt` first is essential: after the reassignment it would be gone.

When `cur` becomes `None`, every node has moved and `prev` is the old last node, now the head. An empty list never enters the loop and returns `None`. Each node is visited once, with three variables of extra space: O(n) time and O(1) space.

## Alternatives

### Collect the values and rebuild

```python alt time="n" space="n" oracle
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        vals = []
        while head:
            vals.append(head.val)
            head = head.next
        new_head = None
        for v in vals:  # prepend each value: the last one read ends up first
            new_head = ListNode(v, new_head)
        return new_head
```

Easy to get right, but it builds a whole new list of nodes instead of reversing the existing one, and it needs O(n) extra memory. In an interview it's a reasonable warm-up, not the answer they're after.

### Recursion

```python alt time="n" space="n"
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if head is None or head.next is None:
            return head
        new_head = self.reverseList(head.next)  # reverse everything after head
        head.next.next = head  # the old second node now points back at head
        head.next = None
        return new_head
```

Reverse the rest of the list, then hang `head` onto its end, which is `head.next` (that node is now the tail of the reversed rest). It's elegant, but it makes one nested call per node: O(n) stack. Python's default limit is 1,000 calls (this page allows 100,000), so on long lists the loop is the safer choice.

## Wrong answers

### Returns the old head

```python wrong fails="example" test="Example 1"
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev, cur = None, head
        while cur:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        return head  # the old head is now the last node
```

The reversal itself is right, but `head` still names the node that used to be first. After reversing, it's the last node, with `next` set to `None`, so the result is a one-node list. Return `prev`.

### Forgets the empty list in the recursion

```python wrong fails="edge" test="empty list" how="error"
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if head.next is None:  # fails when head itself is None
            return head
        new_head = self.reverseList(head.next)
        head.next.next = head
        head.next = None
        return new_head
```

The base case checks `head.next`, which assumes `head` is a node. For an empty list `head` is `None`, and `None.next` raises `AttributeError`. Test `head is None` first.

### Moves the last node to the front, again and again

```python wrong fails="perf"
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        dummy = tail = ListNode()
        while head:
            prev, last = None, head
            while last.next:  # walk to the end of what's left, every time
                prev, last = last, last.next
            tail.next = last
            tail = last
            if prev:
                prev.next = None
            else:
                head = None
        return dummy.next
```

Taking the last node each time does produce the reversed order, but finding the last node means walking the whole remaining list. For 50,000 nodes that's about 1.25 billion steps.
