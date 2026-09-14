"""
Gemini AI service for Kisa.

Provides AI-powered features for cat profiles:
- Generating human-friendly cat summaries
- Analyzing cat images for identifying features
- Suggesting possible matches among nearby cats

All Gemini prompt construction is kept private to this service.
Business logic and error handling live here; routes stay thin.
"""

import json
import re

import requests
import google.generativeai as genai

from app.config import settings

# Configure the Gemini client once when this module is imported.
genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiService:
    """Handles all interactions with the Google Gemini API for Kisa."""

    def __init__(self, model_name: str = "gemini-1.5-flash") -> None:
        """Initialize the Gemini model client once for reuse."""
        self._model = genai.GenerativeModel(model_name)

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def generate_cat_summary(self, cat_data: dict) -> str:
        """
        Generate a short, friendly summary describing a cat.

        Args:
            cat_data: Dictionary of cat fields (name, breed, color, etc.)

        Returns:
            A plain-text summary string.

        Raises:
            RuntimeError: If the Gemini API call fails.
        """
        prompt = self._build_summary_prompt(cat_data)
        try:
            response = self._model.generate_content(prompt)
            return response.text.strip()
        except Exception as exc:
            raise RuntimeError(f"Gemini summary generation failed: {exc}") from exc

    def analyze_cat_image(self, image_url: str) -> dict:
        """
        Analyze a cat image and extract structured identifying features.

        Args:
            image_url: Public URL of the cat image to analyze.

        Returns:
            A dictionary of structured analysis results (e.g. color,
            coat_pattern, distinctive_features, estimated_age_text).

        Raises:
            RuntimeError: If fetching the image or calling Gemini fails.
        """
        try:
            image_bytes, mime_type = self._fetch_image(image_url)
        except Exception as exc:
            raise RuntimeError(f"Failed to fetch image for analysis: {exc}") from exc

        prompt = self._build_image_analysis_prompt()
        try:
            response = self._model.generate_content(
                [prompt, {"mime_type": mime_type, "data": image_bytes}]
            )
            return self._parse_json_response(response.text)
        except Exception as exc:
            raise RuntimeError(f"Gemini image analysis failed: {exc}") from exc

    def suggest_possible_matches(self, cat_data: dict, nearby_cats: list[dict]) -> list:
        """
        Suggest which nearby cats might be the same cat as cat_data.

        Args:
            cat_data: Dictionary describing the reference cat.
            nearby_cats: List of dictionaries describing candidate cats.

        Returns:
            A list of possible match objects, each expected to include
            at least a cat identifier and a confidence/reason field.

        Raises:
            RuntimeError: If the Gemini API call fails.
        """
        prompt = self._build_match_prompt(cat_data, nearby_cats)
        try:
            response = self._model.generate_content(prompt)
            parsed = self._parse_json_response(response.text)
        except Exception as exc:
            raise RuntimeError(f"Gemini match suggestion failed: {exc}") from exc

        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return parsed.get("matches", [])
        return []

    # ------------------------------------------------------------------
    # Private prompt builders
    # ------------------------------------------------------------------

    def _build_summary_prompt(self, cat_data: dict) -> str:
        """Build the prompt used to generate a cat summary."""
        return (
            "You are helping a stray cat rescue community.\n"
            "Write a short, warm, 2-3 sentence summary describing this cat "
            "based on the following details. Do not invent facts that are "
            "not implied by the data.\n\n"
            f"Cat data (JSON):\n{json.dumps(cat_data, default=str)}\n"
        )

    def _build_image_analysis_prompt(self) -> str:
        """Build the prompt used to analyze a cat image."""
        return (
            "You are analyzing a photo of a stray cat for a rescue "
            "database. Look at the image and return ONLY a valid JSON "
            "object (no markdown, no extra text) with these keys:\n"
            '{\n'
            '  "color": string,\n'
            '  "coat_pattern": string,\n'
            '  "estimated_age_text": string,\n'
            '  "distinctive_features": string,\n'
            '  "confidence_notes": string\n'
            '}\n'
            "If a field cannot be determined, use an empty string."
        )

    def _build_match_prompt(self, cat_data: dict, nearby_cats: list[dict]) -> str:
        """Build the prompt used to find possible matching cats."""
        return (
            "You are matching a reference stray cat against a list of "
            "nearby cats that were previously logged, to detect possible "
            "duplicates or sightings of the same cat.\n\n"
            f"Reference cat (JSON):\n{json.dumps(cat_data, default=str)}\n\n"
            f"Nearby cats (JSON list):\n{json.dumps(nearby_cats, default=str)}\n\n"
            "Return ONLY a valid JSON array (no markdown, no extra text). "
            "Each element must be an object with:\n"
            '{\n'
            '  "cat_id": string,\n'
            '  "confidence": number (0-1),\n'
            '  "reason": string\n'
            '}\n'
            "Only include cats with a reasonable likelihood of being a match."
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fetch_image(self, image_url: str) -> tuple[bytes, str]:
        """Download image bytes and determine their MIME type."""
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "image/jpeg")
        return response.content, content_type

    def _parse_json_response(self, raw_text: str):
        """
        Parse a JSON object or array out of a Gemini text response.

        Handles responses that may be wrapped in markdown code fences.
        """
        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Gemini returned a non-JSON or malformed response: {exc}"
            ) from exc