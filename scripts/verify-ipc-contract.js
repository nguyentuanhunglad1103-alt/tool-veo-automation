#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appDir = path.resolve(process.argv[2] || process.cwd());
const packagePath = path.join(appDir, "package.json");
const preloadPath = path.join(appDir, "preload.js");
const htmlPath = path.join(appDir, "dist", "index.html");

function fail(message) {
  throw new Error(message);
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing ${label}: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

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

  const mojibakeMarkers = ["Táº", "ká»", "vÃ", "Ä", "Ä‘"];
  const foundMarkers = mojibakeMarkers.filter((marker) => html.includes(marker));
  if (foundMarkers.length) {
    fail(`HTML contains mojibake marker(s): ${foundMarkers.join(", ")}`);
  }

  return { pkg, mainPath, localAssetCount: localRefs.length };
}

function extractMainChannels(mainPath) {
  const source = fs.readFileSync(mainPath, "utf8");
  const channels = {
    handle: new Set(),
    on: new Set(),
  };

  const ipcPattern = /ipcMain\.(handle|on)\("([^"]+)"/g;
  let match;
  while ((match = ipcPattern.exec(source))) {
    channels[match[1]].add(match[2]);
  }

  const wrappedHandlePattern = /Hw\("([^"]+)"/g;
  while ((match = wrappedHandlePattern.exec(source))) {
    channels.handle.add(match[1]);
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
      return require(name);
    },
    process: { platform: process.platform },
    console,
  };

  vm.runInNewContext(fs.readFileSync(preloadPath, "utf8"), sandbox, {
    filename: preloadPath,
  });

  const api = exposed.electronAPI;
  if (!api || typeof api !== "object") {
    fail("preload.js did not expose window.electronAPI");
  }

  const dummy = function noop() {};
  const errors = [];

  for (const [name, value] of Object.entries(api)) {
    if (typeof value !== "function") {
      continue;
    }

    currentApi = name;
    try {
      value(dummy, dummy, dummy, dummy);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
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
      preloadCalls.filter((call) => call.method === "invoke" && call.api !== "invoke"),
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
    dynamicInvoke: preloadCalls.some((call) => call.api === "invoke" && call.method === "invoke"),
  };
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
      stats.dynamicInvoke ? "  note: generic electronAPI.invoke is present and treated as explicitly dynamic" : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
