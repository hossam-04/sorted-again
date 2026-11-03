---
id: 148
module: sorting
patterns: [merge sort on a linked list, fast and slow pointers, merging sorted lists]
signature: "def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]"
---

## Task

You get the head of a linked list of whole numbers. Sort the list from smallest to largest by relinking its nodes, and return the head of the sorted list. It has to run in O(n log n) time.

## Constraints

- The list has between `0` and `50_000` nodes
- `-10**5 <= node.val <= 10**5`

```json examples
[
  {"args": [[3, 1, 2]], "out": [1, 2, 3], "why": "Three nodes, relinked into increasing order."},
  {"args": [[5, -2, 5, 0]], "out": [-2, 0, 5, 5], "why": "Negative values come first, and both 5s stay in the list."},
  {"args": [[]], "out": [], "why": "An empty list is already sorted: return None."}
]
```

```json edge
[
  {"name": "one node", "args": [[7]], "out": [7]},
  {"name": "two nodes out of order", "args": [[2, 1]], "out": [1, 2]},
  {"name": "already sorted", "args": [[-4, -1, 0, 8]], "out": [-4, -1, 0, 8]},
  {"name": "sorted backwards", "args": [[9, 7, 5, 3, 1]], "out": [1, 3, 5, 7, 9]},
  {"name": "all equal", "args": [[4, 4, 4, 4]], "out": [4, 4, 4, 4]},
  {"name": "the extreme values", "args": [[100000, -100000, 0]], "out": [-100000, 0, 100000]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(8, 200)
    hi = 10 if size == "small" else 10**5
    vals = [rng.randint(-hi, hi) for _ in range(n)]
    if rng.random() < 0.2:
        vals.sort(reverse=rng.random() < 0.5)
    return [vals]
```

```python perf
def perf(rng):
    # 50,000 nodes in random order.
    return [[rng.randint(-10**5, 10**5) for _ in range(50_000)]]
```

## Hints

1. Merge sort suits linked lists: merging two sorted lists needs no random access and no extra array, only relinking.
2. Find the middle with fast and slow pointers, cut the list there, sort both halves, and merge them.
3. Start `fast` one node ahead of `slow` (`fast = head.next`), so that a list of two nodes splits into one and one.

## Solution

```python solution time="n log n" space="log n"
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head
        slow, fast = head, head.next
        while fast and fast.next:  # slow stops at the end of the first half
            slow, fast = slow.next, fast.next.next
        second, slow.next = slow.next, None  # cut the list in two
        a, b = self.sortList(head), self.sortList(second)
        dummy = tail = ListNode()
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b
        return dummy.next
```

Fast and slow pointers find the middle in one pass: when `fast` reaches the end, `slow` is at the last node of the first half. Cutting there gives two lists of nearly equal length. Each is sorted the same way, then the two are merged, as in [[p:21]].

There are about log₂ n levels of splitting, and each level walks and merges all n nodes, so the time is O(n log n). Nodes are relinked, never copied. The only extra memory is the recursion, log₂ n deep: about 16 calls for 50,000 nodes.

## Alternatives

### Bottom-up merge sort, with no recursion

```python alt time="n log n" space="1"
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        def split(node, size):  # cut after `size` nodes; return the rest
            for _ in range(size - 1):
                if not node:
                    break
                node = node.next
            if not node:
                return None
            rest, node.next = node.next, None
            return rest

        def merge(a, b, tail):  # merge a and b after tail; return the new tail
            while a and b:
                if a.val <= b.val:
                    tail.next, a = a, a.next
                else:
                    tail.next, b = b, b.next
                tail = tail.next
            tail.next = a or b
            while tail.next:
                tail = tail.next
            return tail

        n, node = 0, head
        while node:
            n, node = n + 1, node.next
        dummy = ListNode(0, head)
        size = 1
        while size < n:  # merge runs of length size into runs of length 2 * size
            tail, cur = dummy, dummy.next
            while cur:
                left = cur
                right = split(left, size)
                cur = split(right, size)
                tail = merge(left, right, tail)
            size *= 2
        return dummy.next
```

Instead of splitting from the top, start with runs of one node, merge neighbouring pairs into runs of two, then four, and so on. It does the same O(n log n) work with O(1) extra memory, because nothing is waiting on a call stack. It's longer and easier to get wrong.

### Copy the values out, sort them, write them back

```python alt time="n log n" space="n" oracle
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        vals, node = [], head
        while node:
            vals.append(node.val)
            node = node.next
        vals.sort()
        node = head
        for v in vals:
            node.val, node = v, node.next
        return head
```

Simple and fast, but it changes the values stored in the nodes instead of their links, and it uses O(n) extra memory. When the nodes carry other data, or other code holds references to them, that isn't a sort of the list.

## Wrong answers

### Starts the fast pointer at the head

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head
        slow, fast = head, head  # should be head.next
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
        second, slow.next = slow.next, None
        a, b = self.sortList(head), self.sortList(second)
        dummy = tail = ListNode()
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b
        return dummy.next
```

With both pointers starting at the head, `slow` stops one node too late. For a list of two nodes, it stops on the second node, so the "first half" is the whole list and the second half is empty. The call on the first half gets the same two nodes again, forever, until Python raises `RecursionError`. Every list longer than one node reaches a two-node piece eventually.

### Insertion sort on the list

```python wrong fails="perf"
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode()
        while head:
            node, head = head, head.next
            spot = dummy
            while spot.next and spot.next.val < node.val:  # walks from the front every time
                spot = spot.next
            node.next, spot.next = spot.next, node
        return dummy.next
```

It's correct and needs no extra memory, but each node searches the sorted part from the front for its place. On 50,000 nodes in random order that's about n²/4, over 600 million steps. A linked list can't binary search, so the way to O(n log n) is merging.

### Loses the rest of a half when merging

```python wrong fails="example" test="Example 1"
class Solution:
    def sortList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head
        slow, fast = head, head.next
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
        second, slow.next = slow.next, None
        a, b = self.sortList(head), self.sortList(second)
        dummy = tail = ListNode()
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        return dummy.next  # the nodes left in a or b are dropped
```

When one half runs out, the other still holds its largest nodes, already in order. Without `tail.next = a or b`, they fall off the end: `[3, 1, 2]` comes back as `[1]`.
