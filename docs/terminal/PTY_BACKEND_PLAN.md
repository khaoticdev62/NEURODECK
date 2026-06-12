# PTY Backend Plan

The PTY backend is the source of truth for terminal execution.

Requirements:

- spawn real shell processes
- stream stdout/stderr
- accept user input
- resize with viewport changes
- kill and restart sessions safely

