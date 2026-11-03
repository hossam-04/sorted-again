---
id: sorting
title: Sorting algorithms
kicker: sort and sorted · keys and stability · insertion · merge sort · quicksort · heap sort · counting and radix · quickselect
summary: "You'll rarely write a sort at work, because Python's is better than anything you'd write in an interview. But sorting is the first step of a huge number of solutions, and the classic sorts are the cleanest examples of divide and conquer, partitioning and the limits of comparing. Knowing how they work tells you what a sort costs, when it's stable, and when you can beat O(n log n)."
---

## Why sorting comes up everywhere

Sorting rarely is the answer. More often it's the first step that makes the answer easy. Once a list is sorted:

- equal values sit next to each other, so duplicates and groups can be found in one pass ([[p:242]], [[p:128]])
- **binary search** works ([[m:binary-search]])
- **two pointers** can walk in from both ends ([[p:15]])
- intervals that overlap come one after another ([[p:56]], [[p:435]])
- a greedy choice in time order becomes possible ([[p:853]], [[p:846]])

So the first question in many problems is "would this be easy if the input were sorted?". If it would, and O(n log n) fits the limits, sort it.

## Python's sort first

In real code, and in most interviews, you call Python's sort. It's **Timsort**: a merge sort that finds runs that are already in order and uses insertion sort on short pieces. It's stable, O(n log n) in the worst case and O(n) on input that's already sorted.

- `sorted(xs)` returns a **new** list and works on any iterable.
- `xs.sort()` sorts the list **in place** and returns `None`.
- `key=` gives a function that maps each item to the value to compare. It's called once per item.
- `reverse=True` sorts from largest to smallest, and stays stable.

```python run title=Keys_and_reverse
words = ["pear", "Fig", "apple", "kiwi", "banana", "date"]
print(sorted(words))                                # capitals sort before lowercase letters
print(sorted(words, key=str.lower))                 # ignore case
print(sorted(words, key=len))                       # by length; equal lengths keep their order
print(sorted(words, key=lambda w: (len(w), w)))     # by length, then alphabetically
print(sorted(words, key=len, reverse=True))         # longest first
```

A tuple key sorts by its first field, breaks ties with the second, and so on. That covers most sorting by several fields at once.

:::gotcha `.sort()` returns `None`
`nums = nums.sort()` sorts the list and then throws it away: `nums` is now `None`. Write `nums.sort()` on its own line, or `nums = sorted(nums)`. And remember that `.sort()` changes the caller's list too, which [[m:two-pointers]] warns about.
:::

### Stability, and sorting in several passes

A sort is **stable** when items with equal keys keep the order they came in. Stability lets you sort by several keys one pass at a time: sort by the *least* important key first and the most important one last. Each pass keeps the order the earlier passes made among items it sees as equal.

That's the way to mix directions, for example grade from highest to lowest, then name from A to Z. You can negate a number in a key, but not a string.

```python run title=Two_stable_passes
students = [("maya", 88), ("ali", 92), ("zoe", 88), ("ben", 92), ("ivy", 75)]

by_name = sorted(students)                                         # A to Z first...
by_grade = sorted(by_name, key=lambda s: s[1], reverse=True)       # ...then highest grade first
print(by_grade)

print(sorted(students, key=lambda s: (-s[1], s[0])))               # one pass works too, because the grade is a number
```

:::gotcha You can't negate a string key
`key=lambda s: (-s[1], s[0])` works because the grade is a number. To sort *names* from Z to A and break ties some other way, `-name` raises `TypeError`. Use two stable passes, `reverse=True` on the pass that needs it, or `functools.cmp_to_key`.
:::

When the order can't be written as a key, compare two items directly with `functools.cmp_to_key`. The comparison returns a negative number, zero or a positive number, as `a - b` would for numbers. The classic case is putting numbers side by side to make the largest number ([[p:179]]): `4` goes before `42` because `"442" > "424"`, but `46` goes before `4` because `"464" > "446"`.

