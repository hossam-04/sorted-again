---
id: string-matching
part: advanced
title: String matching
kicker: why naive search is quadratic · borders and the prefix function · KMP · the Z-function · rolling hashes · suffix arrays
summary: "Finding a pattern in text looks like a job for `in`, until the inputs are adversarial or the question is harder: the longest repeated substring, the shortest palindrome you can make, the period of a string. This module covers the three linear-time tools behind those answers: the prefix function, the Z-function and the rolling hash."
---

## Why naive search is quadratic

The obvious way to find a pattern of length m in a text of length n is to try every start and compare letter by letter. On ordinary text most attempts fail at the first letter, so it's fast. On text like `aaaa…ab` with the pattern `aaa…ab`, every attempt matches almost the whole pattern before failing, and the work is O(n · m).

The waste is clear: after matching m − 1 letters and failing, you *know* what those letters were, and the naive method throws that away. Every linear-time method below keeps it.

:::note Python's own search
`text.find(pattern)` and `pattern in text` use a search written in C that avoids the quadratic worst case on such inputs, so for plain substring search they're the right answer in real code. The algorithms in this module matter for the questions `find` can't answer, and for interviews that ask you to build the matcher.
:::

## Borders and the prefix function

A **border** of a string is a proper prefix that's also a suffix: `abacaba` has the borders `aba` and `a`. The **prefix function** gives, for every prefix of a string, the length of its longest border: `pi[i]` is the longest border of `s[:i + 1]`.

It's computed left to right. Extending the longest border of `s[:i]` by one letter works if the next letter matches. If not, the next candidate is the longest border *of that border*, which is `pi[k − 1]`, because the borders of a string are its longest border, the longest border of that, and so on. Fall back until a letter matches or nothing is left.

:::viz kmp-prefix
:::

```python run title=The_prefix_function
def prefix_function(s):
    pi = [0] * len(s)
    k = 0
    for i in range(1, len(s)):
        while k and s[i] != s[k]:
            k = pi[k - 1]  # the next shorter border
        if s[i] == s[k]:
            k += 1
        pi[i] = k
    return pi

for s in ["abacabab", "aaaa", "abcd", "abcxabc"]:
    print(f"{s:10} {prefix_function(s)}")
```

`k` rises by at most one per letter, and each fall back lowers it, so all the falls back together cost at most n steps: O(n) in total. The last value alone answers several problems: the longest border ([[p:1392]]), and the string's smallest period, n − `pi[-1]`, which tells you whether the string is a repeated block ([[p:459]]).

## KMP: matching with the prefix function

The **Knuth–Morris–Pratt** algorithm scans the text once with a pointer `j` saying how much of the pattern matches the text just read. On a mismatch, `j` falls back to `pi[j − 1]`: the longest piece of the pattern that's still matched. The text pointer never moves backwards, so the scan is O(n), after O(m) to build `pi` ([[p:28]]).

```python run title=KMP_finds_every_occurrence
def find_all(text, pattern):
    pi = [0] * len(pattern)
    k = 0
    for i in range(1, len(pattern)):
        while k and pattern[i] != pattern[k]:
            k = pi[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        pi[i] = k
    hits, j = [], 0
    for i, ch in enumerate(text):
        while j and ch != pattern[j]:
            j = pi[j - 1]
        if ch == pattern[j]:
            j += 1
        if j == len(pattern):
            hits.append(i - j + 1)
            j = pi[j - 1]  # keep going: occurrences may overlap
    return hits

print(find_all("abababcabab", "abab"))
print(find_all("a" * 20 + "b", "a" * 10 + "b"))
```

A neat trick puts KMP to work on other questions: run the prefix function on `pattern + "#" + text`, where `#` appears in neither. Wherever the value reaches m, the pattern ends there. [[p:214]] uses this with the text being the reversed string: the longest border of `s + "#" + reversed(s)` is the longest prefix of s that's a palindrome.

## The Z-function

The **Z-function** gives, for every position i, the length of the longest substring starting at i that matches the start of the string. It's computed in O(n) by remembering the window `[l, r)` that reaches furthest right: inside it, position i mirrors position i − l near the start, whose value is already known, so only the part past r needs comparing.

```python run title=The_Z-function
def z_function(s):
    z = [0] * len(s)
    l = r = 0
    for i in range(1, len(s)):
        if i < r:
            z[i] = min(r - i, z[i - l])  # what the window already guarantees
        while i + z[i] < len(s) and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z

s = "aabxaab"
print(list(s))
print(z_function(s))
```

The prefix function and the Z-function carry the same information in different shapes, and each problem here can be solved with either. Matching with Z uses the same separator trick: compute it for `pattern + "#" + text` and look for values equal to m.

## Rolling hashes

