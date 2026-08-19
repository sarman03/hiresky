// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "HireSkyOverlay",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "HireSkyOverlay",
            path: "Sources/HireSkyOverlay",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