```python run title=Comparing_two_items_directly
from functools import cmp_to_key

def largest_number(nums):
    def cmp(a, b):  # a first, or b first?
        return -1 if a + b > b + a else 1 if a + b < b + a else 0
    digits = sorted(map(str, nums), key=cmp_to_key(cmp))
    return "".join(digits).lstrip("0") or "0"

print(largest_number([4, 42, 46, 7, 0]))
print(largest_number([0, 0]))
```

## The quadratic sorts: selection and insertion

The simple sorts take O(n²) time. They still matter: they're the baseline every other sort improves on, and insertion sort is genuinely the fastest way to sort a handful of items.

**Selection sort** finds the smallest remaining item and swaps it to the front, n times. It always does about n²/2 comparisons, even on sorted input, and it's not stable, because a long-distance swap can jump an item over its equals.

**Insertion sort** grows a sorted part on the left. Each new item moves left, swapping with larger neighbours, until it reaches one that's no larger:

:::viz insertion-sort
:::

Each swap fixes exactly one pair of items that were out of order, an **inversion**. So insertion sort costs O(n + inversions): O(n) on sorted input, a little more on nearly sorted input, and O(n²) on reversed input. It's stable and needs no extra memory. That's why Timsort and many quicksort libraries switch to insertion sort for pieces of about 16 to 64 items.

```python run title=Selection_and_insertion
def selection_sort(nums):
    for i in range(len(nums)):
        m = min(range(i, len(nums)), key=nums.__getitem__)  # position of the smallest remaining item
        nums[i], nums[m] = nums[m], nums[i]
    return nums

def insertion_sort(nums):
    for i in range(1, len(nums)):
        x, j = nums[i], i
        while j > 0 and nums[j - 1] > x:  # shift larger items right instead of swapping
            nums[j] = nums[j - 1]
            j -= 1
        nums[j] = x
    return nums

print(selection_sort([5, 2, 4, 6, 1, 3]))
print(insertion_sort([5, 2, 4, 6, 1, 3]))
```

Bubble sort, which swaps neighbours that are out of order until a whole pass makes no swap, is also O(n + inversions) in theory but does more work than insertion sort in practice. Mention it and move on.

## Merge sort

Merge sort is divide and conquer in its clearest form ([[m:recursion]]): split the list in half, sort each half, then **merge** the two sorted halves by repeatedly taking the smaller of their two front items.

:::viz merge-sort-calls
:::

The splitting goes log₂ n levels deep, and each level merges n items in total, so the time is O(n log n) whatever the input. The merge needs O(n) extra memory. Merge sort is **stable**, as long as ties go to the left half: `<=`, not `<`.

```python run title=Merge_sort
def merge_sort(nums):
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left, right = merge_sort(nums[:mid]), merge_sort(nums[mid:])
    merged, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:  # <= keeps equal items in their original order
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    return merged + left[i:] + right[j:]  # one of these is empty

print(merge_sort([38, 27, 43, 3, 9, 82, 10, 3]))
```

The merge step is worth more than the sort itself. It merges two sorted lists in [[p:21]] and, with a heap, k sorted lists in [[p:23]]. During the merge, every pair with one item in each half is compared once, and that's how you **count pairs** in O(n log n). When `right[j]` is taken before `left[i]`, it's smaller than everything still left in the left half, so it forms an inversion with each of them:

```python run title=Counting_inversions_while_merging
def count_inversions(nums):
    def sort(a):  # returns (a sorted, the number of inversions in a)
        if len(a) <= 1:
            return a, 0
        mid = len(a) // 2
        (left, x), (right, y) = sort(a[:mid]), sort(a[mid:])
        merged, i, j, count = [], 0, 0, x + y
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1
                count += len(left) - i  # right[j] jumps over every item left in the left half
        return merged + left[i:] + right[j:], count
    return sort(nums)[1]

print(count_inversions([5, 2, 4, 6, 1, 3]))  # 9, the number of swaps insertion sort made above
print(count_inversions([1, 2, 3]), count_inversions([3, 2, 1]))
```

[[p:315]] and [[p:493]] are this idea with a twist. Merge sort is also the natural sort for linked lists ([[p:148]]), because merging needs no random access and no extra array, and for data too big for memory: sort chunks that fit, then merge the sorted files.

## Quicksort

