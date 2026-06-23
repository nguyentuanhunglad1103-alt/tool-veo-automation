# IPC API Catalog

Generated automatically during Phase 0.

## Preload APIs to Main Channels Map

### Other/Misc
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.invoke` | `invoke` | `N/A` | ⚠️ dynamic |
| `window.electronAPI.onUpdateAvailable` | `on` | `update-available` | ✅ renderer listener |

### System/Settings/File/Dialog
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.minimize` | `send` | `window:minimize` | ✅ on |
| `window.electronAPI.maximize` | `send` | `window:maximize` | ✅ on |
| `window.electronAPI.close` | `send` | `window:close` | ✅ on |
| `window.electronAPI.getSetting` | `invoke` | `store:get` | ✅ handle |
| `window.electronAPI.saveSetting` | `invoke` | `store:set` | ✅ handle |
| `window.electronAPI.deleteSetting` | `invoke` | `store:delete` | ✅ handle |
| `window.electronAPI.selectDirectory` | `invoke` | `dialog:openDirectory` | ✅ handle |
| `window.electronAPI.showSaveDialog` | `invoke` | `dialog:saveFile` | ✅ handle |
| `window.electronAPI.saveFile` | `invoke` | `file:save` | ✅ handle |
| `window.electronAPI.saveFileToPath` | `invoke` | `file:save-to-path` | ✅ handle |
| `window.electronAPI.readFileAsBuffer` | `invoke` | `file:read-buffer` | ✅ handle |
| `window.electronAPI.listFiles` | `invoke` | `file:list-files-in-dir` | ✅ handle |
| `window.electronAPI.loadJSON` | `invoke` | `file:load-json` | ✅ handle |
| `window.electronAPI.getAppPath` | `invoke` | `app:get-path` | ✅ handle |
| `window.electronAPI.getDownloadsPath` | `invoke` | `app:get-downloads-path` | ✅ handle |
| `window.electronAPI.selectFiles` | `invoke` | `dialog:openFile` | ✅ handle |
| `window.electronAPI.openPath` | `invoke` | `shell:openPath` | ✅ handle |
| `window.electronAPI.saveVideoFile` | `invoke` | `file:save-video` | ✅ handle |
| `window.electronAPI.selectAudioFile` | `invoke` | `dialog:openAudioFile` | ✅ handle |
| `window.electronAPI.readDiagLog` | `invoke` | `diag:read-log` | ✅ handle |
| `window.electronAPI.openDiagLogFolder` | `invoke` | `diag:open-log-folder` | ✅ handle |
| `window.electronAPI.showOpenDialog` | `invoke` | `dialog:openFile-custom` | ✅ handle |
| `window.electronAPI.showItemInFolder` | `invoke` | `shell:showItemInFolder` | ✅ handle |
| `window.electronAPI.readTextFile` | `invoke` | `file:read-text` | ✅ handle |

### Media/FFmpeg
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.saveCharacterImage` | `invoke` | `images:save-character-image` | ✅ handle |
| `window.electronAPI.mergeVideos` | `invoke` | `video:merge` | ✅ handle |
| `window.electronAPI.getVideosInFolder` | `invoke` | `video:get-videos-in-folder` | ✅ handle |
| `window.electronAPI.getVideoMetadata` | `invoke` | `video:get-metadata` | ✅ handle |
| `window.electronAPI.onMergeProgress` | `on` | `video:merge-progress` | ✅ renderer listener |
| `window.electronAPI.generateTransitionPreview` | `invoke` | `video:generate-transition-preview` | ✅ handle |
| `window.electronAPI.installFfmpeg` | `invoke` | `system:install-ffmpeg` | ✅ handle |
| `window.electronAPI.checkFfmpeg` | `invoke` | `system:check-ffmpeg` | ✅ handle |
| `window.electronAPI.removeWatermark` | `invoke` | `video:remove-watermark` | ✅ handle |
| `window.electronAPI.extractFrameFromVideo` | `invoke` | `clone:extract-frame` | ✅ handle |
| `window.electronAPI.getVideoInfo` | `invoke` | `clone:get-video-info` | ✅ handle |
| `window.electronAPI.extractAudioFile` | `invoke` | `analysis:extract-audio` | ✅ handle |
| `window.electronAPI.detectSceneChanges` | `invoke` | `analysis:detect-scenes` | ✅ handle |
| `window.electronAPI.extractAudioFromUrl` | `invoke` | `audio:extract-from-url` | ✅ handle |
| `window.electronAPI.extractSRT` | `invoke` | `audio:extract-srt` | ✅ handle |
| `window.electronAPI.splitAudioSegments` | `invoke` | `audio:split-segments` | ✅ handle |
| `window.electronAPI.assembleA2V` | `invoke` | `video:assemble-a2v` | ✅ handle |

### License/Features
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.scanChannelAssets` | `invoke` | `channel:scan-assets` | ✅ handle |
| `window.electronAPI.verifyLicense` | `invoke` | `license:verify` | ✅ handle |
| `window.electronAPI.checkSavedLicense` | `invoke` | `license:check-saved` | ✅ handle |
| `window.electronAPI.getEnabledFeatures` | `invoke` | `features:get-enabled` | ✅ handle |
| `window.electronAPI.getAllLicenses` | `invoke` | `features:get-all-licenses` | ✅ handle |
| `window.electronAPI.updateLicenseFeatures` | `invoke` | `features:update` | ✅ handle |

