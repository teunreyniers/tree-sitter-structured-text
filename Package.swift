// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterStructuredText",
    products: [
        .library(name: "TreeSitterStructuredText", targets: ["TreeSitterStructuredText"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterStructuredText",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterStructuredTextTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterStructuredText",
            ],
            path: "bindings/swift/TreeSitterStructuredTextTests"
        )
    ],
    cLanguageStandard: .c11
)
