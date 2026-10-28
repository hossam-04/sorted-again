"""Sorted Again harness: runs learner code against a problem's tests.

The same file runs in the page (Pyodide in a Web Worker) and in the build verifier (Pyodide in Node
worker threads), so a solution that passes at build time passes in the page. Calls cross the JS
boundary as JSON strings: entry(fn, payload_json, emit) -> result_json.
"""
import ast
import functools
import io
import json
import math
import random
import sys
import time
import traceback
import types
from collections import deque
from contextlib import redirect_stderr, redirect_stdout

RECURSION_LIMIT = 100_000
STDOUT_CAP = 4096
TOL = 1e-5
GROUPS = ('examples', 'edge', 'random', 'perf')
SAFE_INT = 2 ** 53

# LeetCode's Python judge makes these names available without imports; so does this page.
PRELUDE_SRC = '''
from typing import *
from collections import *
from functools import *
from itertools import *
from heapq import *
from bisect import *
from math import inf, gcd, lcm, comb, perm, factorial, isqrt, sqrt, ceil, floor, log, log2, log10, prod
from string import ascii_lowercase, ascii_uppercase, ascii_letters, digits
import collections, functools, itertools, heapq, bisect, math, string, re, random, operator, sys, copy
'''
_PRELUDE = compile(PRELUDE_SRC, '<prelude>', 'exec')
exec(_PRELUDE, {})  # import those modules now, before the patches below


# ------------------------------------------------------------------ the browser's small stack
#
# In the page, Python runs in a Web Worker whose native stack is small: Safari's overflows after about 100 nested
# calls that go through C code. Plain Python-to-Python calls don't use that stack (CPython runs them in one C loop),
# so recursion 100,000 deep is fine. Three things do use it, and overflowing it kills the runtime:
#   1. freeing a long chain of objects (a linked list, a deep tree, the frames of a deep traceback), because CPython
#      frees each object from inside its parent's deallocator;
#   2. recursion through functools.cache / lru_cache, which call the cached function from C;
#   3. recursion through other C code, such as max(generator), map() or sorted(key=...).
# The harness frees what it owns in a safe order (release, dispose) and swaps functools' caches for pure-Python
# ones. The build runs the same code on a stack as small as Safari's, so content can't rely on case 3. Not covered:
# learner code that itself catches an exception raised hundreds of calls deeper (CPython frees that traceback the
# recursive way), and recursion through other C code. Both crash the Worker, which the page reports and replaces.
# (A sys.monitoring hook on EXCEPTION_HANDLED would cover the first, but it slows every loop by about 75%.)

def release(exc):
    """Drop a caught exception's traceback deepest frame first.

    Each frame keeps its caller alive, so the usual order frees the frames of a deep recursion as one recursive
    chain. Freed deepest first, every frame's caller is still held by the next traceback entry."""
    todo, seen = [exc], set()
    while todo:
        e = todo.pop()
        if e is None or id(e) in seen:
            continue
        seen.add(id(e))
        todo.append(e.__context__)
        todo.append(e.__cause__)
        entries, tb = [], e.__traceback__
        e.__traceback__ = None
        while tb is not None:
            entries.append(tb)
            nxt = tb.tb_next
            tb.tb_next = None
            tb = nxt
        while entries:
            entries.pop()


_ATOMIC = frozenset({type(None), bool, int, float, complex, str, bytes})
_SKIP = (types.ModuleType, type)


def dispose(owned):
    """Free the objects in `owned` (a list holding the harness's only references) without recursive chains.

    Collect everything reachable, unlink the course's node objects (which breaks the cycles in cyclic lists,
    random pointers and graphs), then drop the collected objects parents first: each one freed only lowers the
    count of children that `order` still holds."""
    order = _reachable(owned)
    owned.clear()
    for o in order:
        if type(o) in NODE_LINKS:
            o.__dict__.clear()
    o = None
    while order:
        order.popleft()


def _reachable(roots):
    """Objects reachable from roots through containers and attributes, in breadth-first order."""
    order, seen, queue = deque(), set(), deque(roots)
    while queue:
        o = queue.popleft()
        t = type(o)
        if t in _ATOMIC or id(o) in seen or isinstance(o, _SKIP):
            continue
        seen.add(id(o))
        order.append(o)
        links = NODE_LINKS.get(t)
        if links is not None and len(o.__dict__) == links[1]:
            queue.extend(getattr(o, name) for name in links[0])
            continue
        if isinstance(o, dict):
            if not set(map(type, o)) <= _ATOMIC:
                queue.extend(o)
            items = o.values()
        elif isinstance(o, (list, tuple, set, frozenset, deque)):
            items = o
        else:
            items = _attributes(o)
        if not set(map(type, items)) <= _ATOMIC:
            queue.extend(items)
    return order


