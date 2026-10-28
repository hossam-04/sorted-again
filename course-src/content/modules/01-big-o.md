---
id: big-o
title: Big-O and complexity
kicker: counting steps · O, Θ and Ω · growth rates · what input sizes allow · amortised cost · Python's hidden costs · space
summary: "Big-O describes how the work an algorithm does grows as its input grows. It ignores the details that change from machine to machine and keeps the one thing that decides whether code finishes in a second or in a week. This module is the vocabulary for every module after it."
---

## Counting steps

To compare algorithms without a stopwatch, count their basic steps: a comparison, an addition, a lookup. Then ask how that count grows with the size of the input, called n.

```python run title=Counting_steps
def count_steps(n):
    single = nested = halving = 0
    for i in range(n):          # one pass
        single += 1
    for i in range(n):          # a pass inside a pass
        for j in range(n):
            nested += 1
    k = n
    while k > 1:                # halve until nothing is left
        k //= 2
        halving += 1
    return single, nested, halving

for n in (10, 100, 1000):
    single, nested, halving = count_steps(n)
    print(f"n = {n:>4}:  one loop {single:>5}   nested loops {nested:>7}   halving {halving:>2}")
```

Multiplying n by 10 multiplies the single loop's steps by 10, the nested loops' by 100, and adds only about 3 halving steps. Those three behaviours are written **O(n)**, **O(n²)** and **O(log n)**.

Big-O keeps only the part that dominates for large n:

- **Constant factors go.** 3n steps and n steps are both O(n). They matter in practice, but they depend on the machine and the language, while the growth doesn't.
- **Smaller terms go.** n² + 5n + 100 is O(n²): for n = 1,000 the n² term is a million and the rest is about 5,000.
- **Nested loops multiply, consecutive loops add.** A loop over n inside a loop over m is O(n·m). A loop over n followed by a loop over m is O(n + m).

## O, Θ and Ω

The three symbols say different things:

- **O(f)**, "at most": the work grows no faster than f, up to a constant factor.
- **Ω(f)**, "at least": the work grows at least as fast as f.
- **Θ(f)**, "exactly": both at once.

In interviews and in this course, "O(n)" is used the way most people use it: as the tight bound for the worst case. Strictly, binary search is also O(n), since log n grows no faster than n, but nobody would say so.

Don't mix up these symbols with best, average and worst cases, which are a separate question. Quicksort takes Θ(n log n) on average and Θ(n²) in its worst case. Insertion sort takes Θ(n) at best, on input that's already sorted, and Θ(n²) at worst. When nobody says which case, they mean the worst one.

## How fast each class grows

The usual classes, from best to worst: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ) and O(n!). Move the slider and watch the gap open up:

:::viz growth-curves
:::

On a small input every algorithm is fast. The class decides what happens when the input gets big: at a million elements, an O(n log n) algorithm written in Python takes about 20 million steps, a couple of seconds, and an O(n²) one takes a trillion, more than a day.

## What the input size allows

Constraints in a problem statement are a hint about the expected complexity. A classic rule of thumb:

| Largest n | Fast enough | Typical algorithms |
|---|---|---|
| about 10 | `O(n!)` | trying every order |
| about 20 | `O(2^n)` | trying every subset, backtracking |
| about 500 | `O(n^3)` | three nested loops, interval DP |
| about 5,000 | `O(n^2)` | two nested loops, 2D DP |
| about 10⁶ | `O(n log n)` | sorting, heaps, binary search inside a loop |
| larger | `O(n)` or `O(log n)` | one pass, hashing, binary search |

The table comes from languages like C++ and Java, which do around 10⁸ simple steps a second. Plain Python does closer to 10⁷, and judges such as LeetCode give it extra time to make up for that, so the table still picks the right target. Just expect no slack at the top of each range.

## Amortised cost

`list.append` is O(1), but not every time. A list keeps some spare room at the end. When the room runs out, Python allocates a bigger block and copies everything over, which costs O(n) for that one append. The trick is that the room grows by a fixed fraction of the size each time, about an eighth more in CPython, so the expensive appends get rarer as the list grows. Over n appends the copying adds up to O(n) in total: O(1) per append **on average**. That's called **amortised** O(1).

