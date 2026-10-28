---
id: greedy-heaps
part: advanced
title: Greedy with heaps
kicker: the best option so far · sort by one key, heap by another · deciding in hindsight · exchange arguments
summary: "Many Hard greedy problems share one shape: options appear over time, and the right move is to take the best one available, or to undo the worst commitment made so far. A heap holds those options. This module covers the two forms of the pattern and the exchange argument that proves them right."
---

## The best option available

The basic [[m:greedy]] module made choices that could be made on the spot: jump as far as possible, cut where the last letter ends. Many harder problems have a greedy answer too, but the best choice depends on options that **keep appearing**: projects become affordable, stations get passed, courses arrive in deadline order. The question each time is "which of the options I have *now* is best?", and a heap answers it in O(log n) while options come and go.

The two shapes below cover most of these problems. In both, the greedy step only makes sense once you've argued that it's safe, so the last part of the module is about that argument.

## Sort by one key, heap by another

Some options become available in an order you can sort by, and are judged by a different quantity. Sort by the first, keep a heap of the second:

- [[p:502]]: projects unlock as capital grows, so sort them by required capital and walk a pointer along that order; the affordable ones go into a max-heap of profits, and each round takes the top.
- [[p:1383]]: a team's efficiency is its least efficient member's, so go through engineers from most to least efficient. Everyone seen so far is efficient enough, and a min-heap keeps the k fastest of them, with their total.
- [[p:1851]] from [[m:intervals]] has the same shape: intervals sorted by start enter a heap ordered by size.

```python run title=Sort_by_one_key,_heap_by_the_other
from heapq import heappop, heappush

def best_capital(k, w, profits, capital):
    projects = sorted(zip(capital, profits))  # sorted by when they become possible
    available, i = [], 0                     # max-heap of profits we can afford now
    for _ in range(k):
        while i < len(projects) and projects[i][0] <= w:
            heappush(available, -projects[i][1])
            i += 1
        if not available:
            break
        w -= heappop(available)              # the best available option
        print(f"capital is now {w}")
    return w

best_capital(3, 0, profits=[3, 2, 9, 4], capital=[0, 0, 4, 6])
```

The pointer moves only forwards and every option is pushed and popped once, so the whole process costs a sort plus O(n log n).

## Deciding in hindsight

The second shape is subtler. Sometimes you can't tell which option to take until later, so you **commit tentatively** and keep your commitments in a heap. When a constraint is broken, you undo the commitment that matters least, which the heap has on top.

- [[p:871]]: the car drives past stations without deciding; when the fuel can't reach the next point, it "had stopped" at the passed station with the most fuel.
- [[p:1642]]: every climb gets a ladder at first; when there are more climbs than ladders, the smallest laddered climb switches to bricks.
- [[p:630]]: courses are taken in deadline order; when one overruns, the longest course taken so far is dropped.

:::viz refuel-stops
:::

```python run title=Commit_now,_undo_the_cheapest_mistake_later
from heapq import heappop, heappush

def furthest(heights, bricks, ladders):
    laddered = []  # the climbs holding ladders: always the largest ones so far
    for i in range(1, len(heights)):
        climb = heights[i] - heights[i - 1]
        if climb <= 0:
            continue
        heappush(laddered, climb)
        if len(laddered) > ladders:
            smallest = heappop(laddered)  # this climb gets bricks after all
            bricks -= smallest
            print(f"building {i}: climb {smallest} switches to bricks, {bricks} left")
            if bricks < 0:
                return i - 1
    return len(heights) - 1

print("furthest building:", furthest([1, 5, 6, 9, 15, 16, 20], bricks=6, ladders=2))
```

The heap is a record of decisions you're still allowed to change. That's what makes these greedy algorithms correct where the obvious on-the-spot rules fail: using a ladder on the first climb, or bricks while they last, or stopping at every station.

## Why the greedy choice is safe

Greedy algorithms are easy to invent and easy to get wrong, so each one needs a reason. The usual reason is an **exchange argument**: take any optimal solution that disagrees with the greedy choice, and show that swapping in the greedy choice doesn't make it worse. Then some optimal solution agrees with greedy at every step.

