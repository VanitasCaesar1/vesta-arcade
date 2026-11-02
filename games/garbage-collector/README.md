# Garbage Collector

You are the garbage collector. Stack frames and globals (the roots) hold references into the heap, and the program keeps allocating, dropping references and returning from functions.

- **Click** an object that no root can reach to free it.
- Free something still reachable and you **segfault**. Three and the process core-dumps.
- Let the heap fill and the kernel **OOM-kills** you. The heap grows a little as you level up.
- **Cycles** are the trap: objects that point at each other aren't reachable unless a root points at one of them.
- Hover an object to highlight who references it. **Space** stops the world and collects everything, for a score penalty and a 30 second cooldown.

One HTML file, no dependencies, about 450 lines of canvas. Written with Claude Code and published with [Vesta](../../README.md). `?demo` plays itself.
