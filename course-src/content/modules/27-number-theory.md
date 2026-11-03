---
id: number-theory
part: advanced
title: Number theory
kicker: sieves · gcd, lcm and inclusion–exclusion · modular arithmetic · fast powers · inverses and binomials
summary: "When a problem says 'return the answer modulo 10⁹ + 7', counts primes, or asks about multiples and divisors, it's testing a small toolkit: the sieve, Euclid's algorithm, modular arithmetic, repeated squaring and modular inverses. This module covers each one, with the Python details that make them fast and the traps that make answers wrong."
---

## Primes and sieves

To test one number k for primality, trial division up to √k is enough: a composite number always has a factor no larger than its square root. To find *all* primes below n, the **sieve of Eratosthenes** is far faster: for each prime p, cross out its multiples, starting at p² (smaller multiples have a smaller prime factor and are already crossed out). What survives is prime.

:::viz sieve
:::

The work is n/2 + n/3 + n/5 + … over the primes, O(n log log n): nearly linear. In Python, cross out with slice assignment on a `bytearray`, which runs in C, rather than a loop ([[p:204]]).

```python run title=A_fast_sieve_and_smallest_prime_factors
def primes_below(n):
    is_prime = bytearray([1]) * n
    is_prime[:2] = b"\x00\x00"
    p = 2
    while p * p < n:
        if is_prime[p]:
            is_prime[p * p::p] = bytes(len(range(p * p, n, p)))  # every multiple from p², at C speed
        p += 1
    return [k for k in range(n) if is_prime[k]]

print(primes_below(50))
print(len(primes_below(1_000_000)), "primes below a million")

# A sieve of smallest prime factors factorises every number below n in O(log k) each.
n = 100
spf = list(range(n))
for p in range(2, int(n ** 0.5) + 1):
    if spf[p] == p:
        for m in range(p * p, n, p):
            if spf[m] == m:
                spf[m] = p

def factorise(k):
    out = []
    while k > 1:
        out.append(spf[k])
        k //= spf[k]
    return out

print(factorise(84), factorise(97))
```

## gcd, lcm and inclusion–exclusion

**Euclid's algorithm** finds the greatest common divisor with `gcd(a, b) = gcd(b, a % b)`, in O(log min(a, b)) steps; Python has `math.gcd`. The **least common multiple** follows from it: `lcm(a, b) = a * b // gcd(a, b)` (or `math.lcm`).

Counting multiples is where they meet. Below or at x there are `x // a` multiples of a, and `x // b` of b, but the numbers divisible by both, the multiples of `lcm(a, b)`, are in both counts, so **inclusion–exclusion** subtracts them once: `x // a + x // b − x // lcm(a, b)`. With three numbers, add back the multiples of all three, and so on.

Because such a count only grows with x, "the n-th number with this property" becomes a binary search for the smallest x whose count reaches n ([[p:878]]).

## Modular arithmetic

Counts in Hard problems are often astronomically large, so the task asks for the remainder modulo a prime, usually 10⁹ + 7. Remainders can be taken *during* the computation, because addition, subtraction and multiplication all respect them:

- `(a + b) % m == (a % m + b % m) % m`
- `(a * b) % m == (a % m) * (b % m) % m`
- subtraction too, and Python's `%` always returns a non-negative result for positive m, so `(a - b) % m` needs no fixing.

Division does **not** work this way: `(a / b) % m` is not `(a % m) / (b % m)`. Dividing by b means multiplying by b's **modular inverse**, below.

:::gotcha Compare before you reduce
"Return the largest value modulo p" means find the largest value, then reduce it. Remainders don't keep order: 10⁹ + 8 is larger than 10⁹, but its remainder is 1. Python's exact integers let you compare the true values and reduce once at the end. In languages with 64-bit integers you need the modulo to avoid overflow, but the comparison must still be on true values, which is why problems like [[p:1383]] are careful about it.
:::

## Fast powers

Computing xᵉ by multiplying e times is hopeless when e is 10¹⁵. **Binary exponentiation** (repeated squaring) uses the binary digits of e: square the base at every step (x, x², x⁴, x⁸, …), and multiply it into the result when the current bit is 1. That's O(log e) multiplications, about fifty for 10¹⁵ ([[p:1922]]). Python's `pow(x, e, m)` does exactly this, in C.

```python run title=Repeated_squaring
def power(base, exp, mod):
    result = 1
    base %= mod
    while exp:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result

mod = 10**9 + 7
print(power(3, 10**15, mod), pow(3, 10**15, mod))  # the same, in about 50 steps
```

When the exponent itself is huge, as in [[p:372]], it can be processed one decimal digit at a time: x^(10e + d) = (xᵉ)¹⁰ · x^d. Reducing the *exponent* is a different matter: **Euler's theorem** says x^φ(m) ≡ 1 (mod m), so exponents may be taken modulo φ(m), but only when x and m have no common factor. For a prime p, φ(p) = p − 1, which is **Fermat's little theorem**.

