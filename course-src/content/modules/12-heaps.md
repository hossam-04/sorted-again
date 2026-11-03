---
id: heaps
title: Heaps and priority queues
kicker: the heap property · heapq · top k · two heaps · merging · greedy choices
summary: "A heap always knows its smallest item, however items come and go: O(1) to look, O(log n) to add or remove. That makes it the tool for top-k questions, running medians, merging sorted streams and greedy algorithms that keep taking the best option left."
---

## The heap property

A **binary heap** is a binary tree with two rules:

1. **Shape:** every level is full, except maybe the last, which fills from the left.
2. **Order:** every parent is at most each of its children. That's a *min-heap*; a *max-heap* flips the comparison.

So the smallest item is always at the root. Nothing else is in order: siblings can come in any order, and a small item can sit deep in one branch while a larger one is near the top of another. That's less than a sorted list gives you, but it's enough to find the minimum instantly, and much cheaper to maintain.

Because the shape has no gaps, the tree fits in a plain list with no pointers at all. The root is at index 0, and the node at index i has its children at 2i + 1 and 2i + 2 and its parent at (i − 1) // 2. A heap of n items is about log₂ n levels tall.

## Push and pop

- **Push:** put the new item at the end of the list, which is the next free spot in the bottom row. Then *sift it up*: while it's smaller than its parent, swap the two.
- **Pop:** take the root. Move the last item into its place, then *sift it down*: while it's larger than its smaller child, swap the two.

Both walk a single path between the root and the bottom row, so each costs O(log n). Looking at the minimum without removing it is O(1).

:::viz heap-sift
:::

Use "Edit input" to push a number larger than everything (it stays where it lands), or to start from a longer list.

## Python's `heapq`

`heapq` keeps an ordinary list arranged as a min-heap. It's a set of functions, not a class: you pass the list to each of them.

```python run title=heapq_in_action
from heapq import heapify, heappush, heappop, heapreplace

h = [9, 4, 7, 1, 8, 2]
heapify(h)  # rearranges the list in place, in O(n)
print("heap:", h, "  smallest:", h[0])

heappush(h, 3)
print("after pushing 3:", h)

print("three pops:", heappop(h), heappop(h), heappop(h))
print("left:", h)

print("heapreplace returns", heapreplace(h, 5), "and leaves", h)  # pop the smallest, then push 5
```

:::gotcha `heap[0]` is the smallest, but the list isn't sorted
Only the root has a guaranteed place. `heap[1]` isn't necessarily the second smallest, and `heap[-1]` isn't the largest: above, `[1, 4, 2, 9, 8, 7]` has its second smallest at index 2. To get items in order, pop them one at a time, or use `sorted(heap)` or `nsmallest`. Looping over the list directly gives heap order, which looks almost sorted and isn't.
:::

`heapify` costs O(n), not O(n log n): it sifts down every parent from the bottom up, and most nodes sit near the bottom, where there's little room to sift. So turning a list into a heap and popping k items costs O(n + k log n).

## Max-heaps by negation

`heapq` only builds min-heaps. For a max-heap, push the negatives: the largest number has the smallest negative, so it comes out first. Flip the sign back whenever you read a value ([[p:1046]]). With tuples, negate just the field that orders them, as in `(-score, name)`.

Python 3.14 added max-heap versions of the functions (`heappush_max`, `heappop_max`, `heapify_max` and the rest). This page runs 3.14, but older Pythons and many judges don't have them, so negation is the habit that works everywhere.

## Priorities with tuples

A **priority queue** hands out items by priority instead of arrival order, and a heap of `(priority, item)` tuples is the standard way to build one. Tuples compare field by field, so the priority decides first.

:::gotcha Ties compare the next field
When two priorities are equal, Python goes on to compare the items themselves. If they can't be compared, such as two dicts, the push raises `TypeError`. If they can, the tie may be broken in an order you didn't intend. Put a counter between them, as in `(priority, next(counter), item)`: counts are never equal, so the items are never compared, and equal priorities come out first in, first out.
:::

```python run title=Ties_and_a_counter
from heapq import heappush, heappop
from itertools import count

jobs = []
try:
    heappush(jobs, (2, {"name": "backup"}))
    heappush(jobs, (2, {"name": "email"}))  # same priority, so Python compares the dicts
except TypeError as e:
    print("TypeError:", e)

jobs, order = [], count()
for priority, job in [(2, {"name": "backup"}), (1, {"name": "deploy"}), (2, {"name": "email"})]:
    heappush(jobs, (priority, next(order), job))  # the counter breaks ties: first come, first served
while jobs:
    priority, _, job = heappop(jobs)
    print(priority, job["name"])
```

## Top k: a heap of size k

To find the k largest of n items, you don't need to sort all of them. Keep a **min-heap of the k largest seen so far**: its top is the smallest of them, the bar that a new item must clear. An item larger than the top replaces it; anything else is skipped.

Each item costs at most O(log k), so the whole scan is O(n log k) with only k items in memory, even when the items arrive as a stream you can't store ([[p:703]]). The same trick, with the comparison flipped, keeps the k nearest points in a max-heap of distances ([[p:973]]), and [[p:215]] is the bare version.

