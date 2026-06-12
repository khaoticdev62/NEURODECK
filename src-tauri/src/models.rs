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
        Theme {
            name: "GHOST_WHITE".to_string(),
            color: "#E8F4FD".to_string(),
            pulse: vec![
                "#E8F4FD".to_string(), "#C9E6F8".to_string(), "#AAD8F3".to_string(),
                "#8BCAEE".to_string(), "#6CBCE9".to_string(), "#4DAEE4".to_string(),
                "#6CBCE9".to_string(), "#8BCAEE".to_string(), "#AAD8F3".to_string(),
                "#C9E6F8".to_string()
            ],
            background: "#080808".to_string(),
            foreground: "#FFFFFF".to_string(),
            accent: "#E8F4FD".to_string(),
            response: "#A8D8EA".to_string(),
            warning: "#FFD166".to_string(),
            error: "#FF4757".to_string(),
        },
        Theme {
            name: "DEEP_VOID".to_string(),
            color: "#7C3AED".to_string(),
            pulse: vec![
                "#7C3AED".to_string(), "#6D30D4".to_string(), "#5E26BB".to_string(),
                "#4F1CA2".to_string(), "#401289".to_string(), "#310870".to_string(),
                "#401289".to_string(), "#4F1CA2".to_string(), "#5E26BB".to_string(),
                "#6D30D4".to_string()
            ],
            background: "#05020D".to_string(),
            foreground: "#DDD6FE".to_string(),
            accent: "#7C3AED".to_string(),
            response: "#A78BFA".to_string(),
            warning: "#FCD34D".to_string(),
            error: "#F87171".to_string(),
        },
        Theme {
            name: "NEON_ORANGE".to_string(),
            color: "#FF6B00".to_string(),
            pulse: vec![
                "#FF6B00".to_string(), "#E56000".to_string(), "#CC5500".to_string(),
                "#B24A00".to_string(), "#993F00".to_string(), "#803400".to_string(),
                "#993F00".to_string(), "#B24A00".to_string(), "#CC5500".to_string(),
                "#E56000".to_string()
            ],
            background: "#0D0600".to_string(),
            foreground: "#FFE5C8".to_string(),
            accent: "#FF6B00".to_string(),
            response: "#FFD700".to_string(),
            warning: "#FFAA00".to_string(),
            error: "#FF2200".to_string(),
        },
        Theme {
            name: "BLOOD_MOON".to_string(),
            color: "#C62828".to_string(),
            pulse: vec![
                "#C62828".to_string(), "#B02424".to_string(), "#9A2020".to_string(),
                "#841C1C".to_string(), "#6E1818".to_string(), "#581414".to_string(),
                "#6E1818".to_string(), "#841C1C".to_string(), "#9A2020".to_string(),
                "#B02424".to_string()
            ],
            background: "#070005".to_string(),
            foreground: "#FFB8C6".to_string(),
            accent: "#C62828".to_string(),
            response: "#FF4D6D".to_string(),
            warning: "#FFA726".to_string(),
            error: "#EF5350".to_string(),
        },
        Theme {
            name: "GOLD_SOVEREIGN".to_string(),
            color: "#D4AF37".to_string(),
            pulse: vec![
                "#D4AF37".to_string(), "#BF9D31".to_string(), "#AA8B2B".to_string(),
                "#957925".to_string(), "#80671F".to_string(), "#6B5519".to_string(),
                "#80671F".to_string(), "#957925".to_string(), "#AA8B2B".to_string(),
                "#BF9D31".to_string()
            ],
            background: "#0C0A00".to_string(),
            foreground: "#FFF8DC".to_string(),
            accent: "#D4AF37".to_string(),
            response: "#FFD700".to_string(),
            warning: "#FF9800".to_string(),
            error: "#F44336".to_string(),
        },
        Theme {
            name: "TRON_LEGACY".to_string(),
            color: "#0FF0FC".to_string(),
            pulse: vec![
                "#0FF0FC".to_string(), "#0DD8E2".to_string(), "#0BC0C8".to_string(),
                "#09A8AE".to_string(), "#079094".to_string(), "#05787A".to_string(),
                "#079094".to_string(), "#09A8AE".to_string(), "#0BC0C8".to_string(),
                "#0DD8E2".to_string()
            ],
            background: "#000000".to_string(),
            foreground: "#FFFFFF".to_string(),
            accent: "#0FF0FC".to_string(),
            response: "#FFFFFF".to_string(),
            warning: "#FFD700".to_string(),
            error: "#FF0040".to_string(),
        },
        Theme {
            name: "EMERALD_VOID".to_string(),
            color: "#00A86B".to_string(),
            pulse: vec![
                "#00A86B".to_string(), "#009660".to_string(), "#008455".to_string(),
                "#00724A".to_string(), "#00603F".to_string(), "#004E34".to_string(),
                "#00603F".to_string(), "#00724A".to_string(), "#008455".to_string(),
                "#009660".to_string()
            ],
            background: "#00080A".to_string(),
            foreground: "#CCFFEE".to_string(),
            accent: "#00A86B".to_string(),
            response: "#00FF99".to_string(),
            warning: "#FFCC00".to_string(),
            error: "#FF4444".to_string(),
        },
        Theme {
            name: "PLASMA_PINK".to_string(),
            color: "#FF0080".to_string(),
            pulse: vec![
                "#FF0080".to_string(), "#E60073".to_string(), "#CC0066".to_string(),
                "#B30059".to_string(), "#99004C".to_string(), "#80003F".to_string(),
                "#99004C".to_string(), "#B30059".to_string(), "#CC0066".to_string(),
                "#E60073".to_string()
            ],
            background: "#0D0008".to_string(),
            foreground: "#FFD6F0".to_string(),
            accent: "#FF0080".to_string(),
            response: "#FF66CC".to_string(),
            warning: "#FFAA00".to_string(),
            error: "#FF2244".to_string(),
        },
        Theme {
            name: "OBSIDIAN".to_string(),
            color: "#94A3B8".to_string(),
            pulse: vec![
                "#94A3B8".to_string(), "#8594A7".to_string(), "#768596".to_string(),
                "#677685".to_string(), "#586774".to_string(), "#495863".to_string(),
                "#586774".to_string(), "#677685".to_string(), "#768596".to_string(),
                "#8594A7".to_string()
            ],
            background: "#060608".to_string(),
            foreground: "#E2E8F0".to_string(),
            accent: "#94A3B8".to_string(),
            response: "#CBD5E1".to_string(),
            warning: "#FCD34D".to_string(),
            error: "#FB7185".to_string(),
        },
        Theme {
            name: "ASTRAL_BLUE".to_string(),
            color: "#3B82F6".to_string(),
            pulse: vec![
                "#3B82F6".to_string(), "#3574DC".to_string(), "#2F66C2".to_string(),
                "#2958A8".to_string(), "#234A8E".to_string(), "#1D3C74".to_string(),
                "#234A8E".to_string(), "#2958A8".to_string(), "#2F66C2".to_string(),
                "#3574DC".to_string()
            ],
            background: "#030712".to_string(),
            foreground: "#DBEAFE".to_string(),
            accent: "#3B82F6".to_string(),
            response: "#93C5FD".to_string(),
            warning: "#FDE68A".to_string(),
            error: "#FC8181".to_string(),
        },
    ];
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CustomPersona {
    pub name: String,
    pub prompt: String,
}
