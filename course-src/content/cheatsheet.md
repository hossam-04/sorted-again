## Hash map lookups

**When you see:** "have I seen this before?", counting, grouping, finding a partner value.

**Think:** spend O(n) memory on a dict or set to make each lookup O(1).

```python template
def two_sum(nums, target):
    seen = {}  # value -> the index where it was seen
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

print(two_sum([3, 9, 4, 6], 10))  # [2, 3]
```

**Practice:** [[p:1]], [[p:49]], [[p:128]]

## Two pointers

**When you see:** a sorted array, pairs or triples with a target sum, a palindrome, "in place".

**Think:** one pointer at each end, and the comparison tells you which one to move.

```python template
def pair_with_sum(nums, target):  # nums is sorted
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1  # need a bigger sum
        else:
            hi -= 1  # need a smaller sum
    return None

print(pair_with_sum([1, 3, 4, 6, 9], 13))  # (2, 4)
```

**Practice:** [[p:167]], [[p:15]], [[p:11]]

## Sliding window

**When you see:** the longest or shortest contiguous run that satisfies a condition, or something about every window of size k.

**Think:** grow the right edge every step; shrink the left edge while the window breaks the rule. Each element enters and leaves once: O(n).

```python template title="Sliding window (variable size)"
def longest_with_k_distinct(s, k):
    count = {}
    best = left = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:  # shrink until the window is valid again
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_with_k_distinct("abaccc", 2))  # 4, for "accc"
```

```python template title="Sliding window (fixed size)"
def max_sum_of_k(nums, k):
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]  # add the new element, drop the oldest
        best = max(best, window)
    return best

print(max_sum_of_k([2, 1, 5, 1, 3, 2], 3))  # 9, for 5 + 1 + 3
```

**Practice:** [[p:3]], [[p:424]], [[p:567]], [[p:76]]

## Prefix sums

**When you see:** many range-sum questions on the same array, or "how many subarrays add up to k".

**Think:** store running totals once; any range is then a difference of two of them, and a dict of totals seen so far finds matching ranges in one pass.

```python template
from itertools import accumulate

nums = [3, -1, 4, 1, 5]
prefix = [0] + list(accumulate(nums))  # prefix[i] = sum(nums[:i])

def range_sum(i, j):  # nums[i] + ... + nums[j]
    return prefix[j + 1] - prefix[i]

def count_with_sum(nums, k):
    seen = {0: 1}  # running total -> how often it has occurred
    total = count = 0
    for x in nums:
        total += x
        count += seen.get(total - k, 0)  # earlier totals that leave exactly k
        seen[total] = seen.get(total, 0) + 1
    return count

print(range_sum(1, 3), count_with_sum([1, 2, 1, 2, 1], 3))  # 4 4
```

**Practice:** [[p:238]], [[p:42]]

## Monotonic stack

**When you see:** "the next greater (or smaller) element", spans, the largest rectangle, days until something happens.

**Think:** a stack of indices still waiting for an answer, kept in decreasing (or increasing) order. Each new element resolves everything it beats.

```python template
def next_greater(nums):
    answer = [-1] * len(nums)
    stack = []  # indices still waiting, their values decreasing
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            answer[stack.pop()] = x
        stack.append(i)
    return answer

print(next_greater([2, 7, 3, 5, 4, 6, 8]))  # [7, 8, 5, 6, 6, 8, -1]
```

**Practice:** [[p:739]], [[p:853]], [[p:84]]

## Binary search

**When you see:** sorted data, a rotated sorted array, or "the smallest (largest) value for which something works".

**Think:** a yes/no question whose answer flips only once. Keep the half where the flip must be: O(log n).

```python template title="Binary search (first index >= target)"
def lower_bound(nums, target):  # the first index whose value is >= target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

print(lower_bound([1, 3, 3, 5, 8], 3), lower_bound([1, 3, 3, 5, 8], 6))  # 1 4
```

```python template title="Binary search on the answer"
def smallest_that_works(lo, hi, works):  # works(x) is False, ..., False, True, ..., True
    while lo < hi:
        mid = (lo + hi) // 2
        if works(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

piles, hours = [9, 14, 3, 20], 7
print(smallest_that_works(1, max(piles), lambda k: sum(-(-p // k) for p in piles) <= hours))  # 9
```

**Practice:** [[p:704]], [[p:875]], [[p:153]]

## Linked-list surgery