Quicksort is divide and conquer the other way round. The hard work happens *before* the recursion: pick a **pivot**, **partition** the list so smaller items come before it and the rest after it, then sort both sides. No merge is needed, because the pivot is already in its final place.

:::viz quicksort-partition
:::

This is the **Lomuto** partition: `i` marks the end of the "smaller" part, and `j` scans everything else. **Hoare's** partition, with two pointers moving towards each other, does fewer swaps. The [[m:two-pointers]] module's Dutch national flag is a three-way partition: smaller, equal and larger ([[p:75]]).

```python run title=Quicksort_with_a_random_pivot
import random

def quicksort(nums, lo=0, hi=None):
    if hi is None:
        hi = len(nums) - 1
    while lo < hi:
        p = random.randint(lo, hi)  # a random pivot makes the worst case vanishingly unlikely
        nums[p], nums[hi] = nums[hi], nums[p]
        pivot, i = nums[hi], lo
        for j in range(lo, hi):
            if nums[j] < pivot:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
        nums[i], nums[hi] = nums[hi], nums[i]
        if i - lo < hi - i:  # recurse on the smaller side, loop on the larger one
            quicksort(nums, lo, i - 1)
            lo = i + 1
        else:
            quicksort(nums, i + 1, hi)
            hi = i - 1
    return nums

print(quicksort([7, 2, 9, 4, 1, 8, 3, 5]))
print(quicksort([3, 1, 2, 3, 3, 1]))
```

When the pivots split the list reasonably evenly, quicksort takes O(n log n), with smaller constants than merge sort and no extra array. When a pivot is the smallest or the largest item every time, each partition only peels off one item, and the time is O(n²).

:::gotcha Sorted input and equal items break a naive quicksort
Taking the first or last item as the pivot is the textbook version, and it's O(n²) on input that's **already sorted**, which is the most common input there is. In Python, the recursion is also n levels deep, so a few thousand items hit the recursion limit. Pick a random pivot, or the median of three. A list of **equal items** is a worst case even then, because every item lands on the same side: use a three-way partition, so the equal items are finished after one pass.
:::

```python run title=How_bad_is_the_worst_case
def comparisons(nums):  # quicksort with the last item as the pivot; counts comparisons
    count, stack = 0, [(0, len(nums) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            continue
        pivot, i = nums[hi], lo
        for j in range(lo, hi):
            count += 1
            if nums[j] < pivot:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
        nums[i], nums[hi] = nums[hi], nums[i]
        stack += [(lo, i - 1), (i + 1, hi)]
    return count

import random
n = 2000
shuffled = random.sample(range(n), n)
print("shuffled:", comparisons(shuffled))          # around 25,000, a little more than n log2 n
print("sorted:  ", comparisons(list(range(n))))    # n(n - 1) / 2 = 1,999,000
```

Recursing on the smaller side and looping on the larger one, as `quicksort` does above, keeps the stack at O(log n) even in a bad case. [[p:912]] asks for a sort of your own, and its performance test is exactly the input that breaks a fixed pivot. Quicksort isn't stable: partitioning swaps items over long distances.

## Heap sort

Heap sort turns the list into a max-heap in O(n), then repeatedly swaps the largest item to the end and sifts the new root down ([[m:heaps]]). It's O(n log n) in the worst case, with O(1) extra memory, which neither merge sort nor quicksort gives you. It isn't stable, and it jumps around memory, so it's usually slower than quicksort in practice. **Introsort**, the sort behind C++'s `std::sort`, runs quicksort and switches to heap sort if the recursion gets too deep, which keeps quicksort's speed and heap sort's guarantee.

```python run title=Heap_sort_with_heapq
import heapq

def heap_sort(nums):
    heap = list(nums)
    heapq.heapify(heap)                                       # O(n)
    return [heapq.heappop(heap) for _ in range(len(heap))]    # n pops, O(log n) each

print(heap_sort([7, 2, 9, 4, 1, 8, 3, 5]))
```

This version uses a separate min-heap for clarity. The in-place version builds a max-heap inside the list itself.

## Why O(n log n) is the limit for comparing

