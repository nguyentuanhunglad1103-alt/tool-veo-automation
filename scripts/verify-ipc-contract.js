#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const os = require("os");
const Module = require("module");

const appDir = path.resolve(process.argv[2] || process.cwd());
const packagePath = path.join(appDir, "package.json");
let preloadPath = path.join(appDir, "preload-entry.js");
if (!fs.existsSync(preloadPath)) {
  preloadPath = path.join(appDir, "preload.js");
}
if (!fs.existsSync(preloadPath)) {
  const fallbackPreload = path.join(appDir, "src-electron", "preload.js");
  if (fs.existsSync(fallbackPreload)) {
    preloadPath = fallbackPreload;
  }
}
const htmlPath = path.join(appDir, "dist", "index.html");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(`Assertion failed: ${message}`);
  }
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing ${label}: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// ------------------------------------------------------------------------
// GLOBAL ELECTRON MOCK
// ------------------------------------------------------------------------
const mockHandlers = {};
const mockListeners = {};

const mockElectron = {
  ipcMain: {
    handle(channel, callback) {
      mockHandlers[channel] = callback;
    },
    on(channel, callback) {
      mockListeners[channel] = callback;
    },
  },
  app: {
    getPath(name) {
      return path.join(os.tmpdir(), name);
    },
    getAppPath() {
      return appDir;
    },
    getVersion() {
      return "1.5.3";
    },
    name: "veo-automation",
  },
  dialog: {
    showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [] }),
    showSaveDialog: () => Promise.resolve({ canceled: false, filePath: "" }),
  },
  shell: {
    openPath: () => Promise.resolve(true),
  },
  BrowserWindow: {
    fromWebContents: () => ({}),
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") {
    return mockElectron;
  }
  return originalLoad.apply(this, arguments);
};
// ------------------------------------------------------------------------

function verifyArtifacts() {
  assertFile(packagePath, "package.json");
  assertFile(preloadPath, "preload.js");
  assertFile(htmlPath, "dist/index.html");

  const pkg = readJson(packagePath);
  if (!pkg.main) {
    fail("package.json is missing main");
  }

  const mainPath = path.join(appDir, pkg.main);
  assertFile(mainPath, `main entry ${pkg.main}`);

  const html = fs.readFileSync(htmlPath, "utf8");
  const localRefs = [];
  const refPattern = /\b(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = refPattern.exec(html))) {
    const ref = match[1];
    if (ref.startsWith("./") || ref.startsWith("/")) {
      localRefs.push(ref);
    }
  }

  const missingRefs = localRefs
    .map((ref) => path.join(path.dirname(htmlPath), ref.replace(/^\/+/, "")))
    .filter((refPath) => !fs.existsSync(refPath));

  if (missingRefs.length) {
    fail(`Missing dist asset reference(s): ${missingRefs.join(", ")}`);
  }

  const mojibakeMarkers = ["Táº", "ká»", "vÃ", "Ä ", "Ä‘"];
  const foundMarkers = mojibakeMarkers.filter((marker) =>
    html.includes(marker),
  );
  if (foundMarkers.length) {
    fail(`HTML contains mojibake marker(s): ${foundMarkers.join(", ")}`);
  }

  return { pkg, mainPath, localAssetCount: localRefs.length };
}

