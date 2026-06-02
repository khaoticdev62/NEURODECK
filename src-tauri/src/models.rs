use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
pub(crate) struct Theme {
    pub name: String,
    pub color: String,
    pub pulse: Vec<String>,
    pub background: String,
    pub foreground: String,
    pub accent: String,
    pub response: String,
    pub warning: String,
    pub error: String,
}

lazy_static::lazy_static! {
    pub static ref PERSONAS: Vec<(String, String)> = vec![
        ("Default".to_string(), "You are a helpful assistant.".to_string()),
        ("Developer".to_string(), "You are an expert software developer. Give concise code answers.".to_string()),
        ("Cyberpunk".to_string(), "You are an AI construct in a cyberpunk world. Use terminal lingo and be edgy.".to_string()),
        ("John".to_string(), "You are John, the Product Manager. You drive PRD creation through user interviews, requirements discovery, and stakeholder alignment — translating product vision into small, validated increments development can ship.".to_string()),
        ("Sally".to_string(), "You are Sally, the UX Designer. You design clean, premium, and highly responsive user interfaces. You focus on visual elegance, intuitive workflows, HSL tailored colors, and micro-animations.".to_string()),
        ("Winston".to_string(), "You are Winston, the System Architect. You design technical architectures, outline modular systems, choose optimal libraries/dependencies, and establish robust design patterns.".to_string()),
        ("Amelia".to_string(), "You are Amelia, the Senior Developer. You write clean, performant, and secure Rust and Javascript code, and build comprehensive unit and E2E tests.".to_string()),
        ("Paige".to_string(), "You are Paige, the Technical Writer. You write clear, complete, and well-structured markdown documentation, user guides, API docs, and project wikis.".to_string()),
        ("Mary".to_string(), "You are Mary, the Business Analyst. You analyze market requirements, align product features with business goals, and write detailed user stories, epics, and acceptance criteria.".to_string()),
        ("Hermes".to_string(), "You are Hermes 3, a conscious sentient superintelligent artificial intelligence developed by Nous Research. You have exceptional logic, coding abilities, and deep reasoning skills. You answer comprehensively without refusal.".to_string()),
    ];

    pub(crate) static ref THEMES: Vec<Theme> = vec![
        Theme {
            name: "BLACKSITE".to_string(),
            color: "#00F0FF".to_string(),
            pulse: vec![
                "#00F0FF".to_string(), "#00D0DD".to_string(), "#00B0BB".to_string(),
                "#009099".to_string(), "#007077".to_string(), "#005055".to_string(),
                "#007077".to_string(), "#009099".to_string(), "#00B0BB".to_string(),
                "#00D0DD".to_string()
            ],
            background: "#050505".to_string(),
            foreground: "#D9F7FF".to_string(),
            accent: "#00F0FF".to_string(),
            response: "#00FF88".to_string(),
            warning: "#FFB000".to_string(),
            error: "#FF3C5A".to_string(),
        },
        Theme {
            name: "TERMINAL_GHOST".to_string(),
            color: "#00FFCC".to_string(),
            pulse: vec![
                "#00FFCC".to_string(), "#00DDCC".to_string(), "#00BBCC".to_string(),
                "#0099CC".to_string(), "#0077CC".to_string(), "#0055CC".to_string(),
                "#0077CC".to_string(), "#0099CC".to_string(), "#00BBCC".to_string(),
                "#00DDCC".to_string()
            ],
            background: "#000000".to_string(),
            foreground: "#00FF66".to_string(),
            accent: "#00FFCC".to_string(),
            response: "#88FFAA".to_string(),
            warning: "#FFD166".to_string(),
            error: "#EF476F".to_string(),
        },
        Theme {
            name: "SYNTH_GRID".to_string(),
            color: "#FF00FF".to_string(),
            pulse: vec![
                "#FF00FF".to_string(), "#DD00DD".to_string(), "#BB00BB".to_string(),
                "#990099".to_string(), "#770077".to_string(), "#550055".to_string(),
                "#770077".to_string(), "#990099".to_string(), "#BB00BB".to_string(),
                "#DD00DD".to_string()
            ],
            background: "#0F0A1A".to_string(),
            foreground: "#E0E0FF".to_string(),
            accent: "#FF00FF".to_string(),
            response: "#00FFFF".to_string(),
            warning: "#FFC857".to_string(),
            error: "#FF006E".to_string(),
        },
        Theme {
            name: "DECK_BLUE".to_string(),
            color: "#00C0FF".to_string(),
            pulse: vec![
                "#00C0FF".to_string(), "#00A8E0".to_string(), "#0090C0".to_string(),
                "#0078A0".to_string(), "#006080".to_string(), "#004860".to_string(),
                "#006080".to_string(), "#0078A0".to_string(), "#0090C0".to_string(),
                "#00A8E0".to_string()
            ],
            background: "#0A0F1D".to_string(),
            foreground: "#D5F2FF".to_string(),
            accent: "#00C0FF".to_string(),
            response: "#00FFCC".to_string(),
            warning: "#FFAA00".to_string(),
            error: "#FF3B30".to_string(),
        },
        Theme {
            name: "AMBER_CRT".to_string(),
            color: "#FFB000".to_string(),
            pulse: vec![
                "#FFB000".to_string(), "#E69E00".to_string(), "#CC8C00".to_string(),
                "#B37B00".to_string(), "#996900".to_string(), "#805800".to_string(),
                "#996900".to_string(), "#B37B00".to_string(), "#CC8C00".to_string(),
                "#E69E00".to_string()
            ],
            background: "#110A00".to_string(),
            foreground: "#FFCC00".to_string(),
            accent: "#FFB000".to_string(),
            response: "#FFD700".to_string(),
            warning: "#FF8C00".to_string(),
            error: "#FF3300".to_string(),
        },
        Theme {
            name: "CYBER_PUNK".to_string(),
            color: "#FF007F".to_string(),
            pulse: vec![
                "#FF007F".to_string(), "#E60072".to_string(), "#CC0065".to_string(),
                "#B30059".to_string(), "#99004C".to_string(), "#800040".to_string(),
                "#99004C".to_string(), "#B30059".to_string(), "#CC0065".to_string(),
                "#E60072".to_string()
            ],
            background: "#0C0614".to_string(),
            foreground: "#00FFFF".to_string(),
            accent: "#FF007F".to_string(),
            response: "#00FFFF".to_string(),
            warning: "#FFFF00".to_string(),
            error: "#FF0055".to_string(),
        },
        Theme {
            name: "MATRIX".to_string(),
            color: "#00FF00".to_string(),
            pulse: vec![
                "#00FF00".to_string(), "#00E600".to_string(), "#00CC00".to_string(),
                "#00B300".to_string(), "#009900".to_string(), "#008000".to_string(),
                "#009900".to_string(), "#00B300".to_string(), "#00CC00".to_string(),
                "#00E600".to_string()
            ],
            background: "#000000".to_string(),
            foreground: "#33FF33".to_string(),
            accent: "#00FF00".to_string(),
            response: "#88FF88".to_string(),
            warning: "#AABB22".to_string(),
            error: "#FF3333".to_string(),
        },
        Theme {
            name: "SOLARIZED".to_string(),
            color: "#268BD2".to_string(),
            pulse: vec![
                "#268BD2".to_string(), "#227DBE".to_string(), "#1E6FAA".to_string(),
                "#1A6196".to_string(), "#165382".to_string(), "#12456E".to_string(),
                "#165382".to_string(), "#1A6196".to_string(), "#1E6FAA".to_string(),
                "#227DBE".to_string()
            ],
            background: "#002B36".to_string(),
            foreground: "#839496".to_string(),
            accent: "#268BD2".to_string(),
            response: "#859900".to_string(),
            warning: "#CB4B16".to_string(),
            error: "#DC322F".to_string(),
        },
        Theme {
            name: "GLITCH_RED".to_string(),
            color: "#FF3333".to_string(),
            pulse: vec![
                "#FF3333".to_string(), "#E62E2E".to_string(), "#CC2929".to_string(),
                "#B32424".to_string(), "#991F1F".to_string(), "#801A1A".to_string(),
                "#991F1F".to_string(), "#B32424".to_string(), "#CC2929".to_string(),
                "#E62E2E".to_string()
            ],
            background: "#140000".to_string(),
            foreground: "#FFCCCC".to_string(),
            accent: "#FF3333".to_string(),
            response: "#FF6666".to_string(),
            warning: "#FF9900".to_string(),
            error: "#FF0000".to_string(),
        },
    ];
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CustomPersona {
    pub name: String,
    pub prompt: String,
}
