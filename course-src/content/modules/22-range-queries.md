---
id: range-queries
part: advanced
title: Fenwick and segment trees
kicker: when prefix sums aren't enough · Fenwick trees · segment trees · descending the tree · indexing by value · range updates
summary: "Prefix sums answer range questions instantly, until the numbers change. Fenwick trees and segment trees keep both updates and range queries at O(log n), and the same trees answer sharper questions: the first position where something holds, how many smaller values came before, the best DP value in a range."
---

## The problem with prefix sums

Prefix sums turn every range sum into one subtraction, which is why [[m:arrays]] uses them everywhere. Their weakness is change: updating one number shifts every prefix sum after it, so an update costs O(n). Summing the range directly has the opposite profile, O(1) updates and O(n) queries.

| Approach | Update one number | Sum of a range |
|---|---|---|
| Plain list | `O(1)` | `O(n)` |
| Prefix sums | `O(n)` | `O(1)` |
| Blocks of √n | `O(1)` | `O(√n)` |
| Fenwick tree | `O(log n)` | `O(log n)` |
| Segment tree | `O(log n)` | `O(log n)` |

When updates and queries are mixed, as in [[p:307]], the trees win: both operations stay logarithmic. Blocks of about √n numbers, each with its total, are a simpler middle ground that's often fast enough in practice.

## Fenwick trees

A **Fenwick tree** (or binary indexed tree) is a list `tree` indexed from 1, where `tree[i]` holds the sum of a block of numbers ending at position i. The block's length is the **lowest set bit** of i, `i & -i`: position 12 (binary 1100) covers the 4 numbers from 9 to 12, and position 7 (binary 111) covers just number 7.

- **Prefix sum of the first i numbers:** add `tree[i]`, then remove the lowest set bit (`i -= i & -i`) and repeat. 13 = 1101 in binary gives blocks 13, 12 and 8: one per set bit, so O(log n) steps.
- **Change number i:** every block containing it changes. Starting at i, adding the lowest set bit (`i += i & -i`) moves to the next, larger block that contains it.

:::viz fenwick-update-query
:::

```python run title=A_Fenwick_tree
class Fenwick:
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (self.n + 1)
        for i, x in enumerate(nums, 1):  # O(n): each block passes its total up to the next block containing it
            self.tree[i] += x
            if i + (i & -i) <= self.n:
                self.tree[i + (i & -i)] += self.tree[i]

    def add(self, i, change):  # nums[i] += change, with i counted from 0
        i += 1
        while i <= self.n:
            self.tree[i] += change
            i += i & -i

    def prefix(self, count):  # the sum of the first `count` numbers
        total = 0
        while count > 0:
            total += self.tree[count]
            count -= count & -count
        return total

    def range_sum(self, left, right):  # nums[left] + ... + nums[right]
        return self.prefix(right + 1) - self.prefix(left)


f = Fenwick([3, 1, 4, 1, 5, 9, 2, 6])
print(f.range_sum(2, 5))  # 4 + 1 + 5 + 9
f.add(3, 10)              # the 1 at index 3 becomes 11
print(f.range_sum(2, 5))
print([f.prefix(c) for c in range(9)])
```

:::gotcha Positions start at 1
The lowest set bit of 0 is 0, so `i += i & -i` never leaves position 0, and a tree that uses position 0 loops forever. Shift every index by one on the way in. When the "positions" are values, as below, shift them so the smallest lands on 1. A negative position is worse than an error in Python: `tree[-3]` quietly reads from the end of the list.
:::

A Fenwick tree needs an operation that can be undone, because a range is the difference of two prefixes: sums, counts and XOR work. For a range *minimum* or *maximum*, use a segment tree.

## Segment trees

A **segment tree** stores the numbers as leaves of a binary tree, and every internal node holds the combination of its two children: their sum, minimum, maximum, or anything else that combines associatively. Like a heap, it fits in a list: with n leaves at positions n to 2n − 1, node i has children 2i and 2i + 1.

- **Update:** change the leaf, then recompute every node above it: O(log n).
- **Query a range:** start at both ends of the leaf range and climb. A node that's a right child at the left end (or a left child at the right end) is taken whole, because its parent reaches outside the range; then both ends move up a level. O(log n).

