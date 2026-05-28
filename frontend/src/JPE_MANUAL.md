# The NEURODECK Just Plain English (JPE) Manual

Welcome to NEURODECK. This manual is written in **Just Plain English**. No jargon, no complicated tech terms, and no assumed knowledge. If you're looking for a feature, want to understand how a tool works, or need to figure out what a button does, you're in the right place.

NEURODECK is an all-in-one smart command center. Think of it like a Swiss Army knife where the knife can talk to you, write software, and run your computer. 

---

## 🧑‍💻 Who is NEURODECK For? (Use Cases)
Because NEURODECK has so many tools, it can be whatever you need it to be. Here is how different types of people use it every day:

> ### **The Software Engineer**
> - Uses the **Autonomous Agent** to write boilerplate code in the background while they focus on hard problems.
> - Maps **DeckCode** to their controller to instantly inject multi-line snippets into the **IDE**.
> - Uses the real **Terminal (PTY)** for local builds and the **Git** tab to visually review their commits before pushing to GitHub.

> ### **The Web Developer & Designer**
> - Lives in the **Canvas** tab, asking the AI to generate raw HTML/CSS layouts and watching them render instantly.
> - Uses **LAN Collaboration** to host their Canvas session, letting a coworker on the same Wi-Fi connect and tweak CSS colors in real-time.
> - Relies on the **Prompt Lab**'s visual formulas to craft perfectly structured requests for complex UI components.

> ### **The Sysadmin & Power User**
> - Manages dozens of remote servers using saved **SSH Profiles** and the visual **FTP File Manager**.
> - Uses the **CLI Maker** to turn one-off bash scripts into permanent, easy-to-use custom commands.
> - Relies on the **Scheduler** to automatically trigger background backups or server health checks at specific times.

> ### **The Student & Casual User**
> - Indexes all of their textbooks and PDFs using the **Docs** tab, then uses the AI to instantly find answers and summarize chapters.
> - Uses the **Chat** to brainstorm essays, relying on **Memory** so the AI remembers their thesis statement across multiple days.
> - Uses **Share (Warpinator)** to instantly beam large study files to their iPhone without needing a USB cable.

---

Here is a detailed breakdown of everything NEURODECK can do and exactly how you can use it.