## Inverses and binomial coefficients

Modulo a prime p, every number a not divisible by p has an **inverse**: a number a⁻¹ with a · a⁻¹ ≡ 1. By Fermat's little theorem it's `pow(a, p - 2, p)`; Python 3.8+ also accepts `pow(a, -1, m)`, which works for any m coprime to a. Dividing by a becomes multiplying by its inverse.

That makes binomial coefficients modulo p cheap: precompute factorials and inverse factorials once, and C(n, k) = n! / (k! (n − k)!) is two multiplications. Binomials count **interleavings**: two sequences of lengths L and R can be shuffled together, keeping each one's order, in C(L + R, L) ways, which is the heart of [[p:1569]].

```python run title=Binomials_modulo_a_prime
mod = 10**9 + 7
N = 1000
fact = [1] * (N + 1)
for i in range(1, N + 1):
    fact[i] = fact[i - 1] * i % mod
inv_fact = [1] * (N + 1)
inv_fact[N] = pow(fact[N], mod - 2, mod)  # Fermat: the inverse of N!
for i in range(N, 0, -1):
    inv_fact[i - 1] = inv_fact[i] * i % mod  # 1/(i-1)! = i/i!

def C(n, k):
    return 0 if k < 0 or k > n else fact[n] * inv_fact[k] % mod * inv_fact[n - k] % mod

from math import comb
print(C(1000, 500), comb(1000, 500) % mod)  # the same number
print("inverse of 3:", pow(3, -1, mod), (3 * pow(3, -1, mod)) % mod)
```

## Complexity

| Tool | Time | Note |
|---|---|---|
| Trial division, one number | `O(√n)` | enough for a single test |
| Sieve of Eratosthenes | `O(n log log n)` | all primes below n |
| Smallest-prime-factor sieve | `O(n log log n)`, then `O(log k)` per factorisation | many factorisations |
| Euclid's gcd | `O(log min(a, b))` | `math.gcd`, `math.lcm` |
| Binary exponentiation | `O(log e)` multiplications | `pow(x, e, m)` |
| Modular inverse | `O(log p)` | `pow(a, p - 2, p)` or `pow(a, -1, m)` |
| C(n, k) mod p, after tables | `O(1)` per query | `O(n)` to build the tables |

:::interview
When you see "modulo 10⁹ + 7", say that you'll reduce after every addition and multiplication, and that you'll never divide: you'll multiply by an inverse instead, which exists because the modulus is prime. Write repeated squaring from memory, then mention `pow(x, e, m)`. For counting problems, look for the combinatorial structure (choices per position, interleavings, inclusion–exclusion) before writing any loop over the possibilities.
:::

:::work
Modular arithmetic is the machinery of cryptography: RSA and Diffie–Hellman are fast modular exponentiation with numbers hundreds of digits long, and their security rests on how hard it is to undo it. Hash functions and hash tables reduce modulo a size, checksums such as Adler-32 are sums modulo a prime, and random number generators are often linear recurrences modulo 2⁶⁴. gcd turns up in scheduling (when do periodic jobs coincide? at the lcm of their periods) and in reducing fractions exactly.
:::

## Quick check

:::quiz
? Why does the sieve start crossing out the multiples of p at p²?
- [ ] p² is the first number that's not prime
- [x] Every smaller multiple, m × p with m < p, has a smaller prime factor and was crossed out already
- [ ] To save memory
> The multiples 2p, 3p, …, (p − 1)p were each crossed out by their smallest prime factor, which is below p.

? How many numbers from 1 to 100 are divisible by 4 or by 6?
- [ ] 41
- [x] 33
- [ ] 25
> 100 // 4 = 25 and 100 // 6 = 16, minus the multiples of lcm(4, 6) = 12 counted twice: 100 // 12 = 8. 25 + 16 − 8 = 33.

? Which of these is *not* valid modulo m?
- [ ] `(a + b) % m == (a % m + b % m) % m`
- [ ] `(a * b) % m == (a % m) * (b % m) % m`
- [x] `(a // b) % m == (a % m) // (b % m)`
> Addition and multiplication respect remainders; division doesn't. Dividing by b modulo a prime means multiplying by b's inverse.

? How many multiplications does repeated squaring need for x raised to 10¹⁵?
- [ ] About 10¹⁵
- [ ] About 10⁷
- [x] About 50 to 100
> 10¹⁵ has 50 binary digits: one squaring per digit, plus one multiplication per set bit.

? When can an exponent be reduced modulo φ(m)?
- [ ] Always
- [x] When the base and m have no common factor
- [ ] Only when m is a power of two
> Euler's theorem needs gcd(x, m) = 1. For a base sharing a factor with m, such as 7 modulo 1337 = 7 × 191, the reduction gives wrong answers.
:::
