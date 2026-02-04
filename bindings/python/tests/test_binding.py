from unittest import TestCase

from tree_sitter import Language, Parser
import tree_sitter_structured_text


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_structured_text.language()))
        except Exception:
            self.fail("Error loading IEC 61131-3 structured text grammar")
