# Keiki brand guidelines
Public brand page: https://onkeiki.com/design
Use this complete guide for websites, videos, presentations, social graphics, and product references. Preserve Keiki’s identity across formats. Existing source values below are authoritative; the cross-format production advice is guidance for new work, not a claim that a historical video specification exists.

## Identity and naming
Write Keiki with a capital K and lowercase eiki. Use Keiki for the company and product. The public domain is onkeiki.com. Do not turn the name into KEIKI, KeiKi, or an invented abbreviation. In plain text, write the name naturally rather than inventing a new wordmark.
Character: a clear white canvas, confident navy typography, precise blue actions, and expressive original artwork. Pair a restrained, useful interface with textured, soft-focus imagery. The engraved rocking foal is the recognizable brand mark. Keep the surrounding composition quiet enough for it and the artwork to carry the character.

## Logo — production assets and usage
- Navy mark: transparent SVG, fill #142653, viewBox 0 0 512 456. Download: https://onkeiki.com/design/keiki-mark-navy.svg
- White mark: transparent SVG, fill #ffffff, viewBox 0 0 512 456. Download: https://onkeiki.com/design/keiki-mark-white.svg
- Original source artwork: https://onkeiki.com/brand/keiki-rocking-foal-v1.png
- Favicon: https://onkeiki.com/favicon.svg
- Exact source geometry: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/keiki-mark.tsx
Use the supplied vector files. They contain the same engraved rocking-foal path as the production website. The SVG has a 512:456 aspect ratio; scale proportionally and preserve its viewBox. Its background is transparent. Use the navy version on white or very light surfaces, and the white version on deep navy or another sufficiently dark, uncluttered surface.
Keep the whole mark visible, with generous clear space on every side. For new compositions, start with at least one-quarter of the displayed mark’s height as clear space; this is adaptation guidance rather than an existing measured logo policy. At small sizes, inspect the engraving at actual output size and use the existing favicon when appropriate. Never stretch, crop, rotate, trace, redraw, add a glow, add a drop shadow, fill it with a gradient, or merge it into another symbol. Avoid placing fine engraving over busy imagery.
There is no separately supplied wordmark in this guide. Pair the real mark with the naturally written name in Geist when a layout needs both; do not represent an improvised lockup as an official alternate logo.

## Colors — exact values and roles
- Keiki blue: #0742a0; RGB 7, 66, 160; CSS token --color-kumo-brand. Role: Primary actions, links, and the outer site frame. For a solid specimen panel use #ffffff text.
- Deep navy: #142653; RGB 20, 38, 83; CSS token --home-foreground. Role: Headings, body text, and the logo on light surfaces. For a solid specimen panel use #ffffff text.
- Canvas: #ffffff; RGB 255, 255, 255; CSS token --home-background. Role: The primary public background. For a solid specimen panel use #142653 text.
- Soft surface: #fafafa; RGB 250, 250, 250; CSS token --home-soft. Role: Quiet secondary backgrounds. For a solid specimen panel use #142653 text.
- Muted blue: #43557a; RGB 67, 85, 122; CSS token --home-muted. Role: Supporting copy and descriptions on white. For a solid specimen panel use #ffffff text.
- Secondary blue: #596a88; RGB 89, 106, 136; CSS token --home-subtle. Role: Secondary labels and metadata on white. For a solid specimen panel use #ffffff text.
- Neutral line: hsl(0, 0%, 92%); RGB 235, 235, 235; CSS token --home-line. Role: Fine structural dividers; never reading text. For a solid specimen panel use #142653 text.
- Selection: #d9b75d; RGB 217, 183, 93; CSS token --home-highlight. Role: Native text selection with navy selected text. For a solid specimen panel use #142653 text.
Default public composition: white background, navy headings and body copy, muted blue supporting copy, and blue interactive emphasis. Use blue deliberately for actions, links, and identity; do not wash every panel with blue. White is the dominant surface. Neutral lines may separate structural groups but must not become an all-over grid of redundant borders.
Color alone does not communicate state. Use text or an icon alongside success, warning, and error treatments from the shared UI tokens. Selection gold is a text-selection treatment, not a generic CTA, warning, or replacement brand color. Navy-on-white and white-on-blue are established readable pairings. For new artwork or dark treatments, measure contrast rather than assuming a sampled color is readable.
The portrait-derived accent gradient is #032455 0%, #2C5FC1 30%, #C1C4DD 62%, #EBB769 80%, #E54823 100%. Existing usage is limited to chart and separator contexts. It is not the logo fill or a default page background. For a new video adaptation, reserve it for a restrained accent only when it serves the composition.