A **rolling hash** reads a window of letters as a number in some base, modulo a large prime. Sliding the window one place removes the leaving letter's contribution, shifts, and adds the new one, all in O(1). Equal strings always have equal hashes; different strings collide only with tiny probability, and a direct comparison on every match makes the answer certain.

Hashes shine where the question is "do any two windows of length L match?", as in [[p:1044]]: hash every window into a dict, and look for a repeat. Combined with binary search on L, that finds the longest repeated substring in O(n log n).

```python run title=A_rolling_hash
base, mod = 131, (1 << 61) - 1

def window_hashes(s, length):
    h = 0
    for ch in s[:length]:
        h = (h * base + ord(ch)) % mod
    top = pow(base, length, mod)  # the weight of the letter about to leave
    out = [h]
    for i in range(length, len(s)):
        h = (h * base - ord(s[i - length]) * top + ord(s[i])) % mod
        out.append(h)
    return out

hashes = window_hashes("abcabcab", 3)
print(hashes)
print("windows 0 and 3 match:", hashes[0] == hashes[3])
```

:::gotcha Collisions are rare, not impossible
Two different windows can share a hash. With a modulus near 2⁶¹ it almost never happens by chance, but a careful solution compares the actual strings whenever hashes match, or uses two independent hashes. Small moduli such as 10⁹ + 7 collide often enough across 10⁵ windows to fail real tests, and some judges include inputs designed to break popular bases.
:::

## Suffix arrays

A **suffix array** lists the starting positions of all suffixes in sorted order. Every substring is a prefix of some suffix, so sorted suffixes put equal substrings next to each other: the longest repeated substring is the longest common prefix of two *neighbouring* suffixes. Building the array by **prefix doubling** sorts by the first 1, 2, 4, … letters, reusing the previous round's ranks, and Kasai's algorithm then computes all neighbouring common prefixes in O(n). It's the heavy machinery of string algorithms: more work to build, and able to answer many questions at once. [[p:1044]] shows it as an alternative.

## Complexity

| Tool | Build | Answers | Notes |
|---|---|---|---|
| Naive search | none | `O(n · m)` worst case | fine on ordinary text |
| Prefix function, KMP | `O(m)` | `O(n)` per text | borders, periods, matching |
| Z-function | `O(n + m)` | same as KMP | "how much of the start matches here" |
| Rolling hash | `O(n)` | `O(1)` per window | needs a collision check |
| Suffix array | `O(n log² n)` here | many substring queries | repeated substrings, counting distinct substrings |

:::interview
Interviewers rarely want KMP from memory for plain search, since `find` exists, but they do ask problems where the prefix function is the key: periods, borders, shortest palindromes. Name the tool ("the longest border is the last value of the prefix function") and explain the fall back in one sentence. For "longest repeated substring" problems, binary search plus a rolling hash is the standard answer: mention the collision check.
:::

:::work
Text search is everywhere: `grep` and editors use searches in the Boyer–Moore family, which skip ahead on mismatches; DNA tools search huge genomes with suffix arrays and their compressed cousins; and deduplication systems, `rsync` and plagiarism checkers use rolling hashes to find matching chunks across files. When a search needs many patterns at once, such as banned words or antivirus signatures, the Aho–Corasick automaton is KMP extended to a trie of patterns.
:::

## Quick check

:::quiz
? What is the longest border of `abacaba`?
- [ ] `abacaba` itself
- [x] `aba`
- [ ] `a`
> A border is a proper prefix that's also a suffix. `aba` both starts and ends the string, and no longer proper prefix does.

? In KMP, after matching j letters of the pattern and failing on the next one, where does matching continue?
- [ ] From the start of the pattern, one text letter later
- [x] With `j = pi[j - 1]`: the longest border of what matched is still matched
- [ ] From the start of the pattern, at the same text letter
> The letters that matched are known; their longest border is the longest piece that could still begin a match, so the text pointer never moves back.

? A string of length 12 has a longest border of length 8. What does that say?
- [x] Its smallest period is 4, which divides 12, so it's three copies of its first 4 letters
- [ ] It's two copies of a 6-letter block
- [ ] Nothing: borders and periods are unrelated
> A border of length b means a period of n − b = 4. Since 4 divides 12, the string is that block repeated three times.

? Why does a solution that finds equal rolling hashes compare the substrings too?
- [ ] To make it faster
- [x] Different substrings can have equal hashes, and the comparison rules that out
- [ ] Because the hash only covers the first letter
> Hashes are only a filter. A direct comparison on each match makes the answer certain, and costs little because real matches are what you're looking for anyway.

? Why does the longest repeated substring appear as the common prefix of two *neighbouring* suffixes in sorted order?
- [x] Suffixes sharing a long prefix sort next to each other, so the best pair is always adjacent
- [ ] Because the suffix array is sorted by length
- [ ] It doesn't: you must compare every pair
> If two suffixes share a prefix of length L, every suffix sorted between them shares it too, so some adjacent pair shares at least as much.
:::
