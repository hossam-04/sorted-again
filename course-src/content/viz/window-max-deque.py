from collections import deque
def window_max(nums, k):
    dq = deque()                         # @ dq holds positions whose values get smaller from front to back.
    out = []
    for i, x in enumerate(nums):         # @ Next value: nums[{i}] = {x}.
        while dq and nums[dq[-1]] <= x:  # @ {('The back holds ' + str(nums[dq[-1]]) + ', which is not bigger than ' + str(x) + '. It can never be a maximum again.') if dq and nums[dq[-1]] <= x else 'Nothing at the back is smaller than ' + str(x) + '.'}
            dq.pop()                     # @ Drop it from the back.
        dq.append(i)                     # @ Add position {i} at the back.
        if dq[0] <= i - k:               # @ {('Position ' + str(dq[0]) + ' has slid out of the window.') if dq[0] <= i - k else 'The front, position ' + str(dq[0]) + ', is still inside the window.'}
            dq.popleft()                 # @ Remove it from the front.
        if i >= k - 1:
            out.append(nums[dq[0]])      # @ The window ending at {i} is full. Its maximum is at the front: {nums[dq[0]]}.
    return out                           # @ The maximum of every window: {out}.
