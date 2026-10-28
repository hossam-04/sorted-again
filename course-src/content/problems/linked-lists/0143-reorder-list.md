---
id: 143
module: linked-lists
patterns: [find the middle, reverse, merge]
signature: "def reorderList(self, head: Optional[ListNode]) -> None"
adapter: in-place
inplace: 0
---

## Task

You get the head of a linked list with nodes L0, L1, …, Ln. Rearrange the nodes into the order

L0, Ln, L1, Ln−1, L2, Ln−2, …

taking alternately from the front and from the back. Change the links between nodes, not the values stored in them. The function returns nothing: the checker reads the list starting from `head` after your function has run.

## Constraints

- The list has between `1` and `50_000` nodes
- `1 <= node.val <= 1000`

```json examples
[
  {"args": [[10, 20, 30, 40, 50, 60]], "out": [10, 60, 20, 50, 30, 40], "why": "First, last, second, second to last, and so on until the two ends meet."},
  {"args": [[1, 2, 3]], "out": [1, 3, 2], "why": "The middle node of an odd-length list ends up last."},
  {"args": [[7]], "out": [7], "why": "One node: nothing to rearrange."}
]
```

```json edge
[
  {"name": "two nodes", "args": [[1, 2]], "out": [1, 2]},
  {"name": "four nodes", "args": [[5, 6, 7, 8]], "out": [5, 8, 6, 7]},
  {"name": "five nodes", "args": [[9, 8, 7, 6, 5]], "out": [9, 5, 8, 6, 7]},
  {"name": "equal values", "args": [[3, 3, 3, 3]], "out": [3, 3, 3, 3]},
  {"name": "seven nodes", "args": [[1, 2, 3, 4, 5, 6, 7]], "out": [1, 7, 2, 6, 3, 5, 4]},
  {"name": "largest values", "args": [[1000, 1, 1000]], "out": [1000, 1000, 1]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    return [[rng.randint(1, 20 if size == "small" else 1000) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 50,000 nodes.
    return [[rng.randint(1, 1000) for _ in range(50_000)]]
```

## Hints

1. The new order alternates between the first half (in order) and the second half (backwards).
2. Find the middle with a slow pointer and a fast pointer, then cut the list into two halves.
3. Reverse the second half, then merge the two halves by alternating nodes.

## Solution

```python solution time="n" space="1"
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        slow = fast = head
        while fast.next and fast.next.next:  # slow stops at the end of the first half
            slow, fast = slow.next, fast.next.next
        second, slow.next = slow.next, None  # cut the list in two

        prev = None  # reverse the second half
        while second:
            second.next, prev, second = prev, second, second.next

        first, second = head, prev  # weave the halves together
        while second:
            first.next, first = second, first.next
            second.next, second = first, second.next
```

The target order is the first half read forwards interleaved with the second half read backwards. Three linear steps produce exactly that. The fast pointer moves two nodes for every one of the slow pointer, so when it reaches the end, `slow` is at the end of the first half (the first half gets the extra node when the length is odd). Cutting there and reversing the second half makes both halves readable from their front.

The weave takes one node from each half in turn. It stops when the second half runs out, and the first half's last node already ends with `None` because of the cut. Every phase is a single pass: O(n) time and O(1) extra space.

## Alternatives

### Put the nodes in a list and use two indices

```python alt time="n" space="n" oracle
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        nodes = []
        while head:
            nodes.append(head)
            head = head.next
        i, j = 0, len(nodes) - 1
        while i < j:
            nodes[i].next = nodes[j]
            i += 1
            if i == j:
                break
            nodes[j].next = nodes[i]
            j -= 1
        nodes[i].next = None
```

With all nodes in a Python list, "the next node from the back" is just an index, and two pointers moving towards each other produce the order directly. It's easy to reason about, at the cost of O(n) extra memory.

## Wrong answers

### Builds a new list instead of changing this one

```python wrong fails="example" test="Example 1"
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        vals = []
        node = head
        while node:
            vals.append(node.val)
            node = node.next
        order = []
        i, j = 0, len(vals) - 1
        while i <= j:
            order.append(vals[i])
            if i != j:
                order.append(vals[j])
            i, j = i + 1, j - 1
        head = ListNode(order[0])  # rebinds the local name; the caller's list is untouched
        tail = head
        for v in order[1:]:
            tail.next = ListNode(v)
            tail = tail.next
```

The new list is in the right order, but assigning to `head` only changes the function's local name. The caller still holds the original first node, whose links never changed. In-place problems have to rewire the nodes they were given.

### Forgets to cut the list in two

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        slow = fast = head
        while fast.next and fast.next.next:
            slow, fast = slow.next, fast.next.next
        second = slow.next  # slow.next is never set to None

        prev = None
        while second:
            second.next, prev, second = prev, second, second.next

        first, second = head, prev
        while second:
            first.next, first = second, first.next
            second.next, second = first, second.next
```

Without `slow.next = None`, the end of the first half still points into the second half. After the reversal and the weave, a link leads back into nodes already visited, and the list becomes a loop that never ends. The checker reports it as a cycle.

### Detaches the last node by walking the whole list each time

```python wrong fails="perf"
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        cur = head
        while cur and cur.next and cur.next.next:
            prev = cur
            while prev.next.next:  # walk to the second-to-last node
                prev = prev.next
            last = prev.next
            prev.next = None
            last.next = cur.next
            cur.next = last
            cur = last.next
```

Moving the current last node behind `cur` produces the right order, one node at a time. But finding the last node means walking everything that's left, so the total is O(n²): over 600 million steps for 50,000 nodes.
