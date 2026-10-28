def two_sum(nums, target):
    seen = {}                       # @ seen maps each value already passed to its position. It starts empty.
    for i, x in enumerate(nums):    # @ Position {i} holds {x}.
        need = target - x           # @ The only partner that works for {x} is {target} − {x} = {need}.
        if need in seen:            # @ {'Is ' + str(need) + ' in seen? Yes, at position ' + str(seen[need]) + '.' if need in seen else 'Is ' + str(need) + ' in seen? No, not yet.'}
            return [seen[need], i]  # @ Positions {seen[need]} and {i} add up to {target}. One pass was enough.
        seen[x] = i                 # @ Remember {x} at position {i}, in case a later number needs it.
    return []                       # @ No pair adds up to {target}.
