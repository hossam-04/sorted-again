---
id: two-pointers
title: Two pointers
kicker: converging · same direction · partition
summary: Two indices that move with a purpose over sorted or symmetric data.
---

## Why it works

Sorted order lets one comparison rule out a whole row of pairs at once. The classic case is [[p:167]].

```python run
nums = [1, 3, 4, 6]
print(nums[0] + nums[-1])
```

:::viz two-pointers-sorted
:::

:::gotcha Off by one at the meeting point
`while l < r` stops when the pointers meet, because a pair needs two different positions.
:::

| Approach | Time |
|---|---|
| Two pointers on sorted input | `O(n)` |

:::quiz
? Which pointer moves when the sum is too small?
- [ ] `r`
- [x] `l`
- [ ] both
> The left value is too small for every remaining partner, so it can go.
:::