## Typography — families and hierarchy
- Geist Variable: Public headings and reading copy. Token: --site-font. Section introductions: 24px desktop / 22px mobile, 1.45 line height, −.035em tracking; 600-weight opening followed inline by 450-weight supporting text.
- Inter Variable: Public buttons and inputs. Token: --font-sans. Control labels: 14px / 20px, weight 500.
- Playfair Display Variable: The homepage finale. Token: Playfair Display Variable. Use only in the established homepage display treatment; public section headings use Geist and workspace titles use the device system font.
- System monospace: Code, asset URLs, and technical examples. Token: --font-mono. Use the existing ui-monospace, SF Mono, JetBrains Mono, monospace fallback stack.
Web font sources: @fontsource-variable/geist, @fontsource-variable/inter, and @fontsource-variable/playfair-display are the installed font packages. Use the actual fonts, not an approximate replacement. For desktop video or slide tools, obtain the corresponding desktop font from its upstream distribution and retain its license; WOFF2 is a web font format, not a desktop editing font.
Public reading copy uses Geist, while the authenticated workspace uses its existing device system font. Keep those contexts distinct. Established editorial title: 24px, weight 600, line height 1.4, tracking −.025em; description: 16px, weight 450, line height 1.5; reading body: 16px, line height 1.65. Shared section introductions use a semibold opening followed inline by supporting copy. Reserve Playfair for the established homepage finale rather than introducing serif headlines everywhere.
For new video and presentation compositions, carry over the families, weight contrast, and restrained hierarchy. Adapt type size to the final canvas and viewing distance; CSS pixels are not a video typography specification. Use short sentence-case headings, comfortable line height, and no tiny caption text. Keep lines of reading copy to roughly 60–75 characters; do not justify text or squash tracking to fit.

## Layout and composition
- White public canvas, deep navy text, Keiki blue primary actions, muted blue supporting copy, and fine neutral structural dividers. Public pages stay light even when the workspace is dark.
- 1448px shared site frame; 24px outer gutter; 40px content inset on desktop and 20px on mobile. A fixed 5px Keiki-blue viewport frame appears on desktop and disappears on phones.
- Use attached introductions: a dark semibold opening followed immediately by muted supporting copy in the same passage. Keep headings compact and introductions left-aligned outside the homepage.
- 32px desktop controls with 12px corners, 14px/20px Inter labels and 16px Pixel icons; retain the shared larger touch targets. Artwork and product windows use the existing 16px corners.
- Use richly textured color artwork with grain, soft focus, classical figures and landscapes. Preserve original files and intentional crops. Put product content on opaque white surfaces so it stays readable.
- Golden yellow is reserved for native text selection with navy selected text. The portrait-inspired gradient runs from #032455 through #2c5fc1, #c1c4dd and #ebb769 to #e54823; use it only in established chart and separator contexts.
- Use Nucleo Pixel icons from app-icons.tsx and actual service logos. Retain original one-bit agent avatars. Connect structural cells with square seams and single neutral dividers.
- Keep native scrolling, visible keyboard focus, labeled fields, clear disabled states, and reduced-motion support. Control feedback uses brief color changes; preserve the shared behavior without bounce or press scaling.
- Write plain sentence-case labels and short, specific product copy. Do not add unverified statistics, integrations, certifications or live-result claims.
The brand page itself uses a narrow centered reading column with a centered hero and left-aligned section headings, generous vertical spacing, paired logo panels, and color values centered inside large swatches. Its quieter brand-resource layout is an owner-approved exception to full-frame marketing section grids. Keep content aligned to a few shared edges. In a new slide or video, use the same hierarchy and clear space rather than drawing a literal browser frame around every scene.
Group related content with space before adding separators. Use one main message or action per composition. Put labels close to the object they describe. Avoid nested cards, decorative dashboards, excessive pill labels, gratuitous feature lists, and multiple competing CTA styles. On the web, retain real links, native keyboard navigation, visible focus, and touch targets from the shared controls.