For [[p:630]], after taking courses in deadline order, suppose the new course overruns its deadline. Some course must go, and every choice leaves the same count. Dropping the longest one makes the total time as small as possible, so every remaining course ends no later than under any other choice: whatever a different choice could take afterwards, this one can take too.

:::key Ask what you'd regret
The useful question is "which commitment would I most regret if the next option turns out to need room?" For refuelling it's having skipped the biggest station, for ladders it's having spent one on a small climb, for courses it's having taken the longest one. The heap keeps that commitment on top.
:::

:::gotcha When greedy is wrong
If choices interact in ways a single swap can't repair, no heap will save a greedy rule. The 0/1 knapsack (take items to maximise value within a weight limit) is the classic case: taking the best value per kilo first can leave a gap no remaining item fills. That's a job for [[m:dp]]. If you can't find an exchange argument, check small cases by brute force before trusting the greedy.
:::

## Complexity

| Problem | Sort | Heap holds | Total |
|---|---|---|---|
| [[p:502]] IPO | by required capital | affordable profits | `O(n log n)` |
| [[p:1383]] team performance | by efficiency | the k fastest speeds | `O(n log n)` |
| [[p:871]] refuelling | stations already sorted | fuel of stations passed | `O(n log n)` |
| [[p:1642]] bricks and ladders | none | climbs holding ladders | `O(n log L)` |
| [[p:630]] courses | by deadline | durations taken | `O(n log n)` |

:::interview
Say the greedy rule and the reason it's safe in one breath: "I'll take courses in deadline order, and when one doesn't fit, drop the longest so far; that keeps the count and leaves the most room." Interviewers often ask "why is that optimal?", and an exchange argument is the answer they're looking for. If the rule decides in hindsight, say so explicitly: "I'll pretend I stopped at the biggest station I passed".
:::

:::work
The same shapes run schedulers and allocators. A job scheduler that admits work in arrival order but evicts the longest-running job when a deadline is at risk is [[p:630]]'s rule. Capacity planners pick the most profitable projects within a budget that grows as projects pay off, and admission controllers keep the k best requests in a heap. When the rules get more complicated, these greedy algorithms become heuristics, and their worst cases are worth measuring.
:::

## Quick check

:::quiz
? In [[p:502]], why sort the projects by required capital but keep their profits in a heap?
- [x] Affordability only grows, so a pointer over the sorted requirements finds new options once; among those, the best profit is wanted each round
- [ ] Sorting by capital alone already puts the best projects first
- [ ] The heap makes the sort unnecessary
> The two keys play different roles: the requirement decides *when* a project becomes available, the profit decides *which* available one to take.

? When does the refuelling greedy decide to stop at a station?
- [ ] Every time it reaches a station
- [ ] When the tank is half empty
- [x] Only when the next point is out of reach, and then it takes the biggest station already passed
> Passing stations without deciding keeps every option open. When fuel runs short, the biggest passed station gives the most range for one stop.

? In [[p:1642]], a new climb arrives and there are more laddered climbs than ladders. Which climb switches to bricks?
- [ ] The new one
- [ ] The first one
- [x] The smallest laddered climb
> Ladders should cover the largest climbs. The min-heap of laddered climbs gives up its smallest, which costs the fewest bricks.

? What does an exchange argument show?
- [ ] That the greedy algorithm runs in O(n log n)
- [x] That swapping the greedy choice into any optimal solution keeps it optimal
- [ ] That every greedy algorithm is correct
> If an optimal solution can always be changed to agree with the greedy choice without getting worse, greedy is optimal step by step.

? Why can't a greedy rule solve the 0/1 knapsack in general?
- [ ] Because it needs a heap
- [x] Because a locally best item can leave capacity that nothing else fills, and no single swap repairs that
- [ ] Because the weights can be zero
> Choices interact through the remaining capacity. Knapsack needs dynamic programming over that capacity.
:::
