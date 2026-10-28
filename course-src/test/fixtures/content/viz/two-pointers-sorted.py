def two_sum_sorted(nums, target):
    l, r = 0, len(nums) - 1        # @ Start at both ends: l = 0 points at the smallest number, r = {r} at the largest.
    while l < r:                   # @ {('l < r, so pairs remain between positions ' + str(l) + ' and ' + str(r) + '.') if l < r else 'l and r have met, so no pair is left to check.'}
        s = nums[l] + nums[r]      # @ Add the two ends: {nums[l]} + {nums[r]} = {s}.
        if s == target:            # @ Compare {s} with the target, {target}.
            return [l + 1, r + 1]  # @ {s} is the target. Return positions {l + 1} and {r + 1}, counting from 1.
        if s < target:             # @ {s} is {'less' if s < target else 'more'} than {target}.
            l += 1                 # @ {nums[l - 1]} plus the largest number left is still too small, so {nums[l - 1]} can't be part of the answer. Move l right.
        else:
            r -= 1                 # @ {nums[r + 1]} plus the smallest number left is still too big, so {nums[r + 1]} can't be part of the answer. Move r left.
    return []                      # @ No two numbers add up to {target}.
