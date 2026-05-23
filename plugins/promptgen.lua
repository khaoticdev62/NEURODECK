-- plugins/promptgen.lua
-- Prompt Lab plugin — exposes /promptlab and /promptgen <task> slash commands.
-- Registered formulas follow AIDA, SCQA, PASTOR, CoT, ToT, PAS, Role+Constraints patterns
-- derived from the NEURODECK Executive Prompt Generator spec.

-- ─────────────────────────────────────────────────────────────────────────────
-- Formula definitions
-- ─────────────────────────────────────────────────────────────────────────────
local FORMULAS = {
    AIDA = {
        label = "AIDA (Attention › Interest › Desire › Action)",
        template = function(task)
            return string.format(
                "You are an expert copywriter. Write a persuasive response for the following task using the AIDA framework:\n\n" ..
                "ATTENTION: Hook the reader immediately.\n" ..
                "INTEREST: Build relevance and context.\n" ..
                "DESIRE: Show value and benefit.\n" ..
                "ACTION: State a clear next step.\n\n" ..
                "Task: %s", task)
        end
    },
    SCQA = {
        label = "SCQA (Situation › Complication › Question › Answer)",
        template = function(task)
            return string.format(
                "Respond to the following task using the SCQA consulting narrative framework:\n\n" ..
                "SITUATION: Establish the current context.\n" ..
                "COMPLICATION: Identify the core tension or problem.\n" ..
                "QUESTION: State what needs to be resolved.\n" ..
                "ANSWER: Provide your recommendation.\n\n" ..
                "Task: %s", task)
        end
    },
    PASTOR = {
        label = "PASTOR (Problem › Amplify › Story › Transformation › Offer › Response)",
        template = function(task)
            return string.format(
                "Apply the PASTOR copywriting framework to this task:\n\n" ..
                "PROBLEM: Define the pain point clearly.\n" ..
                "AMPLIFY: Show the cost of inaction.\n" ..
                "STORY: Share a relatable scenario.\n" ..
                "TRANSFORMATION: Demonstrate the outcome.\n" ..
                "OFFER: Present the solution.\n" ..
                "RESPONSE: Call to action.\n\n" ..
                "Task: %s", task)
        end
    },
    CoT = {
        label = "Chain of Thought (Step-by-step reasoning)",
        template = function(task)
            return string.format(
                "Think through this step by step before giving your final answer. " ..
                "Show your reasoning explicitly at each stage. " ..
                "Label each step (Step 1, Step 2, etc.) and end with a clear final answer.\n\n" ..
                "Task: %s", task)
        end
    },
    ToT = {
        label = "Tree of Thought (Explore multiple reasoning paths)",
        template = function(task)
            return string.format(
                "Use a Tree of Thought approach. Generate three distinct reasoning branches " ..
                "for this task, evaluate each one, then select and complete the most promising path.\n\n" ..
                "Branch A: [first approach]\n" ..
                "Branch B: [second approach]\n" ..
                "Branch C: [third approach]\n\n" ..
                "Evaluation: Identify which branch is strongest and why.\n\n" ..
                "Final answer: Complete the winning branch in full.\n\n" ..
                "Task: %s", task)
        end
    },
    PAS = {
        label = "PAS (Problem › Agitate › Solution)",
        template = function(task)
            return string.format(
                "Use the PAS framework to address this task:\n\n" ..
                "PROBLEM: Describe the problem concisely.\n" ..
                "AGITATE: Intensify the urgency — what happens if this isn't solved?\n" ..
                "SOLUTION: Present the clear, actionable solution.\n\n" ..
                "Task: %s", task)
        end
    },
    RoleConstraints = {
        label = "Role + Constraints (Persona-driven with guardrails)",
        template = function(task)
            return string.format(
                "You are a senior expert in the domain most relevant to the task below. " ..
                "Constraints: Be concise. Use bullet points for lists. " ..
                "Avoid jargon unless technical precision is required. " ..
                "Do not hallucinate facts — state uncertainty explicitly. " ..
                "Format output for a professional audience.\n\n" ..
                "Task: %s", task)
        end
    },
}

local FORMULA_KEYS = {"AIDA","SCQA","PASTOR","CoT","ToT","PAS","RoleConstraints"}

-- ─────────────────────────────────────────────────────────────────────────────
-- /promptgen <task>  — wrap <task> in the default (CoT) formula and return it
-- ─────────────────────────────────────────────────────────────────────────────
registerCommand("promptgen", function(args)
    if not args or args == "" then
        return "Usage: /promptgen <task description>\n\nExample: /promptgen Explain quantum entanglement to a 10-year-old"
    end

    local formula = FORMULAS["CoT"]
    local prompt = formula.template(args)

    return string.format(
        "[Prompt Lab — CoT Formula]\n\n%s\n\n" ..
        "─────────────────────────────────────\n" ..
        "Tip: Open the Prompt Lab tab (★) to access all 7 formulas, template gallery, and JPE explanation.", prompt)
end)

-- ─────────────────────────────────────────────────────────────────────────────
-- /promptlab  — print formula index and direct user to the UI tab
-- ─────────────────────────────────────────────────────────────────────────────
registerCommand("promptlab", function(_args)
    local lines = {"[Prompt Lab — Formula Registry]\n"}
    for i, key in ipairs(FORMULA_KEYS) do
        local f = FORMULAS[key]
        table.insert(lines, string.format("  %d. %-18s %s", i, key, f.label))
    end
    table.insert(lines, "\nOpen the Prompt Lab tab (★ icon in the nav bar) for the full interactive UI.")
    table.insert(lines, "Or use: /promptgen <task>  to generate a CoT-wrapped prompt immediately.")
    return table.concat(lines, "\n")
end)

-- ─────────────────────────────────────────────────────────────────────────────
-- /formula <name> <task>  — apply a specific formula to a task
-- ─────────────────────────────────────────────────────────────────────────────
registerCommand("formula", function(args)
    if not args or args == "" then
        local keys = table.concat(FORMULA_KEYS, " | ")
        return "Usage: /formula <name> <task>\n\nAvailable: " .. keys
    end

    local name, rest = args:match("^(%S+)%s*(.*)")
    if not name then
        return "Usage: /formula <name> <task>"
    end

    -- Case-insensitive lookup
    local found_key = nil
    for _, key in ipairs(FORMULA_KEYS) do
        if key:lower() == name:lower() then
            found_key = key
            break
        end
    end

    if not found_key then
        local keys = table.concat(FORMULA_KEYS, ", ")
        return string.format("Unknown formula '%s'. Available: %s", name, keys)
    end

    if not rest or rest == "" then
        return string.format("Usage: /formula %s <task description>", found_key)
    end

    local formula = FORMULAS[found_key]
    local prompt = formula.template(rest)
    return string.format("[Prompt Lab — %s]\n\n%s", found_key, prompt)
end)

print("[Plugin] Prompt Lab loaded (/promptlab, /promptgen, /formula).")
