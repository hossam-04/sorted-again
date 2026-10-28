---
id: 21
module: linked-lists
patterns: [dummy head, two pointers, splicing]
signature: "def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]"
---

## Task

You get the heads of two linked lists, `list1` and `list2`, each sorted from smallest to largest (either may be empty). Merge them into one sorted list by relinking their nodes, and return the head of the merged list.

## Constraints

- Each list has between `0` and `25_000` nodes
- `-10**4 <= node.val <= 10**4`
- Both lists are sorted in non-decreasing order

```json examples
[
  {"args": [[2, 5, 9], [1, 5, 7, 10]], "out": [1, 2, 5, 5, 7, 9, 10], "why": "Take the smaller front node each time. When list1 runs out, the rest of list2 (just 10) follows."},
  {"args": [[], [3, 4]], "out": [3, 4], "why": "Merging with an empty list gives the other list."},
  {"args": [[6], [1, 2, 3]], "out": [1, 2, 3, 6], "why": "All of list2 comes before the single node of list1."}
]
```

```json edge
[
  {"name": "both empty", "args": [[], []], "out": []},
  {"name": "second list empty", "args": [[1, 2], []], "out": [1, 2]},
  {"name": "equal values everywhere", "args": [[1, 1, 1], [1, 1]], "out": [1, 1, 1, 1, 1]},
  {"name": "list1 entirely smaller", "args": [[1, 2, 3], [7, 8]], "out": [1, 2, 3, 7, 8]},
  {"name": "interleaved", "args": [[1, 3, 5], [2, 4, 6]], "out": [1, 2, 3, 4, 5, 6]},
  {"name": "negative values", "args": [[-9, -1], [-5, 0]], "out": [-9, -5, -1, 0]},
  {"name": "one long, one short", "args": [[4], [1, 2, 3, 5, 6, 7]], "out": [1, 2, 3, 4, 5, 6, 7]}
]
```

```python gen
def gen(rng, size):
    m = rng.randint(0, 5) if size == "small" else rng.randint(0, 150)
    n = rng.randint(0, 5) if size == "small" else rng.randint(0, 150)
    hi = 10 if size == "small" else 10**4
    return [sorted(rng.randint(-hi, hi) for _ in range(m)), sorted(rng.randint(-hi, hi) for _ in range(n))]
```

```python perf
def perf(rng):
    # Two sorted lists of 25,000 nodes each, interleaved.
    a = sorted(rng.randint(-10**4, 10**4) for _ in range(25_000))
    b = sorted(rng.randint(-10**4, 10**4) for _ in range(25_000))
    return [a, b]
```

## Hints

1. Compare the two front nodes. The smaller one is the next node of the merged list.
2. A *dummy* node in front of the result saves you from special-casing the first node: you always append after `tail`.
3. When one list runs out, the other is already sorted: attach the whole rest in one step.

## Solution

```python solution time="m + n" space="1"
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = tail = ListNode()  # a placeholder before the real first node
        while list1 and list2:
            if list1.val <= list2.val:
                tail.next, list1 = list1, list1.next
            else:
                tail.next, list2 = list2, list2.next
            tail = tail.next
        tail.next = list1 or list2  # whatever is left is already sorted
        return dummy.next
```

The merged list grows behind `tail`. At each step the smaller of the two front nodes is the smallest value not yet used, so it goes next. The dummy node means the first real node is appended exactly like every other one, and `dummy.next` is the answer at the end.

When either list is exhausted, the other one holds only values that are at least as large as everything merged so far, in order, so one assignment attaches all of it. Every node is relinked once: O(m + n) time, and no new nodes are created.

## Alternatives

### Collect the values, sort, rebuild

```python alt time="(m + n) log(m + n)" space="m + n" oracle
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        vals = []
        for node in (list1, list2):
            while node:
                vals.append(node.val)
                node = node.next
        head = None
        for v in sorted(vals, reverse=True):
            head = ListNode(v, head)
        return head
```

Obviously correct, but it ignores that both lists are already sorted, and it builds new nodes instead of reusing the given ones.

### Recursion

```python alt time="m + n" space="m + n"
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        if not list1 or not list2:
            return list1 or list2
        if list1.val <= list2.val:
            list1.next = self.mergeTwoLists(list1.next, list2)
            return list1
        list2.next = self.mergeTwoLists(list1, list2.next)
        return list2
```

"The smaller head, followed by the merge of everything else" is a compact definition, and the code says exactly that. It uses one call per node, so its stack grows with the lists' total length.

## Wrong answers

### Drops whatever is left over

```python wrong fails="example" test="Example 1"
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = tail = ListNode()
        while list1 and list2:
            if list1.val <= list2.val:
                tail.next, list1 = list1, list1.next
            else:
                tail.next, list2 = list2, list2.next
            tail = tail.next
        tail.next = None  # the nodes still in list1 or list2 are lost
        return dummy.next
```

The loop stops as soon as one list is empty, but the other may still have nodes. In Example 1 the 10 is never attached. One line, `tail.next = list1 or list2`, fixes it.

### Assumes both lists have a first node

```python wrong fails="example" test="Example 2" how="error"
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        if list1.val <= list2.val:  # crashes when either list is empty
            head, list1 = list1, list1.next
        else:
            head, list2 = list2, list2.next
        tail = head
        while list1 and list2:
            if list1.val <= list2.val:
                tail.next, list1 = list1, list1.next
            else:
                tail.next, list2 = list2, list2.next
            tail = tail.next
        tail.next = list1 or list2
        return head
```

Choosing the head before the loop needs both heads to exist. With an empty list, `list1.val` raises `AttributeError`. A dummy node removes this special case entirely.

### Inserts list2 into list1 one node at a time

```python wrong fails="perf"
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0, list1)
        while list2:
            node, list2 = list2, list2.next
            spot = dummy
            while spot.next and spot.next.val <= node.val:  # searches from the start every time
                spot = spot.next
            node.next, spot.next = spot.next, node
        return dummy.next
```

Insertion keeps the list sorted, but each node of `list2` searches from the very beginning for its spot. That's O(m·n): about 600 million steps for two lists of 25,000. Since `list2` is sorted too, each search could continue where the previous one stopped, which turns this into the merge.
