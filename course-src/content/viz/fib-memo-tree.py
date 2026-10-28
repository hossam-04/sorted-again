def fib(n, memo):                                  # @ Call fib({n}).
    if n in memo:                                  # @ {('fib(' + str(n) + ') is in memo already: ' + str(memo[n]) + '. No new calls.') if n in memo else 'fib(' + str(n) + ') is not in memo yet.'}
        return memo[n]                             # @ Return the remembered {memo[n]}.
    if n < 2:
        return n                                   # @ fib({n}) = {n}, a base case.
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)  # @ Remember fib({n}) = {memo[n]}.
    return memo[n]                                 # @ Return {memo[n]}.