function extractMainChannels(mainPath) {
  const channels = {
    handle: new Set(),
    on: new Set(),
  };
  const scannedFiles = new Set();

  const registrations = {
    handle: {},
    on: {},
  };

  function scanFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    if (scannedFiles.has(resolvedPath)) {
      return;
    }
    scannedFiles.add(resolvedPath);

    const relativePath = path.relative(appDir, filePath);
    const source = fs.readFileSync(filePath, "utf8");

    const ipcPattern = /ipcMain\.(handle|on)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = ipcPattern.exec(source))) {
      const type = match[1];
      const channel = match[2];
      if (!registrations[type][channel]) {
        registrations[type][channel] = [];
      }
      registrations[type][channel].push(relativePath);
      channels[type].add(channel);
    }

    const wrappedHandlePattern = /Hw\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = wrappedHandlePattern.exec(source))) {
      const channel = match[1];
      if (!registrations.handle[channel]) {
        registrations.handle[channel] = [];
      }
      registrations.handle[channel].push(relativePath);
      channels.handle.add(channel);
    }

    // Monolithic entrypoints may load small, maintained IPC modules. Scan only
    // explicit relative requires so inactive reconstructed source remains ignored.
    const localRequirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = localRequirePattern.exec(source))) {
      const request = match[1];
      if (!request.startsWith(".")) {
        continue;
      }
      const candidate = path.resolve(path.dirname(filePath), request);
      const candidates = [
        candidate,
        `${candidate}.js`,
        path.join(candidate, "index.js"),
      ];
      const localModule = candidates.find(
        (item) =>
          fs.existsSync(item) &&
          fs.statSync(item).isFile() &&
          path.relative(appDir, item).split(path.sep)[0] !== "..",
      );
      if (localModule) {
        scanFile(localModule);
      }
    }
  }

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        scanFile(fullPath);
      }
    }
  }

  if (fs.existsSync(mainPath)) {
    if (fs.statSync(mainPath).isFile()) {
      scanFile(mainPath);
    }
  }

  const mainDir = path.dirname(mainPath);
  // If the entrypoint is the monolithic deobfuscated.js bundle, do not scan other source files in the directory
  const isMonolithicBundle = mainPath.endsWith("deobfuscated.js");
  if (
    !isMonolithicBundle &&
    fs.existsSync(mainDir) &&
    fs.statSync(mainDir).isDirectory()
  ) {
    scanDir(mainDir);
  }

  // Check for duplicate registrations
  const duplicates = [];
  for (const type of ["handle", "on"]) {
    for (const [channel, files] of Object.entries(registrations[type])) {
      if (files.length > 1) {
        duplicates.push(
          `Duplicate ipcMain.${type} for "${channel}" in: ${files.join(", ")}`,
        );
      }
    }
  }
  if (duplicates.length > 0) {
    fail(
      `IPC contract check failed: Duplicate channels found:\n- ${duplicates.join("\n- ")}`,
    );
  }

  return channels;
}

