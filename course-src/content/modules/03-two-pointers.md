---
id: two-pointers
title: Two pointers
kicker: converging · same direction · partition
summary: Two indices that move with a purpose. When the data is sorted or symmetric, each step rules out a whole row of candidates, and an O(n²) search over pairs becomes a single O(n) pass.
---

## Why it works

Checking every pair of a list costs `n·(n−1)/2` comparisons. Two pointers get the same answer in one pass, but only when the data lets one comparison **rule out many pairs at once**.

Sorted order is the usual reason. Suppose you want two numbers that add up to a target, and `nums[l] + nums[r]` is too small. Then `nums[l]` plus anything to the left of `r` is smaller still, so no pair that uses `nums[l]` can work. You can move `l` forward and never look back. One comparison just discarded a whole row of pairs.

That sentence is the whole technique: **before you move a pointer, be able to say which candidates the move throws away, and why none of them could be the answer.** If you can't say it, the pointers are guessing.

There are three common shapes:

- **Converging**: one pointer at each end, moving towards each other. Pair sums on sorted data, palindromes, containers.
- **Same direction**: a fast "reader" and a slow "writer", both moving right. Removing duplicates, compacting a list in place.
- **Partitioning**: pointers that split a list into regions, swapping values into place. The Dutch national flag, quicksort's partition step.

## Converging pointers

Start at both ends and move inward. Step through the classic case below, then change the input and trace it again.

:::viz two-pointers-sorted
:::

The same walk can collect every pair instead of stopping at the first one. After a match, both pointers move, because each of those two values has now been used:

```python run title=Every_pair_with_a_given_sum
def pairs_with_sum(nums, target):
    """All pairs of values in the sorted list nums that add up to target."""
    l, r = 0, len(nums) - 1
    out = []
    while l < r:
        s = nums[l] + nums[r]
        if s < target:
            l += 1
        elif s > target:
            r -= 1
        else:
            out.append((nums[l], nums[r]))
            l += 1
            r -= 1
    return out

print(pairs_with_sum([1, 2, 3, 4, 5, 6, 7], 8))
print(pairs_with_sum([-3, -1, 0, 2, 5], 2))
```

Practice this on [[p:167]], which returns the positions of the one pair that matches.

:::gotcha Off by one where the pointers meet
`while l < r` stops when the pointers meet, because a pair needs two different positions. With `<=`, the last step can add an element to itself: in `[1, 3, 5]` with target 6, the loop reaches `l == r == 1` and pairs 3 with itself.
:::

## Palindromes: symmetry instead of order

Converging pointers also work when the data is **symmetric** rather than sorted. A palindrome check compares the first and last characters, then the second and second-to-last, and so on. Each comparison settles one pair of positions for good.

```python run title=Check_a_palindrome_from_both_ends
def is_palindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        if s[l] != s[r]:
            return False
        l, r = l + 1, r - 1
    return True

for word in ["level", "rotor", "pointer", "a", ""]:
    print(repr(word), is_palindrome(word))
```

[[p:125]] adds a twist: skip characters that are not letters or digits, and ignore case. The pointers then move past symbols before they compare.

## Same direction: a reader and a writer

Sometimes both pointers move right, at different speeds. The **reader** looks at every element once. The **writer** marks where the next kept element goes. Everything before the writer is the finished result.

Removing duplicates from a sorted list in place is the standard example:

```python run title=Remove_duplicates_from_a_sorted_list_in_place
def dedupe_sorted(nums):
    """Keep one copy of each value at the front of nums; return how many remain."""
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write

nums = [1, 1, 2, 3, 3, 3, 7]
k = dedupe_sorted(nums)
print(k, nums[:k])
print(nums)  # the tail still holds old values; only the first k matter
```

The rule-out argument here is different: the writer never needs to look back further than `nums[write - 1]`, because the list is sorted and every kept value is already in its final place.

## Partitioning in place

Three pointers can sort a list that holds only three distinct values in one pass. This is the **Dutch national flag** problem:

- everything before `lo` is a 0,
- everything from `lo` up to `mid` is a 1,
- everything after `hi` is a 2,
- and `mid..hi` is still unexamined.

```python run title=Sort_0s_1s_and_2s_in_one_pass
def sort_colors(nums):
    lo, mid, hi = 0, 0, len(nums) - 1
    while mid <= hi:
        if nums[mid] == 0:
            nums[lo], nums[mid] = nums[mid], nums[lo]
            lo += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[hi] = nums[hi], nums[mid]
            hi -= 1  # do not move mid: the value swapped in from hi is unexamined
    return nums

print(sort_colors([2, 0, 2, 1, 1, 0]))
print(sort_colors([1, 2, 0]))
```

Notice `while mid <= hi`, with `<=`. Here the element at `hi` has not been examined yet, so the loop must still look at it. The right comparison depends on what each pointer means, which is why it pays to say the invariant out loud.

## Three values: fix one, walk two

To find triples that sum to zero ([[p:15]]), sort the list, then fix the smallest value of the triple and look for the other two with the converging walk. Each fixed value costs O(n), so the total is O(n²) instead of the brute force's O(n³).

The hard part is **duplicates**. Sorting puts equal values next to each other, so two rules remove them:

1. Skip a fixed value that equals the **previous** one.
2. After a match, move the left pointer past values equal to the one just used.

:::gotcha Skip duplicates by looking back, not ahead
`if i > 0 and nums[i] == nums[i - 1]: continue` skips the *second* copy of a value. Writing `nums[i] == nums[i + 1]` instead skips the *first* copy, which is the one that can still pair with the second. It silently loses triples like `[-1, -1, 2]`.
:::

