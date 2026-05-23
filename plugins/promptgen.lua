-- plugins/promptgen.lua
-- Prompt Lab plugin — exposes /promptlab, /promptgen <task>, and /formula commands.
-- Also defines global prompt assembly functions for the S-Term Elite Prompt Lab UI.

-- ─────────────────────────────────────────────────────────────────────────────
-- Framework-specific formatting functions
-- ─────────────────────────────────────────────────────────────────────────────

local function format_default(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    if task and task ~= "" then
        table.insert(parts, "**Task/Objective:**\n" .. task)
    end
    if context and context ~= "" then
        table.insert(parts, "**Context/Background:**\n" .. context)
    end
    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_aida(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    
    local body = "Write a persuasive response for the following task using the AIDA framework:\n\n"
    if task and task ~= "" then
        body = body .. "**Task:** " .. task .. "\n"
    end
    if context and context ~= "" then
        body = body .. "**Context:** " .. context .. "\n"
    end
    body = body .. "\n" ..
        "ATTENTION: Hook the reader immediately.\n" ..
        "INTEREST: Build relevance and context.\n" ..
        "DESIRE: Show value and benefit.\n" ..
        "ACTION: State a clear next step."
    table.insert(parts, body)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_scqa(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    
    local body = "Respond to the following task using the SCQA consulting narrative framework:\n\n"
    if task and task ~= "" then
        body = body .. "**Task:** " .. task .. "\n"
    end
    if context and context ~= "" then
        body = body .. "**Context:** " .. context .. "\n"
    end
    body = body .. "\n" ..
        "SITUATION: Establish the current context.\n" ..
        "COMPLICATION: Identify the core tension or problem.\n" ..
        "QUESTION: State what needs to be resolved.\n" ..
        "ANSWER: Provide your recommendation."
    table.insert(parts, body)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_pastor(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    
    local body = "Apply the PASTOR copywriting framework to this task:\n\n"
    if task and task ~= "" then
        body = body .. "**Task:** " .. task .. "\n"
    end
    if context and context ~= "" then
        body = body .. "**Context:** " .. context .. "\n"
    end
    body = body .. "\n" ..
        "PROBLEM: Define the pain point clearly.\n" ..
        "AMPLIFY: Show the cost of inaction.\n" ..
        "STORY: Share a relatable scenario.\n" ..
        "TRANSFORMATION: Demonstrate the outcome.\n" ..
        "OFFER: Present the solution.\n" ..
        "RESPONSE: Call to action."
    table.insert(parts, body)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_pas(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    
    local body = "Use the PAS framework to address this task:\n\n"
    if task and task ~= "" then
        body = body .. "**Task:** " .. task .. "\n"
    end
    if context and context ~= "" then
        body = body .. "**Context:** " .. context .. "\n"
    end
    body = body .. "\n" ..
        "PROBLEM: Describe the problem concisely.\n" ..
        "AGITATE: Intensify the urgency — what happens if this isn't solved?\n" ..
        "SOLUTION: Present the clear, actionable solution."
    table.insert(parts, body)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_cot(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    if task and task ~= "" then
        table.insert(parts, "**Task/Objective:**\n" .. task)
    end
    if context and context ~= "" then
        table.insert(parts, "**Context/Background:**\n" .. context)
    end
    
    local cot_instruction = "Think through this step by step before giving your final answer. Show your reasoning explicitly at each stage. Label each step (Step 1, Step 2, etc.) and end with a clear final answer."
    table.insert(parts, "**Reasoning Process:**\n" .. cot_instruction)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

local function format_tot(persona, task, context, tone, constraints, format, examples)
    local parts = {}
    if persona and persona ~= "" then
        table.insert(parts, "**Role/Persona:**\n" .. persona)
    end
    if task and task ~= "" then
        table.insert(parts, "**Task/Objective:**\n" .. task)
    end
    if context and context ~= "" then
        table.insert(parts, "**Context/Background:**\n" .. context)
    end
    
    local tot_instruction = "Use a Tree of Thought approach. Generate three distinct reasoning branches for this task, evaluate each one, then select and complete the most promising path.\n\n" ..
        "Branch A: [first approach]\n" ..
        "Branch B: [second approach]\n" ..
        "Branch C: [third approach]\n\n" ..
        "Evaluation: Identify which branch is strongest and why.\n\n" ..
        "Final answer: Complete the winning branch in full."
    table.insert(parts, "**Reasoning Process (Tree of Thought):**\n" .. tot_instruction)

    if tone and tone ~= "" then
        table.insert(parts, "**Tone/Style:**\n" .. tone)
    end
    if constraints and constraints ~= "" then
        table.insert(parts, "**Constraints:**\n" .. constraints)
    end
    if format and format ~= "" then
        table.insert(parts, "**Output Format:**\n" .. format)
    end
    if examples and examples ~= "" then
        table.insert(parts, "**Examples:**\n" .. examples)
    end
    return table.concat(parts, "\n\n")
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Global prompt assembly hook for Rust/Tauri frontend
-- ─────────────────────────────────────────────────────────────────────────────

function assemble_prompt_via_lua(persona, task, context, tone, constraints, format, examples, formula_name)
    formula_name = formula_name or "default"
    formula_name = formula_name:lower()
    
    if formula_name == "aida" then
        return format_aida(persona, task, context, tone, constraints, format, examples)
    elseif formula_name == "scqa" then
        return format_scqa(persona, task, context, tone, constraints, format, examples)
    elseif formula_name == "pastor" then
        return format_pastor(persona, task, context, tone, constraints, format, examples)
    elseif formula_name == "pas" then
        return format_pas(persona, task, context, tone, constraints, format, examples)
    elseif formula_name == "cot" then
        return format_cot(persona, task, context, tone, constraints, format, examples)
    elseif formula_name == "tot" then
        return format_tot(persona, task, context, tone, constraints, format, examples)
    else
        return format_default(persona, task, context, tone, constraints, format, examples)
    end
end

-- ─────────────────────────────────────────────────────────────────────────────
-- CLI / Command Line compatibility hooks
-- ─────────────────────────────────────────────────────────────────────────────

local FORMULA_KEYS = {"AIDA", "SCQA", "PASTOR", "PAS", "CoT", "ToT"}

registerCommand("promptgen", function(args)
    if not args or args == "" then
        return "Usage: /promptgen <task description>\n\nExample: /promptgen Explain quantum entanglement to a 10-year-old"
    end
    local prompt = format_cot("", args, "", "", "", "", "")
    return string.format(
        "[Prompt Lab — CoT Formula]\n\n%s\n\n" ..
        "─────────────────────────────────────\n" ..
        "Tip: Open the Prompt Lab tab (📝) to access all formulas, presets, and JPE explanation.", prompt)
end)

registerCommand("promptlab", function(_args)
    local lines = {"[Prompt Lab — Formula Registry]\n"}
    table.insert(lines, "  1. AIDA               AIDA (Attention › Interest › Desire › Action)")
    table.insert(lines, "  2. SCQA               SCQA (Situation › Complication › Question › Answer)")
    table.insert(lines, "  3. PASTOR             PASTOR (Problem › Amplify › Story › Transformation › Offer › Response)")
    table.insert(lines, "  4. PAS                PAS (Problem › Agitate › Solution)")
    table.insert(lines, "  5. CoT                Chain of Thought (Step-by-step reasoning)")
    table.insert(lines, "  6. ToT                Tree of Thought (Explore multiple reasoning paths)")
    table.insert(lines, "\nOpen the Prompt Lab tab (📝 icon in the nav bar) for the full interactive UI.")
    table.insert(lines, "Or use: /promptgen <task>  to generate a CoT-wrapped prompt immediately.")
    return table.concat(lines, "\n")
end)

registerCommand("formula", function(args)
    if not args or args == "" then
        local keys = table.concat(FORMULA_KEYS, " | ")
        return "Usage: /formula <name> <task>\n\nAvailable: " .. keys
    end

    local name, rest = args:match("^(%S+)%s*(.*)")
    if not name then
        return "Usage: /formula <name> <task>"
    end

    local name_lower = name:lower()
    if not rest or rest == "" then
        return string.format("Usage: /formula %s <task description>", name)
    end

    local prompt
    if name_lower == "aida" then
        prompt = format_aida("", rest, "", "", "", "", "")
    elseif name_lower == "scqa" then
        prompt = format_scqa("", rest, "", "", "", "", "")
    elseif name_lower == "pastor" then
        prompt = format_pastor("", rest, "", "", "", "", "")
    elseif name_lower == "pas" then
        prompt = format_pas("", rest, "", "", "", "", "")
    elseif name_lower == "cot" then
        prompt = format_cot("", rest, "", "", "", "", "")
    elseif name_lower == "tot" then
        prompt = format_tot("", rest, "", "", "", "", "")
    else
        local keys = table.concat(FORMULA_KEYS, ", ")
        return string.format("Unknown formula '%s'. Available: %s", name, keys)
    end

    return string.format("[Prompt Lab — %s]\n\n%s", name:upper(), prompt)
end)

print("[Plugin] Prompt Lab loaded (/promptlab, /promptgen, /formula).")