## Artwork — approved library and art direction
The eight selected files below are the reference library. Their visual character includes grain, rich blue fields, warm highlights, classical figures, soft focus, and atmospheric landscapes. Use originals before generating substitutes. Let artwork provide texture and color; keep information on a readable opaque surface or a quiet area of the frame. Preserve original proportions when showing a complete work. A crop may fill a thumbnail, but do not stretch it or crop a subject accidentally.
- Color portrait: Homepage hero, pricing backdrop, Introducing Keiki, and authentication. Original file: https://onkeiki.com/landing/person-color.jpeg
- Lady: Homepage template artwork. Original file: https://onkeiki.com/landing/ladyyy.png
- Crying figure: Homepage template artwork. Original file: https://onkeiki.com/landing/cry.png
- Star hand: Homepage template artwork. Original file: https://onkeiki.com/landing/star-hand.png
- Boat: Homepage template artwork. Original file: https://onkeiki.com/landing/boat.png
- Crown: Homepage template artwork. Original file: https://onkeiki.com/landing/crown.jpeg
- Landscape: Homepage template artwork. Original file: https://onkeiki.com/landing/land.jpeg
- Panorama: Homepage footer reveal. Original file: https://onkeiki.com/landing/ultrawide.png
Generation provenance is incomplete. The gallery omits solution, editorial, changelog, and product-example imagery at the owner’s request. Do not reintroduce those files merely because they remain in the repository. Do not invent an artist credit, generation prompt, usage license, or rights statement that the source notes do not provide. The gallery preview is a 4:3 cover crop; a download returns the original file.

## Icons and integration identities
Use the existing Nucleo Pixel icon exports: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/app-icons.tsx
Use actual service logos for integrations and the original one-bit agent avatars where the product already uses them. Do not substitute emoji, initials, or a different service’s logo. Cursor, Anthropic, and OpenAI marks in the Copy for agents button identify compatible tools; they are not Keiki’s logo or palette. A brand video end card should use the Keiki mark, not those tool marks.

## Motion and video production
Existing web behavior: native scrolling, brief control feedback, no bounce or press scaling. The shared copy label transitions over 180ms with ease-out and a 4px vertical offset; reduced motion uses a 120ms opacity transition with no translation. Do not extrapolate this into a requirement to animate all content.
For new videos, use an understated pace: a clear opening message, one idea per scene, and an uncluttered final frame with the genuine Keiki mark and onkeiki.com. Prefer clean cuts and restrained fades. Optional artwork movement should be slow, subtle, and preserve the subject; do not warp the logo, add bouncing captions, neon trails, stock futuristic holograms, or constant zooms. This is adaptation guidance, not a pre-existing brand motion preset.
Adapt for the requested aspect ratio: landscape presentations, square social graphics, and portrait video each need their own crop and text placement. Keep the logo and essential copy away from crop edges and platform overlays. Check the final output at actual viewing size. Leave enough reading time for each sentence. Caption spoken content and keep music below narration; no official audio identity or soundtrack is supplied, so do not invent one. For web delivery, honor reduced motion and provide a visible pause control for autoplaying media.

## Writing and messaging
Voice: direct, calm, concrete, and useful. Address the reader naturally. Prefer familiar words, active verbs, short paragraphs, and sentence case. Buttons name the action: Copy for agents, Copy URL, Download, Get started. An error explains what happened and how to recover. Avoid hype, vague AI promises, exclamation-heavy slogans, and technical implementation details in a customer-facing flow.
Describe only capabilities supported by current public pages and documentation. Do not fabricate statistics, testimonials, customers, integrations, security certifications, guarantees, or live results. For a video or campaign, agree on the factual message before visual production. Treat examples and generated imagery as illustrative rather than evidence of a real customer or result.

