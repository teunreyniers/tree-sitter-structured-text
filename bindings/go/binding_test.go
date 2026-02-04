package tree_sitter_structured_text_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_structured_text "github.com/teunreyniers/tree-sitter-structured-text/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_structured_text.Language())
	if language == nil {
		t.Errorf("Error loading IEC 61131-3 structured text grammar")
	}
}
