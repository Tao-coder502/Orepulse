import importlib, inspect, json, sys

pkg = importlib.import_module('google_antigravity')
public = [name for name in dir(pkg) if not name.startswith('_')]
print('Public symbols:', json.dumps(public, indent=2))

# For each public attribute, if it's a class, print its methods
for name in public:
    obj = getattr(pkg, name)
    if inspect.isclass(obj):
        methods = [m for m in dir(obj) if not m.startswith('_')]
        print(f'Class {name} methods:', json.dumps(methods, indent=2))
    elif inspect.isfunction(obj):
        sig = str(inspect.signature(obj))
        print(f'Function {name}{sig}')
