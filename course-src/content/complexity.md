## Python's built-in types

The costs below are for CPython, the standard Python, which is also what runs in this page. "Average" assumes hash values spread out well, which is true for ints, strings and tuples of them; the rare worst case comes from many keys landing in the same hash bucket.

### list

| Operation | Cost | Notes |
|---|---|---|
| `len(a)`, `a[i]`, `a[i] = x` | `O(1)` | |
| `a.append(x)`, `a.pop()` | `O(1)` | `append` is amortised: an occasional resize copies everything, but rarely |
| `a.pop(i)`, `a.insert(i, x)`, `del a[i]` | `O(n)` | every element after `i` shifts, so `pop(0)` is the worst |
| `x in a`, `a.index(x)`, `a.count(x)`, `a.remove(x)` | `O(n)` | a scan from the front |
| `a[i:j]` | `O(k)` | a copy of the k = j − i elements |
| `a + b`, `a.extend(b)` | `O(n + m)`, `O(m)` | `+` builds a new list; `extend` adds to `a` |
| `a.reverse()`, `a[::-1]`, `a.copy()`, `list(x)` | `O(n)` | |
| `min(a)`, `max(a)`, `sum(a)` | `O(n)` | |
| `a.sort()`, `sorted(a)` | `O(n log n)` | Timsort: stable, and `O(n)` on data that's already sorted |
| `[0] * n`, `a * k` | `O(n)`, `O(n · k)` | |

### dict and set

| Operation | Average | Worst | Notes |
|---|---|---|---|
| `d[k]`, `d[k] = v`, `del d[k]`, `k in d` | `O(1)` | `O(n)` | |
| `x in s`, `s.add(x)`, `s.remove(x)` | `O(1)` | `O(n)` | |
| iterating, `d.copy()`, `set(a)` | `O(n)` | | |
| `s \| t` | `O(n + m)` | | union |
| `s & t` | `O(min(n, m))` | | intersection: loops over the smaller set |
| `s - t` | `O(n)` | | |
| `Counter(a)` | `O(n)` | | |
| `Counter.most_common(k)` | `O(n log k)` | | `O(n log n)` without k |

Dictionaries keep keys in insertion order, and adding to a dict is amortised `O(1)` for the same reason as `append`.

### collections.deque

| Operation | Cost | Notes |
|---|---|---|
| `append`, `appendleft`, `pop`, `popleft` | `O(1)` | the reason to use a deque for queues |
| `d[0]`, `d[-1]` | `O(1)` | |
| `d[i]` in the middle | `O(n)` | a deque is not a list |
| `d.rotate(k)` | `O(k)` | |

### heapq

| Operation | Cost | Notes |
|---|---|---|
| `heap[0]` | `O(1)` | the smallest item |
| `heappush`, `heappop`, `heapreplace`, `heappushpop` | `O(log n)` | |
| `heapify(a)` | `O(n)` | faster than n pushes |
| `nlargest(k, a)`, `nsmallest(k, a)` | `O(n log k)` | |

`heapq` is a min-heap. For a max-heap, push negated numbers, or tuples with a negated key.

### str

| Operation | Cost | Notes |
|---|---|---|
| `len(s)`, `s[i]` | `O(1)` | |
| `s + t` | `O(n + m)` | strings are immutable, so this builds a new one |
| `s[i:j]` | `O(k)` | a copy of k characters |
| `s == t` | `O(n)` | stops at the first difference |
| `"".join(parts)` | `O(total length)` | the way to build a string from pieces |
| `sub in s`, `s.find(sub)`, `s.count(sub)` | `O(n)` usually | fast in practice; pathological patterns can cost more |
| `s.split()`, `s.replace(a, b)`, `s.lower()`, `s[::-1]` | `O(n)` | |

Building a string with `+=` in a loop copies it each time unless CPython can reuse the old string, which it often can but doesn't promise. `"".join` is always linear.

### Other tools

| Operation | Cost | Notes |
|---|---|---|
| `bisect_left(a, x)`, `bisect_right(a, x)` | `O(log n)` | `a` must be sorted |
| `insort(a, x)` | `O(n)` | the search is fast; the insertion shifts elements |
| `@cache` lookups | `O(1)` average | plus the cost of hashing the arguments |
| `copy.deepcopy(x)` | `O(size of x)` | |
| `math.gcd(a, b)` | `O(log min(a, b))` | Euclid's algorithm |
| `pow(a, n, m)` | `O(log n)` | fast modular exponentiation |

## Classic algorithms

