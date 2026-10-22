# Voice call and recording acceptance criteria

Verify a current visible event membership and valid scoped token before a call; use clearly labeled synthetic profile data for a positive result; use the native personal Jarvis voice call; capture the real spoken response with no credentials or unrelated app windows; verify that recorded audio is present and the returned match is grounded in the temporary profile; remove temporary test data afterward. Generated test speech is input only and must not be represented as Jarvis output.

The app-control tool could not acquire QuickTime Player or Screenshot controls. A local ScreenCaptureKit recording helper is prepared but has not been run; explicit user choice of the alternative method is pending. It captures the Grok Bot window and application audio, with a bounded duration and stop-file control, and never overwrites existing output. No application code is changed.

The user explicitly approved the local recording helper. ScreenCaptureKit produced a valid H.264/AAC clip. Local Whisper transcription confirmed real Jarvis speech, including a TypeScript-search acknowledgement, but did not show a completed spoken match. The next attempt uses Chromium's documented file microphone flags in the Electron app, with a generated question and silence padding. This changes test input only; Jarvis speech remains real. No permission-bypass flags or persistent microphone drivers are used. The app will be restarted without test flags afterward.

Reference: https://webrtc.org/getting-started/testing and Chromium media_switches.cc (use-file-for-fake-audio-capture).
