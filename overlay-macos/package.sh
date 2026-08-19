#!/bin/bash
set -e

# Change directory to the script location
cd "$(dirname "$0")"

echo "=== 1. Building HireSky in Release Mode ==="
swift build -c release

echo "=== 2. Creating App Bundle Structure ==="
APP_DIR="HireSky.app"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

echo "=== 3. Copying Binary & Resource Bundle ==="
cp ".build/release/HireSkyOverlay" "$APP_DIR/Contents/MacOS/HireSky"
if [ -d ".build/release/HireSkyOverlay_HireSkyOverlay.bundle" ]; then
    cp -r ".build/release/HireSkyOverlay_HireSkyOverlay.bundle" "$APP_DIR/Contents/Resources/"
    echo "Copied resource bundle successfully."
fi

echo "=== 4. Generating App Icon (.icns) ==="
LOGO_PATH="Sources/HireSkyOverlay/Resources/logo.png"
if [ -f "$LOGO_PATH" ]; then
    ICONSET_DIR="AppIcon.iconset"
    rm -rf "$ICONSET_DIR"
    mkdir -p "$ICONSET_DIR"
    
    # Generate resized copies
    sips -z 16 16     "$LOGO_PATH" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
    sips -z 32 32     "$LOGO_PATH" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
    sips -z 32 32     "$LOGO_PATH" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
    sips -z 64 64     "$LOGO_PATH" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
    sips -z 128 128   "$LOGO_PATH" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
    sips -z 256 256   "$LOGO_PATH" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
    sips -z 256 256   "$LOGO_PATH" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
    sips -z 512 512   "$LOGO_PATH" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
    sips -z 512 512   "$LOGO_PATH" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
    sips -z 1024 1024 "$LOGO_PATH" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1
    
    # Create icns file
    iconutil -c icns "$ICONSET_DIR" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
    rm -rf "$ICONSET_DIR"
    echo "AppIcon.icns generated successfully."
else
    echo "Warning: logo.png not found at $LOGO_PATH"
fi

echo "=== 5. Creating Info.plist ==="
cat <<EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>HireSky</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.hiresky.overlay</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>HireSky</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSMicrophoneUsageDescription</key>
    <string>HireSky needs microphone access to capture and transcribe your voice for live assistance.</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>HireSky needs speech recognition permission to transcribe your voice offline on your Mac.</string>
</dict>
</plist>
EOF

echo "=== 6. Code signing (stable identity so TCC permissions persist) ==="
# Prefer a persistent self-signed identity named "HireSky Dev" if it exists in
# your keychain (create once — see the note printed below). This keeps the same
# code identity across rebuilds, so Screen Recording / Mic grants STICK instead
# of macOS creating "HireSky 2", "HireSky 3"... on every build.
SIGN_ID="HireSky Dev"
# NOTE: use `-p codesigning` WITHOUT `-v`. `-v` lists only trust-validated
# identities; a locally-created self-signed cert is untrusted (CSSMERR_TP_NOT_TRUSTED)
# but is perfectly valid for SIGNING and for stable TCC identity. Requiring `-v`
# would silently fall back to ad-hoc and reset permissions on every build.
if security find-identity -p codesigning 2>/dev/null | grep -q "$SIGN_ID"; then
    echo "Signing with persistent identity: $SIGN_ID"
    codesign --force --deep --options runtime \
        --identifier "com.hiresky.overlay" \
        --sign "$SIGN_ID" "$APP_DIR"
else
    echo "No '$SIGN_ID' identity found — using ad-hoc signing (grants may reset on rebuild)."
    echo "To make permissions persist across rebuilds, create a self-signed cert ONCE:"
    echo "  Keychain Access ▸ Certificate Assistant ▸ Create a Certificate…"
    echo "  Name: 'HireSky Dev', Identity Type: Self Signed Root, Certificate Type: Code Signing"
    codesign --force --deep \
        --identifier "com.hiresky.overlay" \
        --sign - "$APP_DIR"
fi
codesign --verify --verbose=2 "$APP_DIR" || echo "(codesign verify reported issues)"

echo "=== 7. Zipping App Bundle for sharing ==="
rm -f HireSky.zip
zip -r HireSky.zip HireSky.app

echo "=== DONE ==="
echo "HireSky.app has been successfully packaged with your custom app icon!"
echo "You can share HireSky.zip with your friends."