```python run title=Appending_is_amortised
import sys
import time

lst, size = [], sys.getsizeof([])
grew_at = []
for i in range(100):
    lst.append(i)
    if sys.getsizeof(lst) != size:   # the list just moved to a bigger block
        size = sys.getsizeof(lst)
        grew_at.append(len(lst))
print("made more room at lengths:", grew_at)

def append_many(n):
    lst = []
    for i in range(n):
        lst.append(i)

for n in (10_000, 100_000, 1_000_000):
    runs = []
    for _ in range(3):               # the best of three runs, to filter out noise
        start = time.perf_counter()
        append_many(n)
        runs.append(time.perf_counter() - start)
    print(f"{n:>9,} appends: {min(runs) / n * 1e9:.0f} ns each")
```

The gaps between resizes grow with the list, and the time per append stays about the same as n grows a hundredfold. Dictionaries and sets work the same way: occasional rebuilds, O(1) on average.

## Python's hidden costs

A single line of Python can hide a loop. These are the ones that cause most accidental slowdowns:

| Operation | Cost | Instead |
|---|---|---|
| `x in some_list`, `.index(x)`, `.count(x)`, `.remove(x)` | `O(n)` | a set or dict: `O(1)` on average |
| `some_list[a:b]`, `some_list[::-1]`, `list(x)`, `x.copy()` | `O(k)` for k items copied | indices instead of copies |
| `some_list.pop(0)`, `some_list.insert(0, x)` | `O(n)` | `collections.deque`: `O(1)` at both ends |
| `sorted(x)`, `x.sort()` | `O(n log n)` | sort once, outside the loop |
| `min(x)`, `max(x)`, `sum(x)` | `O(n)` | keep a running value |
| `s += c` on strings | a copy of s, unless CPython can reuse it | collect pieces, then `"".join(pieces)` |
| `a == b` on strings or lists | `O(length)` | fine, but not free inside a loop |

```python run title=Two_hidden_loops
import time
from collections import deque

def best_ms(f, *args):           # the best of three runs, to filter out noise
    runs = []
    for _ in range(3):
        start = time.perf_counter()
        f(*args)
        runs.append(time.perf_counter() - start)
    return min(runs) * 1000

def lookups(container, queries):
    return sum(1 for q in queries if q in container)

data = list(range(5_000))
queries = range(0, 10_000, 10)   # 1,000 lookups, half of them misses
print(f"in on a list: {best_ms(lookups, data, queries):6.2f} ms")
print(f"in on a set:  {best_ms(lookups, set(data), queries):6.2f} ms")

def drain_list(n):
    lst = list(range(n))
    while lst:
        lst.pop(0)               # moves every remaining element one place left

def drain_deque(n):
    dq = deque(range(n))
    while dq:
        dq.popleft()

for n in (5_000, 10_000, 20_000):
    print(f"n = {n:>6,}: list.pop(0) {best_ms(drain_list, n):6.1f} ms   deque.popleft() {best_ms(drain_deque, n):4.1f} ms")
```

Doubling n roughly quadruples the `pop(0)` time: n pops that each move up to n elements is O(n²). The deque's time only doubles.

:::gotcha Accidentally quadratic
The most common performance bug in interviews and in production is an O(n) operation inside a loop over n: `if x in seen_list`, `result = result + [x]`, `queue.pop(0)`, or `min(window)` recomputed at every step. Each looks like one line, and the whole loop becomes O(n²). When code is slow, look for a hidden loop inside a visible one.
:::

## Measuring growth yourself

You can find the growth class of code you can't analyse by timing it at n, 2n and 4n. If the time doubles each time, it's linear; if it quadruples, quadratic; if it barely moves, logarithmic or constant.

```python run title=A_doubling_experiment
import time

def has_duplicate_pairs(nums):  # compares every pair
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False

def has_duplicate_set(nums):    # remembers what it has seen
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False

def best_ms(f, arg):            # the best of three runs, to filter out noise
    runs = []
    for _ in range(3):
        start = time.perf_counter()
        f(arg)
        runs.append(time.perf_counter() - start)
    return min(runs) * 1000

for f, sizes in ((has_duplicate_pairs, (300, 600, 1200)), (has_duplicate_set, (50_000, 100_000, 200_000))):
    previous = None
    for n in sizes:
        ms = best_ms(f, list(range(n)))  # no duplicates: the worst case for both
        print(f"{f.__name__:20} n = {n:>7,}: {ms:7.2f} ms" + (f"   x{ms / previous:.1f}" if previous else ""))
        previous = ms
```

