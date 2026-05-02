# Building Finly — Desktop & Mobile

The web app at `npm run dev` is the source of truth. DMG / APK / IPA are wrappers.

| File | Runs on |
|---|---|
| `.dmg` | macOS desktop (Mac) |
| `.apk` | Android phone / tablet |
| `.ipa` | iPhone / iPad |

---

## macOS DMG ✅ (already built)

```bash
npm run dmg
```

Output:
- `dist/Finly-0.1.0-arm64.dmg` (Apple Silicon — M1/M2/M3/M4)
- `dist/Finly-0.1.0.dmg` (Intel)

### Installing

1. Double-click the DMG.
2. Drag Finly to **Applications**.
3. The first launch will show "unidentified developer" because the build is unsigned. Right-click the app → **Open** → **Open** to bypass once.

To sign for distribution you'd need an Apple Developer ID and would set `identity` in `electron-builder.yml`. Not needed for personal use.

### Quick test in dev (no DMG)

```bash
# Terminal 1
npm run dev
# Terminal 2
npm run electron:dev
```

---

## Android APK 📱 (project ready — needs Android SDK to build)

The Android project is created at `android/`. To produce an APK you need:

1. **Java JDK 17**
   ```bash
   brew install --cask temurin@17
   ```

2. **Android Studio** — installs the SDK (~5 GB)
   Download: https://developer.android.com/studio
   On first launch, accept the SDK install prompts.

3. Set the env vars (add to `~/.zshrc`):
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   ```

4. Build the APK:
   ```bash
   npm run apk
   ```

   Output: `android/app/build/outputs/apk/debug/app-debug.apk`

5. To install on a phone:
   - Enable **Developer Options → USB Debugging**
   - `adb install android/app/build/outputs/apk/debug/app-debug.apk`
   - Or copy the APK to your phone and tap to install (allow "Install from unknown source").

### Easier alternative: PWABuilder.com (no Android Studio required)

1. Deploy the app to Vercel:
   ```bash
   npx vercel
   ```
2. Visit https://www.pwabuilder.com → paste your Vercel URL.
3. Click **Package for stores → Android**. Download the signed APK.

This produces a TWA (Trusted Web Activity) that opens your hosted PWA in a Chrome surface. Simpler, but requires the app to be online.

---

---

## iPhone / iPad IPA 🍎 (one-time setup, then 1 click in Xcode)

iOS apps **must** be built with Xcode. There is no command-line shortcut.

### One-time setup

1. **Install Xcode** (free, ~15 GB) from the Mac App Store.
   Search for "Xcode" → Get → Open once and accept the license.

2. After Xcode is installed, run:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo gem install cocoapods
   ```
   (Xcode bundles a modern Ruby that CocoaPods needs — system Ruby 2.6 is too old.)

3. Add the iOS platform to Capacitor:
   ```bash
   npm install --save @capacitor/ios
   npx cap add ios
   ```
   This creates an `ios/` folder with an Xcode workspace.

### Build & install on YOUR iPhone (free Apple ID)

1. Connect your iPhone via USB and trust the Mac.
2. Sync the latest web build and open in Xcode:
   ```bash
   BUILD_TARGET=mobile npx next build && npx cap sync ios
   npx cap open ios
   ```
3. In Xcode:
   - Select your iPhone from the device dropdown (top bar).
   - Select the **App** target → **Signing & Capabilities** tab.
   - Click **Team** → "Add an account" → log in with your Apple ID (free works).
   - Set **Bundle Identifier** to something unique like `com.yourname.finly`.
   - Click the **▶ Run** button (top-left).
4. First time: on your iPhone, go to **Settings → General → VPN & Device Management → trust the developer certificate**.

The app installs and runs on your phone like any App Store app — except it expires after **7 days** with the free Apple ID. Re-run from Xcode to refresh.

### Real distribution

- **For yourself only (free):** repeat above every 7 days.
- **For TestFlight or App Store:** $99/year Apple Developer Program → archive in Xcode → upload to App Store Connect.
- **Sideload tools** like AltStore or Sideloadly let you install IPAs without Xcode but still need a free Apple ID and the 7-day refresh dance.

### Voice on iPhone

Web Speech API works on iOS 14.5+ in Safari. Inside the Capacitor WKWebView it should also work. If it doesn't fire on your device, swap in `@capacitor-community/speech-recognition` for native iOS speech recognition — small wiring change.

---

## Re-build flow

After any code change:

```bash
# DMG (macOS)
npm run dmg

# APK (Android)
npm run apk

# IPA (iPhone) — after iOS platform is added
BUILD_TARGET=mobile npx next build && npx cap sync ios && npx cap open ios
# then click ▶ in Xcode
```

## What works in each build

| Feature | Web | DMG | APK |
|---|---|---|---|
| Manual entry | ✅ | ✅ | ✅ |
| Insights / charts | ✅ | ✅ | ✅ |
| IndexedDB local storage | ✅ | ✅ | ✅ |
| CSV export | ✅ | ✅ | ✅ |
| Voice entry (Web Speech API) | ✅ Chrome/Safari | ✅ | ⚠️ Limited — Android WebView doesn't fully support Web Speech. Falls back to typing with a clear message. To get voice on Android, add `@capacitor-community/speech-recognition` plugin later. |
