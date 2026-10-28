---
id: 2034
module: ordered-structures
title: Stock Price Fluctuation
patterns: [heaps with lazy deletion, corrections]
kind: design
class: StockPrice
---

## Task

A feed sends a stock's price as records `(timestamp, price)`. Records can arrive out of order, and a record for a timestamp that was already seen is a **correction**: it replaces the earlier price for that timestamp, which no longer counts at all.

Build a class `StockPrice`:

- `StockPrice()` starts with no records.
- `update(timestamp, price)` records the price at that timestamp, replacing any earlier record for the same timestamp.
- `current()` returns the price at the **latest timestamp** seen so far (the largest, not the most recent call).
- `maximum()` and `minimum()` return the highest and lowest price among the current prices of all timestamps.

`current`, `maximum` and `minimum` are only called after at least one `update`. Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `update`).

## Constraints

- `1 <= timestamp, price <= 10**9`
- At most `100_000` calls in total

```python starter
class StockPrice:
    def __init__(self):
        pass

    def update(self, timestamp: int, price: int) -> None:
        pass

    def current(self) -> int:
        pass

    def maximum(self) -> int:
        pass

    def minimum(self) -> int:
        pass
```

```json examples
[
  {"ops": ["StockPrice", "update", "update", "current", "maximum", "update", "maximum", "minimum"], "args": [[], [1, 50], [3, 40], [], [], [1, 30], [], []], "out": [null, null, null, 40, 50, null, 40, 30], "why": "Timestamp 3 is the latest, so the current price is 40. The record for timestamp 1 is then corrected from 50 to 30, so 50 isn't a price any more: the maximum drops to 40."},
  {"ops": ["StockPrice", "update", "update", "current", "update", "current", "minimum", "maximum"], "args": [[], [10, 7], [4, 9], [], [12, 1], [], [], []], "out": [null, null, null, 7, null, 1, 1, 9], "why": "Records don't arrive in time order: timestamp 4 comes after 10, but 10 stays the latest until 12 arrives."},
  {"ops": ["StockPrice", "update", "update", "update", "current", "maximum", "minimum"], "args": [[], [5, 100], [5, 60], [5, 80], [], [], []], "out": [null, null, null, null, 80, 80, 80], "why": "Three records for the same timestamp: only the last one counts, so all three answers are 80."}
]
```

```json edge
[
  {"name": "one record", "ops": ["StockPrice", "update", "current", "maximum", "minimum"], "args": [[], [1, 1], [], [], []], "out": [null, null, 1, 1, 1]},
  {"name": "a correction to an old timestamp", "ops": ["StockPrice", "update", "update", "update", "current", "maximum"], "args": [[], [1, 5], [2, 6], [1, 9], [], []], "out": [null, null, null, null, 6, 9]},
  {"name": "the minimum corrected upwards", "ops": ["StockPrice", "update", "update", "update", "minimum"], "args": [[], [1, 3], [2, 8], [1, 10], []], "out": [null, null, null, null, 8]},
  {"name": "equal prices at two timestamps", "ops": ["StockPrice", "update", "update", "update", "minimum", "maximum"], "args": [[], [1, 4], [2, 4], [1, 7], [], []], "out": [null, null, null, null, 4, 7]},
  {"name": "the maximum corrected away twice", "ops": ["StockPrice", "update", "update", "update", "update", "maximum", "minimum"], "args": [[], [1, 9], [2, 5], [1, 1], [2, 2], [], []], "out": [null, null, null, null, null, 2, 1]},
  {"name": "a correction back to an old price", "ops": ["StockPrice", "update", "update", "update", "update", "maximum"], "args": [[], [1, 9], [2, 3], [1, 2], [1, 9], []], "out": [null, null, null, null, null, 9]},
  {"name": "large values", "ops": ["StockPrice", "update", "update", "current", "minimum"], "args": [[], [1000000000, 1000000000], [1, 1], [], []], "out": [null, null, null, 1000000000, 1]}
]
```

```python oracle
class StockPrice:
    def __init__(self):
        self.prices = {}

    def update(self, timestamp: int, price: int) -> None:
        self.prices[timestamp] = price

    def current(self) -> int:
        return self.prices[max(self.prices)]

    def maximum(self) -> int:
        return max(self.prices.values())

    def minimum(self) -> int:
        return min(self.prices.values())
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    times = 4 if size == "small" else 60
    prices = 6 if size == "small" else 10**9
    ops, args = ["StockPrice", "update"], [[], [rng.randint(1, times), rng.randint(1, prices)]]
    for _ in range(calls):
        r = rng.random()
        if r < 0.5:
            ops.append("update")
            args.append([rng.randint(1, times), rng.randint(1, prices)])
        else:
            ops.append(rng.choice(["current", "maximum", "minimum"]))
            args.append([])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 40,000 records, a quarter of them corrections, then 30,000 rounds of asking for the maximum and the minimum.
    ops, args = ["StockPrice"], [[]]
    for t in range(1, 40_001):
        ts = rng.randint(1, t - 1) if t > 1 and rng.random() < 0.25 else t
        ops.append("update")
        args.append([ts, rng.randint(1, 10**9)])
    for _ in range(30_000):
        ops += ["maximum", "minimum"]
        args += [[], []]
    return {"ops": ops, "args": args}
```

## Hints

