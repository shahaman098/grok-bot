# Phone refinement acceptance criteria

- Entry page fits a 320px screen without horizontal scrolling; registration starts with only the essentials and preserves explicit visibility consent.
- All form text is at least 16px and primary touch controls at least 44px. Busy states prevent duplicate actions.
- App header, content and bottom navigation have separate space; safe-area insets protect controls on notched phones.
- People are available without loading WebGL. Choosing Map loads the existing venue map; map failures still allow profiles to open.
- Profile, event and matching sheets have accessible titles, close controls, scrollable content and keyboard-aware height limits.
- Long names and profile fields wrap. Matching results open profiles. Visibility, membership restoration and leave behavior remain intact.
- Validate narrow phones, short landscape, mobile Chromium/WebKit and desktop, with screenshots and meaningful interaction checks; do not submit registration in browser QA.
