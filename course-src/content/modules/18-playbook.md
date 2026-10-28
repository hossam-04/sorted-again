---
id: playbook
title: Interview playbook
kicker: the 45-minute plan · clarify · examples and constraints · brute force first · spotting the pattern · testing by hand · when you're stuck
summary: "Knowing the algorithms is half of a coding interview. The other half is process: asking the right questions, choosing a target complexity, talking through a plan, writing clean code and testing it before the interviewer does. This module is that process, step by step, with the phrases to use along the way."
---

## The 45-minute plan

A typical coding interview gives you about 45 minutes for one problem, sometimes two shorter ones. A rough budget:

| Minutes | Phase | What you produce |
|---|---|---|
| 0–5 | Clarify | the exact task, the input limits, the edge cases that matter |
| 5–10 | Examples and a plan | a worked example, a brute force, then a better idea and its complexity |
| 10–30 | Code | clean, working code, explained as you write it |
| 30–40 | Test | a walk through an example by hand, then the edge cases, fixing what you find |
| 40–45 | Wrap up | the time and space complexity, trade-offs, follow-up questions |

The common failure isn't running out of algorithms. It's starting to code at minute 2 on a misunderstood problem, or finishing at minute 44 with no time to test.

## Clarify

Restate the problem in your own words, then ask about whatever the statement leaves open:

- **Input:** how big can it get? Can it be empty? Are there negative numbers, zeros, duplicates? Is it sorted?
- **Output:** indices or values? Any valid answer, or a specific one? In what order?
- **Rules:** may I change the input? Is there a memory limit? What if there's no answer?

Each answer can change the algorithm. "The array is sorted" suggests two pointers or binary search; "n is at most 20" suggests trying every subset is fine.

## Examples, constraints and a target

Work through a small example by hand, and invent a second one that's a little awkward: duplicates, a single element, the answer at the very end. Then turn the size limit into a target complexity, using the table from [[m:big-o]]: about 10⁵ elements means O(n log n) or better, about 20 means exponential is fine.

## Brute force first, out loud

Describe the simplest correct approach and its complexity before anything clever: "Checking every pair works and is O(n²). With n up to 10⁵, that's too slow, so I need something closer to O(n log n)." This shows you can solve the problem, gives you a fallback, and often points at the fix: the brute force's repeated work is exactly what a better data structure removes.

## Spotting the pattern

Most interview problems are a known pattern in disguise. Some signals to listen for:

| When you see… | Think… | Module |
|---|---|---|
| "have I seen this before?", counting, grouping | a hash map or set | [[m:arrays]] |
| a sorted array, pairs or triples with a target sum | two pointers | [[m:two-pointers]] |
| the longest or shortest contiguous run with a condition | a sliding window | [[m:sliding-window]] |
| "next greater", matching brackets, undo | a stack, often monotonic | [[m:stacks]] |
| sorted data, or "the smallest value that works" | binary search, maybe on the answer | [[m:binary-search]] |
| linked nodes, a cycle, the middle | fast and slow pointers | [[m:linked-lists]] |
| hierarchy, recursion on the left and right subtrees | tree DFS or BFS | [[m:trees]] |
| prefixes, autocomplete, a dictionary of words | a trie | [[m:tries]] |
| the k largest or smallest, a running median, merging sorted lists | a heap | [[m:heaps]] |
| all combinations, permutations, subsets, placements | backtracking | [[m:backtracking]] |
| connections, dependencies, a grid of regions | BFS, DFS, topological sort, union-find | [[m:graphs]] |
| overlapping ranges, meetings | sort by start, then sweep | [[m:intervals]] |
| a choice that's always safe to make now | greedy, with a reason it's safe | [[m:greedy]] |
| "how many ways", "the minimum cost", choices that build on each other | dynamic programming | [[m:dp]] |
| single bits, pairs that cancel, digits | bit tricks and arithmetic | [[m:bits-math]] |

And from the advanced part:

| When you see… | Think… | Module |
|---|---|---|
| "the k-th smallest so far", floor and ceiling, removals from a heap | a sorted list, or a heap with lazy deletion | [[m:ordered-structures]] |
| options that appear over time, "undo the worst choice" | greedy with a heap | [[m:greedy-heaps]] |
| range sums or minimums while values change, "how many smaller before me" | a Fenwick or segment tree | [[m:range-queries]] |
| ancestors k levels up, many path queries on a tree, k up to 10¹⁰ steps | binary lifting | [[m:binary-lifting]] |
| a pattern in text, borders, periods, repeated substrings | the prefix function, Z-function or rolling hash | [[m:string-matching]] |
| all pairs of distances, edge costs 0 or 1, links whose loss splits a network | Floyd–Warshall, 0-1 BFS, low-link values | [[m:advanced-graphs]] |
| n ≤ 20 items, a tree with "not both", "count numbers up to 10¹⁸" | bitmask, tree or digit DP | [[m:advanced-dp]] |
| "modulo 10⁹ + 7", primes, multiples, huge powers | modular arithmetic and sieves | [[m:number-theory]] |

The patterns cheat sheet in the sidebar has a code template for each one.

## A talk track

Interviewers can't give credit for thinking they can't hear. A few sentences per phase are enough:

- **Clarify:** "Just to confirm: the input can contain duplicates, and I should return indices, not values?"
- **Plan:** "The brute force is O(n²). Since the array is sorted, two pointers can find the pair in one pass, O(n) time and O(1) space. Shall I go ahead with that?"
- **Code:** "This loop keeps the invariant that everything left of `lo` is too small." Name what each variable means, not what the syntax does.
- **Test:** "Let me trace the first example… and now the empty list, which returns 0 here."
- **Wrap up:** "It's O(n log n) because of the sort; the scan itself is linear. If the input were already sorted, it would be O(n)."

## Writing the code

Write code you'd be happy to review: clear names, small helper functions for repeated steps, no cleverness that needs a comment to decode. Python's standard library is fair game, and using it well is a plus:

```python run title=Idioms_that_save_time
from collections import Counter, defaultdict, deque
import heapq
from bisect import bisect_left

words = ["stop", "pots", "cat", "tops", "act", "dog"]
groups = defaultdict(list)                  # no "if key not in" dance
for w in words:
    groups["".join(sorted(w))].append(w)
print(list(groups.values()))

print(Counter("mississippi").most_common(2))  # counting in one line
print(heapq.nlargest(3, [5, 1, 9, 3, 7]))     # the k largest, with a heap
print(bisect_left([1, 3, 3, 5, 8], 3))        # where 3 would go in sorted order

for i, (a, b) in enumerate(zip("abc", "xyz")):  # index, and two sequences side by side
    print(i, a, b)

queue = deque([1, 2])
queue.append(3)
print(queue.popleft(), "then", list(queue))   # O(1) at both ends
print(min(["kiwi", "fig", "banana"], key=len), sorted([(2, "b"), (1, "z"), (2, "a")]))
```

A few habits help too: use `float("inf")` or `math.inf` as a starting minimum, unpack tuples (`r, c = cell`), prefer `for x in items` to indexing when you don't need the index, and remember that `sorted(...)` returns a new list while `.sort()` sorts in place and returns `None`.

## Testing by hand

Don't announce that you're done; show it. Trace your code on the small example, line by line, writing down the variables. Then try the edge cases:

- the smallest inputs: empty, one element, two elements;
- all elements equal; already sorted; sorted backwards;
- negative numbers and zeros; duplicates;
- the answer at the very start or the very end; no answer at all;
- the boundaries of every loop: does it stop one step early or one step late?
- for graphs, a single node, a cycle, and pieces that aren't connected;
- the largest input: does anything do hidden O(n) work inside a loop?

Turning those into quick asserts is the fastest way to check them when you can run code:

```python run title=Edge_cases_as_asserts
def max_profit(prices):
    best, lowest = 0, float("inf")
    for p in prices:
        lowest = min(lowest, p)
        best = max(best, p - lowest)
    return best

assert max_profit([3, 8, 2, 6, 9, 4]) == 7   # the example: buy at 2, sell at 9
assert max_profit([]) == 0                    # empty
assert max_profit([5]) == 0                   # one price
assert max_profit([9, 7, 4, 1]) == 0          # only falling: never sell at a loss
assert max_profit([3, 3, 3]) == 0             # all equal
assert max_profit([1, 2]) == 1                # the answer at the very end
print("all edge cases pass")
```