Sorting also has a cost people forget: `nums.sort()` changes the caller's list.

```python run title=Sorting_changes_the_caller's_list
def has_pair(nums, target):
    nums.sort()  # sorts the caller's list, not a copy
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return True
        if s < target:
            l += 1
        else:
            r -= 1
    return False

original = [5, 1, 4, 2]
print(has_pair(original, 6))
print(original)  # the caller's order is gone

def has_pair_safe(nums, target):
    nums = sorted(nums)  # a sorted copy; the caller's list is untouched
    return has_pair(nums, target)

original = [5, 1, 4, 2]
print(has_pair_safe(original, 6), original)
```

:::gotcha Mutating the input
Sorting in place saves O(n) memory but changes data the caller still owns. In an interview, ask whether you may modify the input. In production code, prefer `sorted(nums)` unless the function's job is to sort.
:::

## Containers: drop the shorter side

[[p:11]] asks for the two lines that hold the most water. Start with the widest pair. If the left line is the shorter one, every other container that uses it is narrower **and** no taller, because the short line caps the height. So the left line can go. The same holds for the right line when it is the shorter one.

:::viz container-water
:::

## Trapping rain water: running maxima

[[p:42]] looks similar but asks a different question. Instead of one container, every bar collects water: up to the lower of the tallest bar on its left and the tallest bar on its right. The straightforward version stores both maxima for every position:

```python run title=Water_above_each_bar
height = [3, 0, 2, 0, 4]
left = [max(height[: i + 1]) for i in range(len(height))]
right = [max(height[i:]) for i in range(len(height))]
water = [min(a, b) - h for a, b, h in zip(left, right, height)]
print("left max: ", left)
print("right max:", right)
print("water:    ", water, "total", sum(water))
```

The two-pointer version removes both lists. Whichever side currently has the lower bar is the side whose level is known for sure, so you settle that bar and move its pointer inward.

## Complexity

| Task | Brute force | Two pointers | Extra space |
|---|---|---|---|
| Pair with a given sum, sorted input | `O(n^2)` | `O(n)` | `O(1)` |
| Palindrome check | `O(n)` with a reversed copy | `O(n)` | `O(1)` |
| Remove duplicates in place, sorted input | `O(n^2)` with shifting | `O(n)` | `O(1)` |
| Sort 0s, 1s and 2s | `O(n log n)` with a sort | `O(n)` | `O(1)` |
| Three values summing to zero | `O(n^3)` | `O(n^2)` | `O(n)` for the sorted copy |
| Container with most water | `O(n^2)` | `O(n)` | `O(1)` |
| Trapping rain water | `O(n^2)` | `O(n)` | `O(1)` |

If the input is not sorted and the trick needs sorted order, add the sort: `O(n log n)`. That is still a big win over `O(n^2)`, but a hash set may be faster when you only need one pair and don't care about order.

:::interview
Say the "rules out" sentence before you code: "the sum is too small, so the left value can't pair with anything that's left." It shows you know why the pointers move, and it catches a pointer moving the wrong way before you write it. Also ask early whether the input is sorted and whether you may change it.
:::

:::work
The same walk shows up in ordinary code: merging two sorted lists, finding the differences between two sorted exports, removing duplicates from sorted IDs, or splitting records into "keep" and "drop" in place. When data already arrives sorted from a database index, two pointers save the memory a hash table would cost.
:::

## Quick check

:::quiz
? Converging pointers on `[2, 5, 7, 9]` look for a sum of 12. The first sum is 2 + 9 = 11. Which pointer moves?
- [ ] `r`, because 9 is the largest value
- [x] `l`, because 11 is too small and 2 can't pair with anything that is left
- [ ] both, to keep the window centred
> When the sum is too small, the left value is too small for every remaining partner (even the largest one falls short), so it can be dropped by moving `l` right.

? Why does the pair search use `while l < r` rather than `while l <= r`?
- [x] A pair needs two different positions, and when `l == r` only one number is left
- [ ] To avoid an `IndexError`
- [ ] It makes no difference
> At `l == r` both pointers name the same element, and using it twice is not allowed. With `<=` the loop could add a number to itself.

? In 3Sum, which check skips a duplicate fixed value without losing triples?
- [ ] `if nums[i] == nums[i + 1]: continue`
- [x] `if i > 0 and nums[i] == nums[i - 1]: continue`
- [ ] Both work the same way
> Comparing with the previous value skips the second copy, after the first copy has already been tried with everything to its right. Comparing with the next value skips the first copy, which loses triples like `[-1, -1, 2]`.

? In Container With Most Water, the left line is 3 tall and the right line is 8 tall. Which one do you drop?
- [x] The left one
- [ ] The right one
- [ ] Either; it doesn't matter
> Every other container using the 3-tall line is narrower and still capped at height 3, so none of them can beat the current one. Dropping the 8-tall line might throw away the best pair.

? In the Dutch flag loop, after swapping a 2 from `mid` to `hi`, why don't we advance `mid`?
- [ ] Because `mid` must always stay behind `lo`
- [x] Because the value that came back from `hi` hasn't been examined yet
- [ ] Because 2s must be swapped twice
> Everything between `mid` and `hi` is unexamined, including the value just swapped in. Advancing `mid` would skip it.

? `dedupe_sorted([1, 1, 2, 3, 3])` returns 3. What do the last two positions of the list hold afterwards?
- [ ] They are deleted
- [ ] Two copies of `None`
- [x] Leftover values; only the first 3 positions are meaningful
> The function writes the kept values to the front and returns how many there are. It never shrinks the list, so the tail keeps whatever was there.
:::