**When you see:** reversing, merging, reordering or removing nodes in a linked list.

**Think:** a dummy head so the first node isn't a special case, careful pointer order, and fast and slow pointers for the middle or a cycle.

```python template
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(node):
    out = []
    while node:
        out.append(node.val)
        node = node.next
    return out

def reverse(head):
    prev = None
    while head:
        nxt = head.next  # save the rest before re-pointing
        head.next = prev
        prev, head = head, nxt
    return prev

def merge(a, b):  # two sorted lists
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next

print(to_list(reverse(build([1, 2, 3, 4]))), to_list(merge(build([1, 4, 6]), build([2, 3, 7]))))
```

**Practice:** [[p:206]], [[p:21]], [[p:143]], [[p:141]]

## Tree DFS and BFS

**When you see:** a binary tree, a path, a height, a level, a subtree.

**Think:** DFS when a node's answer comes from its children's answers; BFS with a queue when the question is about levels.

```python template
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def height(node):  # DFS: combine the children's answers
    if node is None:
        return 0
    return 1 + max(height(node.left), height(node.right))

def levels(root):  # BFS: one level of the queue at a time
    out, queue = [], deque([root] if root else [])
    while queue:
        out.append([node.val for node in queue])
        for _ in range(len(queue)):
            node = queue.popleft()
            queue.extend(child for child in (node.left, node.right) if child)
    return out

root = TreeNode(4, TreeNode(2, TreeNode(1)), TreeNode(7, None, TreeNode(9)))
print(height(root), levels(root))  # 3 [[4], [2, 7], [1, 9]]
```

**Practice:** [[p:104]], [[p:102]], [[p:124]]

## Binary search trees

**When you see:** a BST, sorted order, the k-th smallest, a range of values.

**Think:** an inorder walk visits the values in sorted order; every node bounds the values allowed below it.

```python template
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_bst(node, low=float("-inf"), high=float("inf")):
    if node is None:
        return True
    if not low < node.val < high:
        return False
    return is_bst(node.left, low, node.val) and is_bst(node.right, node.val, high)

def kth_smallest(root, k):  # an inorder walk with an explicit stack
    stack, node = [], root
    while True:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right

root = TreeNode(5, TreeNode(3, TreeNode(2), TreeNode(4)), TreeNode(8))
print(is_bst(root), kth_smallest(root, 3))  # True 4
```

**Practice:** [[p:98]], [[p:230]], [[p:235]]

## Trie

**When you see:** prefixes, autocomplete, a dictionary of words searched letter by letter.

**Think:** a tree of letters, one node per prefix, with a mark where a word ends.

```python template
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True  # a word ends here

    def _walk(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and "$" in node

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

t = Trie()
for w in ("card", "care", "cat"):
    t.insert(w)
print(t.search("car"), t.starts_with("car"), t.search("cat"))  # False True True
```

**Practice:** [[p:208]], [[p:211]], [[p:212]]

## Top k with a heap

**When you see:** the k largest, smallest, closest or most frequent items.

**Think:** a min-heap that holds the best k so far; its top is the one to beat. O(n log k).

```python template
import heapq

def k_largest(nums, k):
    heap = []  # the k largest so far; heap[0] is the smallest of them
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)  # pop the smallest and push x in one step
    return sorted(heap, reverse=True)

print(k_largest([5, 1, 9, 3, 7, 8], 3))  # [9, 8, 7]
```

**Practice:** [[p:215]], [[p:973]], [[p:703]]

## Two heaps

**When you see:** a running median, or balancing a stream into a lower and an upper half.

**Think:** a max-heap for the smaller half and a min-heap for the larger half, kept the same size (or one apart).

```python template
import heapq

class RunningMedian:
    def __init__(self):
        self.low = []   # the smaller half, negated so heapq acts as a max-heap
        self.high = []  # the larger half

    def add(self, x):
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))  # the largest of low moves up
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2

m = RunningMedian()
for x in (5, 15, 1, 3):
    m.add(x)
    print(x, m.median())  # 5, then 10.0, 5 and 4.0
```

**Practice:** [[p:295]]

## Backtracking

**When you see:** "all" combinations, subsets, permutations, partitions or placements.

**Think:** choose, explore, un-choose. Copy the path when you record it, and prune choices that can't lead anywhere.