A sort that only learns about items by comparing two of them can't beat O(n log n) in the worst case. The n items can arrive in any of n! orders, and the sort has to tell them all apart, because each one needs different moves to fix. Each comparison has two outcomes, so k comparisons separate at most 2ᵏ orders, and 2ᵏ ≥ n! needs k ≥ log₂(n!), which is about n log₂ n.

```python run title=log2_of_n_factorial
import math

for n in [10, 1_000, 1_000_000]:
    print(f"n = {n:>9,}: log2(n!) = {math.lgamma(n + 1) / math.log(2):>14,.0f}   n log2 n = {n * math.log2(n):>14,.0f}")
```

The way past it is to stop comparing, and look at the values themselves.

## Without comparisons: counting, radix and bucket sort

**Counting sort** works when the keys are small whole numbers, say from 0 to k. Count how many times each key appears, then write the keys out in order. That's O(n + k) time and O(k) memory. It's the right call when k is about n or smaller: ages, grades, letters, or counts that can't exceed n, as in [[p:347]].

**Radix sort** sorts numbers one digit at a time, from the **least** significant digit to the most, with a stable counting sort for each digit. Stability is what makes it work: after the pass for the tens digit, numbers with the same tens digit keep the order the units pass gave them. With d digits in base b, that's O(d · (n + b)).

```python run title=Counting_sort_and_radix_sort
def counting_sort(nums, k):  # every number is in range(k)
    count = [0] * k
    for x in nums:
        count[x] += 1
    return [x for x in range(k) for _ in range(count[x])]

def radix_sort(nums, base=10):  # non-negative whole numbers
    place = 1
    while any(x >= place for x in nums):
        buckets = [[] for _ in range(base)]
        for x in nums:  # in the current order: that's what keeps each pass stable
            buckets[x // place % base].append(x)
        nums = [x for b in buckets for x in b]
        place *= base
    return nums

print(counting_sort([3, 0, 4, 1, 3, 3, 0], 5))
print(radix_sort([170, 45, 75, 90, 802, 24, 2, 66]))
```

**Bucket sort** spreads values over n buckets by range, sorts each bucket, and joins them. On values spread evenly it's O(n) on average. Sometimes the buckets alone answer the question, without sorting inside them at all ([[p:164]]). When the values are exactly 0 to n − 1 with a few missing or repeated, take it to the limit: swap each value into the position equal to itself, in place. This is sometimes called **cyclic sort**, and it finds missing and repeated values in O(n) time and O(1) extra memory ([[p:268]] has simpler answers too).

:::tip Is the range small?
Whenever the values are bounded, by the alphabet, by n, or by a small constant in the constraints, ask whether counting beats sorting. "Sort the characters by frequency", "top k by count" and "the h-index" all have O(n) answers that count instead.
:::

## Finding the kth item without sorting

To find the kth smallest item, you don't need the other n − 1 in order. **Quickselect** partitions like quicksort, then continues only on the side that contains position k. With random pivots, the sides shrink to about half each time, so the work is n + n/2 + n/4 + … ≈ 2n: O(n) on average, O(n²) in the worst case. It's one of the answers to [[p:215]].

```python run title=Quickselect
import random

def kth_smallest(nums, k):  # k counts from 1
    nums, k = list(nums), k - 1
    lo, hi = 0, len(nums) - 1
    while True:
        p = random.randint(lo, hi)
        nums[p], nums[hi] = nums[hi], nums[p]
        pivot, i = nums[hi], lo
        for j in range(lo, hi):
            if nums[j] < pivot:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
        nums[i], nums[hi] = nums[hi], nums[i]
        if i == k:
            return nums[i]
        lo, hi = (i + 1, hi) if i < k else (lo, i - 1)  # keep only the side that holds position k

data = [7, 2, 9, 4, 1, 8, 3, 5]
print([kth_smallest(data, k) for k in range(1, 9)])
```

For the k smallest or largest items in order, a heap of size k costs O(n log k): `heapq.nsmallest(k, xs)` and `heapq.nlargest(k, xs)` do exactly that ([[p:973]]).

## Complexity

