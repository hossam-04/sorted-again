---
id: greedy
title: Greedy algorithms
kicker: the locally best choice · exchange arguments · when greedy fails · Kadane · reach · running balances
summary: "A greedy algorithm builds its answer one step at a time, always taking the choice that looks best right now and never reconsidering. When that works, it's the simplest and fastest solution there is. The hard part is knowing when it works, and this module is about telling the difference."
---

## The greedy idea

A greedy algorithm makes one choice at a time, picks whatever looks best at that moment, and never goes back. There's no search and no table of subproblems, so greedy solutions are usually a single pass, often after a sort.

The catch is that "looks best now" isn't always best overall. A greedy algorithm is correct only when you can show that the local choice never closes off a better answer. Two standard ways to show it:

- **Exchange argument.** Take any optimal solution that doesn't start with the greedy choice, and swap its first choice for the greedy one. If the result is still valid and no worse, there's an optimal solution that agrees with greedy so far, and repeating the argument covers every step. [[p:435]] keeps the interval that *ends* earliest: swapping it in for any other first interval can only free up room.
- **Greedy stays ahead.** Show that after every step, the greedy partial solution is at least as good as any other partial solution with the same number of steps. In [[p:55]], the farthest reachable index after scanning i elements is as far as any sequence of jumps could have gone.

## When greedy fails

Paying an amount with the fewest coins, taking the largest coin that fits each time, works for everyday coin systems like 1, 2, 5, 10. It fails for others:

```python run title=A_greedy_that_fails
def greedy_coins(coins, amount):
    used = []
    for c in sorted(coins, reverse=True):  # largest coin first, as many as fit
        while amount >= c:
            amount -= c
            used.append(c)
    return used if amount == 0 else None

def fewest_coins(coins, amount):  # dynamic programming: the fewest coins for every amount up to `amount`
    best = [0] + [None] * amount
    for a in range(1, amount + 1):
        options = [best[a - c] for c in coins if c <= a and best[a - c] is not None]
        best[a] = min(options) + 1 if options else None
    return best[amount]

print("greedy:", greedy_coins([1, 3, 4], 6))
print("fewest:", fewest_coins([1, 3, 4], 6), "coins (3 + 3)")
```

Taking the 4 first looks right, but it leaves 2, which costs two more coins; 3 + 3 does it in two. When a local choice can rule out the best answer, you need to consider several choices, which is what [[m:dp]] does. A single counterexample like this one is often the fastest way to rule a greedy idea out.

## Kadane's algorithm

[[p:53]] asks for the largest sum of a run of consecutive numbers. Kadane's algorithm keeps the best sum of a run that *ends at the current element*. That run either extends the previous one or starts fresh here, and starting fresh is better exactly when the previous run's sum is negative: a negative prefix only drags down whatever follows it.

:::viz kadane
:::

:::gotcha An all-negative array
A common shortcut starts the best sum at 0 and resets the running sum to 0 whenever it goes negative. That quietly allows an *empty* subarray: with `[-4, -2, -7]` it returns 0, which isn't the sum of any real subarray. Start both the running sum and the best at the first element.
:::

```python run title=Kadane_with_the_run_itself
def best_run(nums):
    best = cur = nums[0]
    start = lo = hi = 0
    for i in range(1, len(nums)):
        if cur < 0:
            cur, start = nums[i], i  # drop a negative run
        else:
            cur += nums[i]
        if cur > best:
            best, lo, hi = cur, start, i
    return best, nums[lo:hi + 1]

print(best_run([3, -4, 2, -1, 3, 1, -5, 4]))
print(best_run([-4, -2, -7]))
```

## Reach: how far can you get?

In [[p:55]] every index can jump forward by up to its value. Which indices are reachable? Always a prefix of the array, because if you can reach index r you can reach every index before it by jumping a little shorter. So one number describes everything reachable, and a single pass updates it:

:::viz jump-reach
:::

[[p:45]] asks for the fewest jumps. The indices reachable with exactly k jumps form a contiguous range, so the ranges behave like the levels of a breadth-first search: scanning the current range finds where the next one ends.

```python run title=Jump_levels
def jump_levels(nums):
    levels, lo, hi = [], 0, 0  # indices lo..hi are reachable with len(levels) jumps
    while True:
        levels.append(list(range(lo, hi + 1)))
        if hi >= len(nums) - 1:
            return levels
        farthest = max(i + nums[i] for i in range(lo, hi + 1))
        if farthest <= hi:
            return None  # stuck: no jump gets past this level
        lo, hi = hi + 1, farthest  # the next level: everything newly reachable

for jumps, level in enumerate(jump_levels([2, 4, 1, 1, 1, 1])):
    print(jumps, "jumps:", level)
```