## App interface — exact sizing and screenshot references
The public site and the app share Keiki identity but have different typography and surfaces. The app uses device system fonts, a neutral canvas, compact controls, and a persistent sidebar. Do not put Playfair titles, marketing-scale headings, or decorative artwork behind an operational form.
Measured on production’s public login on 2026-10-12: inputs and the sign-in button are 32px tall, with 12px corners, 14px font size, 20px line height, and 12px horizontal padding. Production /home redirects to sign-in in this inspection session; authenticated production sidebar measurements are therefore not claimed.
The following JPEGs were captured on 2026-10-12 from the current real SidebarLayout, Field, Input, SearchInput, Textarea, Select, Button, and PromptBar components, rendered with the built app stylesheet and fictional sample data. They are component reference plates, not a complete production workflow or customer workspace. The full plates are 1280×720 at 1 CSS pixel per image pixel; the crops retain that scale. Use them as image inputs when making a video rather than guessing how the controls look. Refresh them when their shared components change.
- App shell and controls — light: 1280×720 JPEG. Image input: https://onkeiki.com/design/interface/app-light.jpg
- App shell and controls — dark: 1280×720 JPEG. Image input: https://onkeiki.com/design/interface/app-dark.jpg
- Sidebar — light: 250×720 JPEG. Image input: https://onkeiki.com/design/interface/sidebar-light.jpg
- Inputs, buttons, select, and composer — light: 688×590 JPEG. Image input: https://onkeiki.com/design/interface/controls-light.jpg
- Inputs, buttons, select, and composer — dark: 688×590 JPEG. Image input: https://onkeiki.com/design/interface/controls-dark.jpg
- Focused input — light: 688×90 JPEG. Image input: https://onkeiki.com/design/interface/input-focus-light.jpg
- Focused input — dark: 688×90 JPEG. Image input: https://onkeiki.com/design/interface/input-focus-dark.jpg
Desktop sidebar: 250px expanded width. Organization header and page toolbar are 36px tall with aligned bottom edges. Header label is 13px/20px, weight 500, with a 20px avatar. Navigation has 12px outer horizontal inset, 8px row padding, 28px rows, 13px/20px regular system text, and 14px Pixel glyphs in 16px frames. There is 12px space above navigation content. Workspace, Customers, and Operations groups start expanded.
Selected destination: transparent row background, ordinary foreground and normal text weight, with a 2px×16px blue leading marker. Dotted neutral rules follow labels with an 8px gap. The desktop sidebar stays expanded; below 768px, navigation becomes a drawer opened from the toolbar. Use the real drawer and its close/Escape/focus behavior rather than drawing an unrelated mobile navigation pattern.
Regular buttons, text inputs, and select triggers: 32px high, 12px corners, and 14px/20px text; button labels are weight 500, text inputs weight 400. Input horizontal padding is 12px; SearchInput reserves its leading 16px glyph. Shared desktop textarea minimum height is 96px with 12px corners, 12px horizontal/8px vertical padding, and the existing 13px reading treatment. Let longer text expand or scroll rather than distorting its type.
Compact toolbar buttons are the exception: 24px high, 12px/16px labels, 8px corners. Coarse-pointer actions preserve at least 44px targets. Preserve the shared mobile input sizing rules from source instead of squeezing a desktop screenshot into a portrait frame.
Compact PromptBar measured in the reference render: 36px idle height, 12px outer corners, 6px padding, 24px controls with 8px corners, and 14px/20px input text. The source owns textarea growth and scrolls long drafts after 132px. Preserve the normal attachment/send placement and icons. Do not copy the roomier empty-state composer’s geometry into every compact chat entry.
App field focus stays neutral: a 1px inset hairline and a subtle 2px outer ring, with a 200ms ease-in-out edge/ring transition and no layout shift. Keep pointer focus understated and keyboard focus clearly visible. The inner composer textarea stays borderless; its outer container carries focus. Use supplied focused-input references to show this accurately.
Light app: use the actual semantic gray tokens from geist-colors.css and theme-keiki.css. Dark app: canvas #121212, elevated/control surface #1d1d1d, line #303030, regular foreground #f2f2f2, supporting text #b5b5b5, primary action #1654C3, brand/link text #809DE2. Public pages remain white with navy copy even when the workspace theme is dark. Do not apply the public navy body color to a dark app screen.
Menus and dialogs: reuse the shared primitives, neutral surfaces, semantic labels, focus trapping/restoration, keyboard selection, and scrolling. App tables keep compact labels, dotted neutral row separation, readable status badges, actual service/model logos, and reachable row actions. Derive exact widths from the real target screen rather than inventing one generic table or dropdown for a video.
App shell and sidebar source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/sidebar-layout.tsx
Input/search/textarea/field source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/form.tsx
Select source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/select.tsx
Chat composer source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/beautiful-ui/prompt-bar.tsx
Composer sizing: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/beautiful-ui/prompt-bar.css
Menus: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/dropdown-menu.tsx
Dialogs: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/dialog.tsx
App theme and focus tokens: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/theme-keiki.css
Base gray palette: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/geist-colors.css
Shared app sizing and font rules: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/styles.css