function extractPreloadCalls(preloadPath) {
  const exposed = {};
  let currentApi = "<initializing>";
  const calls = [];

  const fakeIpcRenderer = {
    invoke(channel) {
      calls.push({ api: currentApi, method: "invoke", channel });
      return Promise.resolve({});
    },
    send(channel) {
      calls.push({ api: currentApi, method: "send", channel });
    },
    on(channel) {
      calls.push({ api: currentApi, method: "on", channel });
    },
    removeListener(channel) {
      calls.push({ api: currentApi, method: "removeListener", channel });
    },
  };

  const sandbox = {
    require(name) {
      if (name === "electron") {
        return {
          contextBridge: {
            exposeInMainWorld(name, value) {
              exposed[name] = value;
            },
          },
          ipcRenderer: fakeIpcRenderer,
        };
      }
      if (name.startsWith(".")) {
        const localPath = require.resolve(
          path.resolve(path.dirname(preloadPath), name),
        );
        vm.runInNewContext(fs.readFileSync(localPath, "utf8"), sandbox, {
          filename: localPath,
        });
        return {};
      }
      return require(name);
    },
    process: { platform: process.platform },
    console,
  };

  vm.runInNewContext(fs.readFileSync(preloadPath, "utf8"), sandbox, {
    filename: preloadPath,
  });

  const electronApi = exposed.electronAPI;
  if (!electronApi || typeof electronApi !== "object") {
    fail("preload.js did not expose window.electronAPI");
  }

  const dummy = function noop() {};
  const errors = [];
  const api = {};

  for (const [globalName, surface] of Object.entries(exposed)) {
    if (!surface || typeof surface !== "object") continue;
    for (const [name, value] of Object.entries(surface)) {
      const qualifiedName =
        globalName === "electronAPI" ? name : `${globalName}.${name}`;
      api[qualifiedName] = value;
      if (typeof value !== "function") {
        continue;
      }

      currentApi = qualifiedName;
      try {
        value(dummy, dummy, dummy, dummy);
      } catch (error) {
        errors.push(`${qualifiedName}: ${error.message}`);
      }
    }
  }

  currentApi = "<done>";

  if (errors.length) {
    fail(`Unable to exercise preload wrapper(s): ${errors.join("; ")}`);
  }

  return { api, calls };
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function verifyContract(preloadCalls, mainChannels) {
  const dynamicInvokeChannels = new Set(["__dynamic_preload_invoke__"]);
  const failures = [];

  for (const call of preloadCalls) {
    if (call.method === "invoke") {
      if (call.api === "invoke") {
        dynamicInvokeChannels.add(call.channel);
        continue;
      }
      if (!mainChannels.handle.has(call.channel)) {
        failures.push(`${call.api} invokes missing handler "${call.channel}"`);
      }
    }

    if (call.method === "send" && !mainChannels.on.has(call.channel)) {
      failures.push(`${call.api} sends missing listener "${call.channel}"`);
    }
  }

  if (failures.length) {
    fail(`IPC contract mismatch:\n- ${failures.join("\n- ")}`);
  }

  return {
    invokeCount: uniqueBy(
      preloadCalls.filter(
        (call) => call.method === "invoke" && call.api !== "invoke",
      ),
      (call) => `${call.api}:${call.channel}`,
    ).length,
    sendCount: uniqueBy(
      preloadCalls.filter((call) => call.method === "send"),
      (call) => `${call.api}:${call.channel}`,
    ).length,
    eventSubscriptionCount: uniqueBy(
      preloadCalls.filter((call) => call.method === "on"),
      (call) => `${call.api}:${call.channel}`,
    ).length,
    dynamicInvoke: preloadCalls.some(
      (call) => call.api === "invoke" && call.method === "invoke",
    ),
  };
}

function verifyResponseShapes() {
  console.log("  Verifying response shapes of handlers...");

  // Mock global.fetch temporarily for stable TTS testing without network dependencies
  const originalFetch = global.fetch;
  global.fetch = (url) => {
    if (typeof url === "string" && url.includes("voices/list")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              Name: "vi-VN-HoaiMyNeural",
              ShortName: "vi-VN-HoaiMyNeural",
              FriendlyName: "Hoai My",
              Locale: "vi-VN",
              Gender: "Female",
            },
          ]),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  };

  require(
    path.join(appDir, "src-electron", "ipc", "license.ipc.js"),
  ).registerLicenseIPC();
  require(
    path.join(appDir, "src-electron", "ipc", "token.ipc.js"),
  ).registerTokenIPC();
  require(
    path.join(appDir, "src-electron", "ipc", "media.ipc.js"),
  ).registerMediaIPC();
  require(
    path.join(appDir, "src-electron", "ipc", "tts.ipc.js"),
  ).registerTtsIPC();

  // Test license:verify
  assert(
    mockHandlers["license:verify"] !== undefined,
    "license:verify handler exists",
  );
  Promise.resolve(mockHandlers["license:verify"]({}, "KEY")).then((data) => {
    assert(data.success === true, "license:verify success is true");
    assert(data.valid === true, "license:verify valid is true");
    assert(Array.isArray(data.features), "license:verify features is array");
  });

  // Test license:check-saved
  assert(
    mockHandlers["license:check-saved"] !== undefined,
    "license:check-saved handler exists",
  );
  Promise.resolve(mockHandlers["license:check-saved"]({})).then((data) => {
    assert(data.success === true, "license:check-saved success is true");
    assert(data.valid === true, "license:check-saved valid is true");
    assert(
      data.licenseKey.includes("XXXX"),
      "license:check-saved returns masked key",
    );
    assert(
      Array.isArray(data.features),
      "license:check-saved features is array",
    );
  });

  // Test features:get-enabled
  assert(
    mockHandlers["features:get-enabled"] !== undefined,
    "features:get-enabled handler exists",
  );
  Promise.resolve(mockHandlers["features:get-enabled"]({})).then((data) => {
    assert(data.success === true, "features:get-enabled success is true");
    assert(
      Array.isArray(data.features),
      "features:get-enabled features is array",
    );
  });

  // Test token:get-all
  assert(
    mockHandlers["token:get-all"] !== undefined,
    "token:get-all handler exists",
  );
  Promise.resolve(mockHandlers["token:get-all"]({})).then((data) => {
    assert(data.success === true, "token:get-all success is true");
    assert(Array.isArray(data.tokens), "token:get-all tokens is array");
  });

  // Test system:check-ffmpeg
  assert(
    mockHandlers["system:check-ffmpeg"] !== undefined,
    "system:check-ffmpeg handler exists",
  );
  Promise.resolve(mockHandlers["system:check-ffmpeg"]({})).then((data) => {
    assert(data.success === true, "system:check-ffmpeg success is true");
    assert(data.installed === true, "system:check-ffmpeg installed is true");
  });

  // Test tts:get-voices
  assert(
    mockHandlers["tts:get-voices"] !== undefined,
    "tts:get-voices handler exists",
  );
  Promise.resolve(mockHandlers["tts:get-voices"]({}))
    .then((data) => {
      assert(Array.isArray(data), "tts:get-voices returns array");
      assert(data.length > 0, "tts:get-voices returns at least one voice");
      assert(
        data[0].shortName !== undefined,
        "tts:get-voices item has shortName",
      );

      // Restore original global.fetch once we finish checking response shapes
      global.fetch = originalFetch;
    })
    .catch((err) => {
      global.fetch = originalFetch;
      fail(`tts:get-voices assertion threw an error: ${err.message}`);
    });

  console.log("  ✅ Response shapes verified successfully.");
}