| Algorithm | Time | Extra space | Stable | Notes |
|---|---|---|---|---|
| Python `sort`, `sorted` (Timsort) | `O(n log n)`, `O(n)` if sorted | `O(n)` | yes | the default choice |
| Selection sort | `O(n^2)` always | `O(1)` | no | the fewest swaps: n − 1 |
| Insertion sort | `O(n + inversions)`, so `O(n^2)` at worst | `O(1)` | yes | best for tiny or nearly sorted lists |
| Merge sort | `O(n log n)` always | `O(n)` | yes | linked lists, external sorting, counting pairs |
| Quicksort, random pivot | `O(n log n)` average, `O(n^2)` worst | `O(log n)` stack | no | fastest in practice on arrays |
| Heap sort | `O(n log n)` always | `O(1)` | no | the worst-case guarantee without extra memory |
| Counting sort | `O(n + k)` | `O(k)` | yes | whole-number keys in a range of size k |
| Radix sort | `O(d (n + b))` | `O(n + b)` | yes | d digits in base b |
| Quickselect | `O(n)` average, `O(n^2)` worst | `O(1)` | | the kth item, without sorting |

:::interview
Unless the question is "implement a sort", call the built-in one and say what it costs: O(n log n) time, and the sorted copy or the change to the caller's list. When you do write one, merge sort is the safest to get right under pressure, and quicksort needs a random pivot to be defensible. Expect the follow-ups: is it stable, what's its worst case, how much memory does it use, and could the values be counted instead of compared?
:::

:::work
At work, sorting is mostly about keys: sorting records by several fields, sorting strings for people (case and accents need locale-aware keys, not plain `<`), and keeping sorts stable so a second sort doesn't scramble the first. Databases sort for `ORDER BY`, merge joins and index builds, and use external merge sort when the data doesn't fit in memory. Top-k queries use heaps, and partial sorts like `numpy.partition` are quickselect.
:::

## Quick check

:::quiz
? What does `nums = nums.sort()` leave in `nums`?
- [ ] The sorted list
- [ ] The original, unsorted list
- [x] `None`
> `.sort()` sorts in place and returns `None`, which then replaces the list. Use `nums.sort()` alone, or `nums = sorted(nums)`.

? You want people sorted by age from oldest to youngest, and by name from A to Z within each age, using two stable sorts. Which order do the passes go in?
- [x] Sort by name first, then by age with `reverse=True`
- [ ] Sort by age with `reverse=True` first, then by name
- [ ] The order doesn't matter, as long as both sorts are stable
> The last pass decides the main order. A stable pass keeps the earlier order among equal keys, so the earlier pass must be the tie-breaker.

? Insertion sort runs on a list of 10,000 numbers that's already sorted except for two neighbours that are swapped. Roughly how much work does it do?
- [x] About n steps: it makes a single swap
- [ ] About n log n steps
- [ ] About n² / 4 steps, its average case
> Insertion sort costs O(n + inversions), and the list has one inversion. That's why sorts that adapt to their input, like Timsort, use it.

? Why does merge sort take O(n log n) time on every input?
- [ ] Its pivots are chosen at random
- [x] The halves always have equal sizes, so there are log n levels, and each level merges n items in total
- [ ] It skips the merge when the halves are already in order
> The split doesn't depend on the values, so no input can make it unbalanced. Quicksort's split does depend on them.

? A quicksort uses the last item as its pivot. On which input is it slowest?
- [ ] A shuffled list
- [x] A list that's already sorted
- [ ] A list with all different values
> Each pivot is then the largest item, so each partition removes only one item: O(n²) comparisons, and n levels of recursion. A random pivot fixes it.

? Which algorithm can sort a million whole numbers between 0 and 999 in less than O(n log n) time?
- [ ] Heap sort
- [ ] Quicksort with a median-of-three pivot
- [x] Counting sort
> With k = 1000 possible values, counting sort takes O(n + k). Any sort that only compares items needs about n log₂ n comparisons in the worst case.

? Why must each pass of radix sort be stable?
- [ ] So that the sort uses O(1) extra memory
- [x] So that a pass on a more significant digit keeps the order the earlier passes made among numbers with that same digit
- [ ] Radix sort works with unstable passes too, only more slowly
> After sorting by the units digit, sorting by the tens digit must keep 42 before 45. An unstable pass could undo the work of the earlier ones.
:::
