"""Run with: (cd server && python -m unittest test_app). Needs trained models in server/model/."""
import unittest
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError

TRAINED = (Path(__file__).parent / "model" / "email" / "signalcheck.json").exists()


@unittest.skipUnless(TRAINED, "train the server models first (python train.py)")
class ServerModelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global app
        import app  # noqa: PLC0415  (loads the models)

    def test_health(self):
        self.assertEqual(app.health(), {"ok": True, "version": app.VERSION, "kinds": ["email"]})

    def test_scores_emails(self):
        phish = app.analyze(app.Request(message="Dear customer, we detected unusual sign-in activity on your online banking account and have suspended access. To restore your account, confirm your identity and update your billing details within 24 hours at https://secure-bank-verify.example/login or your account will be closed."))
        self.assertEqual(set(phish), {"kind", "version", "applicable", "margin", "threshold", "matched", "truncated"})
        self.assertTrue(phish["matched"])
        ordinary = app.analyze(app.Request(message="Hey! Saturday works for me. Want to try the new taco place near the park around 7? I can pick you up on the way. Let me know if Jordan is coming so I can make a reservation for four."))
        self.assertTrue(ordinary["applicable"])
        self.assertFalse(ordinary["matched"])

    def test_short_emails_are_left_to_the_rules(self):
        self.assertEqual(app.analyze(app.Request(message="Never share your password or move money to a safe account.")),
                         {"kind": "email", "version": app.VERSION, "applicable": False, "minimum_words": 20})

    def test_long_messages_are_truncated_not_rejected(self):
        self.assertTrue(app.analyze(app.Request(message="word " * 2000))["truncated"])

    def test_rejects_bad_input(self):
        with self.assertRaises(ValidationError):
            app.Request(type="text", message="texts are checked in the browser only")
        with self.assertRaises(ValidationError):
            app.Request(message="x" * (app.MAX_LENGTH + 1))
        with self.assertRaises(HTTPException):
            app.analyze(app.Request(message="   "))


if __name__ == "__main__":
    unittest.main()
