---
id: 271
title: Pack and Unpack Strings
own: true
module: arrays
patterns: [length prefix, framing]
kind: codec
codec: strings
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

Write a class `Codec` with two methods:

- `encode(strs)` takes a list of strings and packs them into **one** string.
- `decode(s)` takes a string made by `encode` and returns the original list.

For every list, `decode(encode(strs))` must give back exactly `strs`: the same strings, in the same order, including empty strings. The strings may contain *any* character, so no character is safe to use as a plain separator.

The checker calls `encode` on one `Codec` object and `decode` on another, so the packed string has to carry everything `decode` needs.

## Constraints

- `0 <= len(strs) <= 100_000`
- `0 <= len(strs[i]) <= 200`
- The strings may contain any character: letters, digits, `#`, spaces, newlines, `"\0"`, emoji

```python starter
class Codec:
    def encode(self, strs: List[str]) -> str:
        """Pack a list of strings into a single string."""

    def decode(self, s: str) -> List[str]:
        """Turn a string made by encode back into the original list."""
```

```json examples
[
  {"args": [["pack", "me", "up"]], "why": "Three plain words must come back as the same three words, in order."},
  {"args": [["a#b", "x y", ""]], "why": "Strings may contain # and spaces, and an empty string is still a string."},
  {"args": [["one, two", "  "]], "why": "Commas and spaces are ordinary characters too."}
]
```

```json edge
[
  {"name": "strings that start with digits", "args": [["12ab", "3"]]},
  {"name": "only # characters", "args": [["#", "##"]]},
  {"name": "two empty strings", "args": [["", ""]]},
  {"name": "a NUL character", "args": [["a\u0000b", "c"]]},
  {"name": "empty list", "args": [[]]},
  {"name": "headers inside the data", "args": [["5#abc", "0#"]]},
  {"name": "unicode", "args": [["héllo", "日本", "🙂"]]},
  {"name": "newlines and tabs", "args": [["a\nb", "\t", "\n"]]}
]
```

```python gen
def gen(rng, size):
    alphabet = "ab#:09 ,\\\n\t\u0000é日🙂"
    count = rng.randint(0, 6) if size == "small" else rng.randint(20, 300)
    longest = 6 if size == "small" else 30
    return [["".join(rng.choice(alphabet) for _ in range(rng.randint(0, longest))) for _ in range(count)]]
```

```python perf
def perf(rng):
    # 100,000 strings of 50 to 150 characters, cut from one random text: about 10 MB once packed.
    text = "".join(rng.choices("abcdefghij#0123456789 ", k=200_000))
    out = []
    for _ in range(100_000):
        start = rng.randrange(199_850)
        out.append(text[start : start + rng.randint(50, 150)])
    return [out]
```

## Hints

1. Any separator character can also appear inside a string, so a separator alone can't mark where one string ends.
2. Write each string's length in front of it. Then `decode` knows exactly how many characters to take, whatever they are.
3. The length itself needs an end marker, because lengths have different numbers of digits. `f"{len(s)}#{s}"` works: the first `#` after the digits ends the header.

## Solution

```python solution time="n" space="n"
class Codec:
    def encode(self, strs: List[str]) -> str:
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s: str) -> List[str]:
        out, i = [], 0
        while i < len(s):
            j = s.index("#", i)  # the header is digits, so its # is the first one after i
            n = int(s[i:j])
            out.append(s[j + 1 : j + 1 + n])
            i = j + 1 + n  # skip the string by count, whatever it contains
        return out
```

Each string becomes a header (its length in digits, then `#`) followed by the string itself. `decode` keeps an index `i` at the start of the next header. A header holds only digits, so the first `#` at or after `i` must be its end; then the next `n` characters are the string, read by count, so `#`, digits or anything else inside it can't cause confusion.

Empty strings work (`0#`) and an empty list packs to `""`, which decodes to `[]`. Both methods do a constant amount of work per character, so they run in O(n) for n characters in total. `decode` moves an index instead of cutting the string, which is what keeps it linear.

## Alternatives

### Escape the separator

```python alt time="n" space="n" oracle
class Codec:
    def encode(self, strs: List[str]) -> str:
        # Every string ends with ",", and "\" escapes "\" and "," inside strings.
        return "".join(s.replace("\\", "\\\\").replace(",", "\\,") + "," for s in strs)

    def decode(self, s: str) -> List[str]:
        out, cur, i = [], [], 0
        while i < len(s):
            ch = s[i]
            if ch == "\\":
                cur.append(s[i + 1])
                i += 2
            elif ch == ",":
                out.append("".join(cur))
                cur = []
                i += 1
            else:
                cur.append(ch)
                i += 1
        return out
```

The approach CSV and string literals use: pick a separator and escape it (and the escape character itself) wherever it appears in the data. Ending every string with the separator, instead of only putting it between strings, is what lets `[]` and `[""]` pack differently. It's correct and linear, but `decode` has to look at every character, while the length prefix jumps over whole strings.

## Wrong answers

### Joins with a separator

```python wrong fails="example" test="Example 2"
class Codec:
    def encode(self, strs: List[str]) -> str:
        return "#".join(strs)

    def decode(self, s: str) -> List[str]:
        return s.split("#")  # also splits the # inside "a#b"
```

Any separator works until a string contains it. `"a#b"` comes back as two strings. (It also can't tell `[]` from `[""]`: both pack to `""`.)

### Reads every leading digit as the length

```python wrong fails="edge" test="strings that start with digits"
class Codec:
    def encode(self, strs: List[str]) -> str:
        return "".join(str(len(s)) + s for s in strs)  # no marker after the length

    def decode(self, s: str) -> List[str]:
        out, i = [], 0
        while i < len(s):
            j = i
            while j < len(s) and s[j].isdigit():
                j += 1
            n = int(s[i:j])
            out.append(s[j : j + n])
            i = j + n
        return out
```

Without an end marker, the decoder can't tell where the length stops and the string starts. For `"12ab"` the packed text begins `"412ab"`, and the decoder reads the length as 412.

### Cuts off the decoded part every time

```python wrong fails="perf"
class Codec:
    def encode(self, strs: List[str]) -> str:
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s: str) -> List[str]:
        out = []
        while s:
            j = s.index("#")
            n = int(s[:j])
            out.append(s[j + 1 : j + 1 + n])
            s = s[j + 1 + n :]  # copies everything that is left, once per string
        return out
```

The format is right, but each step builds a new string from the rest of the input. With 100,000 strings in 10 megabytes of text, that copies about 500 gigabytes in total. Moving an index instead of slicing makes it linear.

## Notes

LeetCode's version of this problem, "Encode and Decode Strings", is Premium; this is the course's own take on the same idea. Length-prefixed framing is everywhere in real systems: netstrings, HTTP chunked encoding, Redis's protocol and protocol buffers all send a length before the bytes, for the same reason as here.