The pairs version grows about 4 times per doubling: O(n²). The set version grows about 2 times: O(n). Small timings are noisy, so use inputs big enough to take a few milliseconds, and repeat if the numbers jump around.

## Recursion and stack space

A recursive function costs the number of calls times the work per call. Drawing the tree of calls usually gives both:

- **One call on n − 1** (summing a list recursively): n calls, O(n).
- **One call on n / 2** (binary search): log n calls, O(log n).
- **Two calls on n / 2, plus O(n) work** (merge sort): log n levels of the tree, each doing O(n) in total, so O(n log n).
- **Two calls on n − 1** (plain Fibonacci): the tree doubles at every level, about O(2ⁿ) calls. A cache brings it down to O(n), as in [[m:recursion]].

Every call that hasn't returned yet keeps a frame on the call stack, so recursion uses memory even when it stores nothing else: a recursion n levels deep takes O(n) space. Plain Python stops at 1,000 levels by default. This page allows 100,000, and [[m:recursion]] covers what to do when that's not enough.

## Space complexity

Space complexity counts the extra memory an algorithm needs on top of its input. The memory for the output is usually not counted, and it's worth saying which convention you use.

| Approach | Extra space |
|---|---|
| Two pointers, a running sum | `O(1)` |
| A set or dict of everything seen | `O(n)` |
| Recursion n levels deep | `O(n)` for the call stack |
| A DP table over two strings | `O(n · m)`, or `O(m)` keeping two rows |
| Every subset, as a list | `O(n · 2^n)` |

Time and space trade off against each other all the time: a set spends O(n) memory to make lookups O(1), and a DP table stores answers to avoid recomputing them.

:::interview
End every solution with its time and space complexity, and name the step that dominates: "the sort is O(n log n), and the scan after it is O(n), so O(n log n) overall". Say "amortised" when it applies, for example to appends or to a sliding window whose pointers each move n times in total. If you're asked whether you can do better, think about lower bounds: you have to read the whole input, so O(n) is often the floor, and sorting by comparisons can't beat O(n log n).
:::

:::work
In production, complexity bugs hide in plain sight: a membership test on a list inside a loop, a database query issued once per row (the "N + 1 queries" problem), or a pandas `apply` over a million rows where one vectorised operation would do. They're harmless on test data and painful on real data, so know how big your inputs will get. When something is slow, measure first: a profiler such as `cProfile` tells you where the time goes, and a doubling experiment tells you how it will grow.
:::

## Quick check

:::quiz
? A loop over n runs another loop over n inside it. What's the complexity?
- [ ] `O(n)`
- [ ] `O(2n)`
- [x] `O(n^2)`
> The inner loop runs n times for each of the n outer iterations: n × n steps.

? `for x in a: if x in b: ...`, where `a` and `b` are lists of length n. What's the complexity, and how do you fix it?
- [ ] `O(n)`, nothing to fix
- [x] `O(n^2)`; make `b` a set first
- [ ] `O(n log n)`; sort `b` first
> `in` on a list scans it, so each check costs O(n). With `b` as a set, each check is O(1) on average and the loop is O(n). Sorting and binary searching would give O(n log n), which is better, but the set is simpler and faster.

? A problem says n can be up to 100,000. Which complexity should you aim for?
- [ ] `O(n^2)`
- [x] `O(n log n)` or better
- [ ] `O(2^n)`
> n² would be 10 billion steps. n log n is under 2 million.

? Appending n items to an empty Python list one by one costs, in total:
- [x] `O(n)`, because each append is amortised O(1)
- [ ] `O(n^2)`, because the list is copied when it grows
- [ ] `O(n log n)`
> The list does get copied when it grows, but the room grows by a fixed fraction, so the copies add up to O(n) over all n appends.

? A recursive function goes n levels deep and stores nothing else. How much space does it use?
- [ ] `O(1)`
- [x] `O(n)`
- [ ] `O(log n)`
> Each unfinished call keeps a frame on the call stack, so n nested calls use O(n) memory.
:::
