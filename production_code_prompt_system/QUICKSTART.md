# Quickstart

## Best Starting Point

Use this file first:

```txt
prompts/14_ai_agent_orchestration.md
```

It decides which specialist prompt should run based on the repository and your task.

## First Message To Paste Into Your AI Coding Tool

```md
Use the AI Agent Orchestration prompt. Begin with discovery only. Detect the stack, verify real commands, map the repository, classify the task, select the right specialist module, identify high-risk files, and do not modify files yet.
```

## After Discovery

```md
Proceed with the smallest safe work unit first. Preserve behavior, add or update tests, provide rollback, and verify with real commands only.
```

## Before Release

```md
Use the Final Production Readiness + Release Certification prompt. Perform a strict go/no-go release certification. Do not approve release without evidence.
```

## The Big Rule

If the AI cannot verify something, it must say so.

No fake confidence. No fake commands. No fake APIs.