```python template
def subsets(items):
    out, path = [], []

    def explore(i):
        if i == len(items):
            out.append(path[:])  # a copy: path keeps changing
            return
        path.append(items[i])    # choose items[i]
        explore(i + 1)
        path.pop()               # un-choose it
        explore(i + 1)           # and explore without it

    explore(0)
    return out

print(subsets(["a", "b", "c"]))
```

**Practice:** [[p:78]], [[p:46]], [[p:39]]

## Grid BFS

**When you see:** the fewest steps in a grid or maze, or spreading from several sources at once.

**Think:** a queue of cells and a distance for each; put every source in the queue at the start for a multi-source search.

```python template
from collections import deque

def steps_to_exit(grid, start):
    rows, cols = len(grid), len(grid[0])
    dist = {start: 0}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        if grid[r][c] == "E":
            return dist[(r, c)]
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                queue.append((nr, nc))
    return -1

maze = ["S.#.",
        ".##E",
        "...."]
print(steps_to_exit(maze, (0, 0)))  # 6
```

**Practice:** [[p:200]], [[p:994]], [[p:286]]

## Topological sort

**When you see:** prerequisites, dependencies, build order, "is there a cycle?" in a directed graph.

**Think:** Kahn's algorithm: repeatedly take a node with no unmet prerequisites. If some nodes never become free, there's a cycle.

```python template
from collections import deque

def order(n, prerequisites):  # pairs (course, required_first)
    waiting = [0] * n
    unlocks = [[] for _ in range(n)]
    for course, first in prerequisites:
        unlocks[first].append(course)
        waiting[course] += 1
    ready = deque(c for c in range(n) if waiting[c] == 0)
    result = []
    while ready:
        c = ready.popleft()
        result.append(c)
        for nxt in unlocks[c]:
            waiting[nxt] -= 1
            if waiting[nxt] == 0:
                ready.append(nxt)
    return result if len(result) == n else []  # [] means there's a cycle

print(order(4, [(1, 0), (2, 1), (3, 1), (3, 2)]))  # [0, 1, 2, 3]
```

**Practice:** [[p:207]], [[p:210]], [[p:269]]

## Union-find

**When you see:** connected groups that only ever merge, "are these two connected?", an edge that closes a cycle.

**Think:** each group is a tree with a root; find the roots, and link the smaller tree under the larger.

```python template
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False  # already connected: this edge closes a cycle
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True

d = DSU(5)
print([d.union(a, b) for a, b in [(0, 1), (1, 2), (3, 4), (2, 0)]])  # [True, True, True, False]
print(len({d.find(x) for x in range(5)}), "groups")  # 2 groups
```

**Practice:** [[p:684]], [[p:323]], [[p:261]]

## Dijkstra

**When you see:** the cheapest path with non-negative weights: times, costs, distances.

**Think:** a heap of (distance so far, node); the first time a node comes off the heap, its distance is final. Skip stale entries.

```python template
import heapq

def shortest(graph, source):  # graph[u] = [(v, weight), ...]
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue  # stale: u was already reached more cheaply
        for v, w in graph.get(u, []):
            if d + w < dist.get(v, float("inf")):
                dist[v] = d + w
                heapq.heappush(heap, (d + w, v))
    return dist

g = {"A": [("B", 4), ("C", 1)], "C": [("B", 2), ("D", 7)], "B": [("D", 1)]}
print(shortest(g, "A"))  # {'A': 0, 'B': 3, 'C': 1, 'D': 4}
```

**Practice:** [[p:743]], [[p:778]], [[p:787]]

## Intervals

**When you see:** ranges, meetings, bookings, overlaps.

**Think:** sort by start, then sweep, extending or closing the current block. For "how many at once", sort the starts and the ends separately.

```python template
def merge(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:  # overlaps or touches the last block
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out

print(merge([[5, 8], [1, 3], [2, 4], [8, 9]]))  # [[1, 4], [5, 9]]
```

**Practice:** [[p:56]], [[p:57]], [[p:435]]

## Greedy

**When you see:** a choice that looks safe to make right now and never undo: the earliest end, the farthest reach.

**Think:** state the rule and why it's safe (an exchange argument). If a small counterexample breaks it, use dynamic programming instead.

```python template
def most_meetings(meetings):  # keep the meeting that ends first, every time
    count, free_at = 0, float("-inf")
    for start, end in sorted(meetings, key=lambda m: m[1]):
        if start >= free_at:
            count += 1
            free_at = end
    return count

print(most_meetings([[1, 4], [2, 3], [3, 5], [6, 7]]))  # 3
```

