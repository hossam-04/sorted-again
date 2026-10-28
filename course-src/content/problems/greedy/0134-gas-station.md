---
id: 134
module: greedy
patterns: [running balance, restart after a deficit]
signature: "def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int"
---

## Task

Gas stations stand around a circular road. At station i you can fill up `gas[i]` units, and driving from station i to station i + 1 (the last one leads back to station 0) uses `cost[i]` units. The tank has no limit and starts empty.

Return the index of the station where you can start and drive the whole circle once, or `-1` if no station works. The tests make sure the answer is unique.

## Constraints

- `1 <= n <= 100_000`, with `n == len(gas) == len(cost)`
- `0 <= gas[i], cost[i] <= 10**4`

```json examples
[
  {"args": [[1, 5, 2], [3, 1, 2]], "out": 1, "why": "From station 1 the tank never runs dry: 5 − 1 = 4, then 4 + 2 − 2 = 4, then 4 + 1 − 3 = 2. Starting at station 0 fails at once (1 − 3), and starting at station 2 fails at station 0 (2 − 2 + 1 − 3)."},
  {"args": [[2, 2], [3, 2]], "out": -1, "why": "There are 4 units of gas around the circle but the drive costs 5, so no start works."},
  {"args": [[4], [4]], "out": 0, "why": "A single station: fill up 4 and drive the loop for 4."}
]
```

```json edge
[
  {"name": "the last station", "args": [[0, 0, 5], [1, 1, 1]], "out": 2},
  {"name": "a restart after a long run", "args": [[3, 0, 0, 4], [1, 2, 2, 1]], "out": 3},
  {"name": "the first station", "args": [[5, 0, 1, 0], [1, 2, 1, 2]], "out": 0},
  {"name": "the most gas isn't the best start", "args": [[2, 3, 0], [0, 4, 1]], "out": 0}
]
```

```python oracle
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        n = len(gas)
        for start in range(n):  # drive the circle from every station
            tank = 0
            for k in range(n):
                i = (start + k) % n
                tank += gas[i] - cost[i]
                if tank < 0:
                    break
            else:
                return start
        return -1
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 20)
    while True:  # the answer must be unique
        gas = [rng.randint(0, 6) for _ in range(n)]
        cost = [rng.randint(0, 6) for _ in range(n)]
        good = 0
        for start in range(n):
            tank, ok = 0, True
            for k in range(n):
                i = (start + k) % n
                tank += gas[i] - cost[i]
                if tank < 0:
                    ok = False
                    break
            good += ok
        if good <= 1:
            return [gas, cost]
```

```python perf
def perf(rng):
    # 99,980 stations that each gain 1, then 10 that each lose 9,999, then 10 more that gain 1. The only
    # valid start is the first of those last 10; every earlier start runs dry only after a long drive.
    gas, cost = [], []
    for diff in [1] * 99_980 + [-9_999] * 10 + [1] * 10:
        if diff > 0:
            c = rng.randint(0, 9_999)
            gas.append(c + 1)
            cost.append(c)
        else:
            g = rng.randint(0, 1)
            gas.append(g)
            cost.append(g + 9_999)
    return [gas, cost]
```

## Hints

1. If the total gas is less than the total cost, no start works. Is the converse true: if there's enough gas overall, does some start always work?
2. Drive from a start and keep the tank's balance. If it goes negative at station i, then no station between the start and i works either: each of them would arrive at i with even less gas.
3. So restart at i + 1 with an empty tank. After one pass, the last restart point is the answer, provided the total is not negative.

## Solution

```python solution time="n" space="1"
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        if sum(gas) < sum(cost):
            return -1  # not enough gas in total, wherever you start
        tank = start = 0
        for i in range(len(gas)):
            tank += gas[i] - cost[i]
            if tank < 0:  # stuck before station i + 1
                start, tank = i + 1, 0  # no station from start to i can work: try the next one
        return start
```

Two facts make one pass enough. First, if driving from `start` runs dry before station i + 1, then starting at any station in between fails too: from `start` you reach each of those stations with a non-negative tank, so starting there instead, empty, can only arrive at i with less. That rules out the whole stretch at once.

Second, when the total gas covers the total cost, the station after the last failure works. Its run to the end of the array never goes negative, and it arrives back at station 0 with that run's balance, B. Every restart happened where the running balance counted from station 0 reached a new low, so on the stretch from station 0 to the start, that balance never dips below its final value, total − B. The tank therefore never drops below B + (total − B) = total ≥ 0. O(n) time, O(1) space.

## Alternatives

### Start right after the lowest point

```python alt time="n" space="1"
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        balance = lowest = 0
        start = 0
        for i in range(len(gas)):
            balance += gas[i] - cost[i]  # the tank if you could start from 0 with credit
            if balance < lowest:
                lowest, start = balance, i + 1  # the deepest dip so far ends at station i
        return start % len(gas) if balance >= 0 else -1
```

Imagine starting at station 0 with unlimited credit and plotting the balance. The best start is right after the balance's lowest point: from there, every later point of the plot is higher, so the real tank never goes below zero.

## Wrong answers

### Never checks the total

```python wrong fails="example" test="Example 2"
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        tank = start = 0
        for i in range(len(gas)):
            tank += gas[i] - cost[i]
            if tank < 0:
                start, tank = i + 1, 0
        return start  # but maybe no start works at all
```

The restarting pass always ends with *some* candidate, even when the circle can't be completed from anywhere. In Example 2 it answers 1, though there's less gas than road. Check the total first, or check the balance at the end.

### Starts at the station with the most gas

```python wrong fails="edge" test="the most gas isn't the best start"
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        if sum(gas) < sum(cost):
            return -1
        return gas.index(max(gas))  # the biggest fill-up, but maybe followed by the worst stretch
```

What matters is gas minus cost along the way, not the gas at one station. With gas `[2, 3, 0]` and cost `[0, 4, 1]`, station 1 has the most gas, but its stretch costs 4, and starting there fails at once.

### Tries every start

```python wrong fails="perf"
class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        n = len(gas)
        for start in range(n):
            tank = 0
            for k in range(n):  # drive until the tank runs dry
                i = (start + k) % n
                tank += gas[i] - cost[i]
                if tank < 0:
                    break
            else:
                return start
        return -1
```

Simulating the drive from every station is correct, and fast when bad starts fail quickly. In the test, almost every start drives most of the circle before failing, about 5 billion steps in all. The restart rule skips every station a failed drive has already passed.
