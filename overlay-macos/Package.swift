// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "SystemAudioBridge",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "SystemAudioBridge",
            path: "Sources/HireSkyOverlay",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