```python run title=Top_k_with_a_size_k_heap
from heapq import heappush, heapreplace, nlargest
import random

random.seed(7)
scores = [random.randint(0, 10**9) for _ in range(100_000)]

def top_k(items, k):
    heap = []  # the k largest so far; heap[0] is the smallest of them
    for x in items:
        if len(heap) < k:
            heappush(heap, x)
        elif x > heap[0]:
            heapreplace(heap, x)  # x joins the top k, and the old k-th largest leaves
    return sorted(heap, reverse=True)

print(top_k(scores, 5))
print(nlargest(5, scores))  # the same, built in
```

## Two heaps: a running median

The median splits sorted numbers into a lower and an upper half. Keep the lower half in a max-heap and the upper half in a min-heap, with equal sizes or the lower half one bigger. The two tops are then the middle of the sorted order: the median is the lower top, or the mean of both tops ([[p:295]]).

:::viz two-heaps-median
:::

Each new number joins the half it belongs to. If the sizes drift apart by two, one top moves across, which keeps both rules: every number in the lower half is at most every number in the upper half. Adding costs O(log n), and reading the median is O(1).

## Merging sorted streams

To merge k sorted lists, keep a heap holding the current front item of each list. Pop the smallest, then push the next item from the list it came from. The heap never holds more than k items, so merging N items costs O(N log k). [[p:23]] does this with linked lists. [[p:355]] merges each user's tweets and stops after the newest 10, and `heapq.merge` does the same work lazily, one item at a time.

```python run title=Merging_sorted_lists_with_a_heap
from heapq import heapify, heappop, heappush, merge

def merge_sorted(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]  # (value, which list, index in it)
    heapify(heap)
    out = []
    while heap:
        value, i, j = heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            heappush(heap, (lists[i][j + 1], i, j + 1))  # the next value from the same list
    return out

lists = [[1, 4, 9], [2, 3, 10, 11], [], [5]]
print(merge_sorted(lists))
print(list(merge(*lists)))  # heapq.merge does the same, lazily
```

The list index `i` in each tuple also breaks ties between equal values, so the lists themselves are never compared.

## Greedy choices

Many greedy algorithms repeatedly take the best option available right now, while new options keep appearing. A heap serves exactly that. [[p:1046]] keeps combining the two largest numbers. [[p:621]] fills each round of n + 1 time units with the job types that have the most jobs left. [[m:graphs]] uses the same idea for shortest paths (Dijkstra's algorithm always settles the nearest unsettled node next) and for minimum spanning trees.

## Complexity

| Operation | `heapq` | Time |
|---|---|---|
| Look at the smallest | `heap[0]` | `O(1)` |
| Push | `heappush` | `O(log n)` |
| Pop the smallest | `heappop` | `O(log n)` |
| Pop, then push (or push, then pop) | `heapreplace`, `heappushpop` | `O(log n)` |
| Build from a list | `heapify` | `O(n)` |
| k smallest or largest of n | `nsmallest`, `nlargest` | `O(n log k)` |
| Merge k sorted lists of N items in all | `merge` | `O(N log k)` |
| Find or remove any other item | a scan, then `heapify` | `O(n)` |

:::interview
Name the heap and what's on top: "a min-heap of the k largest, so the top is the k-th largest", or "a max-heap of the lower half". Say how you get a max-heap from `heapq` (negation), and mention that `heapify` is O(n). If the input fits in memory and k is close to n, say that sorting is simpler and just as fast; the heap shines for small k and for streams.
:::

:::work
Priority queues are everywhere in systems code. Job queues and schedulers hand out work by priority, timers fire in order of deadline (Python's own `asyncio` keeps its scheduled callbacks in a heap), and network routing runs Dijkstra's algorithm. Sorting data too large for memory ends with a k-way merge of sorted chunks, which is what `heapq.merge` does, and a size-k heap gives a "top 10" over a stream without storing the stream.
:::

## Quick check

:::quiz
? A min-heap is stored in a list. Where is the second smallest item?
- [ ] Always at index 1
- [x] At index 1 or 2: it's one of the root's children
- [ ] At the end of the list
> Each child is at least its parent, so the second smallest must be directly below the root. Which of the two children it is depends on how the heap was built.

? How long does `heapify` take on a list of n items?
- [ ] O(n log n), one push per item
- [x] O(n), because most nodes are near the bottom and sift only a little
- [ ] O(log n)
> Sifting down from the bottom up does little work for the many nodes near the leaves. The total is O(n).

? You need the 10 largest of a million numbers. Which heap do you keep?
- [x] A min-heap of size 10, whose top is the smallest of the 10 largest
- [ ] A max-heap of all million numbers
- [ ] A min-heap of all million numbers
> The top of a size-10 min-heap is the bar a new number must clear. That's O(n log 10) time and only 10 numbers in memory.

? `heappush(h, (priority, task))` raises `TypeError` when tasks are dicts. When, and how do you fix it?
- [ ] Always: heaps can't hold tuples
- [x] When two priorities are equal, so the dicts get compared; put a counter between priority and task
- [ ] When the priority is negative; take its absolute value
> Tuples compare field by field. A unique counter in the second field settles every tie before the tasks are reached.

? In the two-heaps median, what must always be true?
- [ ] Both heaps are sorted lists
- [x] Every number in the lower half is at most every number in the upper half, and the sizes differ by at most one
- [ ] The lower half holds the first half of the numbers to arrive
> Those two rules put the middle of the sorted order at the two tops, so the median can be read in O(1).
:::
