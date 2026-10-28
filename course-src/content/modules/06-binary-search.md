---
id: binary-search
title: Binary search
kicker: halving · invariants · bisect · search on the answer
summary: When a yes/no question flips from "no" to "yes" exactly once along a sorted range, you can find the flip by halving the range, in about 30 steps for a billion candidates. Sorted lists are the obvious case; rotated lists, grids, timestamps and even "the smallest speed that works" are the less obvious ones.
---

## Halving a range

Guess a number between 1 and 100 and you can find it with "higher or lower" in at most 7 questions: each answer rules out half of what's left. Binary search is that game. Every step halves the range of candidates, so n candidates need about log₂ n steps: 17 for 100,000 and 30 for a billion.

What it needs is not exactly a sorted list. It needs a question whose answer, across the candidates in order, looks like

`no no no no yes yes yes`

Comparing a sorted list with a target is one such question ("is `nums[i] >= target`?"). The skill this module builds is spotting the same shape in problems that don't look like searching at all.

## Keeping the invariant

Most binary-search bugs are off-by-one bugs. They go away when you decide what your bounds *mean* and keep that meaning true after every step. The classic version uses a **closed** range: the target, if it's present, is somewhere in `nums[lo..hi]`, both ends included.

:::viz binary-search-bounds
:::

Three details follow from "both ends included":

- Loop `while lo <= hi`: when `lo == hi`, one candidate is still left.
- Move to `mid + 1` or `mid - 1`: `mid` was just checked, so it leaves the range.
- When `lo > hi`, the range is empty and the answer is "not found".

```python run title=Counting_the_steps
def search(nums, target):
    lo, hi, steps = 0, len(nums) - 1, 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid, steps
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1, steps

nums = list(range(0, 2_000_000, 2))  # a million even numbers
for target in [0, 777_778, 1_999_998, 3]:
    print(target, search(nums, target))
```

:::gotcha The loop that never ends
If you write `lo = mid` (or `hi = mid`) in a loop where the range can shrink to two elements, `mid` may equal `lo`, the range doesn't change, and the loop spins forever. Every update must make the range strictly smaller. In the closed version, that means `mid + 1` and `mid - 1`. Versions that do use `hi = mid` (like the one for finding a boundary below) loop `while lo < hi`, where `mid` is always less than `hi`.
:::

## Searching for a boundary

Often you don't want "is x here?" but "where is the first position where something becomes true?": the first value ≥ x, the first bad version, the smallest speed that's fast enough. Use a **half-open** style that keeps the boundary inside `lo..hi` and stops when they meet:

```python run title=First_position_that_passes_a_test
def first_true(lo, hi, ok):
    """Smallest i in [lo, hi] with ok(i) True, assuming ok flips from False to True once (hi must pass)."""
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid      # mid passes: the boundary is mid or earlier
        else:
            lo = mid + 1  # mid fails: the boundary is after mid
    return lo

nums = [2, 3, 3, 3, 7, 9]
print("first index with nums[i] >= 3:", first_true(0, len(nums), lambda i: i == len(nums) or nums[i] >= 3))
print("integer square root of 2,000,000:", first_true(0, 2_000_001, lambda r: (r + 1) ** 2 > 2_000_000))
```

Python ships this search in the `bisect` module, implemented in C. `bisect_left(nums, x)` returns the first position whose value is ≥ x, and `bisect_right(nums, x)` the first position whose value is > x. Between them sit exactly the copies of x:

```python run title=The_bisect_module
from bisect import bisect_left, bisect_right, insort

nums = [1, 3, 3, 3, 5, 8]
print("bisect_left(3):", bisect_left(nums, 3))
print("bisect_right(3):", bisect_right(nums, 3))
print("how many 3s:", bisect_right(nums, 3) - bisect_left(nums, 3))
print("values in 2..6:", bisect_right(nums, 6) - bisect_left(nums, 2))
insort(nums, 4)  # insert, keeping the list sorted
print(nums)
```

:::gotcha Overflow in other languages
In Java, C++ and similar languages, `(lo + hi) / 2` can overflow when `lo + hi` is bigger than the largest integer, which is why you'll see `lo + (hi - lo) / 2`. Python integers never overflow, so `(lo + hi) // 2` is safe here; the other form is still a good habit when you switch languages.
:::

[[p:704]] is the plain search; write it once by hand, then use `bisect` when the interviewer allows it.

## Lists that are only partly sorted

A sorted list that was rotated, like `[15, 18, 22, 3, 7, 9]`, climbs, drops once, and climbs again. It isn't sorted, but binary search still works, because one comparison still tells you which half to keep.

- To find the minimum ([[p:153]]), compare the middle with the last value. If the middle is bigger, the drop is to its right; otherwise the middle..end stretch is sorted and the minimum is at the middle or to its left.
- To find a target ([[p:33]]), note that at least one half around the middle is sorted. Check whether the target lies within that half's range; if not, it's in the other half.

## A grid as one long list

[[p:74]] gives a grid whose rows continue each other: every row starts above the previous row's end. Read row by row, it's one sorted list of m·n values, and position `k` of that list is row `k // n`, column `k % n`. Binary search the positions and convert each `mid` on the fly. The same conversion turns any 2-D grid into a 1-D index and back, which you'll use again in the graph module.

