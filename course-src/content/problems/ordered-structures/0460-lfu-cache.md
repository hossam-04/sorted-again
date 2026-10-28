---
id: 460
module: ordered-structures
patterns: [frequency buckets of ordered dicts, minimum frequency]
kind: design
class: LFUCache
---

## Task

Build a class `LFUCache`: a key-value cache with a fixed capacity that, when full, throws out the **least frequently used** key. Among keys used equally often, it throws out the one whose last use is the oldest.

- `LFUCache(capacity)` creates an empty cache that holds at most `capacity` keys.
- `get(key)` returns the value stored for `key`, or -1 if the key isn't in the cache. A successful `get` is a use of that key.
- `put(key, value)` stores `value` for `key`. Updating an existing key replaces its value and is a use. Adding a new key to a full cache first evicts the least frequently used key (the least recently used among ties). A new key starts with one use: the `put` itself.

Both methods must run in O(1) average time. A key's use count is forgotten once it's evicted. Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `put`).

## Constraints

- `1 <= capacity <= 10_000`
- `0 <= key <= 10**5`, `0 <= value <= 10**9`
- At most `200_000` calls in total

```python starter
class LFUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        pass

    def put(self, key: int, value: int) -> None:
        pass
```

```json examples
[
  {"ops": ["LFUCache", "put", "put", "get", "get", "put", "get", "get", "put", "get", "get"], "args": [[2], [5, 50], [6, 60], [5], [5], [7, 70], [6], [7], [8, 80], [7], [5]], "out": [null, null, null, 50, 50, null, -1, 70, null, -1, 50], "why": "Key 6 was used once and key 5 three times, so 6 goes first. Later key 7, used twice, is evicted before key 5, used three times."},
  {"ops": ["LFUCache", "put", "put", "put", "get", "get", "get", "put", "get", "get"], "args": [[3], [1, 10], [2, 20], [3, 30], [1], [2], [3], [4, 40], [1], [4]], "out": [null, null, null, null, 10, 20, 30, null, -1, 40], "why": "All three keys are used twice. The tie goes against key 1, whose last use is the oldest."},
  {"ops": ["LFUCache", "put", "put", "put", "put", "get", "get"], "args": [[2], [1, 1], [2, 2], [1, 100], [3, 3], [2], [1]], "out": [null, null, null, null, null, -1, 100], "why": "Updating key 1 counts as a use, so key 2 is the least frequently used when key 3 arrives."}
]
```

```json edge
[
  {"name": "capacity one", "ops": ["LFUCache", "put", "get", "put", "get", "get"], "args": [[1], [1, 1], [1], [2, 2], [1], [2]], "out": [null, null, 1, null, -1, 2]},
  {"name": "get on an empty cache", "ops": ["LFUCache", "get"], "args": [[2], [9]], "out": [null, -1]},
  {"name": "a failed get changes nothing", "ops": ["LFUCache", "put", "put", "get", "put", "get", "get"], "args": [[2], [1, 1], [2, 2], [3], [4, 4], [1], [2]], "out": [null, null, null, -1, null, -1, 2]},
  {"name": "a new key starts at one use", "ops": ["LFUCache", "put", "get", "get", "put", "put", "get", "get", "get"], "args": [[2], [1, 1], [1], [1], [2, 2], [3, 3], [2], [3], [1]], "out": [null, null, 1, 1, null, null, -1, 3, 1]},
  {"name": "the rarest group empties", "ops": ["LFUCache", "put", "put", "get", "get", "get", "put", "get", "get", "get"], "args": [[2], [1, 1], [2, 2], [1], [2], [1], [3, 3], [2], [3], [1]], "out": [null, null, null, 1, 2, 1, null, -1, 3, 1]},
  {"name": "a value of zero", "ops": ["LFUCache", "put", "get"], "args": [[1], [0, 0], [0]], "out": [null, null, 0]},
  {"name": "an evicted key starts over", "ops": ["LFUCache", "put", "get", "get", "put", "put", "put", "get"], "args": [[1], [1, 1], [1], [1], [2, 2], [1, 5], [3, 3], [1]], "out": [null, null, 1, 1, null, null, null, -1]}
]
```