**Practice:** [[p:55]], [[p:134]], [[p:763]]

## Dynamic programming in one dimension

**When you see:** "how many ways", "the minimum cost", "the most you can get", with choices along a sequence.

**Think:** state, transition, base case, order. Start with recursion and `@cache`, then turn it into a loop over a table.

```python template
from functools import cache

@cache
def ways(n):  # top-down: ways to climb n stairs, 1 or 2 at a time
    return 1 if n <= 1 else ways(n - 1) + ways(n - 2)

def fewest_coins(coins, amount):  # bottom-up
    best = [0] + [float("inf")] * amount  # best[a]: the fewest coins that make a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                best[a] = min(best[a], best[a - c] + 1)
    return best[amount] if best[amount] != float("inf") else -1

print(ways(30), fewest_coins([1, 3, 4], 6))  # 1346269 2
```

**Practice:** [[p:70]], [[p:198]], [[p:322]]

## Dynamic programming in two dimensions

**When you see:** two strings, a grid, or a pair of indices that both shrink.

**Think:** `table[i][j]` answers the question for the first i of one and the first j of the other; row 0 and column 0 are the empty cases.

```python template
def lcs(a, b):
    L = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]  # row 0 and column 0: empty prefixes
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])
    return L[len(a)][len(b)]

print(lcs("piano", "pain"))  # 3
```

**Practice:** [[p:62]], [[p:1143]], [[p:72]]

## Knapsack

**When you see:** choosing items to reach or maximise a total: subset sums, coin combinations, target sums.

**Think:** one row indexed by the total. Loop the totals downwards when each item is used at most once, upwards when it can be reused.

```python template
def can_make(nums, target):  # 0/1: each number at most once
    can = [True] + [False] * target
    for x in nums:
        for t in range(target, x - 1, -1):  # downwards
            can[t] = can[t] or can[t - x]
    return can[target]

def combinations(coins, amount):  # unbounded: each coin any number of times
    ways = [1] + [0] * amount
    for c in coins:
        for t in range(c, amount + 1):  # upwards
            ways[t] += ways[t - c]
    return ways[amount]

print(can_make([3, 5, 9], 8), can_make([3, 5, 9], 11), combinations([2, 3, 5], 10))  # True False 4
```

**Practice:** [[p:416]], [[p:518]], [[p:494]]

## Bit tricks

**When you see:** single bits, powers of two, pairs that cancel, "without + or −".

**Think:** `n & (n - 1)` clears the lowest 1 bit, `x ^ x == 0`, and Python needs a mask for 32-bit behaviour.

```python template
from functools import reduce
from operator import xor

n = 0b10110100
print(format(n & (n - 1), "08b"))  # the lowest 1 bit cleared: 10110000
print(format(n & -n, "08b"))       # only the lowest 1 bit: 00000100
print((n >> 2) & 1, n.bit_count())  # bit 2, and the number of 1 bits: 1 4
print(reduce(xor, [6, 3, 9, 3, 6]))  # pairs cancel: 9
print(-6 & 0xFFFFFFFF)              # -6 as an unsigned 32-bit pattern: 4294967290
```

**Practice:** [[p:136]], [[p:191]], [[p:371]]

## Heap with lazy deletion

**When you see:** a running minimum or maximum, or a median, while items are also removed: sliding windows, corrected records.

**Think:** leave removed items in the heap, count them as gone, and pop them only when they reach the top. Track live sizes yourself.

```python template
import heapq
from collections import Counter

def window_minimums(nums, k):
    heap, gone, out = [], Counter(), []
    for i, x in enumerate(nums):
        heapq.heappush(heap, x)
        if i >= k:
            gone[nums[i - k]] += 1  # left the window: remove it later
        while gone[heap[0]]:
            gone[heap[0]] -= 1
            heapq.heappop(heap)
        if i >= k - 1:
            out.append(heap[0])
    return out

print(window_minimums([4, 2, 12, 3, 8, 1, 7], 3))  # [2, 2, 3, 1, 1]
```

**Practice:** [[p:480]], [[p:2034]], [[p:460]]

## Fenwick tree

**When you see:** prefix or range sums while values change, or "how many earlier values are smaller".

**Think:** a 1-indexed list where position i covers `i & -i` numbers; update climbs with `i += i & -i`, query descends with `i -= i & -i`. O(log n) each.