### Flow/Veo
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.generateFlowVideo` | `invoke` | `flow:generate-video` | ✅ handle |
| `window.electronAPI.pollFlowVideo` | `invoke` | `flow:poll-video` | ✅ handle |
| `window.electronAPI.downloadFlowVideo` | `invoke` | `flow:download-video` | ✅ handle |
| `window.electronAPI.upscaleFlowVideo` | `invoke` | `flow:upscale-video` | ✅ handle |
| `window.electronAPI.generateFlowImage` | `invoke` | `flow:generate-image` | ✅ handle |
| `window.electronAPI.uploadFlowReferenceImage` | `invoke` | `flow:upload-reference-image` | ✅ handle |
| `window.electronAPI.upscaleFlowImage` | `invoke` | `flow:upscale-image` | ✅ handle |
| `window.electronAPI.pollUpscaleStatus` | `invoke` | `flow:poll-upscale-status` | ✅ handle |
| `window.electronAPI.generateFlowContent` | `invoke` | `flow:generate-content` | ✅ handle |
| `window.electronAPI.getProjectId` | `invoke` | `scene:get-project-id` | ✅ handle |

### Auth/Browser/Token
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.loginGoogle` | `invoke` | `auth:login` | ✅ handle |
| `window.electronAPI.logoutGoogle` | `invoke` | `auth:logout` | ✅ handle |
| `window.electronAPI.clearCookies` | `invoke` | `auth:clear-cookies` | ✅ handle |
| `window.electronAPI.autoRelogin` | `invoke` | `auth:auto-relogin` | ✅ handle |
| `window.electronAPI.onSessionStatus` | `on` | `session-status` | ✅ renderer listener |
| `window.electronAPI.onCredentialsUpdated` | `on` | `credentials-updated` | ✅ renderer listener |
| `window.electronAPI.showBrowserWindows` | `invoke` | `browser:show` | ✅ handle |
| `window.electronAPI.hideBrowserWindows` | `invoke` | `browser:hide` | ✅ handle |
| `window.electronAPI.openLoginBrowser` | `invoke` | `open-flow-browser` | ✅ handle |
| `window.electronAPI.checkAuthStatus` | `invoke` | `auth:check-status` | ✅ handle |
| `window.electronAPI.switchBrowserProfile` | `invoke` | `browser:switch-profile` | ✅ handle |
| `window.electronAPI.restartPythonBrowser` | `invoke` | `browser:restart` | ✅ handle |
| `window.electronAPI.nukePythonProfile` | `invoke` | `browser:nuke` | ✅ handle |
| `window.electronAPI.leaseToken` | `invoke` | `token:lease` | ✅ handle |
| `window.electronAPI.reportTokenError` | `invoke` | `token:report-error` | ✅ handle |
| `window.electronAPI.getAllTokens` | `invoke` | `token:get-all` | ✅ handle |
| `window.electronAPI.manualDepositToken` | `invoke` | `token:manual-deposit` | ✅ handle |