## Component reconstruction map for agents
Start by deciding what you are making. For a product close-up in a video or slide, use the supplied app reference image and crop it. For an interactive screen in this repository, compose the existing exports below inside the current app; do not approximate their styling with a new UI kit. For work outside the repository, use the measured geometry and supplied images as the visual specification, and clearly distinguish a recreated illustration from a live product.
| Component | Actual export and geometry | Appearance and behavior to preserve |
| --- | --- | --- |
| App shell | SidebarLayout in src/components/sidebar-layout.tsx; 250px desktop sidebar; 36px organization/header bar | Neutral app canvas, 13px system navigation, 28px destination rows, Pixel icons, dotted rules, transparent selected row with a 2px blue leading marker; drawer below 768px |
| Page content | PageHeader and PageBody from sidebar-layout.tsx | Compact 13px/20px medium toolbar title; page actions portaled into the existing toolbar. PageBody uses 12px side padding, 24px top padding, 40px bottom padding, and 24px child-group spacing. A route may supply a narrower content wrapper; do not treat a screenshot form width as a global fixed width |
| Field and input | Field and Input in src/components/ui/form.tsx; input 32px high, 12px corners, 12px side padding, 14px/20px text | Field associates the real label and supporting hint; white light-mode control surface, neutral inset hairline, muted placeholder, correct error/disabled state. Coarse-pointer minimum height is 44px and input text is 16px |
| Search | SearchInput in form.tsx; 32px high, 12px corners; 28px left/12px right input padding | Existing 16px Nucleo search glyph at 8px from the leading edge, muted ink, real type=search semantics. Do not center the search icon or replace it with an emoji |
| Multiline input | Textarea in form.tsx; minimum 96px, 12px corners, 12px horizontal/8px vertical padding, 13px relaxed text | Neutral inset hairline, real field association, resize/scroll behavior and 16px coarse-pointer text. It is a form field, distinct from the borderless inner chat input |
| Buttons | Button in src/components/ui/button.tsx; regular 32px high, 12px corners, 12px side padding, 14px/20px medium labels | primary/brand use the real Keiki blue fill with white ink; secondary/outline use shared neutral surface/hairline tokens; preserve hover, disabled, keyboard focus and actual click action. Compact toolbar exceptions are 24px high with 8px corners and 12px/16px labels |
| Select | Select in src/components/ui/select.tsx; 32px trigger, 12px corners, 14px/20px text; 12px leading/8px trailing padding | Actual Pixel caret, selected label, muted placeholder and disabled state. Popup matches trigger width, sits 6px below it, keeps 8px collision clearance, supports keyboard selection and respects available height |
| Chat entry | PromptBar in src/components/beautiful-ui/prompt-bar.tsx; compact idle 36px, 12px outer corners, 6px padding, 24px/8px controls | Leading attachment action, editable borderless inner textarea, trailing send/stop action, normal 14px/20px text. Preserve draft-driven growth up to 132px and the existing busy/send/attachment states; do not make every composer spacious |
| Menus and dialogs | DropdownMenu and Dialog primitives in src/components/ui | Use the original portal, neutral surface, dismissal, focus return and keyboard handling. Capture the specific real menu/dialog for a video instead of inventing a generic floating panel |
The app font stack is system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif. Source sets font-synthesis:none, optical sizing and kerning, and the established macOS ss07/ss06 features. App reading copy defaults to 13px/20px; shared form controls deliberately use 14px/20px. Public pages use Geist reading copy and Inter controls. This distinction is central to matching the actual product.
Exact light-app surfaces from current theme tokens: canvas #fafafa, control/base #ffffff, subtle fill #f2f2f2, hairline #ebebeb, normal foreground hsl(0,0%,9%), supporting/placeholder hsl(0,0%,30%), primary #0742A0, primary hover #042766. App text selection is blue with white text; public selection is gold with navy text. Use the source dark tokens and dark reference plates for a dark app scene; never invert a light screenshot or apply a navy marketing canvas to the app.

