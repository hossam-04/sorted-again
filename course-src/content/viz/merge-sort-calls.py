def merge_sort(nums):
    if len(nums) <= 1:                         # @ {('A list of ' + str(len(nums)) + ' is already sorted.') if len(nums) <= 1 else ('Split ' + str(nums) + ' in half and sort each half.')}
        return nums
    mid = len(nums) // 2
    left = merge_sort(nums[:mid])              # @ The left half comes back sorted: {left}.
    right = merge_sort(nums[mid:])             # @ The right half comes back sorted: {right}.
    merged, i, j = [], 0, 0                    # @ Merge {left} and {right}: compare their fronts, take the smaller one.
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:                # @ {(str(left[i]) + ' ≤ ' + str(right[j]) + ', so take ' + str(left[i]) + ' from the left.') if left[i] <= right[j] else (str(right[j]) + ' < ' + str(left[i]) + ', so take ' + str(right[j]) + ' from the right.')}
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged += left[i:] + right[j:]             # @ One half has run out. What's left of the other is already sorted, so it goes on the end: {merged}.
    return merged                              # @ {nums} sorted is {merged}.
