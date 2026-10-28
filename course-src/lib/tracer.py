"""Visualizer tracer: runs a small Python function and records one frame per executed line.

Frames carry the line that just finished, its caption and the values the page's renderers draw.
"""
import re
import sys

import harness

MAX_FRAMES = 400
CAPTION = re.compile(r'\s*#\s*@\s?(.*)$')
FIELD = re.compile(r'\{([^{}]+)\}')


class StopTrace(Exception):
    pass


def split_captions(src):
    lines, captions = [], {}
    for i, line in enumerate(src.split('\n'), start=1):
        m = CAPTION.search(line)
        if m and line[: m.start()].strip():
            captions[i] = m.group(1).strip()
            line = line[: m.start()].rstrip()
        lines.append(line)
    return '\n'.join(lines), captions


def fmt(v):
    if isinstance(v, float):
        return f'{v:g}'
    return str(v)


def reach(*starts):
    """Every node reachable from the given nodes by following .next, each once, in the order first met."""
    out, seen = [], set()
    for node in starts:
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            out.append(node)
            node = getattr(node, 'next', None)
    return out


def own_code(code):
    """The code objects to trace: the function itself and functions defined inside it, but not generator
    expressions or lambdas, which run in frames where the function's variables don't exist."""
    found, todo = set(), [code]
    while todo:
        c = todo.pop()
        if c.co_name.startswith('<') and c is not code:
            continue
        found.add(c)
        todo.extend(k for k in c.co_consts if isinstance(k, type(code)))
    return found


class Snapshotter:
    def __init__(self):
        self.ids = {}

    def node_id(self, x):
        if x is None:
            return None
        key = id(x)
        if key not in self.ids:
            self.ids[key] = len(self.ids)
        return self.ids[key]

    def nodes(self, seq):
        return [{'id': self.node_id(n), 'val': self.value(getattr(n, 'val', None)),
                 'next': self.node_id(getattr(n, 'next', None))} for n in seq]

    def tree(self, root):
        out, stack = [], [root]
        while stack:
            n = stack.pop()
            if n is None:
                continue
            out.append({'id': self.node_id(n), 'val': self.value(n.val), 'left': self.node_id(n.left), 'right': self.node_id(n.right)})
            stack.append(n.right)
            stack.append(n.left)
        return {'root': self.node_id(root), 'nodes': out}

    def trie(self, root):
        """A trie (nodes with a `children` dict and an `end` flag) as an n-ary tree for the tree renderer."""
        nodes, stack = [], [(root, '')]
        while stack:
            node, letter = stack.pop()
            kids = sorted(node.children.items())
            nodes.append({'id': self.node_id(node), 'val': letter or None, 'kids': [self.node_id(c) for _, c in kids],
                          'end': bool(getattr(node, 'end', False))})
            stack.extend((c, ch) for ch, c in reversed(kids))
        return {'root': self.node_id(root), 'nodes': nodes}

    def trie_path(self, root, target):
        """Node ids from a trie's root down to target, or [] when target is None or not in the trie."""
        stack = [(root, [root])] if target is not None else []
        while stack:
            node, path = stack.pop()
            if node is target:
                return [self.node_id(n) for n in path]
            stack.extend((c, path + [c]) for c in node.children.values())
        return []

    def forest(self, parent):
        """Union-find parent links (a list or a dict) as trees, roots side by side, for the tree renderer."""
        items = list(parent.items()) if isinstance(parent, dict) else list(enumerate(parent))
        kids, roots = {x: [] for x, _ in items}, []
        for x, p in items:
            if p == x:
                roots.append(x)
            else:
                kids.setdefault(p, []).append(x)
        return {'roots': [self.value(r) for r in roots],
                'nodes': [{'id': self.value(x), 'val': self.value(x), 'kids': [self.value(k) for k in kids[x]]} for x, _ in items]}

    def entries(self, d):
        """A hash map's contents, keeping key types and insertion order (for the map renderer)."""
        return {'$map': [[self.value(k), self.value(x)] for k, x in list(d.items())[:200]]}

    def value(self, v, depth=0):
        if v is None or isinstance(v, (bool, int, float, str)):
            return v
        if depth > 6:
            return '…'
        if isinstance(v, (list, tuple)) or type(v).__name__ == 'deque':
            return [self.value(x, depth + 1) for x in list(v)[:400]]
        if isinstance(v, (set, frozenset)):
            items = [self.value(x, depth + 1) for x in v]
            try:
                items.sort()
            except TypeError:
                pass
            return {'$set': items}
        if isinstance(v, dict):
            if set(v) == {'$map'}:
                return v
            return {str(k): self.value(x, depth + 1) for k, x in list(v.items())[:200]}
        if hasattr(v, 'val'):
            return {'$node': self.node_id(v), 'val': self.value(v.val, depth + 1)}
        return repr(v)

    def helpers(self):
        return {'node_id': self.node_id, 'nodes': self.nodes, 'tree': self.tree, 'entries': self.entries, 'reach': reach, 'trie': self.trie, 'trie_path': self.trie_path, 'forest': self.forest,
                'ids': lambda seq: [self.node_id(x) for x in seq], 'len': len, 'min': min, 'max': max,
                'sorted': sorted, 'list': list, 'range': range, 'enumerate': enumerate, 'abs': abs, 'sum': sum}


