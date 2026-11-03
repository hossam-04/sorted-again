def insertion_sort(nums):
    for i in range(1, len(nums)):
        j = i                                            # @ {'Position 0 is' if i == 1 else 'Positions 0 to ' + str(i - 1) + ' are'} sorted. {nums[i]}, at position {i}, is next to join them.
        while j > 0 and nums[j - 1] > nums[j]:           # @ {(str(nums[j - 1]) + ' > ' + str(nums[j]) + ', so ' + str(nums[j]) + ' still has to move left.') if j > 0 and nums[j - 1] > nums[j] else (str(nums[j]) + ' is at the front, so it has found its place.') if j == 0 else (str(nums[j - 1]) + ' ≤ ' + str(nums[j]) + ': ' + str(nums[j]) + ' has found its place. Nothing to its left needs checking, because that part is sorted.')}
            nums[j - 1], nums[j] = nums[j], nums[j - 1]  # @ Swap them: {nums[j - 1]} moves one place left.
            j -= 1
    return nums                                          # @ Every number has joined the sorted part, so the whole list is sorted.
