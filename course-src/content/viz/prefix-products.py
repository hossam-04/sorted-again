def product_except_self(nums):
    n = len(nums)
    answer = [1] * n                # @ answer[i] will be (product left of i) × (product right of i).
    left = 1                        # @ left = product of everything before position 0: nothing yet, so 1.
    for i in range(n):
        answer[i] = left            # @ answer[{i}] = {left}: the product of everything left of position {i}.
        left *= nums[i]             # @ Fold nums[{i}] = {nums[i]} into left, which becomes {left}.
    right = 1                       # @ Now sweep back from the end. right starts at 1: nothing after the last position.
    for i in range(n - 1, -1, -1):
        answer[i] *= right          # @ Multiply in {right}, the product of everything right of {i}: answer[{i}] = {answer[i]}.
        right *= nums[i]            # @ Fold nums[{i}] = {nums[i]} into right, which becomes {right}.
    return answer                   # @ Each answer[i] skips exactly nums[i], and no division was needed.
