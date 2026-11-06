# Type contracts

Use with the relevant field/signature sections of `extension-api.md`. Templates under
`templates/<type>/` are complete scaffolds; keep required scripts and only supported
optional scripts.

## Novel and comic

Both use detail → optional page → toc → chap. `page` is TOC pagination and returns one
or more absolute TOC-page URLs; omit it when the TOC is not paginated. Comic images come
from `chap`, never `page`; comic `chap` returns an image array.

## Video

Playback is a required `chap` → `track` chain. `chap(episodeUrl)` returns server entries
`[{title, data}]`; `track(data)` resolves the chosen entry. Prefer direct `native`
`.m3u8`/`.mp4`, then `auto` for sniffing an embed, then `webview` only when both fail.

## Audio

Audio also requires `chap` → `track`, but the app uses the first non-blank chap entry and
has no server picker. Wrap even a single source as `[{title, data}]`. `track` must resolve
to real `native` media; `auto` and `webview` do not work. Detail format is `album` or
`audio`. Lyrics belong in `track.lyrics` (LRC/VTT/plain text), never subtitles.

## TTS

Declare `voice` and `tts`. Voice language is a valid BCP-47 tag. Engine controls such as
`preload_size`, `preload_parallel`, and `max_length` are bare JSON values; set
`max_length > 0` to avoid per-character requests. Provider credentials are ordinary
input settings.

## Translate

Declare `language` and `translate`; `model` and `style` are optional. Language IDs follow
the API contract. `support_auto_detect`, `max_line`, and `max_length` are bare values.
Provider credentials are ordinary input settings.

## AI

Declare `chatStream`. Provider URL, key, and model belong in config. Stream with
`fetch(..., {stream:true})`, `readLine()`, and `ai.emitToken(...)`, or return one complete
non-empty response for a non-streaming provider.