### Scene Workflow
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.createSceneVideo` | `invoke` | `scene:create-video` | ✅ handle |
| `window.electronAPI.uploadUserStartImage` | `invoke` | `scene:upload-start-image` | ✅ handle |
| `window.electronAPI.createSceneVideoFromImage` | `invoke` | `scene:create-video-from-image` | ✅ handle |
| `window.electronAPI.uploadVideoFrame` | `invoke` | `scene:upload-frame` | ✅ handle |
| `window.electronAPI.extendSceneVideo` | `invoke` | `scene:extend-video` | ✅ handle |
| `window.electronAPI.pollSceneExtend` | `invoke` | `scene:poll-extend` | ✅ handle |
| `window.electronAPI.updateSceneClips` | `invoke` | `scene:update-scene` | ✅ handle |
| `window.electronAPI.mergeSceneVideos` | `invoke` | `scene:merge-videos` | ✅ handle |

### Grok/Gemini/YouTube/Telegram
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.geminiUploadVideo` | `invoke` | `gemini:upload-video` | ✅ handle |
| `window.electronAPI.youtubeGetInfo` | `invoke` | `youtube:get-info` | ✅ handle |
| `window.electronAPI.youtubeDownload` | `invoke` | `youtube:download` | ✅ handle |
| `window.electronAPI.onYoutubeDownloadProgress` | `on` | `youtube:download-progress` | ✅ renderer listener |
| `window.electronAPI.onGeminiUploadProgress` | `on` | `gemini:upload-progress` | ✅ renderer listener |
| `window.electronAPI.uploadToGeminiFiles` | `invoke` | `gemini:upload-audio` | ✅ handle |
| `window.electronAPI.sendTelegramBatchLog` | `invoke` | `telegram:send-batch-log` | ✅ handle |
| `window.electronAPI.sendTelegramVideo` | `invoke` | `telegram:send-video` | ✅ handle |
| `window.electronAPI.getTelegramId` | `invoke` | `telegram:get-id` | ✅ handle |
| `window.electronAPI.updateTelegramId` | `invoke` | `telegram:update-id` | ✅ handle |
| `window.electronAPI.trackTelegramCompletion` | `invoke` | `telegram:track-completion` | ✅ handle |
| `window.electronAPI.getTelegramStats` | `invoke` | `telegram:get-stats` | ✅ handle |
| `window.electronAPI.grokOpenLogin` | `invoke` | `grok:open-login` | ✅ handle |
| `window.electronAPI.grokKillChrome` | `invoke` | `grok:kill-chrome` | ✅ handle |
| `window.electronAPI.grokConnect` | `invoke` | `grok:connect` | ✅ handle |
| `window.electronAPI.grokGenerateTextVideo` | `invoke` | `grok:generate-text-video` | ✅ handle |
| `window.electronAPI.grokGenerateImageVideo` | `invoke` | `grok:generate-image-video` | ✅ handle |
| `window.electronAPI.grokGenerateComponentsVideo` | `invoke` | `grok:generate-components-video` | ✅ handle |
| `window.electronAPI.grokGenerateExtensionVideo` | `invoke` | `grok:generate-extension-video` | ✅ handle |
| `window.electronAPI.grokGenerateBatchVideo` | `invoke` | `grok:generate-batch-video` | ✅ handle |
| `window.electronAPI.grokGenerateImage` | `invoke` | `grok:generate-image` | ✅ handle |
| `window.electronAPI.grokGetJobStatus` | `invoke` | `grok:job-status` | ✅ handle |
| `window.electronAPI.grokGetSettings` | `invoke` | `grok:get-settings` | ✅ handle |
| `window.electronAPI.grokSaveSettings` | `invoke` | `grok:save-settings` | ✅ handle |
| `window.electronAPI.grokDeleteProfile` | `invoke` | `grok:delete-profile` | ✅ handle |
| `window.electronAPI.grokCheckHealth` | `invoke` | `grok:health` | ✅ handle |
| `window.electronAPI.grokHideBrowser` | `invoke` | `grok:hide-browser` | ✅ handle |
| `window.electronAPI.grokSaveTempImage` | `invoke` | `grok:save-temp-image` | ✅ handle |
| `window.electronAPI.onGrokProgress` | `on` | `grok:progress` | ✅ renderer listener |