```python oracle
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = {}  # key -> [value, uses, time of last use]
        self.clock = 0

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.clock += 1
        entry = self.data[key]
        entry[1] += 1
        entry[2] = self.clock
        return entry[0]

    def put(self, key: int, value: int) -> None:
        self.clock += 1
        if key in self.data:
            entry = self.data[key]
            entry[0] = value
            entry[1] += 1
            entry[2] = self.clock
            return
        if len(self.data) == self.capacity:
            victim = min(self.data, key=lambda k: (self.data[k][1], self.data[k][2]))
            del self.data[victim]
        self.data[key] = [value, 1, self.clock]
```

```python gen
def gen(rng, size):
    capacity = rng.randint(1, 3) if size == "small" else rng.randint(2, 20)
    calls = rng.randint(1, 12) if size == "small" else rng.randint(20, 300)
    keys = range(0, 5) if size == "small" else range(0, 40)
    ops, args = ["LFUCache"], [[capacity]]
    for _ in range(calls):
        if rng.random() < 0.5:
            ops.append("put")
            args.append([rng.choice(keys), rng.randint(0, 100)])
        else:
            ops.append("get")
            args.append([rng.choice(keys)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # Capacity 10,000: fill the cache, then 25,000 rounds of reading a cached key and adding a new one,
    # so every round ends in an eviction.
    ops, args = ["LFUCache"], [[10_000]]
    cached = list(range(10_000))
    for k in cached:
        ops.append("put")
        args.append([k, k])
    for k in range(10_000, 35_000):
        ops += ["get", "put"]
        args += [[rng.randint(k - 10_000, k - 1)], [k % 100_001, k]]
    return {"ops": ops, "args": args}
```

## Hints

1. A dict finds a key's value and use count in O(1). The hard part is finding the key to evict: the smallest count, and among those, the oldest use.
2. Group the keys by use count. Inside one group, keep them in order of last use, like an LRU cache: an `OrderedDict` per count does both.
3. Track the smallest count that has keys, `min_count`. A use moves a key from group c to group c + 1; if group c empties and c was `min_count`, the minimum becomes c + 1. A new key always makes the minimum 1.

## Solution

```python solution time="1" space="capacity"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.value = {}                      # key -> value
        self.count = {}                      # key -> number of uses
        self.group = defaultdict(OrderedDict)  # count -> keys with that count, oldest use first
        self.min_count = 0

    def _use(self, key):  # move key from its count's group to the next one
        c = self.count[key]
        del self.group[c][key]
        if not self.group[c]:
            del self.group[c]
            if self.min_count == c:
                self.min_count = c + 1
        self.count[key] = c + 1
        self.group[c + 1][key] = None  # appended: the newest use in its group

    def get(self, key: int) -> int:
        if key not in self.value:
            return -1
        self._use(key)
        return self.value[key]

    def put(self, key: int, value: int) -> None:
        if key in self.value:
            self.value[key] = value
            self._use(key)
            return
        if len(self.value) == self.capacity:
            victim, _ = self.group[self.min_count].popitem(last=False)  # rarest, then oldest
            if not self.group[self.min_count]:
                del self.group[self.min_count]
            del self.value[victim], self.count[victim]
        self.value[key] = value
        self.count[key] = 1
        self.group[1][key] = None
        self.min_count = 1
```

The cache is an LRU cache per use count. Each `OrderedDict` in `group` holds the keys with one count, in order of last use, so the key to evict is the first one in the group of the smallest count. `min_count` says which group that is, and it only ever changes in two ways: a use can empty the smallest group, which makes the minimum one higher (the key just moved there), and a new key resets it to 1.

Every step is a constant number of dict and `OrderedDict` operations: O(1) average per call, with O(capacity) memory. Empty groups are deleted so the `defaultdict` doesn't fill up with them.

## Alternatives

### A heap of (count, time, key) with lazy deletion

```python alt time="log n" space="n"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = {}  # key -> (value, count, time of last use)
        self.heap = []  # (count, time, key), possibly outdated
        self.clock = 0

    def _touch(self, key, value, count):
        self.clock += 1
        self.data[key] = (value, count, self.clock)
        heappush(self.heap, (count, self.clock, key))

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        value, count, _ = self.data[key]
        self._touch(key, value, count + 1)
        return value

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self._touch(key, value, self.data[key][1] + 1)
            return
        if len(self.data) == self.capacity:
            while True:  # skip entries that no longer describe their key
                count, time, victim = heappop(self.heap)
                if victim in self.data and self.data[victim][1:] == (count, time):
                    break
            del self.data[victim]
        self._touch(key, value, 1)
```