### Existing component composition — forms
The following is a composition recipe, not a standalone application. name/search/instructions/responseStyle are controlled state, and the setters plus saveChanges/resetChanges must be bound to the existing screen’s real handlers. Import the built styles and render in the app’s current theme/router/query providers; those providers and handlers are not replaced by this snippet.
```tsx
import { Button } from '~/components/ui/button'
import { Field, Input, SearchInput, Textarea } from '~/components/ui/form'
import { Select } from '~/components/ui/select'

<form onSubmit={saveChanges} className="space-y-6">
  <Field label="Agent name">
    <Input value={name} onChange={e => setName(e.target.value)} />
  </Field>
  <SearchInput aria-label="Search agents" placeholder="Search agents…"
    value={search} onChange={e => setSearch(e.target.value)} />
  <Field label="Instructions">
    <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} />
  </Field>
  <Field label="Response style">
    <Select aria-label="Response style" value={responseStyle} onChange={setResponseStyle}
      options={[{ value: "standard", label: "Standard" }, { value: "concise", label: "Concise" }]} />
  </Field>
  <div className="flex flex-wrap gap-2">
    <Button type="submit" disabled={isSaving}>Save changes</Button>
    <Button type="button" variant="secondary" onClick={resetChanges}>Cancel</Button>
  </div>
</form>
```

### Existing component composition — compact chat
Use the existing draft, paste/attachment, send/stop handlers and textarea ref. canSend/busy come from the actual conversation state; do not hardcode fake sending success or replace the handlers with no-ops in an interactive deliverable.
```tsx
import { PromptBar } from '~/components/beautiful-ui/prompt-bar'

<PromptBar compact value={draft} onChange={setDraft}
  placeholder="Message your agent…" label="Message your agent"
  inputRef={messageInput} onPaste={pasteAttachments}
  onAttach={openAttachmentPicker} onSend={sendMessage} onStop={stopGeneration}
  canSend={canSend} busy={isSending} />
```

### Matching the feel in a frame
Interface feel: practical, compact and calm. Align controls to the same few edges; use neutral 1px lines for structure and restrained blue for the main action or selected destination. Keep labels close to their fields. Primary controls have 12px corners, not generic 4px rectangles or 999px pills. Do not inflate the app into large marketing cards, add glass blur, deep floating shadows, neon strokes, decorative gradients, or a serif workspace title.
For a screenshot in a 1920px-wide composition, a 1280px reference shown at 960px wide uses scale 0.75: its 250px sidebar becomes 187.5px and its 32px input becomes 24px. The image, line weights, font, icon and corners scale together. Crop a detail before scaling if the resulting labels are too small. This arithmetic describes uniform screenshot scaling, not a requirement to use those example canvas dimensions.
For a frame with new narrative text, keep that text outside the app image on a quiet brand surface. Use a short Geist heading and supporting copy; let the actual app image carry the product detail. Never paint a marketing headline over an input, replace the app’s text with unreadable generated lettering, or suggest fictional sample content is a real customer result.
A useful agent handoff includes: the guide, the actual downloaded logo/artwork/component image files, the chosen output format and aspect ratio, the factual message, and the desired duration. If an image-capable model cannot access a URL directly, attach the downloaded files as its image inputs. A text-only model must not claim it visually inspected images it did not open.

## Practical workflow for a video agent
1. Read this guide and confirm the actual message, audience, duration, and output aspect ratio. Download the logo, selected original artwork, and relevant app reference images from the URLs above before composing frames.
2. Use the supplied images as visual references or actual image layers. A typical sequence is one short brand introduction, one clear product idea illustrated with the real app reference, and a quiet closing frame with the Keiki mark and onkeiki.com. This is an example structure, not a mandatory script.
3. Scale a screenshot uniformly: the 250px sidebar, 32px inputs, and 36px toolbar must scale together. For an input close-up, crop the real control rather than redrawing it with a different radius, font, or padding. For a portrait video, use an intentional crop or a separately composed mobile layout; never squash the desktop sidebar and controls.
4. Keep text readable against footage and under platform overlays. Use actual logo variants, fonts, colors, and image files. Build the motion around the message with restrained cuts/fades, without deforming the UI, inventing outcomes, or suggesting sample data is a customer result.
5. Deliver a storyboard or reviewable draft with the asset URLs and the intended final export settings. Verify the exported frames at actual viewing size, captions and narration, crop/safe areas, proportions, factual copy, and the clean end card.

