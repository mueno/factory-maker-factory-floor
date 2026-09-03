# TERRA — Voice-Driven Earth Engine

TERRA turns a browser tab into a shared, interactive Earth. A person can speak or type a question; a WebMCP-capable browser agent can call the same typed controls. Both operate the same camera, scientific layer, IPCC scenario, year, and visual style.

Built for the [WebMCP Challenge](https://webmcp.devpost.com/).

## The experience

- A Three.js globe is the interface, rather than an illustration beside a chat window.
- Camera flights connect the Arctic, North Atlantic, Europe, Japan, and the whole Earth.
- Scientific, cinematic, and plain-language views change presentation without changing values.
- Browser speech recognition, speech synthesis, and Web Audio provide voice input, spoken explanations, and a spatial ambient layer when the browser supports them.
- The existing MAESTRO on-device WebGPU fluid field runs behind the globe on supported devices. The experience falls back cleanly when WebGPU is unavailable.

## Why WebMCP

TERRA registers six tools in the page. They are not a server-side MCP wrapper and do not infer clicks or DOM coordinates.

| Tool | Shared action |
| --- | --- |
| `earth_read_scene` | Read scene, measurements, uncertainty, sources, and revision |
| `earth_focus_region` | Fly the visible globe to a named region |
| `earth_set_layer` | Change the visible scientific evidence layer |
| `earth_set_scenario` | Set an IPCC AR6 scenario and year |
| `earth_set_render_style` | Change presentation while preserving the values |
| `earth_play_story` | Play an interruptible Arctic-to-AMOC evidence sequence |

Every mutation requires the revision returned by `earth_read_scene`. A stale write is rejected with `revision_conflict`. Human controls call the same host operations as the agent, so the screen is the shared state—not a separate visualization of hidden agent work.

## Scientific boundary

TERRA is an exploratory, reduced-order visualization. It does not run a global climate model, predict weather, or map local flooding.

- Temperature and global mean sea-level ranges are taken from IPCC AR6 WGI.
- September Arctic sea-ice observations use NSIDC Sea Ice Index v4 values for 1979 and 2025.
- The AMOC endpoint uses the 34–45% CMIP6 decline range reported by Weijer et al. (2020) and archived by NOAA.
- Values between assessment windows are visibly identified as interpolation.
- The future sea-ice shape is an illustrative path to the IPCC “practically ice-free” threshold, not a year-specific forecast.

Primary sources are linked in the interface and returned by `earth_read_scene`:

- [IPCC AR6 WGI Chapter 4](https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-4/)
- [IPCC AR6 WGI Summary for Policymakers](https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/)
- [NSIDC Sea Ice Index](https://nsidc.org/data/seaice_index/)
- [NOAA repository: Weijer et al. (2020)](https://repository.library.noaa.gov/view/noaa/30634)

## Run and verify

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/?lang=en` or `?lang=ja`.

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The interface remains usable without WebMCP. Microphone access is requested only when the user selects the voice control. Audio starts only after an explicit user action.

## Technology

Next.js 16, React 19, TypeScript, Three.js, Natural Earth geometry through `world-atlas`, the imperative WebMCP API, the Web Speech API, Web Audio, and MAESTRO's on-device WebGPU world layer.

## Legal and responsible use

- [Terms of Use](https://factory-maker-floor.chalky-wasp-3685.chatgpt.site/terms)
- [Privacy Policy](https://factory-maker-floor.chalky-wasp-3685.chatgpt.site/privacy)
- [AI & Safety Notice](https://factory-maker-floor.chalky-wasp-3685.chatgpt.site/ai-safety)

MIT — see [LICENSE](LICENSE).