A heap ordered by (count, time of last use) puts the eviction victim on top, as long as outdated entries are skipped: every use pushes a fresh entry, and an entry is only trusted if it still matches its key's current count and time. That's O(log n) per call instead of O(1), and the heap can grow to the number of calls, but it's the same lazy deletion as in [[p:2034]] and easy to get right.

## Wrong answers

### Breaks ties by first use, not last use

```python wrong fails="example" test="Example 2"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = {}  # key -> [value, uses, time the key was added]
        self.clock = 0

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data[key][1] += 1
        return self.data[key][0]

    def put(self, key: int, value: int) -> None:
        self.clock += 1
        if key in self.data:
            self.data[key][0] = value
            self.data[key][1] += 1
            return
        if len(self.data) == self.capacity:
            victim = min(self.data, key=lambda k: (self.data[k][1], -self.data[k][2]))  # newest key loses the tie
            del self.data[victim]
        self.data[key] = [value, 1, self.clock]
```

The tie-break needs the time of each key's last use, which changes with every `get`. This records only when each key was added, and then picks the wrong end of that order too. In Example 2 all three keys are used twice, and it evicts key 3 instead of key 1, whose last use is the oldest.

### Doesn't count an update as a use

```python wrong fails="example" test="Example 3"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.value, self.count = {}, {}
        self.group = defaultdict(OrderedDict)
        self.min_count = 0

    def _use(self, key):
        c = self.count[key]
        del self.group[c][key]
        if not self.group[c]:
            del self.group[c]
            if self.min_count == c:
                self.min_count = c + 1
        self.count[key] = c + 1
        self.group[c + 1][key] = None

    def get(self, key: int) -> int:
        if key not in self.value:
            return -1
        self._use(key)
        return self.value[key]

    def put(self, key: int, value: int) -> None:
        if key in self.value:
            self.value[key] = value  # the new value, but no use recorded
            return
        if len(self.value) == self.capacity:
            victim, _ = self.group[self.min_count].popitem(last=False)
            if not self.group[self.min_count]:
                del self.group[self.min_count]
            del self.value[victim], self.count[victim]
        self.value[key] = value
        self.count[key] = 1
        self.group[1][key] = None
        self.min_count = 1
```

Writing to a key is a use, just like reading it. Without that, key 1 in Example 3 stays at one use and, as the older of two keys with one use each, is evicted when key 3 arrives. Call the same "use" step from `put`.

### Never raises the minimum count

```python wrong fails="example" test="Example 1" how="error"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.value, self.count = {}, {}
        self.group = defaultdict(OrderedDict)
        self.min_count = 0

    def get(self, key: int) -> int:
        if key not in self.value:
            return -1
        c = self.count[key]
        del self.group[c][key]  # the group may now be empty, and min_count still points at it
        self.count[key] = c + 1
        self.group[c + 1][key] = None
        return self.value[key]

    def put(self, key: int, value: int) -> None:
        if key in self.value:
            self.value[key] = value
            self.get(key)
            return
        if len(self.value) == self.capacity:
            victim, _ = self.group[self.min_count].popitem(last=False)
            del self.value[victim], self.count[victim]
        self.value[key] = value
        self.count[key] = 1
        self.group[1][key] = None
        self.min_count = 1
```

When a key moves up and leaves its group empty, the smallest count may go up with it. Here `min_count` stays put, so the next eviction looks in an empty group, and `popitem` raises `KeyError`. In Example 1, reading key 7 empties the group of keys used once, and adding key 8 then fails.

### Searches for the victim at every eviction

```python wrong fails="perf"
class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = {}  # key -> [value, uses, time of last use]
        self.clock = 0

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.clock += 1
        self.data[key][1] += 1
        self.data[key][2] = self.clock
        return self.data[key][0]

    def put(self, key: int, value: int) -> None:
        self.clock += 1
        if key in self.data:
            self.data[key][0] = value
            self.data[key][1] += 1
            self.data[key][2] = self.clock
            return
        if len(self.data) == self.capacity:
            victim = min(self.data, key=lambda k: (self.data[k][1], self.data[k][2]))  # scans every key
            del self.data[victim]
        self.data[key] = [value, 1, self.clock]
```

The counts and times are right, so the right key is evicted, but finding it scans the whole cache. With a capacity of 10,000 and 25,000 evictions, that's 250 million key comparisons. The groups keep the victim at a known place.
