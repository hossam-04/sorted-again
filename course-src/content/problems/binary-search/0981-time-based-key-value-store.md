---
id: 981
module: binary-search
patterns: [binary search on timestamps, dict of lists]
kind: design
class: TimeMap
---

## Task

Build a class `TimeMap`: a key-value store that remembers every value a key has had, and when.

- `TimeMap()` creates an empty store.
- `set(key, value, timestamp)` records that `key` had `value` from time `timestamp` on.
- `get(key, timestamp)` returns the value `key` had at time `timestamp`: the value from the latest `set` for that key whose timestamp is at most `timestamp`. If there is none (the key was never set, or only set later), return the empty string `""`.

The timestamps passed to `set` strictly increase from one call to the next. Tests list the method names called in order, their arguments, and what each call returns (`None` for `set`).

## Constraints

- `1 <= len(key), len(value) <= 100`, using lowercase letters and digits
- `1 <= timestamp <= 10**7`
- Timestamps of `set` calls strictly increase
- At most `100_000` calls in total

```python starter
class TimeMap:
    def __init__(self):
        pass

    def set(self, key: str, value: str, timestamp: int) -> None:
        pass

    def get(self, key: str, timestamp: int) -> str:
        pass
```

```json examples
[
  {"ops": ["TimeMap", "set", "get", "get", "set", "get"], "args": [[], ["color", "red", 3], ["color", 2], ["color", 3], ["color", "blue", 7], ["color", 10]], "out": [null, null, "", "red", null, "blue"], "why": "Before time 3 the key has no value. From time 3 it's red, and from time 7 it's blue."},
  {"ops": ["TimeMap", "set", "set", "get", "get"], "args": [[], ["a", "x", 1], ["b", "y", 2], ["a", 5], ["b", 1]], "out": [null, null, null, "x", ""], "why": "Each key has its own history: b had no value yet at time 1."},
  {"ops": ["TimeMap", "set", "set", "set", "get"], "args": [[], ["k", "v1", 10], ["k", "v2", 20], ["k", "v3", 30], ["k", 25]], "out": [null, null, null, null, "v2"], "why": "At time 25 the most recent set for k is the one at time 20."}
]
```

```json edge
[
  {"name": "unknown key", "ops": ["TimeMap", "get"], "args": [[], ["nope", 5]], "out": [null, ""]},
  {"name": "exact timestamp", "ops": ["TimeMap", "set", "get"], "args": [[], ["k", "a", 5], ["k", 5]], "out": [null, null, "a"]},
  {"name": "just before the first set", "ops": ["TimeMap", "set", "get"], "args": [[], ["k", "a", 5], ["k", 4]], "out": [null, null, ""]},
  {"name": "long after the last set", "ops": ["TimeMap", "set", "get"], "args": [[], ["k", "a", 5], ["k", 10000000]], "out": [null, null, "a"]},
  {"name": "many versions", "ops": ["TimeMap", "set", "set", "set", "set", "get", "get", "get"], "args": [[], ["k", "v1", 1], ["k", "v2", 2], ["k", "v3", 3], ["k", "v4", 4], ["k", 3], ["k", 1], ["k", 9]], "out": [null, null, null, null, null, "v3", "v1", "v4"]},
  {"name": "the same value twice", "ops": ["TimeMap", "set", "set", "get"], "args": [[], ["k", "same", 1], ["k", "same", 2], ["k", 2]], "out": [null, null, null, "same"]},
  {"name": "keys and values with digits", "ops": ["TimeMap", "set", "get"], "args": [[], ["user1", "42", 7], ["user1", 8]], "out": [null, null, "42"]}
]
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    keys = ["a", "b"] if size == "small" else ["a", "b", "c", "d", "key9"]
    ops, args, now = ["TimeMap"], [[]], 0
    for _ in range(calls):
        if rng.random() < 0.5:
            now += rng.randint(1, 5)
            ops.append("set")
            args.append([rng.choice(keys), rng.choice(("x", "y", "z", "v1", "v2")), now])
        else:
            ops.append("get")
            args.append([rng.choice(keys), rng.randint(1, now + 5)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 50,000 versions of one key, then 50,000 lookups of early timestamps:
    # a lookup that walks back from the newest version passes almost all of them.
    ops = ["TimeMap"] + ["set"] * 50_000 + ["get"] * 50_000
    args = [[]] + [["k", f"v{t}", t] for t in range(1, 50_001)] + [["k", rng.randint(1, 500)] for _ in range(50_000)]
    return {"ops": ops, "args": args}
```

## Hints

1. Group the history by key: a dict from each key to its list of `(timestamp, value)` entries.
2. Timestamps only ever increase, so appending keeps each list sorted by time. No sorting needed.
3. For `get`, find the last entry with timestamp ≤ the query by binary search: `bisect_right` on the timestamps, minus one. Watch out for "before the first entry".

## Solution

```python solution time="log n" space="n"
class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)   # key -> timestamps, increasing
        self.values = defaultdict(list)  # key -> value set at the matching timestamp

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.times[key].append(timestamp)
        self.values[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        i = bisect_right(self.times[key], timestamp) - 1  # last entry at or before timestamp
        return self.values[key][i] if i >= 0 else ""
```

Since `set` timestamps strictly increase, appending keeps every key's list sorted by time for free. `bisect_right(times, t)` is the number of entries with timestamp ≤ t, so the entry just before that position is the latest one at or before t. When it returns 0, no entry is early enough, and the answer is `""`.

`set` is O(1) and `get` is O(log n) for a key with n versions. The store holds every value ever set: O(n) space in total.

## Alternatives

### Scan the whole history

```python alt time="n" space="n" slow oracle
class TimeMap:
    def __init__(self):
        self.history = defaultdict(list)  # key -> (timestamp, value) entries

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.history[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        best, answer = 0, ""
        for t, v in self.history[key]:
            if best < t <= timestamp:
                best, answer = t, v
        return answer
```

Look at every version and keep the latest one that isn't too late. It doesn't rely on the timestamps being sorted, which makes it a good check for the faster version, but each lookup is O(n).

## Wrong answers

### Lets index -1 wrap around

```python wrong fails="example" test="Example 1"
class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)
        self.values = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.times[key].append(timestamp)
        self.values[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        if not self.values[key]:
            return ""
        i = bisect_right(self.times[key], timestamp) - 1
        return self.values[key][i]  # i is -1 when every version is too late
```

When the query is earlier than every version, `i` is -1, and in Python `values[-1]` is the *last* element instead of an error. The lookup silently returns the newest value. Any index computed by subtracting 1 needs a check for -1.

### Keeps only the newest value

```python wrong fails="example" test="Example 3"
class TimeMap:
    def __init__(self):
        self.latest = {}  # key -> (timestamp, value), overwritten by every set

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.latest[key] = (timestamp, value)

    def get(self, key: str, timestamp: int) -> str:
        if key in self.latest and self.latest[key][0] <= timestamp:
            return self.latest[key][1]
        return ""
```

A plain dict forgets old versions. That's fine while every query asks about "now", but a query between two versions needs the older one, and it's gone.

### Walks back from the newest version

```python wrong fails="perf"
class TimeMap:
    def __init__(self):
        self.history = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.history[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        for t, v in reversed(self.history[key]):  # O(n) when the query is early
            if t <= timestamp:
                return v
        return ""
```

Walking backwards is quick for recent timestamps but slow for old ones. The performance test asks about early times in a history of 50,000 versions, 50,000 times. The list is sorted, so binary search jumps straight to the answer.
