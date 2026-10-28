def rob(nums):
    best = [0] * (len(nums) + 1)          # best[i]: the most from the first i houses
    best[1] = nums[0]                     # @ No houses give 0. With one house, take it: best[1] = {nums[0]}.
    for i in range(2, len(nums) + 1):
        skip = best[i - 1]                # @ Skipping house {i - 1} keeps the best from the houses before it: {skip}.
        take = best[i - 2] + nums[i - 1]  # @ Taking house {i - 1} ({nums[i - 1]}) means skipping house {i - 2}: {best[i - 2]} + {nums[i - 1]} = {take}.
        best[i] = max(skip, take)         # @ best[{i}] = the better of the two: {best[i]}.
    return best[len(nums)]                # @ The most from all {len(nums)} houses is {best[len(nums)]}.