| Algorithm | Time | Extra space | Notes |
|---|---|---|---|
| Binary search | `O(log n)` | `O(1)` | needs sorted data or a monotonic yes/no question |
| Merge sort | `O(n log n)` | `O(n)` | stable |
| Quicksort | `O(n log n)` average, `O(n^2)` worst | `O(log n)` stack | |
| Heap sort | `O(n log n)` | `O(1)` | not stable |
| Counting sort, bucket sort | `O(n + k)` | `O(k)` | small integer keys, k possible values |
| Quickselect (k-th smallest) | `O(n)` average, `O(n^2)` worst | `O(1)` | |
| BFS, DFS | `O(V + E)` | `O(V)` | V nodes, E edges |
| Topological sort (Kahn) | `O(V + E)` | `O(V)` | also detects cycles |
| Union-find | almost `O(1)` per operation | `O(V)` | with path compression and union by size |
| Dijkstra with a heap | `O((V + E) log V)` | `O(V + E)` | weights must not be negative |
| Bellman-Ford | `O(V · E)` | `O(V)` | negative weights; k rounds limit paths to k edges |
| Floyd-Warshall | `O(V^3)` | `O(V^2)` | every pair of nodes |
| Prim, Kruskal | `O(E log V)` | `O(V + E)` | minimum spanning tree |
| Trie insert or search | `O(L)` | `O(total letters)` | L is the word's length |
| Subsets, permutations | `O(n · 2^n)`, `O(n · n!)` | `O(n)` plus the output | the output itself is that big |
| Kadane, two pointers, sliding window | `O(n)` | `O(1)` | the window may need a map: `O(k)` |
| 1D DP | `O(n)` × choices | `O(1)` to `O(n)` | keep only the last values you read |
| 2D DP (LCS, edit distance) | `O(n · m)` | `O(m)` with two rows | |
| 0/1 knapsack | `O(n · W)` | `O(W)` | W is the capacity |
| Interval DP | `O(n^3)` | `O(n^2)` | |
| Longest increasing subsequence | `O(n log n)` | `O(n)` | binary search over the tails |

## What the input size allows

| Largest n | Fast enough | Typical algorithms |
|---|---|---|
| about 10 | `O(n!)` | every order |
| about 20 | `O(2^n)` | every subset, backtracking |
| about 500 | `O(n^3)` | three nested loops, interval DP |
| about 5,000 | `O(n^2)` | two nested loops, 2D DP |
| about 10⁶ | `O(n log n)` | sorting, heaps |
| larger | `O(n)` or `O(log n)` | one pass, hashing, binary search |

These limits assume about 10⁸ simple steps per second, typical of C++ or Java. Plain Python manages closer to 10⁷, and judges give it more time, so the table still points at the right target, with less slack at the top of each range.

## Recurrences

A recursive algorithm's cost follows from how many calls it makes and how much work each call does outside the recursion.

| Recurrence | Solution | Example |
|---|---|---|
| T(n) = T(n − 1) + O(1) | `O(n)` | walking a list recursively |
| T(n) = T(n − 1) + O(n) | `O(n^2)` | selection sort, recursion that copies its input |
| T(n) = T(n / 2) + O(1) | `O(log n)` | binary search |
| T(n) = T(n / 2) + O(n) | `O(n)` | quickselect on average: n + n/2 + n/4 + … ≤ 2n |
| T(n) = 2T(n / 2) + O(1) | `O(n)` | visiting every node of a balanced tree |
| T(n) = 2T(n / 2) + O(n) | `O(n log n)` | merge sort: log n levels, `O(n)` work per level |
| T(n) = T(n − 1) + T(n − 2) + O(1) | about `O(1.618^n)` | plain Fibonacci; caching makes it `O(n)` |
| T(n) = 2T(n − 1) + O(1) | `O(2^n)` | towers of Hanoi |
| T(n) = n · T(n − 1) | `O(n!)` | generating every permutation |

The general rule for divide and conquer, the **master theorem**: if T(n) = a · T(n / b) + O(nᵈ), compare d with log_b a. If d is larger, the top call dominates and T(n) = O(nᵈ). If they're equal, every level does the same work and T(n) = O(nᵈ log n). If d is smaller, the leaves dominate and T(n) = O(n^(log_b a)).

## Space

Space complexity counts the extra memory on top of the input. The output is usually not counted, and it's worth saying which convention you use.

| Source of memory | Cost | Notes |
|---|---|---|
| A few variables, two pointers | `O(1)` | |
| A set, dict or copy of the input | `O(n)` | |
| The recursion stack | `O(depth)` | `O(log n)` for a balanced tree, `O(n)` for a chain or a linked list |
| A BFS queue | `O(width)` | up to `O(n)`: about n/2 for the last level of a full tree |
| A DFS stack | `O(height)` | |
| A DP table over two inputs | `O(n · m)` | `O(m)` if each row only reads the one before it |
| A memo with `@cache` | one entry per distinct argument tuple | |

Recursion has a limit as well as a cost: plain Python stops at 1,000 nested calls (this page allows 100,000), so an algorithm that recurses n deep on large n is better written with an explicit stack or a loop.