1. A dict from timestamp to price handles corrections and `current` (keep the largest timestamp seen). The hard part is the maximum and minimum when prices can be replaced.
2. A heap gives the maximum quickly, but it can't remove an arbitrary old price when a correction arrives. Can you leave the old price in the heap and recognise it later?
3. Push `(price, timestamp)` on every update. When reading the top, check it against the dict: if that timestamp's current price is different, the entry is out of date. Pop it and look again. Use one max-heap (negated prices) and one min-heap.

## Solution

```python solution time="log n" space="n"
class StockPrice:
    def __init__(self):
        self.price = {}  # timestamp -> its current price
        self.latest = 0
        self.high = []   # (-price, timestamp): a max-heap, possibly holding outdated entries
        self.low = []    # (price, timestamp): a min-heap, likewise

    def update(self, timestamp: int, price: int) -> None:
        self.price[timestamp] = price
        self.latest = max(self.latest, timestamp)
        heappush(self.high, (-price, timestamp))
        heappush(self.low, (price, timestamp))

    def current(self) -> int:
        return self.price[self.latest]

    def maximum(self) -> int:
        while -self.high[0][0] != self.price[self.high[0][1]]:  # corrected since it was pushed
            heappop(self.high)
        return -self.high[0][0]

    def minimum(self) -> int:
        while self.low[0][0] != self.price[self.low[0][1]]:
            heappop(self.low)
        return self.low[0][0]
```

A correction should remove the old price from the heaps, but a heap can only remove its top cheaply. So the old entry stays where it is, and the heap is cleaned **lazily**: an entry is only checked when it reaches the top. Each entry carries its timestamp, and the dict says whether that timestamp still has that price. If it doesn't, the entry is out of date, and popping it costs nothing that wasn't paid when it was pushed.

Every update pushes one entry into each heap, and each entry is popped at most once, so the work is O(log n) per update, amortised over the calls; `current` is O(1). The heaps may hold out-of-date entries, so their size is the number of updates, not the number of timestamps.

## Alternatives

### A sorted list of prices

```python alt time="n" space="n"
class StockPrice:
    def __init__(self):
        self.price = {}
        self.latest = 0
        self.sorted_prices = []  # every current price, in order, with repeats

    def update(self, timestamp: int, price: int) -> None:
        if timestamp in self.price:  # remove the price being corrected
            old = self.price[timestamp]
            del self.sorted_prices[bisect_left(self.sorted_prices, old)]
        self.price[timestamp] = price
        insort(self.sorted_prices, price)
        self.latest = max(self.latest, timestamp)

    def current(self) -> int:
        return self.price[self.latest]

    def maximum(self) -> int:
        return self.sorted_prices[-1]

    def minimum(self) -> int:
        return self.sorted_prices[0]
```

Keeping every current price in a sorted list makes the maximum and minimum free to read, and a correction removes exactly one copy of the old price (`bisect_left` finds one; which copy doesn't matter). Inserting and deleting shift part of the list, O(n) each, but as fast block moves. With LeetCode's `sortedcontainers.SortedList`, which isn't part of standard Python, each update would be O(log n).

## Wrong answers

### Never notices corrections

```python wrong fails="example" test="Example 1"
class StockPrice:
    def __init__(self):
        self.price = {}
        self.latest = 0
        self.high, self.low = [], []

    def update(self, timestamp: int, price: int) -> None:
        self.price[timestamp] = price
        self.latest = max(self.latest, timestamp)
        heappush(self.high, -price)  # the old price for this timestamp stays in both heaps
        heappush(self.low, price)

    def current(self) -> int:
        return self.price[self.latest]

    def maximum(self) -> int:
        return -self.high[0]

    def minimum(self) -> int:
        return self.low[0]
```

The heaps hold every price ever recorded, including the ones that were corrected away. In Example 1, the price 50 at timestamp 1 is replaced by 30, but 50 stays at the top of the max-heap and is reported as the maximum. Store the timestamp with each price so an outdated entry can be recognised.

### Takes the most recent call as the current price

```python wrong fails="example" test="Example 2"
class StockPrice:
    def __init__(self):
        self.price = {}
        self.last_price = None

    def update(self, timestamp: int, price: int) -> None:
        self.price[timestamp] = price
        self.last_price = price  # the last record received, not the latest timestamp

    def current(self) -> int:
        return self.last_price

    def maximum(self) -> int:
        return max(self.price.values())

    def minimum(self) -> int:
        return min(self.price.values())
```

Records arrive out of order, so the last one received may describe an earlier moment. In Example 2 the record for timestamp 4 arrives after the one for 10, and this reports 9 as the current price instead of 7. Track the largest timestamp seen.

### Scans every price for each maximum and minimum

```python wrong fails="perf"
class StockPrice:
    def __init__(self):
        self.price = {}
        self.latest = 0

    def update(self, timestamp: int, price: int) -> None:
        self.price[timestamp] = price
        self.latest = max(self.latest, timestamp)

    def current(self) -> int:
        return self.price[self.latest]

    def maximum(self) -> int:
        return max(self.price.values())  # looks at every timestamp, every call

    def minimum(self) -> int:
        return min(self.price.values())
```

Correct, and corrections are trivial: just overwrite the dict. But each `maximum` and `minimum` reads every price. In the test, 60,000 such calls over about 32,000 timestamps make nearly 2 billion reads. The lazy heaps answer each call from the top.
