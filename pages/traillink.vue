<template>
  <div class="p-4 max-w-3xl mx-auto space-y-6">
    <!-- Hero Section -->
    <div class="text-center py-8">
      <h1 class="text-4xl font-bold">
        <span class="text-orange-500">TrailLink</span> Firmware Flasher
      </h1>
      <p class="mt-3 text-lg text-gray-400">
        Convert your ESP32-C3 WiFi device (ESCape32 WiFi Link, Sequre WiFi Link, or any ESP32-C3 Super Mini)
        into a TrailLink BLE bridge for your RC ESC.
      </p>
    </div>

    <!-- Browser Support Warning -->
    <UAlert
      v-if="!webSerialSupported"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      title="WebSerial Not Supported"
      description="Your browser does not support WebSerial. Please use Chrome or Edge on desktop."
    />

    <!-- Prerequisites Card -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Prerequisites</h2>
      </template>
      <ul class="space-y-2 text-gray-300">
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-globe-alt" class="mt-1 text-orange-500 shrink-0" />
          <span><strong>Chrome or Edge</strong> browser (WebSerial required)</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-link" class="mt-1 text-orange-500 shrink-0" />
          <span><strong>USB cable</strong> connected to your ESP32-C3 device</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-hand-raised" class="mt-1 text-orange-500 shrink-0" />
          <span>Hold the <strong>BOOT</strong> button while clicking Connect (or hold BOOT + tap RESET to enter bootloader mode)</span>
        </li>
      </ul>
    </UCard>

    <!-- Flash Controls Card -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Flash Controls</h2>
          <span
            class="text-sm px-2 py-1 rounded"
            :class="connected ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'"
          >
            {{ connected ? `Connected — ${chipType}` : 'Disconnected' }}
          </span>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Connect / Disconnect -->
        <div class="flex flex-wrap gap-3">
          <UButton
            v-if="!connected"
            icon="i-heroicons-bolt"
            color="orange"
            size="lg"
            :loading="status === 'connecting'"
            :disabled="!webSerialSupported"
            @click="connectDevice"
          >
            Connect
          </UButton>
          <UButton
            v-else
            icon="i-heroicons-x-mark"
            color="gray"
            size="lg"
            @click="disconnectDevice"
          >
            Disconnect
          </UButton>

          <UButton
            icon="i-heroicons-arrow-down-tray"
            color="gray"
            size="lg"
            :disabled="!connected || busy"
            @click="backupFirmware"
          >
            Backup Firmware
          </UButton>

          <UButton
            icon="i-heroicons-arrow-up-tray"
            color="orange"
            size="lg"
            :disabled="!connected || busy"
            :loading="status === 'flashing'"
            @click="flashFirmware"
          >
            Flash TrailLink
          </UButton>
        </div>

        <!-- Progress -->
        <div v-if="progressPercent >= 0" class="space-y-2">
          <div class="flex justify-between text-sm text-gray-400">
            <span>{{ statusMessage }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <UProgress :value="progressPercent" color="orange" />
        </div>

        <!-- Console Log -->
        <div class="mt-4">
          <h3 class="text-sm font-medium text-gray-400 mb-1">Console Output</h3>
          <div
            ref="consoleEl"
            class="bg-gray-950 border border-gray-800 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap"
          >{{ consoleLog }}</div>
        </div>
      </div>
    </UCard>

    <!-- Post-Flash Instructions -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">After Flashing</h2>
      </template>
      <ul class="space-y-2 text-gray-300">
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-arrow-path" class="mt-1 text-orange-500 shrink-0" />
          <span>Press the <strong>RESET</strong> button on your device. It will reboot with TrailLink firmware.</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-signal" class="mt-1 text-orange-500 shrink-0" />
          <span>The device will appear as <strong>"TrailLink"</strong> in your phone's Bluetooth (BLE) device list.</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-heroicons-device-phone-mobile" class="mt-1 text-orange-500 shrink-0" />
          <span>Open the <a href="#" class="text-orange-500 underline">TrailLink App</a> to connect and configure your ESC.</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ESPLoader, Transport } from 'esptool-js';

const webSerialSupported = ref(false);
const connected = ref(false);
const chipType = ref('');
const consoleLog = ref('');
const consoleEl = ref<HTMLElement | null>(null);
const progressPercent = ref(-1);
const statusMessage = ref('');
const status = ref<'idle' | 'connecting' | 'flashing' | 'backing-up'>('idle');

let esploader: ESPLoader | null = null;
let transport: Transport | null = null;

const busy = computed(() => status.value !== 'idle');

onMounted(() => {
  webSerialSupported.value = 'serial' in navigator;
});

const FIRMWARE_FILES = [
  { path: '/firmware/traillink/bootloader.bin', address: 0x0, label: 'bootloader' },
  { path: '/firmware/traillink/partition-table.bin', address: 0x8000, label: 'partition table' },
  { path: '/firmware/traillink/scale_buddy.bin', address: 0x10000, label: 'application' },
];

function log(msg: string) {
  consoleLog.value += msg;
  nextTick(() => {
    if (consoleEl.value) {
      consoleEl.value.scrollTop = consoleEl.value.scrollHeight;
    }
  });
}

