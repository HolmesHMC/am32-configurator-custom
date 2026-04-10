<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950 p-4">
    <div class="bg-gray-900 rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
      <div class="text-5xl mb-4">⚡</div>
      <h1 class="text-2xl font-bold text-white mb-2">TrailLink</h1>
      <p class="text-sm text-gray-500 mb-6">by Holmes Hobbies</p>
      <span class="inline-block bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full mb-8">Android</span>
      <div>
        <a
          href="/downloads/TrailLink.apk"
          download="TrailLink.apk"
          class="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 rounded-xl transition-colors"
        >
          ⬇ Download APK
        </a>
      </div>
      <p class="mt-6 text-xs text-gray-600 leading-relaxed">
        Tap the button to download the APK.<br>
        You may need to allow installs from unknown sources in your Android settings.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Download TrailLink' });
</script>