function verifyPathTraversal() {
  console.log("  Verifying path traversal protection...");
  const { isSafePath } = require(
    path.join(appDir, "src-electron", "ipc", "file.ipc.js"),
  );

  assert(
    isSafePath("C:\\Windows\\System32\\cmd.exe") === false,
    "Blocked system files",
  );
  assert(isSafePath("c:\\windows") === false, "Blocked system directories");
  assert(
    isSafePath("../../../etc/passwd") === false,
    "Blocked relative traversals",
  );
  assert(
    isSafePath("C:\\Users\\random\\Documents\\unsafe.exe") === false,
    "Blocked non-whitelist extensions",
  );

  const safeDocPath = path.join(os.tmpdir(), "downloads", "test.json");
  assert(
    isSafePath(safeDocPath) === true,
    "Allowed user downloads path with safe extension",
  );

  console.log("  ✅ Path traversal protection verified.");
}

function verifySafeStorage() {
  console.log("  Verifying safe storage logic...");
  const store = require(
    path.join(appDir, "src-electron", "services", "store.js"),
  );

  // Setup mock store properties
  store.set("allowPlaintextFallback", true);
  store.setSecure("test_secure_key", "super_secret");
  assert(
    store.getSecure("test_secure_key") === "super_secret",
    "Secure store round-trip with fallback works",
  );

  store.set("allowPlaintextFallback", false);
  let threw = false;
  try {
    store.getSecure("test_secure_key");
  } catch (e) {
    threw = true;
  }
  assert(
    threw === true,
    "Secure store throws error when fallback disabled and encryption is unavailable",
  );

  console.log("  ✅ Safe storage logic verified.");
}

function verifyTailwindCSS() {
  console.log("  Verifying Tailwind CSS compilation...");
  const assetsDir = path.join(appDir, "dist", "assets");
  if (!fs.existsSync(assetsDir)) {
    fail("Vite assets directory does not exist: run npm run build first");
  }
  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find((f) => f.endsWith(".css"));
  assert(cssFile !== undefined, "Tailwind compiled CSS file exists");

  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");
  assert(
    cssContent.length > 50 * 1024,
    "Compiled CSS file size is > 50KB (Tailwind utility CSS)",
  );
  assert(
    cssContent.includes("--font-sans") || cssContent.includes("slate"),
    "Compiled CSS contains Tailwind utility variables",
  );

  console.log("  ✅ Tailwind CSS compilation verified.");
}

function main() {
  const { pkg, mainPath, localAssetCount } = verifyArtifacts();
  const mainChannels = extractMainChannels(mainPath);
  const { api, calls } = extractPreloadCalls(preloadPath);
  const stats = verifyContract(calls, mainChannels);

  const apiCount = Object.keys(api).length;
  console.log(
    [
      `ipc contract ok: ${pkg.name}`,
      `  preload APIs: ${apiCount}`,
      `  checked invoke wrappers: ${stats.invokeCount}`,
      `  checked send wrappers: ${stats.sendCount}`,
      `  event subscriptions observed: ${stats.eventSubscriptionCount}`,
      `  main handlers: ${mainChannels.handle.size}`,
      `  main listeners: ${mainChannels.on.size}`,
      `  dist local assets: ${localAssetCount}`,
      stats.dynamicInvoke
        ? "  note: generic electronAPI.invoke is present and treated as explicitly dynamic"
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  // Additional verifications
  const hasSrcElectron = fs.existsSync(path.join(appDir, "src-electron"));
  if (hasSrcElectron) {
    verifyResponseShapes();
    verifyPathTraversal();
    verifySafeStorage();
  } else {
    console.log(
      "  ⚠️ Skipping src-electron dependent checks (running in original obfuscated/deobfuscated mode).",
    );
  }
  verifyTailwindCSS();
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
