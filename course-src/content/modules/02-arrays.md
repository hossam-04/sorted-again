---
id: arrays
title: Arrays and hashing
kicker: dynamic arrays · dict and set · counting · prefix sums
summary: Two tools carry most interview problems. A list gives you any position in O(1), and a hash map answers "have I seen this?" in O(1). Learn what each one costs and most O(n²) searches turn into one pass.
---

## The two workhorses

A Python `list` is an array: its items sit side by side in memory, so reading or writing position `i` takes the same time whether the list holds ten items or ten million. A `dict` (and its key-only sibling, `set`) is a hash table: it finds a key without looking at the others.

Most problems in this module come down to one move: replace a search through a list with a lookup in a dict or set. The search costs O(n) each time. The lookup costs O(1) on average. Inside a loop, that turns O(n²) into O(n).

## Lists are dynamic arrays

A list stores references to its items in one contiguous block. Indexing is arithmetic (start of the block plus `i` slots), which is why `nums[i]` is O(1).

Appending is O(1) too, *on average*. When the block is full, Python allocates a bigger one (about 1.125 times as big, plus a little) and copies the references over. Copying costs O(n), but it happens rarely enough that the total over n appends stays O(n). That's what **amortised O(1)** means. You can watch the capacity jump:

```python run title=A_list_grows_in_steps
import sys

items = []
last = sys.getsizeof(items)
print(f"empty list: {last} bytes")
for i in range(40):
    items.append(i)
    size = sys.getsizeof(items)
    if size != last:
        print(f"after {len(items):2} items: {size} bytes (room for more)")
        last = size
```

Inserting or removing at the front costs more. `items.insert(0, x)` and `items.pop(0)` shift every other item by one slot: O(n) each. If you need a queue, use `collections.deque`, which adds and removes at both ends in O(1).

Searching is O(n) as well: `x in items` and `items.index(x)` compare against items one by one. That cost hides inside innocent-looking lines, as in this version of [[p:217]]:

```python run title=A_hidden_loop
import time

def has_duplicate_slow(nums):
    for i, x in enumerate(nums):
        if x in nums[i + 1:]:  # copies and scans the rest of the list
            return True
    return False

def has_duplicate_fast(nums):
    seen = set()
    for x in nums:
        if x in seen:  # one hash lookup
            return True
        seen.add(x)
    return False

nums = list(range(5000))  # no duplicates: the worst case
for f in (has_duplicate_slow, has_duplicate_fast):
    t = time.perf_counter()
    f(nums)
    print(f"{f.__name__}: {(time.perf_counter() - t) * 1000:.1f} ms")
```

:::gotcha The [[0] * n] * m trap
`[[0] * 3] * 2` builds one inner list and an outer list that holds it twice, so a write through `grid[0]` also shows up through `grid[1]`. Build a grid with a comprehension instead, which creates a new inner list each time: `[[0] * 3 for _ in range(2)]`.
:::

```python run title=Two_names_for_one_row
grid = [[0] * 3] * 2
grid[0][0] = 9
print(grid)  # both rows changed

grid = [[0] * 3 for _ in range(2)]
grid[0][0] = 9
print(grid)  # only the first row changed
```

## Hash maps and sets

A hash table turns a key into a number with `hash(key)`, uses that number to pick a slot, and stores the key there. Looking a key up repeats the same calculation and goes straight to the slot. Different keys sometimes land in the same slot; Python then probes a few more slots, which costs little as long as the table isn't crowded (it resizes itself to keep it that way).

So lookups, inserts and deletes take O(1) on average. The worst case is O(n), when a great many keys collide, but that needs deliberately chosen keys and you can ignore it for interview problems.

Keys must be **hashable**: their hash must never change. Numbers, strings, tuples of hashable values and `frozenset`s qualify. Lists, dicts and sets don't, because they can change after you store them.

:::gotcha Lists as dict keys
`d[[1, 2]] = x` raises `TypeError: unhashable type: 'list'`. When a key is naturally a sequence, such as a sorted word or a pair of coordinates, convert it to a tuple or a string first.
:::

