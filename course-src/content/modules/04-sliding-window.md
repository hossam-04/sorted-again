---
id: sliding-window
title: Sliding window
kicker: fixed windows · grow and shrink · counts in a dict · monotonic deque
summary: Many questions about contiguous stretches can be answered by sliding a window over the data instead of checking every stretch. Each element enters the window once and leaves once, so O(n²) scans become one pass.
---

## The idea

A *window* is a stretch of consecutive elements, `nums[left..right]`. Many problems ask about the best such stretch: the largest sum of k days, the longest substring without repeats, the shortest piece of text containing some letters.

Checking every stretch costs O(n²) stretches, and often O(n) more to examine each one. A sliding window avoids both costs:

1. **It reuses work.** When the window moves one step, one element enters and one leaves. Update the window's summary (a sum, a count, a set) for just those two, instead of recomputing it.
2. **It skips stretches that can't win.** Both ends only move forward. Each element enters once and leaves once, so the total work is O(n).

Windows come in two kinds. A **fixed** window always has length k. A **variable** window grows and shrinks to keep some condition true.

## Fixed windows

With a fixed length, the window moves one step at a time: add the new element on the right, remove the old one on the left. A running sum makes every window's total available in O(1):

```python run title=Rolling_average_of_k_days
def rolling_averages(values, k):
    total = sum(values[:k])
    out = [total / k]
    for i in range(k, len(values)):
        total += values[i] - values[i - k]  # one in, one out
        out.append(total / k)
    return out

temps = [18, 21, 25, 24, 19, 16, 20, 23]
print([round(a, 1) for a in rolling_averages(temps, 3)])
```

The same move works for any summary you can update one element at a time. [[p:567]] keeps letter counts for a window of length `len(s1)` and compares them with `s1`'s counts at each step.

## Variable windows: grow, then shrink

When the window's length isn't fixed, use two pointers that both move right:

- Move `right` forward to add one element.
- While the window breaks the rule, move `left` forward to remove elements.
- Now the window is valid; compare it with the best so far.

The rule is the window's **invariant**. Every algorithm in this module is "keep the invariant while sliding", with a different invariant. For [[p:3]] it's "no character appears twice":

:::viz window-longest-unique
:::

Here is the general template, with a set as the window's summary. Each element is added once and removed at most once, so even with the inner `while`, the whole loop is O(n):

```python run title=Grow_and_shrink
def longest_without_repeats(s):
    window = set()
    left = best = 0
    for right, c in enumerate(s):
        while c in window:  # the rule is broken: shrink from the left
            window.remove(s[left])
            left += 1
        window.add(c)
        best = max(best, right - left + 1)
    return best

for s in ["abcbade", "aaaa", "", "pneumonia"]:
    print(repr(s), longest_without_repeats(s))
```

The visualizer jumps `left` straight past the earlier copy instead of stepping, using a dict of last positions. Both versions are O(n).

:::gotcha The left end must never move back
When you jump `left` to `last[c] + 1`, that earlier copy may already be *outside* the window. In `"abba"`, the final `a` was last seen at index 0, but `left` is already 2; jumping to 1 would let the second `b` back in. Use `left = max(left, last[c] + 1)` or check `last[c] >= left` first.
:::

## Counting inside the window

Often the rule depends on how many of each value the window holds. A dict of counts, updated as elements enter and leave, answers that in O(1) per step.

[[p:424]] asks for the longest stretch you could turn into one repeated letter with at most k changes. The cheapest plan for a window is to keep its most common letter and change the rest, so the rule is

`window length − count of the most common letter ≤ k`

and the window shrinks whenever that fails.

[[p:76]] turns the question around: find the *shortest* window that contains every letter of `t`. Grow until the window covers `t`, then shrink from the left as long as it still does, and record the window while it is still valid.

:::gotcha Record before you shrink
In "shortest window" problems, update the answer while the window is valid, then remove the left element. Removing first and recording second records a window that may have just lost a letter it needed. In "longest window" problems the order flips: shrink until the window is valid again, then record.
:::

## Counting windows: the "at most k" trick

Some problems ask *how many* windows satisfy a rule. Counting windows with **at most** k of something is easy with a sliding window: for each `right`, every start from `left` to `right` works, which is `right - left + 1` windows. Counting **exactly** k is harder directly, but

`exactly(k) = at_most(k) − at_most(k − 1)`

turns it back into two easy counts:

```python run title=Subarrays_with_exactly_k_distinct_values
from collections import defaultdict

def at_most(nums, k):
    count = defaultdict(int)
    left = total = 0
    for right, x in enumerate(nums):
        count[x] += 1
        while len(count) > k:
            count[nums[left]] -= 1
            if count[nums[left]] == 0:
                del count[nums[left]]
            left += 1
        total += right - left + 1  # windows ending at right with at most k distinct
    return total

def exactly(nums, k):
    return at_most(nums, k) - at_most(nums, k - 1)

nums = [1, 2, 1, 2, 3]
print("at most 2:", at_most(nums, 2))
print("exactly 2:", exactly(nums, 2))
```

## The maximum of every window

Sums and counts update easily when an element leaves. A maximum doesn't: when the maximum leaves, which element takes over? Rescanning the window costs O(k) per step.

The fix is a **monotonic deque** of positions whose values decrease from front to back. A new value first evicts every smaller value from the back: those can never be a maximum again, because the new value is at least as large and stays in the window longer. The front is then the maximum, as long as you drop it once it slides out of the window. [[p:239]] uses exactly this:

:::viz window-max-deque
:::

Each position enters the deque once and leaves once, so the whole pass is O(n). The same idea, "throw away what can never matter again", drives the monotonic stacks of the next module.

```python run title=Window_maximum_with_a_deque
from collections import deque

def window_max(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out

print(window_max([2, 7, 4, 1, 5, 3, 6], 3))
print(window_max([9, 8, 7, 6, 5], 2))
```

## A window you might not recognise

[[p:121]] asks for the best profit from one buy and one later sell. The buy day is the left end and the sell day is the right end. The right end moves every day; the left end only moves when a cheaper day appears, because a lower buy price beats any earlier one for every future sell day. The whole window collapses into one variable: the lowest price so far.

## Complexity

| Task | Brute force | Sliding window | Extra space |
|---|---|---|---|
| Sum or average of every window of size k | `O(n·k)` | `O(n)` | `O(1)` |
| Longest stretch without repeats | `O(n^2)` | `O(n)` | `O(k)` for k distinct values |
| Longest stretch fixable with k changes | `O(n^2)` | `O(n)` | `O(1)` for 26 letters |
| Does a rearrangement of `p` appear? | `O(n·m)` | `O(n)` | `O(1)` for 26 letters |
| Shortest window covering `t` | `O(n^2)` | `O(n + m)` | `O(k)` |
| Maximum of every window | `O(n·k)` | `O(n)` with a deque | `O(k)` |

:::interview
State the window's invariant out loud before coding ("the window never contains a repeated character") and say which pointer restores it. Interviewers listen for why the solution is O(n) despite the nested loop: each element enters and leaves the window once. Also say whether you record the answer before or after shrinking, and why.
:::

:::work
Sliding windows are how monitoring systems compute "errors in the last 5 minutes" and rate limiters decide whether a client made too many requests in the last second. Rolling averages smooth noisy metrics, and the deque trick computes rolling maxima for things like peak memory over the last hour.
:::

## Quick check

:::quiz
? Why is a variable sliding window O(n) even though it has a `while` loop inside a `for` loop?
- [ ] The `while` loop runs at most once per step
- [x] Each element is added once and removed at most once, so all the `while` steps add up to at most n
- [ ] Because the window is never longer than k
> The `for` loop adds each element once. The `while` loop only removes elements, and each element can be removed only once. Across the whole run, that's at most n removals.

? In the "last seen position" version of Longest Substring Without Repeating Characters, what goes wrong with `left = last[c] + 1` on `"abba"`?
- [ ] Nothing, it returns 2
- [x] At the final `a`, `left` jumps back from 2 to 1, so the window `"bba"` is counted
- [ ] It raises a KeyError
> The earlier `a` sits before the window. Jumping to it moves `left` backwards. Taking `max(left, last[c] + 1)` keeps the left end moving forward only.

? For the shortest window containing all of `t`, when should you record the answer?
- [x] While the window still covers `t`, before removing the left element
- [ ] After removing the left element
- [ ] Only when `right` reaches the end
> Removing the left element can break the window. Recording after that would save a window that no longer contains all of `t`.

? How can you count subarrays with exactly k distinct values using a sliding window?
- [ ] Shrink whenever there are fewer than k distinct values
- [x] Count windows with at most k distinct values and subtract those with at most k − 1
- [ ] It can't be done with a sliding window
> "At most k" counts are easy: each `right` adds `right - left + 1` windows. The windows with exactly k distinct values are the ones in the first count but not the second.

? In the window-maximum deque, why can a value be dropped from the back when a larger or equal value arrives?
- [x] The new value is at least as large and leaves the window later, so the old one can never be the maximum again
- [ ] To keep the deque short enough to fit in memory
- [ ] Because the deque must stay sorted in increasing order
> Every future window that contains the old value also contains the new one, which is at least as big. The old value is dominated forever, so the deque can forget it.
:::
