import XCTest
import SwiftTreeSitter
import TreeSitterStructuredText

final class TreeSitterStructuredTextTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_structured_text())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading IEC 61131-3 structured text grammar")
    }
}