```python template
class Fenwick:
    def __init__(self, n):
        self.tree = [0] * (n + 1)

    def add(self, i, change):  # position i, counted from 1
        while i < len(self.tree):
            self.tree[i] += change
            i += i & -i

    def prefix(self, i):  # the sum of positions 1 .. i
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

f = Fenwick(8)
for i, x in enumerate([3, 1, 4, 1, 5, 9, 2, 6], 1):
    f.add(i, x)
print(f.prefix(4), f.prefix(8) - f.prefix(4))  # 9 22
```

**Practice:** [[p:307]], [[p:315]], [[p:493]]

## Binary lifting

**When you see:** the k-th ancestor, many LCA or path queries on a tree, or "where are you after k steps" for a huge k.

**Think:** a table `up[j][v]` of where 2^j steps from v land, built from the row before: `up[j][v] = up[j-1][up[j-1][v]]`. Jump by the bits of k.

```python template
parent = [-1, 0, 0, 1, 1, 3, 5, 6]
up = [parent]
for _ in range(len(parent).bit_length()):
    prev = up[-1]
    up.append([-1 if a == -1 else prev[a] for a in prev])

def kth_ancestor(v, k):
    j = 0
    while k and v != -1:
        if k & 1:
            v = up[j][v]
        k >>= 1
        j += 1
    return v

print(kth_ancestor(7, 5), kth_ancestor(7, 9))  # 0 -1
```

**Practice:** [[p:1483]], [[p:2846]], [[p:2836]]

## Prefix function (KMP)

**When you see:** a pattern in text, the longest prefix that's also a suffix, a string's period.

**Think:** `pi[i]` is the longest border of `s[:i + 1]`; on a mismatch, fall back with `k = pi[k - 1]`. Run it on `pattern + "#" + text` to find matches.

```python template
def prefix_function(s):
    pi, k = [0] * len(s), 0
    for i in range(1, len(s)):
        while k and s[i] != s[k]:
            k = pi[k - 1]
        if s[i] == s[k]:
            k += 1
        pi[i] = k
    return pi

pattern, text = "abab", "abababcabab"
pi = prefix_function(pattern + "#" + text)
print([i - 2 * len(pattern) for i, v in enumerate(pi) if v == len(pattern)])  # match starts: [0, 2, 7]
```

**Practice:** [[p:28]], [[p:1392]], [[p:214]]

## Bitmask DP

**When you see:** n ≤ 20 items and a choice of subsets, or "visit every node" in a small graph.

**Think:** a subset is an integer; `mask >> i & 1` tests item i, `mask | 1 << i` adds it, and `range(1 << n)` visits subsets after their own subsets.

```python template
from math import inf

# the cheapest way to visit every city once, starting at city 0 (travelling salesman)
cost = [[0, 4, 1, 9], [4, 0, 2, 6], [1, 2, 0, 3], [9, 6, 3, 0]]
n = len(cost)
best = [[inf] * n for _ in range(1 << n)]  # best[mask][v]: visited mask, standing at v
best[1][0] = 0
for mask in range(1 << n):
    for v in range(n):
        if best[mask][v] < inf:
            for w in range(n):
                if not mask >> w & 1:
                    nxt = mask | 1 << w
                    best[nxt][w] = min(best[nxt][w], best[mask][v] + cost[v][w])
print(min(best[(1 << n) - 1]))  # 0 -> 2 -> 1 -> 3: 1 + 2 + 6 = 9
```

**Practice:** [[p:698]], [[p:847]]

## Modular arithmetic

**When you see:** "return it modulo 10⁹ + 7", primes, divisors, huge powers.

**Think:** reduce after every + and ×, never divide (multiply by `pow(b, p - 2, p)` instead), compare before reducing, and use `pow(x, e, m)` for powers.

```python template
mod = 10**9 + 7

def primes_below(n):
    is_prime = bytearray([1]) * n
    is_prime[:2] = b"\x00\x00"
    for p in range(2, int(n ** 0.5) + 1):
        if is_prime[p]:
            is_prime[p * p::p] = bytes(len(range(p * p, n, p)))
    return [k for k in range(n) if is_prime[k]]

print(primes_below(30))
print(pow(2, 10**18, mod))           # repeated squaring
print(6 * pow(3, mod - 2, mod) % mod)  # 6 / 3 modulo a prime: 2
```

**Practice:** [[p:204]], [[p:1922]], [[p:878]]
