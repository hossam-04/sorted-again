def can_reach_end(nums):
    reach = 0                              # @ At the start, only index 0 is reachable.
    for i, jump in enumerate(nums):
        if i > reach:
            return False                   # @ Index {i} lies past the farthest reachable index, {reach}: no jump crosses that gap.
        reach = max(reach, i + jump)       # @ {'Index ' + str(i) + ' has a jump length of 0, so it adds nothing.' if jump == 0 else 'From index ' + str(i) + ', jumps of up to ' + str(jump) + ' reach index ' + str(i + jump) + '.'} The farthest reachable index is {reach}.
        if reach >= len(nums) - 1:
            return True                    # @ The last index, {len(nums) - 1}, is within reach.
    return True