## More greedy patterns

- **A running balance that restarts.** In [[p:134]], driving from a start that runs dry at station i rules out every station in between too, so the search restarts right after i. One pass, and the total gas tells whether any start works.
- **Smallest first, with counts.** In [[p:846]], the smallest card left can't be in the middle of a run, so it must start one, and that whole group is forced. Counting the cards makes each step O(1).
- **Reach the last occurrence.** In [[p:763]], a part that contains a letter must extend to that letter's last occurrence. Scanning while extending the end cuts each part as early as possible.
- **Throw away what can't be used.** In [[p:1899]], merging only takes maxima, so a triplet that's too big anywhere is useless, and everything else is safe to merge.
- **Track a range of possibilities.** In [[p:678]], each `*` could be `(`, `)` or nothing. Instead of trying every reading, keep the lowest and highest possible number of open parentheses:

```python run title=The_range_of_open_counts
def show_range(s):
    lo = hi = 0
    for ch in s:
        if ch == "(":
            lo, hi = lo + 1, hi + 1
        elif ch == ")":
            lo, hi = lo - 1, hi - 1
        else:
            lo, hi = lo - 1, hi + 1
        lo = max(lo, 0)  # a reading with a negative count is already invalid
        print(f"{ch}  open count between {lo} and {hi}")
        if hi < 0:
            return False
    return lo == 0

print(show_range("(*()"))
```

## Complexity

| Problem | Greedy idea | Time |
|---|---|---|
| Largest subarray sum | Kadane: drop a negative running sum | `O(n)` |
| Can you reach the end? | the farthest reach so far | `O(n)` |
| Fewest jumps | breadth-first levels over ranges | `O(n)` |
| Gas station | restart after a deficit, check the total | `O(n)` |
| Consecutive groups | smallest card first, with counts | `O(n log n)` |
| Partition labels | extend to each letter's last occurrence | `O(n)` |
| Most non-overlapping intervals | earliest end first | `O(n log n)` |

Greedy solutions are usually a single pass, plus a sort when the order matters.

:::interview
When you propose a greedy solution, say what the choice is and why it's safe, in one sentence: an exchange argument ("swapping in the earliest-ending interval never hurts") or a stays-ahead argument. If you can't, try to break it with a small counterexample, like coins 1, 3, 4 for 6; if one exists, switch to dynamic programming. Interviewers often ask for exactly this justification.
:::

:::work
Greedy algorithms run a lot of real systems because they're fast and predictable: schedulers pick the job with the earliest deadline, caches evict by a simple rule, compression builds Huffman codes greedily, and load balancers send work to the least busy server. Many of these are heuristics rather than optimal solutions, and that's a deliberate trade: a good-enough answer now beats a perfect one too late.
:::

## Quick check

:::quiz
? What makes an algorithm greedy?
- [ ] It tries every possible answer
- [x] It makes the locally best choice at each step and never reconsiders it
- [ ] It stores the answers to subproblems in a table
> Greedy algorithms commit to one choice per step. Trying everything is brute force; tables of subproblems are dynamic programming.

? With coins 1, 3 and 4, how many coins does "largest coin first" use to pay 6, and what's the best?
- [ ] 2 and 2
- [x] 3 (4 + 1 + 1), but 2 (3 + 3) is possible
- [ ] 2 (4 + 1 + 1)
> The 4 looks best locally, but it leaves 2, which needs two 1s. Greedy coin change is only correct for special coin systems.

? Kadane's algorithm starts the best sum at 0. What goes wrong?
- [x] An array of only negative numbers returns 0, which no subarray sums to
- [ ] Nothing, 0 is a safe starting value
- [ ] It becomes O(n²)
> Starting at 0 allows the empty subarray. Start with the first element instead.

? In the jump game, why does one number, the farthest reach, describe every reachable index?
- [ ] Because you always jump as far as possible
- [x] Reachable indices always form a prefix: if you can reach r, you can reach everything before it
- [ ] Because the array is sorted
> A shorter jump is always allowed, so anything before a reachable index is reachable too.

? In Valid Parenthesis String, why is the low end of the range clamped at 0?
- [ ] To make the loop faster
- [x] A reading whose open count goes negative is already invalid, so those readings are dropped
- [ ] Because stars can't be read as `)`
> A negative count means a `)` with nothing to close. Clamping removes those readings from the range.
:::