def _attributes(o):
    d = getattr(o, '__dict__', None)
    out = list(d.values()) if type(d) is dict else []
    for cls in type(o).__mro__[:-1]:
        slots = cls.__dict__.get('__slots__', ())
        for name in (slots,) if isinstance(slots, str) else slots:
            if name not in ('__dict__', '__weakref__'):
                out.append(getattr(o, name, None))
    return out


def _cached(user_function, maxsize, typed):
    hits = misses = 0
    memo = {}
    get = memo.get
    missing = object()
    mark = (object(),)

    def make_key(args, kwds):
        key = args
        if kwds:
            key += mark + tuple(kwds.items())
        if typed:
            key += tuple(type(v) for v in args) + tuple(type(v) for v in kwds.values())
        return key

    if maxsize is None:
        def wrapper(*args, **kwds):
            nonlocal hits, misses
            key = make_key(args, kwds) if kwds or typed else args
            result = get(key, missing)
            if result is not missing:
                hits += 1
                return result
            misses += 1
            result = memo[key] = user_function(*args, **kwds)
            return result
    else:
        def wrapper(*args, **kwds):
            nonlocal hits, misses
            key = make_key(args, kwds) if kwds or typed else args
            result = get(key, missing)
            if result is not missing:
                hits += 1
                memo[key] = memo.pop(key)  # most recently used goes last
                return result
            misses += 1
            result = user_function(*args, **kwds)
            if maxsize > 0:
                memo[key] = result
                if len(memo) > maxsize:
                    del memo[next(iter(memo))]
            return result

    def cache_info():
        return functools._CacheInfo(hits, misses, maxsize, len(memo))

    def cache_clear():
        nonlocal hits, misses
        memo.clear()
        hits = misses = 0

    wrapper.cache_info, wrapper.cache_clear = cache_info, cache_clear
    wrapper.cache_parameters = lambda: {'maxsize': maxsize, 'typed': typed}
    return functools.update_wrapper(wrapper, user_function)


def lru_cache(maxsize=128, typed=False):
    """functools.lru_cache in plain Python, so a cached recursion stays off the browser's native stack."""
    if isinstance(maxsize, int):
        maxsize = max(maxsize, 0)
    elif callable(maxsize) and isinstance(typed, bool):
        return _cached(maxsize, 128, typed)
    elif maxsize is not None:
        raise TypeError('Expected first argument to be an integer, a callable, or None')
    return lambda user_function: _cached(user_function, maxsize, typed)


def cache(user_function):
    """functools.cache in plain Python (see lru_cache)."""
    return _cached(user_function, None, False)


functools.lru_cache, functools.cache = lru_cache, cache

_set_recursion_limit = sys.setrecursionlimit


def setrecursionlimit(limit):
    """sys.setrecursionlimit capped at RECURSION_LIMIT, so runaway recursion can't use up the page's memory."""
    _set_recursion_limit(min(limit, RECURSION_LIMIT) if isinstance(limit, int) else limit)


sys.setrecursionlimit = setrecursionlimit
_set_recursion_limit(RECURSION_LIMIT)


class HarnessError(Exception):
    """A problem with the learner's result that is not a Python exception (wrong type, a cycle...)."""


class MutationError(Exception):
    def __init__(self, name):
        super().__init__(f'Your code changed the input `{name}`. This problem requires leaving it unchanged.')


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        vals, node = [], self
        while node is not None and len(vals) < 12:
            vals.append(repr(node.val))
            node = node.next
        return 'ListNode(' + ' -> '.join(vals) + (' -> ...' if node is not None else '') + ')'


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f'TreeNode({self.val!r})'


class GraphNode:
    """LeetCode's Node for Clone Graph."""

    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

    def __repr__(self):
        return f'Node({self.val!r})'


class RandomNode:
    """LeetCode's Node for Copy List with Random Pointer."""

    def __init__(self, x, next=None, random=None):
        self.val = int(x)
        self.next = next
        self.random = random

    def __repr__(self):
        return f'Node({self.val!r})'


NODE_CLASSES = {'graph': GraphNode, 'random': RandomNode}
# Attributes that link the course's nodes to other objects, and how many attributes a plain node has.
NODE_LINKS = {ListNode: (('next',), 2), TreeNode: (('left', 'right'), 3), GraphNode: (('neighbors',), 2),
              RandomNode: (('next', 'random'), 3)}


# ------------------------------------------------------------------ data structures

def clone(v):
    """Deep copy of JSON-like data; fast on big flat lists."""
    t = type(v)
    if t is list:
        return [clone(x) if type(x) in (list, dict) else x for x in v]
    if t is dict:
        return {k: clone(x) for k, x in v.items()}
    return v