def trace(payload, emit=None):
    src, spec, args = payload['code'], payload['spec'], payload.get('args', {})
    code, captions = split_captions(src)
    ns = {}
    exec(compile(code, '<viz>', 'exec'), ns)
    fn = ns[spec['function']]
    snap = Snapshotter()
    helpers = snap.helpers()
    mode = spec.get('mode', 'lines')
    frames, pending, calls, stack = [], {}, [], []
    state = {'truncated': False}

    see_outer = spec.get('see_outer', False)

    def env_for(frame, line, event, ret=None):
        env = {}
        if see_outer:  # also see the variables of the traced functions this frame was called from
            chain, f = [], frame.f_back
            while f is not None and f.f_code in traced:
                chain.append(f)
                f = f.f_back
            for f in reversed(chain):
                env.update(f.f_locals)
        env.update(frame.f_locals)
        env.update({'__line__': line, '__event__': event, '__return__': ret, '__depth__': len(stack)})
        return env

    def caption(line, env):
        tpl = captions.get(line, '')

        def sub(m):
            try:
                return fmt(eval(m.group(1), helpers, env))
            except Exception:  # noqa: BLE001
                return m.group(0)
        return FIELD.sub(sub, tpl)

    def channels(env):
        out = []
        for item in spec.get('layout', []):
            ch = {}
            for key, expr in item.get('bind', {}).items():
                try:
                    ch[key] = snap.value(eval(expr, helpers, env))
                except Exception:  # noqa: BLE001
                    ch[key] = None
            out.append(ch)
        return out

    def record(frame, line, event, ret=None):
        if len(frames) >= MAX_FRAMES:
            state['truncated'] = True
            raise StopTrace()
        env = env_for(frame, line, event, ret)
        frames.append({'line': line, 'event': event, 'caption': caption(line, env), 'channels': channels(env),
                       'calls': [dict(c) for c in calls] if mode == 'calls' else None})

    traced = own_code(fn.__code__)
    # In calls mode, the calls of one function form the tree: the visualized function itself, or a function
    # defined inside it (spec "calls_of"), such as a backtrack helper.
    call_code = fn.__code__
    if spec.get('calls_of'):
        named = [c for c in traced if c.co_name == spec['calls_of']]
        if not named:
            raise ValueError(f"calls_of: no function named {spec['calls_of']} inside {spec['function']}")
        call_code = named[0]

    def tracer(frame, event, arg):
        # Only the visualized function and functions defined inside it. Helpers at module level (a node
        # class, a list builder) run untraced.
        if frame.f_code not in traced:
            return None
        key = id(frame)
        if event == 'call':
            if mode == 'calls' and frame.f_code is call_code:
                env = env_for(frame, frame.f_lineno, 'call')
                try:
                    label = str(eval(spec.get('call_label', 'f"{__name__}()"'), helpers, env))
                except Exception:  # noqa: BLE001
                    label = '?'
                calls.append({'id': len(calls), 'parent': stack[-1] if stack else None, 'label': label, 'ret': None, 'state': 'active'})
                stack.append(len(calls) - 1)
                record(frame, frame.f_lineno, 'call')
            return tracer
        if event == 'line':
            if key in pending:
                record(frame, pending[key], 'line')
            pending[key] = frame.f_lineno
        elif event == 'return':
            line = pending.pop(key, frame.f_lineno)
            if mode == 'calls' and frame.f_code is call_code and stack:
                node = calls[stack.pop()]
                node['ret'], node['state'] = snap.value(arg), 'done'
                record(frame, line, 'return', arg)
            else:
                record(frame, line, 'line', arg)
        return tracer

    result, error = None, None
    sys.settrace(tracer)
    try:
        result = fn(**args)
    except StopTrace as e:
        harness.release(e)
    except Exception as e:  # noqa: BLE001
        error = f'{type(e).__name__}: {e}'
        harness.release(e)
    finally:
        sys.settrace(None)
    # Show the code from the visualized function on, numbered from 1: helpers defined above it (a node class,
    # a builder) stay out of the way. Layout expressions still see the file's own line numbers in __line__.
    first = fn.__code__.co_firstlineno
    for f in frames:
        f['line'] -= first - 1
    out = {'frames': frames, 'code': code.split('\n')[first - 1 :], 'truncated': state['truncated'], 'error': error,
           'result': snap.value(result)}
    owned = [result, *ns.values()]
    ns.clear()
    result = fn = None
    harness.dispose(owned)
    return out
