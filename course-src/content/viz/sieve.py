def sieve(n):
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False    # @ Every number from 2 to {n - 1} starts as a candidate.
    p = 2
    while p * p < n:
        if is_prime[p]:                   # @ {(str(p) + ' was never crossed out, so it is prime. Cross out its multiples, starting at ' + str(p) + '² = ' + str(p * p) + '.') if is_prime[p] else (str(p) + ' was crossed out already: its multiples were crossed out with it.')}
            for multiple in range(p * p, n, p):
                is_prime[multiple] = False  # @ {multiple} = {p} × {multiple // p}: not prime.
        p += 1
    return [k for k in range(n) if is_prime[k]]  # @ {p}² is past {n - 1}, so everything still standing is prime: {len([k for k in range(n) if is_prime[k]])} primes below {n}.