## When you're stuck

Being stuck for a minute is normal, and interviewers expect it. What matters is how you get unstuck:

- **Solve a smaller case by hand** and watch what you do. Your hands often find the algorithm before your head does.
- **Simplify the problem.** What if the array were sorted? What if there were no duplicates? Solve that, then add the complication back.
- **Find the slow step** in the brute force and ask which data structure makes it fast: a set for lookups, a heap for "the smallest so far", a prefix sum for range totals.
- **Go through the patterns** in the table above and ask whether each one fits.
- **Say where you are.** "I have an O(n²) solution, and I think the repeated work is in this inner loop" invites a useful hint. Silence doesn't.

If you're out of ideas, code the brute force cleanly. A working O(n²) solution with a clear explanation of what you'd improve beats an unfinished clever one.

## After the code

State the time and space complexity and what dominates them. Mention trade-offs you made, such as memory for speed, or modifying the input. Expect follow-ups: what if the input doesn't fit in memory, what if it arrives as a stream, what if this runs a million times a second? Each one is a variation on what you've built: a different data structure, a cache, or a precomputation.

:::interview
Interviewers usually score four things: problem solving (did you find a good approach, and could you justify it?), coding (is the code correct, clear and idiomatic?), communication (could they follow your reasoning?) and testing (did you find your own bugs?). A correct solution that you explained and tested scores better than a faster one delivered in silence.
:::

:::work
The same skills carry over to everyday engineering. In code review, ask "what happens when this list has a million entries?", and look for a hidden loop inside a visible one. When choosing data structures in production, start with the built-ins: a dict, a set, a sorted list with `bisect`, a heap, before reaching for anything exotic, and remember that much of the time the right structure is a database index, which is a B-tree doing binary search for you. Above all, measure before optimising: profilers often find the slow part somewhere you didn't expect.
:::

## Which pattern?

:::quiz
? You get a list of daily stock prices and must find, for each day, how many days pass until a higher price. Which pattern fits best?
- [ ] Sliding window
- [x] Monotonic stack
- [ ] Binary search
> Each new price resolves every lower price still waiting for a higher one, which is a monotonic stack: O(n) overall.

? Find the shortest contiguous stretch of a list whose sum is at least a target, with all numbers positive.
- [x] Sliding window
- [ ] Backtracking
- [ ] Heap
> With positive numbers, growing the window raises the sum and shrinking it lowers the sum, so two forward-moving pointers find the best window in O(n).

? Courses have prerequisites. Find an order in which to take them all, or report that it's impossible.
- [ ] Dijkstra's algorithm
- [x] Topological sort
- [ ] Union-find
> Prerequisites form a directed graph. A topological order exists exactly when there's no cycle, and Kahn's algorithm finds one or detects the cycle.

? Return every way to place n queens on an n × n board so that none attack each other.
- [ ] Greedy
- [ ] Dynamic programming
- [x] Backtracking
> The task asks for every valid placement, so the search has to try choices and undo them. Pruning the attacked squares keeps it fast enough.

? A server receives a stream of numbers and must report the median at any moment.
- [x] Two heaps
- [ ] Sorting after every number
- [ ] A trie
> A max-heap holds the smaller half and a min-heap the larger half, so the median is at the top: O(log n) per number instead of a sort each time.

? Count the ways to climb a staircase of n steps taking 1 or 2 steps at a time.
- [ ] Two pointers
- [x] Dynamic programming
- [ ] Breadth-first search
> The number of ways to reach step n is the ways to reach n − 1 plus the ways to reach n − 2: small overlapping subproblems.

? Find the minimum eating speed that lets you finish all the piles within h hours.
- [ ] Heap
- [x] Binary search on the answer
- [ ] Greedy
> "Can I finish at speed k?" is false and then true as k grows, so binary search finds the switch point.

? Given a list of meetings, find the fewest rooms needed so that no two meetings in a room overlap.
- [ ] Union-find
- [x] Sort the start and end times and sweep, or a heap of end times
- [ ] Two pointers on the unsorted list
> The answer is the largest number of meetings running at the same moment. A sweep over sorted starts and ends finds it, and so does a heap of the rooms' end times.
:::
