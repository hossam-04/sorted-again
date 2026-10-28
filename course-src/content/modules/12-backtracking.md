---
id: backtracking
title: Backtracking
kicker: choose · explore · un-choose · pruning · duplicates · grids and boards
summary: "Backtracking explores every way of making a sequence of choices, one choice at a time: try an option, explore what follows from it, then undo it and try the next. It lists subsets, permutations and combinations, and with good pruning it solves puzzles like N-Queens long before trying every possibility."
---

## The template: choose, explore, un-choose

Many problems ask for *every* arrangement of something: every subset, every ordering, every way to reach a sum. Each answer is built by a sequence of decisions, and all those sequences together form a **decision tree**. Backtracking is a depth-first walk of that tree that keeps a single partial answer, `path`, and changes it in place:

```python
def backtrack(state):
    if is_complete(state):
        out.append(path[:])  # record a copy of the answer
        return
    for option in options(state):
        path.append(option)                    # choose
        backtrack(next_state(state, option))   # explore
        path.pop()                             # un-choose: undo exactly what "choose" did
```

The un-choose step is what makes one shared `path` work for the whole tree: after exploring a branch, everything is back the way it was before the choice, ready for the next option.

For subsets, the decision at level i is whether to take `nums[i]`. The tree below shows every call, labelled with `path` at the moment of the call; the leaves are the subsets:

:::viz subsets-decision-tree
:::

:::gotcha Recording `path` instead of a copy
`out.append(path)` stores a reference to the one `path` list, not its current contents. Every entry of `out` is then the same list, and since backtracking undoes every choice, that list is empty by the end. Record a snapshot: `out.append(path[:])` or `out.append(list(path))`.
:::

```python run title=path_versus_a_copy_of_path
def subsets(nums, copy):
    out, path = [], []

    def backtrack(i):
        if i == len(nums):
            out.append(path[:] if copy else path)
            return
        path.append(nums[i])
        backtrack(i + 1)
        path.pop()
        backtrack(i + 1)

    backtrack(0)
    return out

wrong = subsets([1, 2], copy=False)
print("append(path):    ", wrong)
print("all the same list?", all(x is wrong[0] for x in wrong))
print("append(path[:]): ", subsets([1, 2], copy=True))
```

## Two ways to build subsets

The tree above makes a yes-or-no decision per number: **include or skip**. Another shape asks a different question at each level, *which number comes next?*, and only allows numbers after the last one taken. In this **loop-from-start** shape every node is a subset, not just the leaves, and it's the shape that combination problems use ([[p:78]] shows both).

```python run title=Include_or_skip_versus_loop_from_start
def include_or_skip(nums):
    out, path = [], []
    def backtrack(i):
        if i == len(nums):
            out.append(path[:])
            return
        path.append(nums[i])
        backtrack(i + 1)  # with nums[i]
        path.pop()
        backtrack(i + 1)  # without it
    backtrack(0)
    return out

def loop_from_start(nums):
    out, path = [], []
    def backtrack(start):
        out.append(path[:])  # every node is a subset
        for j in range(start, len(nums)):
            path.append(nums[j])
            backtrack(j + 1)  # only numbers after j may follow
            path.pop()
    backtrack(0)
    return out

print(include_or_skip([1, 2, 3]))
print(loop_from_start([1, 2, 3]))
```

Both produce the 8 subsets, in different orders. Moving only forward is what keeps each subset from being built in several orders.

## Orderings, sums and repeats

Three small changes to the loop give the other classic families:

- **Permutations** ([[p:46]]): order matters, so every level loops over *all* the numbers and skips those already used. A `used` list makes that check O(1); un-choosing clears the mark.
- **Combinations with reuse** ([[p:39]]): recurse with `j` instead of `j + 1`, so the same candidate may be chosen again, but never one before it.
- **Each item at most once** ([[p:40]]): recurse with `j + 1`.

```python run title=Permutations_with_a_used_list
def permute(nums):
    out, path, used = [], [], [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):
            out.append(path[:])
            return
        for i, x in enumerate(nums):
            if used[i]:
                continue
            used[i] = True  # choose
            path.append(x)
            backtrack()     # explore
            path.pop()      # un-choose: undo both changes
            used[i] = False

    backtrack()
    return out

for p in permute(["a", "b", "c"]):
    print("".join(p))
```

When the input has **repeated values**, equal choices at the same level produce the same answers again. Sort first, so equal values sit side by side, then skip a value that equals the one tried just before it *in the same loop*:

```python run title=Skipping_duplicates_in_the_same_loop
def subsets_with_dup(nums):
    nums = sorted(nums)
    out, path = [], []

    def backtrack(start):
        out.append(path[:])
        for j in range(start, len(nums)):
            if j > start and nums[j] == nums[j - 1]:
                continue  # this value was already tried at this level
            path.append(nums[j])
            backtrack(j + 1)
            path.pop()

    backtrack(0)
    return out

print(subsets_with_dup([2, 1, 2]))
```