## Implementation sources for agents
- Brand mark: Reuse KeikiMark, the existing engraved rocking-foal SVG that inherits the current ink color; do not redraw the logo. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/keiki-mark.tsx
- Public shell: Compose SiteLayout, PageHeader and SectionHeading; use shared site.css and chrome.css. Navbar: logo left, destinations centered, Log in /login and Get started /signup right. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/landing/site-layout.tsx
- Section introductions: Use semantic headings and paragraphs displayed as one flowing passage, with the existing Pixel category icon. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/landing/section-heading.tsx
- Actions: Use Button or buttonClassName for links; primary public actions are blue, secondary actions neutral, with shared keyboard, touch and disabled behavior. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/button.tsx
- Copy actions: Use CopyButton for labeled clipboard actions with success feedback; provide readable selectable content when clipboard access fails. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/copy-button.tsx
- Fields: Use Field, Input, Textarea and SearchInput with labels, shared hairline edges and focus rings. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/form.tsx
- Selection: Use Select and the shared ToggleSwitch; retain keyboard selection and readable selected state. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/select.tsx
- Surfaces and status: Use Card and Badge with quiet neutral structure and semantic status colors. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/ui/card.tsx
- Template directory: Identity tile, clear title and description, full-width Get started action. Keep search, category, loading, empty and recovery states. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/landing/templates-page.tsx
- Editorial reading: Blog titles: 24px/1.4, weight 600, −.025em tracking. Descriptions: 16px/1.5, weight 450. Body: 16px/1.65. Source: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/blog/blog-article.tsx

## Live references
- Home (Public): https://onkeiki.com/ — Brand, story, artwork, and section composition.
- Templates (Public): https://onkeiki.com/templates — Directory cards and template artwork.
- Pricing (Public): https://onkeiki.com/pricing — Calculator, rates, and FAQ.
- Blog (Public): https://onkeiki.com/blog — Editorial cards and reading layout.
- Solutions (Public): https://onkeiki.com/for — Hero artwork and reusable solution pages.
- Changelog (Public): https://onkeiki.com/blog/changelog-2026-10-09 — Illustrated product updates.
- Documentation (Public): https://onkeiki.com/docs — Long-form technical reading.
- Home workspace (Sign in required): https://onkeiki.com/home — Agent chat and setup shortcuts.
- Agents (Sign in required): https://onkeiki.com/agents — Lists, editing, and agent details.
- People (Sign in required): https://onkeiki.com/crm — Tables, search, and status.
- Settings (Sign in required): https://onkeiki.com/settings — Forms, tabs, and organization controls.

## Delivery checklist
- Real Keiki logo, proportional, fully visible, with clear space; correct navy or white variant.
- Exact color values; white-dominant composition; readable text and intentional blue emphasis.
- Actual Geist/Inter families in their intended roles; Playfair only for the established finale treatment.
- Approved original artwork, intentional crops, and no removed gallery images.
- One clear hierarchy and message; generous space; concise, accurate copy.
- Format-appropriate safe areas, legible captions, restrained motion, and accessible web controls.
- Final export checked at actual size; linked/downloaded files resolve; source and provenance facts are not invented.

## Source of truth
Design contract: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/DESIGN.md
Public tokens: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/src/components/landing/site.css
Artwork notes: https://github.com/Mail-0/sms-kit/blob/initial-scaffold/packages/platform/web/public/landing/ARTWORK.md
Readable reference: https://onkeiki.com/design/brand-reference.md
Structured catalog: https://onkeiki.com/design/catalog.json
When a summary and current implementation differ, inspect the design contract and source. Use this guide as reusable brand context, not permission to change unrelated screens or publish a campaign.
