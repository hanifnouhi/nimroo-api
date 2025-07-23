"""
Spell Checker API using FastAPI and pyspellchecker.

This API provides basic spell-checking functionality for single words,
based on the selected language. If the language is not supported, the
original input word is returned as-is.

Supported languages: 'en' (English), 'es' (Spanish), 'fr' (French),
'de' (German), 'pt' (Portuguese)

Author: Hanou
Date: 2025-07-22
"""

from fastapi import FastAPI
from pydantic import BaseModel
from spellchecker import SpellChecker
import re

app = FastAPI()

class SpellRequest(BaseModel):
    """
    Request model for spell correction.

    Attributes:
        text (str): The input word to be corrected.
        language (str): Optional language code. Default is 'en'.
    """
    text: str
    language: str = "en" # Optional language parameter; defaults to English

def correct_word(word, spell):
    """
    Check if the input word has _ or - to prevent unwanted failure.

    Parameters:
        The word and spell checker.

    Returns:
        dict: A dictionary with the corrected word.
              If no correction is found or language is unsupported,
              the original word is returned.
    """
    if '-' in word:
        parts = word.split('-')
        corrected = [spell.correction(p) for p in parts]
        return '-'.join(corrected)
    elif '_' in word:
        parts = word.split('_')
        corrected = [spell.correction(p) for p in parts]
        return '_'.join(corrected)
    else:
        return spell.correction(word) or word

@app.post("/correct")
async def correct_text(req: SpellRequest):
    """
    Spell-corrects a single input word using pyspellchecker.

    Parameters:
        req (SpellRequest): Input object containing the word and optional language.

    Returns:
        dict: The corrected word.
              If no correction is found or language is unsupported,
              the original word is returned.
    """
    try:
        # Initialize the spell checker with the specified language
        spell = SpellChecker(language=req.language)
    except Exception:
        # if language is not supported, return the input text
        return {
            "corrected": req.text,
            "note": f"Language '{req.language}' not supported. Returned original text."
        }

    words = req.text.split()
    corrected_words = []

    for word in words:
        match = re.match(r"(^\W*)(\w+[\w\-_]*)(\W*$)", word)
        if match:
            prefix, core, suffix = match.groups()
            corrected_core = correct_word(core, spell)
            corrected_words.append(f"{prefix}{corrected_core}{suffix}")
        else:
            corrected_words.append(word)

    corrected_text = " ".join(corrected_words)
    return {"corrected": corrected_text}