```python run title=Tuples_can_be_keys,_lists_can't
seen = {}
try:
    seen[[3, 4]] = "a list"
except TypeError as e:
    print("TypeError:", e)

seen[(3, 4)] = "a tuple"
seen["".join(sorted("listen"))] = "a sorted word"
print(seen)
print((3, 4) in seen, "eilnst" in seen)
```

## Have I seen this before?

The simplest use of a set is remembering what you've passed. [[p:217]] asks whether any value repeats: walk the list, and for each value check the set before adding it. One pass, O(n) time, O(n) memory. A sort would also work, in O(n log n), by putting equal values next to each other.

## Looking for a partner

[[p:1]] asks for two numbers that add up to a target. For a value `x`, the only partner that works is `target - x`, so the question "which earlier value pairs with this one?" becomes a single lookup. Store each value with its position as you go, and look up the partner *before* storing `x`, so a position can't pair with itself.

:::viz two-sum-hashmap
:::

The same "complement" idea appears whenever the condition on a pair can be solved for the second item: a difference instead of a sum, a running sum that should equal some earlier running sum, a value and its mirror.

## Counting

Many problems are about how often things appear. `collections.Counter` counts in one line, and `collections.defaultdict` creates an empty list (or zero, or set) the first time you touch a key.

To compare two words as anagrams ([[p:242]]), compare their letter counts. To *group* anagrams ([[p:49]]), give every word a key that is the same for all its rearrangements, either its letters sorted or its tuple of 26 counts, and collect words by key:

```python run title=Counting_and_grouping
from collections import Counter, defaultdict

words = ["stop", "pots", "tops", "opt", "top", "spot", "post"]
groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)
print(dict(groups))

votes = Counter("abracadabra")
print(votes)
print(votes.most_common(2))
```

[[p:347]] asks for the k most frequent values. Sorting by count costs O(n log n), and a heap of size k costs O(n log k). There's a linear answer too: a count is between 1 and n, so put each value into a bucket indexed by its count and read the buckets from the top. That's **bucket sort**, and it works whenever the keys you sort by are small integers.

## Prefix sums and products

A prefix sum stores, for every position, the total of everything before it. Once you have it, the sum of any stretch `nums[i:j]` is one subtraction instead of a loop:

```python run title=Range_sums_in_O(1)
from itertools import accumulate

nums = [4, -1, 3, 7, 2, 5]
prefix = [0] + list(accumulate(nums))  # prefix[i] = sum(nums[:i])
print("prefix:", prefix)

def range_sum(i, j):
    """Sum of nums[i:j] in O(1)."""
    return prefix[j] - prefix[i]

print(range_sum(1, 4), sum(nums[1:4]))
print(range_sum(0, 6), sum(nums))
```

Products work the same way, which is how [[p:238]] gets "the product of everything except me" without division. The product left of `i` times the product right of `i` is the answer for `i`. One pass from the left fills in the left parts, and one pass from the right multiplies in the right parts:

:::viz prefix-products
:::

## Packing strings with lengths

[[p:271]] asks you to pack a list of strings into one string and unpack it again. Any separator character might also appear inside a string, so separators alone can't work. Writing each string's length in front of it does: the reader knows exactly how many characters to take, whatever they are. Network protocols frame their messages the same way.

## Sets for runs, and index arithmetic for grids

[[p:128]] wants the longest run of consecutive numbers. With all numbers in a set, a number `x` starts a run only when `x - 1` is missing. Counting up only from starts means every number is visited once, so the whole search is O(n) even though there's a loop inside a loop.

[[p:36]] checks a Sudoku grid with one set per row, column and box. The box of cell `(r, c)` is `(r // 3) * 3 + c // 3`: integer division picks the band and the stack, and multiplying one by 3 keeps the nine numbers apart. Turning a 2-D position into one number like this is a trick you'll use for grids again and again.

