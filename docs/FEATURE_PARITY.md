# Feature Parity & Side Effects

Generated automatically during Phase 0.

## Side Effects Analysis

| Channel | Preload API | Identified Side Effect |
| --- | --- | --- |
| `store:set` | `saveSetting` | Potential side effect |
| `store:delete` | `deleteSetting` | Potential side effect |
| `file:save` | `saveFile` | Potential side effect |
| `file:save-to-path` | `saveFileToPath` | Potential side effect |
| `flow:generate-video` | `generateFlowVideo` | Potential side effect |
| `video:merge` | `mergeVideos` | Potential side effect |
| `video:merge-progress` | `onMergeProgress` | Runs FFmpeg process |
| `auth:login` | `loginGoogle` | Potential side effect |
| `file:save-video` | `saveVideoFile` | Writes to file system |
| `system:install-ffmpeg` | `installFfmpeg` | Potential side effect |
| `youtube:download` | `youtubeDownload` | Potential side effect |
| `youtube:download-progress` | `onYoutubeDownloadProgress` | Network call and writes to file system |
| `grok:generate-text-video` | `grokGenerateTextVideo` | Potential side effect |
| `tts:synthesize` | `ttsSynthesize` | Potential side effect |
| `tts:synthesize-google` | `ttsSynthesizeGoogle` | Network call / Edge-TTS |
| `whisper:transcribe` | `whisperTranscribe` | Potential side effect |