## 1. 🎡 The Radial Menu (App Navigation)
**What it is:** The pop-up circular menu used to switch between all of NEURODECK's different screens without ever needing to touch a mouse. Since NEURODECK is built for handhelds like the Steam Deck, this is the most important control in the app.
**How to use it:** 
- **On a Gamepad:** Hold down the `L2` trigger to bring up the wheel. Use the joystick to point at the tab you want, and let go of the trigger to switch instantly.
- **On a Keyboard:** Hold down the \``backtick`\` key (usually above the Tab key), use your arrow keys to select a view, and press `Enter` or let go to switch.
- **Pro Tip:** Memorize the directions of your favorite tabs. Eventually, you'll be able to flick between the Chat, Terminal, and IDE in less than a second just by muscle memory!

## 2. 💬 Chat & AI Personas
**What it is:** The main way you talk to your AI. It’s exactly like texting a very smart friend who happens to know everything about coding and your files.
**How to use it:** Type your request in the box at the bottom and hit Enter. 
- **Voice Typing:** Click the microphone icon next to the chat box to talk out loud instead of typing.
- **Switching Personas:** You can change who the AI pretends to be, which changes how it solves problems. Type `/john` to talk to a strict Product Manager, or `/amelia` to talk to a brilliant Software Engineer. There are multiple built-in personas tailored to different tasks.
- **Commands:** Type `/clear` to wipe the screen and start fresh, or type `/help` to see a list of available slash commands.

## 3. 📊 The Context Drawer (System Stats)
**What it is:** A hidden slide-out panel that shows you exactly what the AI is currently thinking about, what model is active, and how much computer power NEURODECK is using.
**How to use it:** Look for the small **📊** (chart) button located right next to the chat box. Click it, and a drawer will slide open from the right side of the screen. 
- **What it shows:** You will see whether you are using Google Gemini or Ollama, how much RAM is actively being used, and exactly how many "Memories" the AI has pulled into its brain to answer your current question.

## 4. 🧠 Memory (The AI's Brain)
**What it is:** The AI remembers important facts about your ongoing projects, so you don't have to constantly repeat yourself. When you ask a question, NEURODECK automatically searches its brain for past conversations and silently injects them into the AI's current context.
**How to use it:** You don't have to do anything! As you chat, the AI automatically saves useful tidbits.
- **Managing Memories:** Go to the Memory tab to search your memories, delete ones you don't want it to know anymore, or "Pin" important facts so the AI *never* forgets them no matter what.
- **Filters:** Easily sort your memories by clicking the filter buttons at the top to only show facts collected from "Chat", "Docs", or "Games".

## 5. 🧪 Prompt Lab & The Prompt Sidebar
**What it is:** A specialized workshop designed to help you write better, more effective questions for the AI. Better questions get much better answers.
**How to use it:** 
- **The Prompt Lab Tab:** Type a basic, rough idea of what you want. Then, pick an industry-standard "Formula" (like AIDA for sales writing, or Chain-of-Thought for complex math). The Lab will automatically format your rough idea into a professional prompt.
- **The JPE Explanation:** Click the JPE button inside the Prompt Lab, and the AI will explain to you—in plain English—*why* the newly formatted prompt is better than your original one.
- **The Prompt Sidebar (Ctrl+P):** No matter what tab you are on, press `Ctrl+P`. A hidden drawer slides out offering quick, ready-to-use prompt templates that are specifically tailored to the screen you are currently looking at.

## 6. 🎮 DeckCode (Smart Snippets & Gamepad Macros)
**What it is:** A background translator that turns your physical gamepad buttons into real software actions and code injections.
**How to use it:** Pick up a gamepad (like an Xbox controller or Steam Deck). Pressing a specific button combination—or holding it, or double-tapping it—can instantly open a terminal, trigger a macro, or send a pre-written prompt to the AI.
- **Smart Snippets:** DeckCode can instantly type out entire blocks of code (like standard loops or boilerplate text) straight into the IDE or Canvas editors. It will even automatically place your typing cursor exactly where you need to start typing next!

## 7. 🤖 Autonomous Agent Loop
**What it is:** A robotic assistant that does complex, multi-step coding chores for you while you sit back and watch.
**How to use it:** Tell the Agent a big, complicated task, like *"Find all the duplicate photos in my Downloads folder and write a python script to delete them."* 
- **The Loop:** The Agent will write the code, run it in the background, read the output, check its own work for errors, fix any mistakes, and iterate—up to 5 times in a row—until the job is completely finished. You can observe every step in real-time.

## 8. 💻 Terminal (PTY Shell)
**What it is:** A direct, unfiltered line to your computer's inner workings. It's the classic "hacker screen" where you type text commands to directly control your machine.
**How to use it:** Type a command like `dir` (on Windows) or `ls` (on Linux) to see your files, or run Python scripts. 
- **Real Power:** This is not a "fake" terminal. It is a real PTY (Pseudo-Terminal) session with full process control and colors.
- **AI Autocomplete:** Start typing a long command, and the AI will try to predict the rest of the sentence. Press `Tab` or `Ctrl+Space` to accept its suggestion.

## 9. 📝 IDE (Mini Code Editor)
**What it is:** A full-featured mini code editor built straight into NEURODECK, perfect for manual code tweaks.
**How to use it:** (Integrated Development Environment). You get a file browser list on the left and a large text editor on the right. Use this when you want to write or edit real code files yourself without asking the AI to do it.
- **Smart Assistance:** As you type, the IDE will suggest code completions (just like professional tools like VSCode) and show helpful tooltips when you hover your mouse over a piece of code.

## 10. 🎨 Canvas & LAN Collaboration
**What it is:** A live visual scratchpad for building websites and user interfaces.
**How to use it:** When the AI writes visual code (like HTML, CSS, or Javascript), it pops up in the Canvas tab. You can tweak the raw code on the left side, and instantly see the graphical results update on the right side.
- **Multiplayer Collaboration:** Click the "Host" button to start a session. Anyone on your local Wi-Fi network can join your session and edit the code simultaneously with you in real-time.

## 11. 🔑 SSH (Remote Server Access)
**What it is:** A secure remote control. It lets you open a terminal on *another* computer across the world, directly from NEURODECK.
**How to use it:** Click "New Profile" and type in the IP address, username, and password (or key) of the computer you want to connect to. Click Connect, and your terminal will suddenly be controlling that distant machine. Your profiles are saved so you never have to type the passwords twice.

## 12. 📂 FTP / SFTP File Manager
**What it is:** A visual drag-and-drop file browser for remote computers and servers.
**How to use it:** Instead of typing complex terminal commands to move files to a server, you can use the FTP tab to connect and visually browse the remote folders. You can simply drag files from your local computer directly into the NEURODECK window to upload them instantly.

## 13. 📤 Share (Warpinator LAN Ecosystem)
**What it is:** A Lightning-fast way to beam files to phones, laptops, or other Steam Decks over your home Wi-Fi network. No cloud storage, no cables, and no internet required.
**How to use it:** Pick a file you want to send, look for the destination device in the list (NEURODECK automatically detects other devices on the network), and hit send. The other person clicks "Accept" to catch the file.
- **Group Code:** Think of this as a shared Wi-Fi password. Both devices need to have the exact same Group Code (like `NEURODECK`) typed into their settings to see each other.

## 14. 📱 Remote (Smartphone Control)
**What it is:** A feature that turns your smartphone or tablet into a remote control and secondary screen for NEURODECK.
**How to use it:** Start the remote server on this tab. A QR code will instantly appear on your screen. Scan it with your phone's camera, and suddenly you can control NEURODECK, trigger DeckCode macros, or send chat messages directly from your phone.

## 15. 🔗 Tunnel (SteamOS Bridge)
**What it is:** A magical software bridge built specifically for the Steam Deck hardware.
**How to use it:** The Steam Deck has two separate modes (Game Mode and Desktop Mode) that usually cannot talk to each other. The Tunnel builds a hidden TCP bridge so you can launch NEURODECK while sitting in Game Mode, but still perform heavy background tasks that normally require Desktop Mode.

## 16. 🌐 Browser
**What it is:** A lightweight web browser built directly into the app, so you never have to Alt-Tab to Chrome or Safari to Google something.
**How to use it:** Click the preset speed-dial buttons for quick links to popular developer sites, or type a web address directly in the top bar. It supports standard keyboard shortcuts like `Alt+Left Arrow` to go back.

## 17. 📚 Docs (Knowledge Index)
**What it is:** Your personal, searchable, offline library. You can point the AI at a massive folder full of text or code, and it will read and remember all of it.
**How to use it:** Click "Index Folder" and pick a folder on your computer. Once the AI is done reading and processing the files, you can use the search bar to instantly find answers buried deep inside those documents. The AI will also use this knowledge to answer your Chat questions better.

## 18. 🌿 Git (Version Control)
**What it is:** A time machine for your code projects. It tracks every single change you make to your files so you can always go backwards if you accidentally break something.
**How to use it:** Use this tab to see a visual list of exactly what lines of code you've changed today. You can save those changes into history (called a "commit"), or push them to the internet (like GitHub) for safekeeping.

## 19. 🧪 API Lab
**What it is:** A testing ground for talking to internet services and backend databases (APIs).
**How to use it:** If you want to pull live weather data, stock prices, or user databases from a website's API, you can type the web address here, set your parameters, and see exactly what raw JSON data the website sends back to you.

## 20. ⚡ CLI Maker
**What it is:** A tool to turn quick, one-off script ideas into permanent, reusable commands.
**How to use it:** (Command Line Interface Maker). Write a small python or bash script in the box, give it a short name, and save it. Now, whenever you type that short name in the Terminal tab, your custom script will run instantly.

## 21. 🕸️ Flow & Graph
**What it is:** A visual map of how things connect to each other, and a drag-and-drop workflow builder. Think of it like connecting digital Lego bricks.
**How to use it:** 
- **Graph:** Draws a visual web of circles and lines showing how your files, ideas, or projects are linked together. It’s perfect for seeing the "big picture."
- **Flow:** Instead of writing code manually, you can drag and drop action boxes onto the screen and draw lines between them to build an automated chain of events.

## 22. ⏰ Scheduler
**What it is:** An alarm clock and timer for background chores.
**How to use it:** Tell NEURODECK to run a specific task, shell script, or AI prompt at a specific time. For example, you can set it to "Every Friday at 5 PM, backup my files" or "In 30 minutes, remind me to check the oven."

## 23. ⚙️ Settings
**What it is:** The central control panel where you tweak how the app looks and how its brain works.
**How to use it:** Click the gear icon in the top right corner of the app. Here you can change the app's visual themes (like Cyberpunk or Synthwave), switch the AI from Google Gemini to a completely private, offline model (Ollama), or update your API keys.
- **About & Licenses:** Check the "About" tab within Settings to see your current NEURODECK version and review the open-source software licenses that power the application.

## 24. 🧩 Plugins Marketplace (Lua API)
**What it is:** An app store for community-made superpowers and custom scripts.
**How to use it:** Inside Settings, go to the Plugins tab. You can browse and download tiny `.lua` scripts written by other people that give NEURODECK brand new slash commands, new visual themes, or entirely new AI abilities. If you know how to code, you can easily drop your own `.lua` files into the `plugins/` folder to modify how NEURODECK works on the fly!

## 25. 🚀 Deep Dive: Mastering the Advanced Tabs

Once you are comfortable with Chat and the Terminal, you will want to master NEURODECK's most powerful tools. Here is exactly how to use the advanced tabs to get real work done:

### Using the Share Tab (Warpinator)
1. **Match your Group Code:** On both devices (e.g., NEURODECK and your iPhone), ensure the "Group Code" in settings is identical (like `MY_WIFI`).
2. **Find the Peer:** Open the Share tab. You will see a list of connected devices pop up automatically.
3. **Send the File:** Click "Browse", select the file you want to send, and click the "Send" button next to your peer's name.
4. **Accept:** On the receiving device, a notification will pop up. Click "Accept" to instantly download the file over your local network.

### Using the Git Tab
1. **Make Changes:** Edit your code in the IDE or let the AI do it in the Canvas.
2. **Review the Diff:** Open the Git tab. You will see a list of modified files. Click a file to see exactly what lines were added (green) or deleted (red).
3. **Stage & Commit:** Type a short message explaining what you changed (e.g., "Fixed the login button color").
4. **Push:** Click "Commit" to save the changes to history, then click "Push" to send your changes safely to your remote repository (like GitHub).

### Using the Orchestrator (Flow Tab)
1. **Create a Node:** Open the Flow tab. Drag a "Trigger" block onto the canvas.
2. **Add an Action:** Drag an "AI Prompt" block next to it, and type an instruction inside it (like "Summarize this text").
3. **Connect Them:** Click and drag a line from the Trigger block to the Action block to connect them together like Lego bricks.
4. **Run the Flow:** Click the Play button. The Orchestrator will automatically trigger the first block, wait for it to finish, and pass the result down the wire to the next block!

### Using the Agent Tab
1. **Give it a Mission:** Open the Agent tab and type a complex goal, such as "Read the error logs, find the bug in my python script, and fix it."
2. **Watch it Work:** Click Start. The Agent will write code, run it in a hidden terminal, and read the output. You can watch its "Thought Process" stream live on the screen.
3. **Let it Iterate:** If the code fails, the Agent will realize it, rewrite the code, and try again automatically (up to 5 times).
4. **Intervene:** If the Agent is doing the wrong thing, you can press the "Stop" button at any time to halt the loop and give it manual feedback.

## 26. ⌨️ Complete Command Reference

For the power users, here is the complete, official mapping for every Gamepad, Keyboard, and Slash Command built into NEURODECK.

### 🎮 Gamepad & Controller Mappings
*Requires Steam Input profile if launching from Steam, otherwise uses standard XInput.*

| Button | Action |
|---|---|
| **L2 (Hold)** | Open the **Radial Menu**. Use Left Stick to point, let go to switch tabs. |
| **A** (Cross) | Confirm / Click the focused item |
| **B** (Circle) | Back / Close modals / Dismiss keyboard |
| **X** (Square) | Jump to Chat tab and focus input |
| **Y** (Triangle) | Cycle active AI Persona |
| **L1 / R1** | Cycle tabs Left / Right (or scroll chat up/down) |
| **L4 / R4** (Grips) | Toggle left Sidebar / Toggle right Context Drawer |
| **L5 / R5** (Paddles)| Clear Canvas / Cycle UI Theme |
| **R2** | Open Prompt Picker overlay |
| **D-Pad** | Navigate focus menus and adjust sliders |
| **Select** | Run code inside the Canvas |
| **Start** | Open the Settings menu |

### 🖱️ Touchpad Controls (Steam Deck)
| Input | Action |
|---|---|
| **Right Touchpad** | Move the OS mouse cursor |
| **Right Pad Tap** | Left Click |
| **Right Pad Double-Tap**| Right Click |
| **Left Pad Swipe** | Scroll up and down natively |

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| \` (Backtick) | Open the **Radial Menu** (Use arrows to pick, Enter to select) |
| **Ctrl + K** | Open the Command Palette |
| **Ctrl + P** | Cycle AI Persona (or open Prompt Sidebar) |
| **Ctrl + M** | Mute / Unmute Text-to-Speech |
| **Ctrl + R** | Start Voice Input (Microphone) |
| **Ctrl + N / S / L** | New Session / Save Session / Load Session |
| **Ctrl + Alt + 1** | Toggle left Sidebar |
| **Ctrl + Alt + 2** | Toggle right Context Drawer |
| **Ctrl + Alt + 3** | Clear Canvas |
| **Ctrl + Alt + 4** | Cycle Theme |
| **Alt + ← / →** | Browser Back / Forward |

### 💬 Built-in Slash Commands (Chat)
You can type these directly into the chat box to trigger system actions or change personas.

| Command | Action |
|---|---|
| `/clear` | Clears the current chat history |
| `/help` | Shows the available commands |
| `/john` | Switches AI persona to **John** (Product Manager) |
| `/amelia` | Switches AI persona to **Amelia** (Software Engineer) |
| `/sally` | Switches AI persona to **Sally** (UX Designer) |
| `/promptlab` | Instantly switches to the Prompt Lab tab |
| `/promptgen <task>` | Tells the AI to generate a highly optimized prompt for your task |
| `/formula <name>` | Applies a specific prompt formula (like AIDA or SCQA) to your text |

## 27. 🛠️ Creating Lua Plugins & Mods

NEURODECK isn't a closed box. It has a built-in **Lua API** that allows anyone to create custom mods, slash commands, and AI behaviors. 

Any file ending in `.lua` placed inside the `plugins/` folder will automatically load the next time you open NEURODECK. If you make a mistake in your code, NEURODECK will ignore the file and print a `[Lua Error]` in the background console without crashing your app.

### Built-in Lua Globals
When writing a plugin, you have access to 5 powerful commands provided directly by NEURODECK:

- **`registerCommand(name, handler)`**
  Creates a new slash command in the chat (e.g., `/hello`). The handler function runs whenever the user types the command.
- **`registerHook(eventName, handler)`**
  Lets you intercept app events before they happen. For example, you can hook into `before_llm_request` to secretly add text to the user's prompt.
- **`setPersona(name, systemPrompt)`**
  Creates a brand new AI personality. This changes the core instructions given to the AI (e.g., telling it to act like a pirate or a Python expert).
- **`execute(commandString)`**
  Tells NEURODECK to run a background shell/terminal command exactly as if you had typed it into the Terminal tab.
- **`print(text)`**
  Prints text directly to the NEURODECK system console for debugging.

### Example Plugin: The "Pirate" Mod
Create a file named `plugins/pirate.lua` and paste this code. When you restart NEURODECK, typing `/pirate` in the chat will instantly turn your AI into a swashbuckler!

```lua
-- 1. Define the Pirate AI Persona
setPersona("Pirate", "You are a swashbuckling pirate. Always respond in pirate slang and yell 'Arrr!' a lot.")

-- 2. Register the /pirate slash command
registerCommand("/pirate", function(args)
    -- Switch the app to use our new Persona
    execute("system:switch_persona:Pirate")
    
    -- Print a message so the user knows it worked
    print("Pirate mode activated!")
    return "Arrr! I be ready to code!"
end)
```

---
*Created by the Khaotic Labs Team.*