The test is `j > start`, not `j > 0`: a second 2 may still be chosen one level deeper, which is how `[1, 2, 2]` and `[2, 2]` appear. [[p:90]] and [[p:40]] both rely on this, and both show what goes wrong with `j > 0`.

## Pruning

The decision tree is usually exponential, so the most useful thing you can do is avoid walking parts of it. **Pruning** means checking, as early as possible, whether a branch can still lead to an answer, and abandoning it the moment it can't:

- in [[p:39]], with sorted candidates, the loop stops at the first candidate larger than what's left: every later one is too big as well;
- in [[p:131]], a piece that isn't a palindrome ends the branch, and with it every way of cutting the rest;
- in [[p:79]], counting letters first rules out boards that can't hold the word at all.

Generating every complete candidate and filtering at the end gives the same answers, but it pays for every dead branch in full. Several problems in this module include that version as a wrong answer, and it fails the performance test.

## Grids: mark and unmark

On a grid, the choices are the neighbouring cells. In [[p:79]] a path through the board spells a word and may not reuse a cell, so the cell is **marked** while it's on the path and **unmarked** when the search backs out. Overwriting the letter with `#` and restoring it afterwards is the same choose and un-choose, with the board itself holding the state. Forgetting to unmark is a classic bug: cells used by a failed path stay blocked for every later path. [[p:212]] in the tries module runs the same search for thousands of words at once.

## Boards: N-Queens

[[p:51]] places n queens so that none attacks another. Two queens in a row attack each other, so every solution has exactly one queen per row: place them row by row, trying each column. A square is safe if its column and both of its diagonals are free. On a diagonal running down to the right, `row − column` is the same for every square; on one running down to the left, `row + column` is. Three sets turn the safety check into three O(1) lookups.

:::viz n-queens-board
:::

Each placement adds to all three sets, and taking the queen back removes from all three. When a row has no safe square left, the search returns to the previous row and moves that queen on. Try n = 3, which has no solution, to watch the search give up entirely.

## Complexity

| Problem | Answers | Time |
|---|---|---|
| Subsets of n items | `2ⁿ` | `O(n · 2ⁿ)` |
| Permutations of n items | `n!` | `O(n · n!)` |
| Combinations of k from n | `C(n, k)` | `O(k · C(n, k))` |
| Letter combinations of n digits | up to `4ⁿ` | `O(n · 4ⁿ)` |
| Word search, word of length L | one yes or no | `O(m·n · 3^L)` worst case |
| N-Queens | 724 for n = 10 | bounded by `O(n!)`, far less with pruning |

When every complete path is an answer, as in subsets and permutations, the time can't be smaller than the output. When most paths are dead ends, the pruning decides the real cost. The extra space is the recursion depth plus `path`, usually O(n), not counting the output.

:::interview
Draw the decision tree before coding: what is decided at each level, and what are the options? Then write the template and say what "choose" and "un-choose" do. State how you avoid duplicates (moving forward with a start index, or sorting and skipping equal values in the same loop), where you prune, and that the copy into the output is `path[:]`. For the complexity, count the leaves of the tree and the work per leaf.
:::

:::work
Backtracking turns up wherever a configuration must satisfy constraints: solvers for Sudoku-like puzzles, timetables and seating plans, regex engines trying alternative matches, and test generators enumerating combinations of options. For large instances, real systems use constraint solvers or SAT solvers, which are backtracking with very clever pruning and learning. Knowing the basic search tells you what those tools do, and when a brute-force enumeration is still small enough to just run.
:::

## Quick check

:::quiz
? In the backtracking template, why must every choice be undone after exploring it?
- [ ] To free memory
- [x] So the shared `path` and other state are back as they were before the next option is tried
- [ ] Because Python lists can't be copied
> One `path` is shared by the whole search. Undoing each change restores the state for the next sibling branch.

? `out.append(path)` runs at every leaf of a subsets search. What does `out` hold at the end?
- [ ] Every subset, correctly
- [x] Several references to the same list, which is empty by the end
- [ ] Only the last subset found
> Appending `path` stores the list object itself. All entries are the same object, and backtracking pops it back to empty. Append `path[:]`.

? Combination Sum allows reusing a candidate; Combination Sum II doesn't. What's the difference in code?
- [x] The recursive call passes `j` in the first and `j + 1` in the second
- [ ] The first sorts the candidates and the second doesn't
- [ ] The second needs a `used` list like permutations
> Passing `j` lets the next level pick the same candidate again; `j + 1` moves past it for good.

? With sorted input, why is the duplicate check `j > start and nums[j] == nums[j - 1]` rather than `j > 0 and ...`?
- [ ] They're equivalent
- [x] Only repeats within the same loop should be skipped; a deeper level may still take another copy
- [ ] `j > 0` would crash on the first element
> Skipping at every depth would forbid taking two equal numbers at all, losing answers like `[2, 2]`.

? In N-Queens, which value is the same for every square on a diagonal running down to the left?
- [ ] `row − column`
- [x] `row + column`
- [ ] `row × column`
> Moving down-left adds 1 to the row and subtracts 1 from the column, so their sum stays constant. On down-right diagonals, the difference does.
:::