```python run title=A_segment_tree_for_any_operation
class SegmentTree:
    def __init__(self, nums, combine, empty):
        self.n, self.combine, self.empty = len(nums), combine, empty
        self.t = [empty] * self.n + list(nums)  # leaves at n .. 2n - 1
        for i in range(self.n - 1, 0, -1):
            self.t[i] = combine(self.t[2 * i], self.t[2 * i + 1])

    def set(self, i, value):
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = self.combine(self.t[2 * i], self.t[2 * i + 1])

    def query(self, left, right):  # combine nums[left .. right], both ends included
        res_l = res_r = self.empty
        l, r = left + self.n, right + self.n + 1
        while l < r:
            if l & 1:
                res_l = self.combine(res_l, self.t[l])
                l += 1
            if r & 1:
                r -= 1
                res_r = self.combine(self.t[r], res_r)
            l //= 2
            r //= 2
        return self.combine(res_l, res_r)


nums = [5, 2, 8, 6, 3, 9, 1, 7]
low = SegmentTree(nums, min, float("inf"))
high = SegmentTree(nums, max, float("-inf"))
print("min and max of nums[2..6]:", low.query(2, 6), high.query(2, 6))
low.set(4, 0)
print("after setting nums[4] = 0:", low.query(2, 6))
```

The two partial results are kept apart, left and right, so that operations where order matters (such as joining strings or multiplying matrices) still combine in the right order. Recursive segment trees are also common, and easier to extend with lazy propagation (below); the iterative form is shorter and faster in Python.

## Descending the tree

A segment tree can do more than combine ranges: it can **find** a position. To find the first position whose value is at least k, start at the root and go left whenever the left child's maximum is at least k, otherwise right. That's O(log n), where scanning would be O(n). [[p:2286]] uses exactly this to put each group in the lowest row with room for it, and keeps a second value per node, the sum of free seats, for the other kind of booking.

A Fenwick tree has its own descent. Over counts of values, "the smallest value whose prefix count reaches k" is the k-th smallest value, and it can be found by trying the bits of the answer from the largest down, adding a block whenever it doesn't overshoot. That turns a Fenwick tree into an order-statistics structure: insert, delete, and k-th smallest, all in O(log n).

## Indexing by value

The trees don't care what their positions mean. Indexed **by value**, they answer questions about the numbers seen so far:

- "How many earlier numbers are smaller than x?" is a prefix count over values. Scanning from the right gives [[p:315]]; scanning from the left and asking about values above `2x` gives [[p:493]].
- "What's the best DP value among predecessors whose value lies in a window?" is a range maximum over values, which turns the O(n²) DP of [[p:2407]] into O(n log m).

When values are huge or negative, replace them by their **rank** among the distinct values: sort them once and use `bisect` to map a value to its position. That's *coordinate compression*, and it keeps the tree as small as the number of distinct values.

Counting pairs can also be done with no tree at all: merge sort sees every pair once, in the merge where their halves meet, and a counting pass over two sorted halves counts all crossing pairs in linear time ([[p:493]]).

## Range updates

Sometimes a whole range changes at once: add 5 to every number from 10 to 20.

- **Range add, point query.** Store the *differences* between neighbours instead of the numbers. Adding v to a range changes only two differences (+v at the start, −v just after the end), and a number is the prefix sum of the differences. A Fenwick tree over the differences does both in O(log n).
- **Range add or assign, range query.** A segment tree with **lazy propagation**: when an update covers a node completely, record it on the node ("everything below me gets +5") and stop. The note is pushed down to the children only when a later operation needs to look inside.

```python run title=Lazy_propagation:_range_add_and_range_sum
class LazyTree:
    def __init__(self, n):
        self.n = n
        self.total = [0] * (4 * n)    # the sum of each node's range
        self.pending = [0] * (4 * n)  # an addition still owed to each child of the node

    def _push(self, node, lo, hi):  # hand a pending addition down to the children
        if self.pending[node]:
            mid = (lo + hi) // 2
            for child, size in ((2 * node, mid - lo + 1), (2 * node + 1, hi - mid)):
                self.total[child] += self.pending[node] * size
                self.pending[child] += self.pending[node]
            self.pending[node] = 0

    def add(self, l, r, v, node=1, lo=0, hi=None):  # add v to every position in l .. r
        hi = self.n - 1 if hi is None else hi
        if r < lo or hi < l:
            return
        if l <= lo and hi <= r:  # fully covered: note it here and stop
            self.total[node] += v * (hi - lo + 1)
            self.pending[node] += v
            return
        self._push(node, lo, hi)
        mid = (lo + hi) // 2
        self.add(l, r, v, 2 * node, lo, mid)
        self.add(l, r, v, 2 * node + 1, mid + 1, hi)
        self.total[node] = self.total[2 * node] + self.total[2 * node + 1]

    def sum(self, l, r, node=1, lo=0, hi=None):
        hi = self.n - 1 if hi is None else hi
        if r < lo or hi < l:
            return 0
        if l <= lo and hi <= r:
            return self.total[node]
        self._push(node, lo, hi)
        mid = (lo + hi) // 2
        return self.sum(l, r, 2 * node, lo, mid) + self.sum(l, r, 2 * node + 1, mid + 1, hi)


t = LazyTree(10)
t.add(2, 7, 5)      # positions 2..7 get +5
t.add(5, 9, 1)      # positions 5..9 get +1
print(t.sum(0, 9))  # 6 * 5 + 5 * 1
print(t.sum(6, 6))  # 5 + 1
```

