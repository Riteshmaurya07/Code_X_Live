🎨 1. COLOR SYSTEM (Grey + Green + Dark)
Base Colors
Primary Background: #0F1115  (deep dark, not pure black)
Secondary Background: #1A1D24
Surface/Card: #22262F
Border/Subtle Divider: #2E3440
Green Accent (DON’T overuse)
Primary Accent: #00D084
Hover Accent: #00B574
Soft Accent BG: rgba(0, 208, 132, 0.1)
Text Colors
Primary Text: #E6EAF0
Secondary Text: #A0A8B5
Muted Text: #6B7280
Status Colors
Success: #22C55E
Error: #EF4444
Warning: #F59E0B
Info: #3B82F6

👉 Reality check:
If everything is green, nothing is premium. Use green only for actions + highlights.

🔤 2. TYPOGRAPHY SYSTEM
Font Stack
Primary: Inter (clean, modern)
Alternative: Poppins (slightly more UI-heavy)
Scale
H1: 32px / Bold
H2: 24px / SemiBold
H3: 20px / Medium
Body: 16px / Regular
Small: 14px
Caption: 12px
Rules (Most people mess this up)
Max 2 font weights per screen
Line height: 1.4–1.6
NEVER use pure white (#FFFFFF) → looks cheap
📐 3. SPACING SYSTEM (THIS defines premium feel)

Use 8px grid system

4px → micro spacing
8px → tight spacing
16px → default spacing
24px → section spacing
32px+ → layout spacing

👉 If your spacing is random → your UI looks amateur instantly.

🧱 4. LAYOUT SYSTEM
Grid
Desktop: 12 column grid
Tablet: 8 column
Mobile: 4 column
Container
Max width: 1200px
Padding: 24px
Sections
Header
Sidebar (optional)
Content Area
Footer
🧩 5. COMPONENT DESIGN RULES
🔘 Buttons
Primary:
BG: Green
Text: Dark (#0F1115)
Radius: 8px
Padding: 10px 16px

Secondary:
BG: Transparent
Border: 1px solid #2E3440
Text: #E6EAF0

States:

Hover → slightly brighter
Active → scale 0.98
Disabled → opacity 0.5
🧾 Cards
BG: #1A1D24
Border: subtle (#2E3440)
Radius: 12px
Padding: 16px–24px
Shadow: very soft (NOT heavy)

👉 Brutal truth:
Heavy shadows = cheap UI. Premium = subtle depth.

🧭 Navbar
Height: 64px
Background: slightly transparent dark
Blur effect (glassmorphism optional)
Active item → green underline or glow
📊 Inputs / Forms
BG: #22262F
Border: #2E3440
Focus: Green border + glow
Radius: 8px

Bad practice:

Don’t use bright outlines
Don’t use thick borders
✨ 6. VISUAL STYLE (THIS is what makes it “techy”)
Effects

Subtle gradients:

linear-gradient(135deg, #00D08410, transparent)
Glow (only on hover or active)
Glassmorphism (light use only)
Icons
Use: Lucide, Heroicons
Style: outline, minimal
Animations
Duration: 200–300ms
Easing: ease-in-out
Use for:
hover
page transitions
modals

👉 If everything animates → it becomes annoying, not premium.

🧠 7. UX PRINCIPLES (Don’t skip this)
Clear hierarchy > fancy visuals
Fewer colors > better clarity
White space = luxury
Consistency = trust
📱 8. SCREEN STRUCTURE TEMPLATE
Dashboard Example
[ Navbar ]
[ Sidebar ] [ Main Content ]

Main Content:
- Page Title
- Stats Cards (3–4)
- Graph Section
- Table/List
App Page Template
Header
↓
Section Title + Actions
↓
Card/Grid/List
↓
Footer / Pagination
🧪 9. DESIGN TOKENS (Use in code)

If you're building in React/Tailwind, define this:

colors: {
  bg: "#0F1115",
  surface: "#1A1D24",
  card: "#22262F",
  border: "#2E3440",
  primary: "#00D084",
  textPrimary: "#E6EAF0",
  textSecondary: "#A0A8B5"
}