def build_list(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def dump_list(head, limit=1_000_000):
    out, node = [], head
    while node is not None:
        if len(out) >= limit:
            raise HarnessError('The returned linked list never ends: it probably has a cycle.')
        if not isinstance(node, ListNode):
            raise HarnessError(f'Expected a ListNode in the list, found {type(node).__name__}.')
        out.append(node.val)
        node = node.next
    return out


def build_tree(level):
    if not level or level[0] is None:
        return None
    root = TreeNode(level[0])
    queue, i = deque([root]), 1
    while queue and i < len(level):
        node = queue.popleft()
        if i < len(level) and level[i] is not None:
            node.left = TreeNode(level[i])
            queue.append(node.left)
        i += 1
        if i < len(level) and level[i] is not None:
            node.right = TreeNode(level[i])
            queue.append(node.right)
        i += 1
    return root


def dump_tree(root, limit=1_000_000):
    if root is None:
        return []
    out, queue, seen = [], deque([root]), 0
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        if not isinstance(node, TreeNode):
            raise HarnessError(f'Expected a TreeNode, found {type(node).__name__}.')
        seen += 1
        if seen > limit:
            raise HarnessError('The returned tree never ends: a node is probably its own descendant.')
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out


def find_node(root, val):
    stack = [root]
    while stack:
        node = stack.pop()
        if node is None:
            continue
        if node.val == val:
            return node
        stack.append(node.left)
        stack.append(node.right)
    raise HarnessError(f'Test data error: no node with value {val!r} in the tree.')


def build_random_list(pairs):
    nodes = [RandomNode(v) for v, _ in pairs]
    for i, (_, r) in enumerate(pairs):
        if i + 1 < len(nodes):
            nodes[i].next = nodes[i + 1]
        nodes[i].random = nodes[r] if r is not None else None
    return (nodes[0] if nodes else None), {id(n) for n in nodes}


def dump_random_list(head, originals, limit=1_000_000):
    order, index, node = [], {}, head
    while node is not None:
        if id(node) in originals:
            raise HarnessError('Your copy reuses a node from the original list. Every node in the copy must be new.')
        if len(order) >= limit:
            raise HarnessError('The copied list never ends: it probably has a cycle.')
        index[id(node)] = len(order)
        order.append(node)
        node = node.next
    out = []
    for n in order:
        r = n.random
        if r is not None and id(r) in originals:
            raise HarnessError('A random pointer in your copy points into the original list. Point it at a new node.')
        if r is not None and id(r) not in index:
            raise HarnessError('A random pointer in your copy points at a node that is not in the copied list.')
        out.append([n.val, index[id(r)] if r is not None else None])
    return out


def build_graph(adj):
    if not adj:
        return None, set()
    nodes = [GraphNode(i + 1) for i in range(len(adj))]
    for i, nbrs in enumerate(adj):
        nodes[i].neighbors = [nodes[j - 1] for j in nbrs]
    return nodes[0], {id(n) for n in nodes}


def dump_graph(node, originals):
    if node is None:
        return []
    seen, queue = {}, deque([node])
    while queue:
        cur = queue.popleft()
        if id(cur) in originals:
            raise HarnessError('Your clone reuses a node from the original graph. Every node in the clone must be new.')
        if cur.val in seen:
            if seen[cur.val] is not cur:
                raise HarnessError(f'Your clone has two different nodes with value {cur.val}.')
            continue
        seen[cur.val] = cur
        queue.extend(cur.neighbors)
    return [[nb.val for nb in seen[v].neighbors] for v in range(1, max(seen) + 1)] if seen else []


def normalize(v, depth=0):
    """JSON-like view of a return value: tuples -> lists, sets -> sorted lists, nodes -> LeetCode lists."""
    if depth > 1000:
        raise HarnessError('The returned value is nested too deeply to read.')
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        return v if math.isfinite(v) else repr(v)
    if isinstance(v, (list, tuple)):
        return [normalize(x, depth + 1) for x in v]
    if isinstance(v, (set, frozenset)):
        items = [normalize(x, depth + 1) for x in v]
        try:
            return sorted(items)
        except TypeError:
            return items
    if isinstance(v, dict):
        return {str(k): normalize(x, depth + 1) for k, x in v.items()}
    if isinstance(v, ListNode):
        return dump_list(v)
    if isinstance(v, TreeNode):
        return dump_tree(v)
    raise HarnessError(f'Cannot read a return value of type {type(v).__name__}.')


def to_js(v):
    """Make data JSON-safe for JavaScript: ints beyond 2**53 become {"$big": "..."}."""
    if isinstance(v, bool) or v is None or isinstance(v, (str, float)):
        return v
    if isinstance(v, int):
        return {'$big': str(v)} if abs(v) > SAFE_INT else v
    if isinstance(v, (list, tuple)):
        return [to_js(x) for x in v]
    if isinstance(v, dict):
        return {str(k): to_js(x) for k, x in v.items()}
    return repr(v)


# ------------------------------------------------------------------ comparison

def same(a, b, tol):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, int) and isinstance(b, int):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=tol, abs_tol=tol)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(same(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(same(a[k], b[k], tol) for k in a)
    return type(a) is type(b) and a == b


def _canon(v, deep):
    if isinstance(v, list):
        items = [_canon(x, deep) for x in v]
        if deep:
            items.sort(key=_key)
        return items
    if isinstance(v, float):
        return round(v, 6)
    return v


def _key(v):
    return json.dumps(v, sort_keys=True)


def multiset_equal(expected, got, deep):
    if not isinstance(expected, list) or not isinstance(got, list) or len(expected) != len(got):
        return False
    return sorted(_key(_canon(x, deep)) for x in expected) == sorted(_key(_canon(x, deep)) for x in got)


# ------------------------------------------------------------------ output capture and errors

class CappedIO(io.TextIOBase):
    def __init__(self, cap=STDOUT_CAP):
        super().__init__()
        self.parts, self.size, self.cap, self.dropped = [], 0, cap, 0

    def writable(self):
        return True

    def write(self, s):
        if self.size < self.cap:
            take = s[: self.cap - self.size]
            self.parts.append(take)
            self.size += len(take)
            self.dropped += len(s) - len(take)
        else:
            self.dropped += len(s)
        return len(s)

    def getvalue(self):
        text = ''.join(self.parts)
        if self.dropped:
            text += f'\n… {self.dropped:,} more characters of output not shown'
        return text


def error_info(e, code, filename):
    if isinstance(e, SyntaxError) and e.filename == filename:
        return {'type': 'SyntaxError', 'message': e.msg, 'line': e.lineno, 'col': e.offset, 'frames': []}
    lines = code.splitlines()
    # Walk the traceback lazily and keep the last few frames from the learner's file. extract_tb would load
    # source for every frame, which takes seconds after a RecursionError 100,000 frames deep.
    frames = deque(maxlen=4)
    for frame, lineno in traceback.walk_tb(e.__traceback__):
        if frame.f_code.co_filename == filename:
            frames.append((lineno, frame.f_code.co_name))
    info = {
        'type': type(e).__name__, 'message': str(e), 'line': frames[-1][0] if frames else None,
        'frames': [{'line': ln, 'name': name, 'text': lines[ln - 1].strip() if 0 < ln <= len(lines) else ''} for ln, name in frames],
    }
    if isinstance(e, RecursionError):
        info['hint'] = ('Recursion went deeper than Python allows here (100,000 calls; a default Python allows 1,000). '
                        'Check the base case, or rewrite the recursion as a loop.')
    elif isinstance(e, SystemExit):
        info['message'] = 'Your code called exit(). Return the answer instead.'
    elif isinstance(e, (HarnessError, MutationError)):
        info['type'] = 'Result problem' if isinstance(e, HarnessError) else 'Input changed'
    return info


# ------------------------------------------------------------------ problems

def load_function(src, name):
    ns = {}
    exec(compile(src, f'<{name}>', 'exec'), ns)
    if name not in ns:
        raise RuntimeError(f'content error: the {name} block does not define {name}()')
    return ns[name]


class Problem:
    def __init__(self, spec):
        self.spec = spec
        self.kind = spec.get('kind', 'function')
        self.params = spec.get('params', [])
        self.ret = spec.get('ret', 'any')
        self.adapter = spec.get('adapter')
        self.mode = spec.get('compare', 'exact')
        self.tol = spec.get('tol', TOL)
        protected = set(spec.get('no_mutation', []))
        self.no_mutation = [i for i, p in enumerate(self.params) if p['name'] in protected]
        self._validator = None

    # ---- namespaces
    def namespace(self):
        ns = {'__name__': 'solution'}
        exec(_PRELUDE, ns)
        ns['ListNode'], ns['TreeNode'] = ListNode, TreeNode
        if self.spec.get('node'):
            ns['Node'] = NODE_CLASSES[self.spec['node']]
        return ns

    def target(self):
        if self.kind == 'codec':
            return 'Codec'
        if self.kind == 'design':
            return self.spec['class']
        return 'Solution'

    def load(self, code, filename='solution.py'):
        """Compile and execute a solution. Returns (namespace, None) or (None, error)."""
        ns = self.namespace()
        try:
            compiled = compile(code, filename, 'exec')
        except SyntaxError as e:
            return None, {'type': 'SyntaxError', 'message': e.msg, 'line': e.lineno, 'col': e.offset, 'frames': []}
        sink = CappedIO()
        try:
            with redirect_stdout(sink), redirect_stderr(sink):
                exec(compiled, ns)
        except BaseException as e:  # noqa: BLE001  learner code may raise anything
            info = error_info(e, code, filename)
            release(e)
            return None, info
        name = self.target()
        if not isinstance(ns.get(name), type):
            return None, {'type': 'Missing class', 'message': f'Define a class named {name}.', 'line': None, 'frames': []}
        if self.kind == 'function' and not callable(getattr(ns[name], self.spec['method'], None)):
            return None, {'type': 'Missing method', 'line': None, 'frames': [],
                          'message': f'Class Solution needs a method named {self.spec["method"]}.'}
        return ns, None

    # ---- calling
    def build_args(self, data):
        args, root = [], None
        for p, v in zip(self.params, data):
            conv = p.get('conv', 'any')
            if conv == 'any':
                x = clone(v)
            elif conv == 'ListNode':
                x = build_list(v)
            elif conv == 'ListNode[]':
                x = [build_list(item) for item in v]
            elif conv == 'TreeNode':
                x = build_tree(v)
                root = root if root is not None else x
            elif conv == 'TreeNodeRef':
                x = find_node(root, v)
            else:
                raise RuntimeError(f'unknown converter {conv}')
            args.append(x)
        return args

    def out(self, v):
        if v is None and self.ret in ('ListNode', 'TreeNode'):
            return []  # an empty list or tree
        if self.ret == 'TreeNode.val':
            return v.val if isinstance(v, TreeNode) else normalize(v)
        return normalize(v)

    def call(self, ns, data, repeat=1, owned=None):
        """Run one test on fresh inputs and return the normalized output.

        Inputs, outputs and objects the learner's code made go into `owned`, for dispose()."""
        keep = owned.append if owned is not None else (lambda obj: None)
        if self.kind == 'design':
            return self._call_design(ns, data, keep)
        if self.kind == 'codec':
            return self._call_codec(ns, data, keep)
        solution = ns['Solution']()
        keep(solution)
        method = getattr(solution, self.spec['method'])
        if self.adapter == 'cycle-list':
            vals, pos = data
            head = build_list(vals)
            keep(head)
            if pos is not None and pos >= 0:
                nodes, n = [], head
                while n is not None:
                    nodes.append(n)
                    n = n.next
                nodes[-1].next = nodes[pos]
            got = method(head)
            keep(got)
            return self.out(got)
        if self.adapter == 'random-list':
            head, originals = build_random_list(data[0])
            keep(head)
            got = method(head)
            keep(got)
            return dump_random_list(got, originals)
        if self.adapter == 'graph':
            node, originals = build_graph(data[0])
            keep(node)
            got = method(node)
            keep(got)
            return dump_graph(got, originals)
        args = self.build_args(data)
        keep([a for a, p in zip(args, self.params) if p.get('conv', 'any') != 'any'])
        snapshots = [normalize(args[i]) for i in self.no_mutation]
        got = None
        for _ in range(repeat):
            got = method(*args)
            keep(got)
        if self.adapter == 'in-place':
            result = normalize(args[self.spec.get('inplace', 0)])
        else:
            result = self.out(got)
        for k, i in enumerate(self.no_mutation):
            if normalize(args[i]) != snapshots[k]:
                raise MutationError(self.params[i]['name'])
        return result

    def _call_design(self, ns, data, keep):
        ops, args = data['ops'], data['args']
        obj = ns[self.spec['class']](*clone(args[0]))
        keep(obj)
        out = [None]
        for k in range(1, len(ops)):
            fn = getattr(obj, ops[k], None)
            if not callable(fn):
                raise HarnessError(f'{self.spec["class"]} has no method {ops[k]}.')
            out.append(normalize(fn(*clone(args[k]))))
        return out

    def _call_codec(self, ns, data, keep):
        codec = ns['Codec']
        if self.spec.get('codec') == 'tree':
            root = build_tree(data[0])
            keep(root)
            text = codec().serialize(root)
            if not isinstance(text, str):
                raise HarnessError(f'serialize must return a str, got {type(text).__name__}.')
            copy = codec().deserialize(text)
            keep(copy)
            return dump_tree(copy)
        text = codec().encode(clone(data[0]))
        if not isinstance(text, str):
            raise HarnessError(f'encode must return a str, got {type(text).__name__}.')
        return normalize(codec().decode(text))

    # ---- comparing
    def compare(self, expected, got, data):
        if self.mode == 'validator':
            if self._validator is None:
                self._validator = load_function(self.spec['validator'], 'check')
            res = self._validator(clone(data), got)
            return (res, '') if isinstance(res, bool) else (bool(res[0]), res[1] if len(res) > 1 else '')
        if self.kind == 'design' and isinstance(expected, list) and isinstance(got, list):
            for k, (e, g) in enumerate(zip(expected, got)):
                if not same(e, g, self.tol):
                    return False, f'Call {k + 1}: {data["ops"][k]}() returned {pylit(g)}, expected {pylit(e)}.'
            return len(expected) == len(got), ''
        if got is None and expected is not None:
            return False, 'Your function returned None. Did you forget to return the answer?'
        if self.mode in ('exact', 'float'):
            return same(expected, got, self.tol), ''
        if self.mode in ('unordered', 'unordered-deep'):
            return multiset_equal(expected, got, self.mode == 'unordered-deep'), ''
        raise RuntimeError(f'unknown compare mode {self.mode}')

    # ---- display
    def describe_input(self, data, budget=220):
        if self.kind == 'design':
            return 'ops = ' + pylit(data['ops'], budget) + ', args = ' + pylit(data['args'], budget)
        names = [p['name'] for p in self.params] or ['input']
        if self.adapter == 'cycle-list':
            names = ['head', 'pos']
        return ', '.join(f'{n} = {grid_lit(v) or pylit(v, budget)}' for n, v in zip(names, data))

    def data_of(self, test):
        return {'ops': test['ops'], 'args': test['args']} if self.kind == 'design' else test['args']

    def expected_of(self, test):
        if 'out' in test:
            return test['out']
        if self.kind == 'codec':
            return clone(test['args'][0])
        return None


def grid_lit(v):
    """A small rectangular grid as a literal with one row per line, or None for anything else."""
    if not (isinstance(v, list) and 2 <= len(v) <= 30 and all(isinstance(r, list) for r in v)):
        return None
    width = len(v[0])
    if width < 2 or any(len(r) != width for r in v):
        return None
    rows = [pylit(r) for r in v]
    if max(map(len, rows)) > 80:
        return None
    return '[\n' + ''.join(f'    {r},\n' for r in rows) + ']'


def pylit(v, budget=220):
    """Python-style literal with long lists abbreviated."""
    s = _pylit(v, [budget])
    return s


def _pylit(v, budget):
    if v is None:
        return 'None'
    if v is True:
        return 'True'
    if v is False:
        return 'False'
    if isinstance(v, str):
        if len(v) > 120:
            return f'{json.dumps(v[:60], ensure_ascii=False)[:-1]}… {len(v) - 75:,} more characters …{json.dumps(v[-15:], ensure_ascii=False)[1:]}'
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, dict) and set(v) == {'$big'}:
        return v['$big']
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, tuple)):
        n = len(v)
        if n > 14 and budget[0] < 10_000:
            head = ', '.join(_pylit(x, budget) for x in v[:8])
            tail = ', '.join(_pylit(x, budget) for x in v[-3:])
            return f'[{head}, … {n - 11:,} more …, {tail}]'
        return '[' + ', '.join(_pylit(x, budget) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ', '.join(f'{_pylit(k, budget)}: {_pylit(x, budget)}' for k, x in v.items()) + '}'
    return repr(v)


def size_label(problem, data):
    """'n = 100,000' style label for the performance test."""
    if problem.kind == 'design':
        return f'{len(data["ops"]):,} calls'
    for p, v in zip(problem.params, data):
        if isinstance(v, (list, str)) and len(v) > 50:
            return f'len({p["name"]}) = {len(v):,}'
    return 'large input'


def small(v, limit=4000):
    """Keep a value for display only when it is small; big values travel as a preview string."""
    text = json.dumps(to_js(v))
    return v if len(text) <= limit else {'$preview': pylit(v)}


# ------------------------------------------------------------------ running tests

def run_case(problem, ns, data, expected, code, filename='solution.py', repeat=1, compare=True):
    sink, owned = CappedIO(), []
    t0 = time.perf_counter()
    try:
        with redirect_stdout(sink), redirect_stderr(sink):
            got = problem.call(ns, data, repeat, owned)
        ms = (time.perf_counter() - t0) * 1000
    except BaseException as e:  # noqa: BLE001
        ms = (time.perf_counter() - t0) * 1000
        info = error_info(e, code, filename)
        release(e)
        dispose(owned)
        return {'status': 'error', 'error': info, 'stdout': sink.getvalue(), 'ms': ms}
    dispose(owned)
    res = {'status': 'pass', 'got': got, 'stdout': sink.getvalue(), 'ms': ms}
    if compare:
        ok, msg = problem.compare(expected, got, data)
        if not ok:
            res['status'], res['message'] = 'fail', msg
    return res


def _event(emit, **kw):
    if emit is not None:
        emit(kw)


def _expected(problem, ns, data, code, filename):
    r = run_case(problem, ns, data, None, code, filename, compare=False)
    if r['status'] != 'pass':
        raise RuntimeError(f'{filename} failed on generated input {problem.describe_input(data)}: {json.dumps(r.get("error"))}')
    return r['got']


def make_cases(problem, spec, group, opts, exp):
    """exp: {'random': (ns, code, filename), 'perf': (ns, code, filename)} solvers for expected values."""
    if group in ('examples', 'edge'):
        tests = spec.get(group, [])
        return [{'name': t.get('name') or f'Example {i + 1}', 'data': problem.data_of(t), 'expected': problem.expected_of(t)}
                for i, t in enumerate(tests)]
    if group == 'random':
        gen = load_function(spec['gen'], 'gen')
        cases = []
        for size, count, base in (('small', opts.get('random_small', 30), 0), ('medium', opts.get('random_medium', 10), 500)):
            for k in range(count):
                seed = spec['id'] * 1000 + base + k
                data = gen(random.Random(seed), size)
                if problem.kind == 'codec':
                    expected = clone(data[0])
                else:
                    ns, code, filename = exp['random']
                    expected = _expected(problem, ns, data, code, filename)
                cases.append({'name': f'random {size} input #{k + 1}', 'seed': seed, 'data': data, 'expected': expected})
        return cases
    perf = load_function(spec['perf'], 'perf')
    data = perf(random.Random(spec['id']))
    t0 = time.perf_counter()
    if problem.kind == 'codec':
        expected = clone(data[0])
    else:
        ns, code, filename = exp['perf']
        r = run_case(problem, ns, data, None, code, filename, repeat=spec.get('perf_repeat', 1), compare=False)
        if r['status'] != 'pass':
            raise RuntimeError(f'reference failed on the performance input: {json.dumps(r.get("error"))}')
        expected = r['got']
    ref_ms = (time.perf_counter() - t0) * 1000
    return [{'name': 'performance test', 'seed': spec['id'], 'data': data, 'expected': expected, 'ref_ms': ref_ms,
             'label': size_label(problem, data)}]


def check(payload, emit):
    spec, code, opts = payload['problem'], payload['code'], payload.get('opts', {})
    problem = Problem(spec)
    ns, err = problem.load(code)
    if err:
        return {'status': 'compile_error', 'error': err, 'groups': []}
    exp = {}
    if problem.kind != 'codec':
        ref_ns, ref_err = problem.load(spec['reference'], 'reference.py')
        if ref_err:
            raise RuntimeError('reference does not load: ' + json.dumps(ref_err))
        exp = {'random': (ref_ns, spec['reference'], 'reference.py'), 'perf': (ref_ns, spec['reference'], 'reference.py')}
        if opts.get('random_expected') == 'oracle':
            src = spec['oracle']
            if 'class ' not in src:  # a plain oracle(...) function: wrap it as a Solution
                src += f'\n\nclass Solution:\n    def {spec["method"]}(self, *args):\n        return oracle(*args)\n'
            o_ns, o_err = problem.load(src, 'oracle.py')
            if o_err:
                raise RuntimeError('oracle does not load: ' + json.dumps(o_err))
            exp['random'] = (o_ns, src, 'oracle.py')
    test_limit = opts.get('test_limit_ms', 3000)
    perf_limit = opts.get('perf_limit_ms', spec.get('limits', {}).get('perf_ms', 3000))
    groups = opts.get('groups', GROUPS)
    result = {'status': 'accepted', 'groups': []}
    for group in GROUPS:
        if group not in groups or (group == 'perf' and not spec.get('perf')) or (group == 'random' and not spec.get('gen')):
            continue
        _event(emit, event='prepare', group=group, limit_ms=opts.get('prepare_limit_ms', 60000))
        cases = make_cases(problem, spec, group, opts, exp)
        g = {'name': group, 'total': len(cases), 'passed': 0}
        for i, case in enumerate(cases):
            limit = perf_limit if group == 'perf' else test_limit
            _event(emit, event='start', group=group, index=i, limit_ms=limit, name=case['name'], label=case.get('label'))
            r = run_case(problem, ns, case['data'], case['expected'], code, repeat=spec.get('perf_repeat', 1) if group == 'perf' else 1)
            _event(emit, event='end', group=group, index=i, status=r['status'], ms=r['ms'])
            if group == 'perf':
                result['perf'] = {'ms': r['ms'], 'ref_ms': case['ref_ms'], 'limit_ms': perf_limit, 'label': case['label']}
            if r['status'] == 'pass':
                g['passed'] += 1
            elif 'failure' not in g:
                g['failure'] = {
                    'group': group, 'index': i, 'name': case['name'], 'seed': case.get('seed'),
                    'input': problem.describe_input(case['data']), 'data': small(case['data']),
                    'expected': small(case['expected']), 'got': small(r.get('got')), 'status': r['status'],
                    'message': r.get('message', ''), 'error': r.get('error'), 'stdout': r.get('stdout', ''),
                }
        result['groups'].append(g)
        if 'failure' in g:
            result['failure'] = g['failure']
            result['status'] = 'error' if g['failure']['status'] == 'error' else 'wrong'
            break
    return result


def run(payload, emit):
    spec, code = payload['problem'], payload['code']
    problem = Problem(spec)
    ns, err = problem.load(code)
    if err:
        return {'status': 'compile_error', 'error': err, 'tests': []}
    tests = payload.get('tests') or spec.get('examples', [])
    out = []
    for i, t in enumerate(tests):
        data, expected = problem.data_of(t), problem.expected_of(t)
        _event(emit, event='start', group='examples', index=i, limit_ms=payload.get('test_limit_ms', 3000), name=t.get('name') or f'Example {i + 1}')
        r = run_case(problem, ns, data, expected, code)
        _event(emit, event='end', group='examples', index=i, status=r['status'], ms=r['ms'])
        out.append({'index': i, 'name': t.get('name') or f'Example {i + 1}', 'input': problem.describe_input(data),
                    'expected': small(expected), 'got': small(r.get('got')), 'status': r['status'],
                    'expected_text': pylit(expected), 'got_text': pylit(r.get('got')) if r['status'] != 'error' else '',
                    'message': r.get('message', ''), 'error': r.get('error'), 'stdout': r.get('stdout', ''), 'ms': r['ms']})
    return {'status': 'ok', 'tests': out}


def exec_code(payload, emit):
    code = payload['code']
    sink = CappedIO(payload.get('cap', 20000))
    ns = {'__name__': '__main__'}
    _event(emit, event='start', group='exec', index=0, limit_ms=payload.get('limit_ms', 10000))
    t0 = time.perf_counter()
    err = None
    try:
        compiled = compile(code, 'main.py', 'exec')
        with redirect_stdout(sink), redirect_stderr(sink):
            exec(compiled, ns)
    except BaseException as e:  # noqa: BLE001
        err = error_info(e, code, 'main.py')
        release(e)
    ms = (time.perf_counter() - t0) * 1000
    owned = list(ns.values())
    ns.clear()
    dispose(owned)
    return {'stdout': sink.getvalue(), 'error': err, 'ms': ms}


def perf_time(payload, emit):
    spec, code = payload['problem'], payload['code']
    problem = Problem(spec)
    ns, err = problem.load(code)
    if err:
        raise RuntimeError('perf_time: code does not load: ' + json.dumps(err))
    data = load_function(spec['perf'], 'perf')(random.Random(spec['id']))
    best = math.inf
    for _ in range(payload.get('runs', 3)):
        r = run_case(problem, ns, data, None, code, repeat=spec.get('perf_repeat', 1), compare=False)
        if r['status'] != 'pass':
            raise RuntimeError('perf_time: run failed: ' + json.dumps(r.get('error')))
        best = min(best, r['ms'])
    return {'ms': best}


def conv_for(annotation):
    a = annotation.replace(' ', '')
    if 'ListNode' in a:
        return 'ListNode[]' if a.startswith(('List[', 'list[')) else 'ListNode'
    if 'TreeNode' in a:
        return 'TreeNode'
    return 'any'


def describe(payload, emit):
    sig = payload['signature'].strip().rstrip(':')
    fn = ast.parse(sig + ':\n    pass').body[0]
    params = []
    for a in fn.args.args[1:]:
        ann = ast.unparse(a.annotation) if a.annotation else ''
        params.append({'name': a.arg, 'annotation': ann, 'conv': conv_for(ann)})
    ret = ast.unparse(fn.returns) if fn.returns else ''
    return {'method': fn.name, 'params': params, 'ret': conv_for(ret), 'ret_annotation': ret}


def trace(payload, emit):
    import tracer  # lib/tracer.py, written next to this file
    return tracer.trace(payload, emit)


def step(payload, emit):
    import stepper  # lib/stepper.py, written next to this file
    return stepper.step(payload, emit, sys.modules[__name__])


FUNCS = {'run': run, 'check': check, 'exec': exec_code, 'perf_time': perf_time, 'describe': describe, 'trace': trace, 'step': step}


def entry(fn, payload_json, emit=None):
    _set_recursion_limit(RECURSION_LIMIT)
    payload = json.loads(payload_json)
    send = (lambda obj: emit(json.dumps(obj))) if emit is not None else None
    return json.dumps(to_js(FUNCS[fn](payload, send)))
