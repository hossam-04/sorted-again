def fib(n):                            # @ Call fib({n}).
    if n < 2:                          # @ {('fib(' + str(n) + ') is a base case: no more calls needed.') if n < 2 else 'fib(' + str(n) + ') needs fib(' + str(n - 1) + ') and fib(' + str(n - 2) + ') first.'}
        return n                       # @ fib({n}) returns {n}.
    return fib(n - 1) + fib(n - 2)     # @ Both answers are in: fib({n}) = {__return__}.