## Searching on the answer

[[p:875]] asks for the slowest eating speed that finishes all the piles within h hours. There's no list to search, but there is a yes/no question with the right shape: "is speed k fast enough?" is `no` for slow speeds and `yes` from some speed on. So binary search the **speeds**, and answer the question for each `mid` with an O(n) check.

:::viz search-answer-koko
:::

This pattern is worth a lot in interviews. When a problem says "find the minimum X such that ..." or "the maximum X such that ...", and checking a given X is easy, try binary searching X. The total cost is (cost of one check) × log(range of X).

## Searching by time

[[p:981]] stores each key's history as values with increasing timestamps. Appending keeps each history sorted, so "what was the value at time t?" is "find the last timestamp ≤ t": `bisect_right(times, t) - 1`. Watch the edge case where every timestamp is later than t: the index is -1, and in Python `values[-1]` silently returns the *last* value instead of failing.

```python run title=Looking_up_a_price_by_time
from bisect import bisect_right

times = [3, 7, 12, 20]               # when the price changed
prices = [9.99, 8.49, 10.25, 7.75]   # the price from each of those times on

def price_at(t):
    i = bisect_right(times, t) - 1   # the last change at or before t
    return prices[i] if i >= 0 else None

for t in [1, 3, 10, 25]:
    print(f"time {t:>2}: {price_at(t)}")
print("without the check, time 1 would give", prices[bisect_right(times, 1) - 1])
```

## The hardest one: the median of two lists

[[p:4]] asks for the median of two sorted lists in logarithmic time, so you can't merge them. Think of the median as a cut that puts half of all values on the left and every left value at most every right value. Choose how many values the left side takes from the shorter list; the half size fixes how many it takes from the other. Whether the cut is too far right or too far left in the first list is a monotone question, so binary search finds the right cut. It's the same idea as everything above, applied to a cut position instead of a value.

## Complexity

| Task | Linear scan | Binary search |
|---|---|---|
| Find a value in a sorted list | `O(n)` | `O(log n)` |
| First position with value ≥ x | `O(n)` | `O(log n)` |
| Minimum of a rotated sorted list | `O(n)` | `O(log n)` |
| Value in a sorted m × n grid | `O(m·n)` | `O(log(m·n))` |
| Smallest feasible answer, check costs `O(n)` | `O(n·R)` for R candidates | `O(n log R)` |
| Value at time t, history of n versions | `O(n)` | `O(log n)` |
| Median of two sorted lists | `O(m + n)` | `O(log(min(m, n)))` |

:::interview
Before coding, say the invariant in words: "if the target is present, it's in `nums[lo..hi]`". Then each line of the loop has a reason, and the off-by-one choices (`<` or `<=`, `mid` or `mid + 1`) follow from it instead of from memory. For "search on the answer" problems, say the monotone property explicitly: "if speed k works, every faster speed works".
:::

:::work
`git bisect` binary searches commit history for the change that broke a test. Databases use B-trees, which are binary search spread across disk pages, to find rows by key. Logs and time series are sorted by time, so "what happened at 14:03?" is a `bisect` away. And "the smallest batch size or instance count that meets a deadline" is a search on the answer.
:::

## Quick check

:::quiz
? Binary search over 1,000,000 sorted values needs at most about how many comparisons?
- [ ] 1,000
- [x] 20
- [ ] 500,000
> Each comparison halves the range: 2²⁰ is a little over a million, so about 20 halvings narrow a million candidates to one.

? With a closed range `[lo, hi]`, why must the loop be `while lo <= hi` rather than `while lo < hi`?
- [x] When `lo == hi`, one candidate is left and it hasn't been checked yet
- [ ] To avoid an infinite loop
- [ ] Because `mid` can be negative
> Both ends are included, so `lo == hi` still names one position. Stopping at `lo < hi` skips it, which is why a one-element list would never find its target.

? What do `bisect_left([1, 3, 3, 5], 3)` and `bisect_right([1, 3, 3, 5], 3)` return?
- [ ] 1 and 2
- [x] 1 and 3
- [ ] 2 and 3
> `bisect_left` gives the first position with a value ≥ 3, which is 1. `bisect_right` gives the first position with a value > 3, which is 3. The difference, 2, is how many 3s there are.

? Why can you binary search the eating speed in Koko Eating Bananas?
- [ ] Because the piles are sorted
- [x] Because "speed k finishes in time" is false up to some speed and true from then on
- [ ] Because the answer is always a power of two
> Any speed faster than a working speed also works. That one flip from "too slow" to "fast enough" is all binary search needs.

? In a time-based store, `i = bisect_right(times, t) - 1`. What goes wrong if you return `values[i]` without checking `i`?
- [ ] An IndexError is raised
- [x] When t is earlier than every timestamp, i is -1 and Python returns the last value
- [ ] Nothing, -1 is handled by bisect
> Negative indexes count from the end in Python, so `values[-1]` is the newest value instead of an error. Check `i >= 0` and return the "no value" answer otherwise.
:::