function logLine(msg: string) {
  log(msg + '\n');
}

const terminal = {
  clean() {
    consoleLog.value = '';
  },
  writeLine(data: string) {
    logLine(data);
  },
  write(data: string) {
    log(data);
  },
};

async function connectDevice() {
  try {
    status.value = 'connecting';
    statusMessage.value = 'Connecting...';
    progressPercent.value = -1;
    consoleLog.value = '';

    const port = await navigator.serial.requestPort();
    transport = new Transport(port);
    esploader = new ESPLoader({
      transport,
      baudrate: 115200,
      terminal,
    });

    logLine('Connecting to ESP32...');
    const chip = await esploader.main();
    chipType.value = chip || 'Unknown';
    logLine(`Connected: ${chip}`);

    try {
      const flashId = await esploader.flashId();
      logLine(`Flash ID: ${flashId}`);
    } catch {
      // flashId is optional, ignore errors
    }

    connected.value = true;
    status.value = 'idle';
    statusMessage.value = '';
  } catch (err: any) {
    logLine(`Connection failed: ${err.message || err}`);
    status.value = 'idle';
    statusMessage.value = '';
    connected.value = false;
    await cleanupTransport();
  }
}

async function disconnectDevice() {
  await cleanupTransport();
  connected.value = false;
  chipType.value = '';
  status.value = 'idle';
  statusMessage.value = '';
  progressPercent.value = -1;
  logLine('Disconnected.');
}

async function cleanupTransport() {
  try {
    if (transport) {
      await transport.disconnect();
    }
  } catch {
    // ignore
  }
  transport = null;
  esploader = null;
}

async function fetchBinary(path: string): Promise<Uint8Array> {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

async function flashFirmware() {
  if (!esploader) return;

  try {
    status.value = 'flashing';
    progressPercent.value = 0;
    statusMessage.value = 'Downloading firmware files...';
    logLine('Downloading firmware binaries...');

    const fileArray: { data: Uint8Array; address: number }[] = [];
    for (const fw of FIRMWARE_FILES) {
      logLine(`  Fetching ${fw.label} (${fw.path})...`);
      const data = await fetchBinary(fw.path);
      logLine(`  ${fw.label}: ${data.length} bytes`);
      fileArray.push({ data, address: fw.address });
    }

    statusMessage.value = 'Erasing and writing flash...';
    logLine('Starting flash...');

    const totalFiles = fileArray.length;

    await esploader.writeFlash({
      fileArray,
      flashSize: '4MB',
      flashMode: 'dio',
      flashFreq: '80m',
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex: number, written: number, total: number) => {
        const fileProgress = total > 0 ? written / total : 0;
        const overallProgress = ((fileIndex + fileProgress) / totalFiles) * 100;
        progressPercent.value = Math.round(overallProgress);

        const label = FIRMWARE_FILES[fileIndex]?.label ?? `file ${fileIndex}`;
        statusMessage.value = `Writing ${label}... (${Math.round(fileProgress * 100)}%)`;
      },
    });

    progressPercent.value = 100;
    statusMessage.value = 'Flash complete!';
    logLine('Flash complete! Press RESET on your device.');
    status.value = 'idle';
  } catch (err: any) {
    logLine(`Flash failed: ${err.message || err}`);
    statusMessage.value = `Flash failed: ${err.message || err}`;
    status.value = 'idle';
  }
}

async function backupFirmware() {
  if (!esploader) return;

  try {
    status.value = 'backing-up';
    progressPercent.value = 0;
    statusMessage.value = 'Reading flash (4MB)...';
    logLine('Starting flash backup (4MB)...');

    const FLASH_SIZE = 4 * 1024 * 1024;
    const BLOCK_SIZE = 0x4000; // 16KB blocks
    const blocks: Uint8Array[] = [];
    let bytesRead = 0;

    while (bytesRead < FLASH_SIZE) {
      const remaining = FLASH_SIZE - bytesRead;
      const readSize = Math.min(BLOCK_SIZE, remaining);
      const block = await esploader.readFlash(bytesRead, readSize) as Uint8Array;
      blocks.push(block);
      bytesRead += readSize;
      progressPercent.value = Math.round((bytesRead / FLASH_SIZE) * 100);
      statusMessage.value = `Reading flash... ${Math.round(bytesRead / 1024)}KB / ${FLASH_SIZE / 1024}KB`;
    }

    // Combine blocks and download
    const fullFlash = new Uint8Array(FLASH_SIZE);
    let offset = 0;
    for (const block of blocks) {
      fullFlash.set(block, offset);
      offset += block.length;
    }

    const blob = new Blob([fullFlash], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esp32c3_backup_${Date.now()}.bin`;
    a.click();
    URL.revokeObjectURL(url);

    logLine('Backup complete — file downloaded.');
    statusMessage.value = 'Backup complete!';
    progressPercent.value = 100;
    status.value = 'idle';
  } catch (err: any) {
    logLine(`Backup failed: ${err.message || err}`);
    statusMessage.value = `Backup failed: ${err.message || err}`;
    status.value = 'idle';
  }
}
</script>
