def power(x, n):                       # @ Call power({x}, {n}).
    if n == 0:                         # @ {'n is 0: x to the 0 is 1.' if n == 0 else 'Compute ' + str(x) + ' to the ' + str(n // 2) + ' once, then square it.'}
        return 1
    half = power(x, n // 2)            # @ power({x}, {n // 2}) = {half}.
    if n % 2 == 0:
        return half * half             # @ {n} is even: {half} × {half} = {half * half}.
    return half * half * x             # @ {n} is odd, so one more factor: {half} × {half} × {x} = {half * half * x}.
