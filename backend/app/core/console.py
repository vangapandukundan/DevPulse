"""
Shared Rich console configured for Windows compatibility.
Uses force_terminal=True to avoid legacy Windows renderer with Unicode issues.
"""
import sys
from rich.console import Console

# Force UTF-8 output, disable legacy Windows renderer
console = Console(
    file=sys.stdout,
    force_terminal=True,
    width=120,
    highlight=False,
)
