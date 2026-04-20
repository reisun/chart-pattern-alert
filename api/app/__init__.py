from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("chart-pattern-alert-api")
except PackageNotFoundError:
    __version__ = "0.1.0"