Both operations visit O(log n) nodes, however long the range. Lazy segment trees are the most general tool in this module and the slowest in Python, where every node visit is a function call; reach for them only when a range update really is needed.

## Which one?

| You need | Use |
|---|---|
| Range sums, no updates | prefix sums |
| Point updates, range sums or counts | a Fenwick tree |
| Point updates, range minimum or maximum | a segment tree |
| The first position where a condition holds | a segment tree, descending |
| How many earlier values are smaller | a Fenwick tree over values (or merge sort) |
| Range updates, point queries | a Fenwick tree over differences |
| Range updates, range queries | a segment tree with lazy propagation |
| Something quick to write and fast enough | blocks of √n |

## Complexity

| Structure | Build | Point update | Range query | Range update |
|---|---|---|---|---|
| Prefix sums | `O(n)` | `O(n)` | `O(1)` | `O(n)` |
| Blocks of √n | `O(n)` | `O(1)` | `O(√n)` | `O(√n)` |
| Fenwick tree | `O(n)` | `O(log n)` | `O(log n)` | over differences: `O(log n)` |
| Segment tree | `O(n)` | `O(log n)` | `O(log n)` | lazy: `O(log n)` |

:::interview
These trees come up in Hard problems and in follow-ups: "now the array changes between queries". Say which operations you need and pick the simplest structure that does them: a Fenwick tree is about fifteen lines and enough for sums and counts. Write it from memory with 1-based positions. If a problem counts pairs by value ("how many earlier numbers are smaller"), say "Fenwick tree over values, with coordinate compression" before you write anything.
:::

:::work
Range queries over changing data are everywhere: rolling metrics over time windows, leaderboards that need a player's rank, and the order book of an exchange. Databases answer them with B-tree indexes and precomputed aggregates; time-series stores keep per-block summaries, which is the √n idea at scale. Fenwick trees also appear inside compression (arithmetic coding keeps cumulative symbol frequencies in one) and in game engines that need fast prefix sums of weights.
:::

## Quick check

:::quiz
? In a Fenwick tree, which numbers does `tree[12]` cover?
- [ ] Numbers 1 to 12
- [x] Numbers 9 to 12: the lowest set bit of 12 (binary 1100) is 4
- [ ] Only number 12
> Each position covers as many numbers as its lowest set bit, ending at the position itself.

? Why can't a Fenwick tree answer "the minimum of nums[l..r]" directly?
- [ ] Because it's too slow
- [x] A range is the difference of two prefixes, and a minimum can't be subtracted
- [ ] Because positions start at 1
> Sums, counts and XOR can be undone, so prefix(r) − prefix(l − 1) works. Minimums and maximums can't, which is what segment trees are for.

? How does a segment tree find the first position with a value of at least k in O(log n)?
- [x] It walks down from the root, going left whenever the left child's maximum is at least k
- [ ] It binary searches over the leaves, which are sorted
- [ ] It queries every prefix
> Each node's maximum says whether its range contains a position that qualifies, so one path from the root reaches the first one.

? To count, for each number, how many earlier numbers are smaller, what goes into the Fenwick tree?
- [ ] The positions of the numbers
- [x] A count per value (or per rank), queried with a prefix sum below the current value
- [ ] The prefix sums of the numbers
> Indexed by value, the tree's prefix sums count how many numbers seen so far are below a given value.

? What does lazy propagation save?
- [ ] Memory: the tree needs fewer nodes
- [x] Time: a range update stops at nodes it covers completely, noting the change there instead of visiting every position
- [ ] Nothing: it only makes the code shorter
> The note is pushed down only when an operation needs to look inside the node, so a range update visits O(log n) nodes.
:::