:::gotcha Mutable default arguments
Python creates a default value once, when it runs the `def` line. `def add(x, seen=[])` then shares that one list across all calls that don't pass `seen`, so it keeps growing. Use `None` as the default and create the list inside the function.
:::

```python run title=One_default_list_for_every_call
def remember(x, seen=[]):
    seen.append(x)
    return seen

print(remember(1))
print(remember(2))  # still holds 1

def remember_fixed(x, seen=None):
    if seen is None:
        seen = []
    seen.append(x)
    return seen

print(remember_fixed(1))
print(remember_fixed(2))
```

## Complexity

| Operation | list | dict / set |
|---|---|---|
| Read or write by position | `O(1)` | not applicable |
| Append, or add a key | `O(1)` amortised | `O(1)` average |
| Insert or delete at the front | `O(n)` | not applicable |
| `x in ...` | `O(n)` | `O(1)` average |
| Delete a given value or key | `O(n)` | `O(1)` average |
| Sort | `O(n log n)` | not applicable |
| Build a prefix-sum list | `O(n)` | not applicable |

| Problem | Brute force | With hashing or prefix work |
|---|---|---|
| Any duplicate? | `O(n^2)` | `O(n)` with a set |
| Two values with a given sum | `O(n^2)` | `O(n)` with a dict |
| Group anagrams | `O(n^2·k)` | `O(n·k)` with a key |
| k most frequent | `O(n log n)` with a sort | `O(n)` with buckets |
| Product of all others | `O(n^2)` | `O(n)` with prefix and suffix products |
| Longest run of consecutive values | `O(n log n)` with a sort | `O(n)` with a set |

:::interview
When you reach for a dict, say what the keys and values are ("value to position", "sorted word to its group"). It shows the interviewer the structure of your solution before you write it. Mention the space cost too: these solutions trade O(n) memory for speed, and "can you do it in O(1) space?" is a common follow-up.
:::

:::work
Counting with `Counter`, grouping with `defaultdict(list)` and deduplicating with a set are everyday tools for logs, CSV exports and API responses. Prefix sums appear as running totals in reports and as cumulative counts behind histograms and percentiles. Length-prefixed framing is how many network protocols and file formats separate records.
:::

## Quick check

:::quiz
? Why is appending to a Python list O(1) on average even though it sometimes copies the whole list?
- [ ] Python lists are linked lists
- [x] Copies happen rarely enough, because each resize grows the capacity by a fixed proportion
- [ ] Appending never copies anything
> Each resize makes the list proportionally bigger, so the expensive copies get further apart as the list grows. Spread over all the appends, the cost per append is constant: amortised O(1).

? What does `grid = [[0] * 3] * 3; grid[1][1] = 5` do?
- [ ] Sets one cell to 5
- [x] Sets the middle cell of every row to 5, because all three rows are the same list
- [ ] Raises an error
> Multiplying the outer list copies the reference to the inner list three times. All three entries refer to one inner list, so a change through one of them shows up through all of them.

? Which of these can be a dict key?
- [ ] `[1, 2]`
- [ ] `{1, 2}`
- [x] `(1, 2)`
> Keys must be hashable, which means their value can't change. Tuples of hashable items qualify; lists and sets are mutable, so they don't.

? In Two Sum with a dict, why look up `target - x` before storing `x`?
- [x] So that a position can't be paired with itself
- [ ] Because storing first would be slower
- [ ] It makes no difference
> If `x` is exactly half the target and you store it first, the lookup finds `x` itself. Looking up first means `seen` only contains earlier positions.

? Longest consecutive sequence counts up only from numbers whose `x - 1` is missing. Why is that O(n) overall?
- [ ] Because the set is sorted
- [x] Each run is walked once, from its start, so all the inner loops together take n steps
- [ ] Because most numbers are skipped by the inner loop
> The inner `while` loop only runs at the start of a run and walks to its end. Every number belongs to exactly one run, so the inner loops add up to n steps in total.
:::
