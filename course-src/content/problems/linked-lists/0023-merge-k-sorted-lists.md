---
id: 23
module: linked-lists
patterns: [min-heap of list heads, k-way merge]
signature: "def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]"
---

## Task

You get a list `lists` of k linked lists, each sorted from smallest to largest. Some of them may be empty, and `lists` itself may be empty. Merge all of them into one sorted linked list and return its head.

## Constraints

- `0 <= k <= 10_000`
- At most `100_000` nodes in total
- `-10**4 <= node.val <= 10**4`
- Each list is sorted in non-decreasing order

```json examples
[
  {"args": [[[2, 6], [1, 5, 9], [3]]], "out": [1, 2, 3, 5, 6, 9], "why": "Repeatedly take the smallest front node among the three lists."},
  {"args": [[[], [4, 4]]], "out": [4, 4], "why": "Empty lists contribute nothing."},
  {"args": [[[7, 8]]], "out": [7, 8], "why": "One list is already merged."}
]
```

```json edge
[
  {"name": "no lists at all", "args": [[]], "out": []},
  {"name": "one empty list", "args": [[[]]], "out": []},
  {"name": "only empty lists", "args": [[[], [], []]], "out": []},
  {"name": "equal values in different lists", "args": [[[1, 3], [1, 2]]], "out": [1, 1, 2, 3]},
  {"name": "lists of one node", "args": [[[3], [1], [2]]], "out": [1, 2, 3]},
  {"name": "repeated values within a list", "args": [[[2, 2, 2], [1]]], "out": [1, 2, 2, 2]},
  {"name": "negative values", "args": [[[-5, -1], [-3]]], "out": [-5, -3, -1]},
  {"name": "one long list, two short", "args": [[[1, 2, 3, 4, 5, 6], [0], [7]]], "out": [0, 1, 2, 3, 4, 5, 6, 7]}
]
```

```python gen
def gen(rng, size):
    k = rng.randint(0, 4) if size == "small" else rng.randint(2, 30)
    hi = 6 if size == "small" else 10**4
    lists = []
    for _ in range(k):
        length = rng.randint(0, 4) if size == "small" else rng.randint(0, 20)
        lists.append(sorted(rng.randint(-hi, hi) for _ in range(length)))
    return [lists]
```

```python perf
def perf(rng):
    # 5,000 lists of 20 nodes: 100,000 nodes in total.
    return [[sorted(rng.randint(-10**4, 10**4) for _ in range(20)) for _ in range(5_000)]]
```

## Hints

1. The next node of the merged list is always the smallest of the k front nodes.
2. Keep the front nodes in a min-heap, so finding and removing the smallest takes O(log k). After taking a node, push its successor.
3. `heapq` compares tuples item by item. When two values are equal it compares the next item, so put a unique number (the list index, or a counter) before the node: `ListNode` objects can't be compared.

## Solution

```python solution time="N log k" space="k"
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
        heapq.heapify(heap)
        dummy = tail = ListNode()
        while heap:
            val, i, node = heapq.heappop(heap)  # the smallest front node
            tail.next = tail = node
            if node.next:
                heapq.heappush(heap, (node.next.val, i, node.next))  # i breaks ties: nodes can't be compared
        return dummy.next
```

The heap holds exactly one node per non-empty list: its current front. The smallest front is the smallest value not yet merged, so popping it and appending it to the result keeps the result sorted. Its successor becomes that list's new front.

Each heap entry is `(value, list index, node)`. When two values tie, Python compares the next item, and the list index is always different, so the comparison never reaches the nodes (which don't support `<`). With N nodes in total, every node is pushed and popped once at O(log k) each: O(N log k) time, and the heap holds at most k entries.

## Alternatives

### Collect every value and sort

```python alt time="N log N" space="N" oracle
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        vals = []
        for node in lists:
            while node:
                vals.append(node.val)
                node = node.next
        head = None
        for v in sorted(vals, reverse=True):
            head = ListNode(v, head)
        return head
```

Throw away the structure and sort. It's simple and, thanks to Python's fast `sorted`, often quick in practice. It ignores that each list is already sorted and creates new nodes instead of reusing the old ones.

### Merge pairs, round by round

```python alt time="N log k" space="1"
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        def merge(a, b):
            dummy = tail = ListNode()
            while a and b:
                if a.val <= b.val:
                    tail.next, a = a, a.next
                else:
                    tail.next, b = b, b.next
                tail = tail.next
            tail.next = a or b
            return dummy.next

        lists = [node for node in lists if node]
        while len(lists) > 1:  # each round halves the number of lists
            lists = [merge(lists[i], lists[i + 1]) if i + 1 < len(lists) else lists[i] for i in range(0, len(lists), 2)]
        return lists[0] if lists else None
```

Merge lists in pairs, like the levels of merge sort: k lists become k/2, then k/4, and so on. Every node takes part in one merge per round, and there are about log k rounds, so it matches the heap's O(N log k) without needing a heap.

## Wrong answers

### Forgets to push the next node

```python wrong fails="example" test="Example 1"
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
        heapq.heapify(heap)
        dummy = tail = ListNode()
        while heap:
            val, i, node = heapq.heappop(heap)
            tail.next = tail = node  # node.next still points into its own list
        tail.next = None
        return dummy.next
```

Each list's front enters the heap, but when a node is taken, its successor never does. The result is just the k heads in order, cut off at the end. Every pop must be followed by a push of that node's `next`.

### Pushes nodes without a tiebreaker

```python wrong fails="edge" test="equal values in different lists" how="error"
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        heap = [(node.val, node) for node in lists if node]  # equal values make heapq compare nodes
        heapq.heapify(heap)
        dummy = tail = ListNode()
        while heap:
            val, node = heapq.heappop(heap)
            tail.next = tail = node
            if node.next:
                heapq.heappush(heap, (node.next.val, node.next))
        return dummy.next
```

When two entries have the same value, `heapq` compares the second items, the nodes, and `ListNode` doesn't define `<`, so Python raises `TypeError`. It works on every test without ties, which makes it easy to miss. Put a unique number between the value and the node.

### Merges the lists one at a time

```python wrong fails="perf"
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        merged = None
        for head in lists:  # the merged list grows, and is walked again for every new list
            dummy = tail = ListNode()
            a, b = merged, head
            while a and b:
                if a.val <= b.val:
                    tail.next, a = a, a.next
                else:
                    tail.next, b = b, b.next
                tail = tail.next
            tail.next = a or b
            merged = dummy.next
        return merged
```

Each merge is correct, but the result keeps growing and is walked again for every list added. With 5,000 lists of 20 nodes, the later merges walk nearly 100,000 nodes each: about 250 million steps in total.