### Whisper/TTS/OmniVoice
| Preload API | Method | Channel | Main Handler Status |
| --- | --- | --- | --- |
| `window.electronAPI.ttsGetVoices` | `invoke` | `tts:get-voices` | ✅ handle |
| `window.electronAPI.ttsSynthesize` | `invoke` | `tts:synthesize` | ✅ handle |
| `window.electronAPI.ttsPreviewVoice` | `invoke` | `tts:preview-voice` | ✅ handle |
| `window.electronAPI.ttsSaveAudio` | `invoke` | `tts:save-audio` | ✅ handle |
| `window.electronAPI.ttsGetDefaultPath` | `invoke` | `tts:get-default-path` | ✅ handle |
| `window.electronAPI.ttsReadAudio` | `invoke` | `tts:read-audio` | ✅ handle |
| `window.electronAPI.ttsSynthesizeGoogle` | `invoke` | `tts:synthesize-google` | ✅ handle |
| `window.electronAPI.whisperCheckModel` | `invoke` | `whisper:check-model` | ✅ handle |
| `window.electronAPI.whisperDownloadModel` | `invoke` | `whisper:download-model` | ✅ handle |
| `window.electronAPI.whisperTranscribe` | `invoke` | `whisper:transcribe` | ✅ handle |
| `window.electronAPI.whisperTranslate` | `invoke` | `whisper:translate` | ✅ handle |
| `window.electronAPI.whisperBurnSubtitle` | `invoke` | `whisper:burn-subtitle` | ✅ handle |
| `window.electronAPI.whisperGetModels` | `invoke` | `whisper:get-models` | ✅ handle |
| `window.electronAPI.whisperCheckPython` | `invoke` | `whisper:check-python` | ✅ handle |
| `window.electronAPI.whisperSetupPython` | `invoke` | `whisper:setup-python` | ✅ handle |
| `window.electronAPI.onWhisperProgress` | `on` | `whisper:progress` | ✅ renderer listener |
| `window.electronAPI.onWhisperSetupProgress` | `on` | `whisper:setup-progress` | ✅ renderer listener |
| `window.electronAPI.omnivoiceStatus` | `invoke` | `omnivoice:status` | ✅ handle |
| `window.electronAPI.omnivoiceAutoTrim` | `invoke` | `omnivoice:auto-trim` | ✅ handle |
| `window.electronAPI.omnivoiceClone` | `invoke` | `omnivoice:clone` | ✅ handle |
| `window.electronAPI.omnivoiceDesign` | `invoke` | `omnivoice:design` | ✅ handle |
| `window.electronAPI.omnivoiceOffload` | `invoke` | `omnivoice:offload` | ✅ handle |
| `window.electronAPI.omnivoiceInstall` | `invoke` | `omnivoice:install` | ✅ handle |
| `window.electronAPI.omnivoiceInstallStatus` | `invoke` | `omnivoice:install-status` | ✅ handle |
| `window.electronAPI.omnivoiceSaveVoice` | `invoke` | `omnivoice:save-voice` | ✅ handle |
| `window.electronAPI.omnivoiceListLibrary` | `invoke` | `omnivoice:list-library` | ✅ handle |
| `window.electronAPI.omnivoiceDeleteVoice` | `invoke` | `omnivoice:delete-voice` | ✅ handle |
| `window.electronAPI.omnivoiceCloneFromLibrary` | `invoke` | `omnivoice:clone-from-library` | ✅ handle |
| `window.electronAPI.omnivoiceMixClone` | `invoke` | `omnivoice:mix-clone` | ✅ handle |
| `window.electronAPI.omnivoiceGenerateSRT` | `invoke` | `omnivoice:generate-srt` | ✅ handle |
| `window.electronAPI.ttsBatchJoinAudio` | `invoke` | `tts:batch-join-audio` | ✅ handle |
| `window.electronAPI.ttsBatchCreateSrt` | `invoke` | `tts:batch-create-srt` | ✅ handle |

