"""
backend/services/api_key_manager.py
-------------------------------------
Smart API key rotation manager with TPM (Tokens Per Minute) and
TPD (Tokens Per Day) limit handling.

Supports both Gemini and Groq providers.

How it works:
  - Maintains up to 3 keys per provider.
  - Tracks token usage per key per minute and per day.
  - When a key hits TPM limit  → immediately rotates to next key.
    After 60s the exhausted key recovers and re-joins the rotation.
  - When a key hits TPD limit  → that key is excluded for the rest of the day.
    The next key takes over. After midnight it resets automatically.
  - thread-safe via threading.Lock.

Usage:
    from .api_key_manager import get_key_manager

    manager = get_key_manager("gemini")      # or "groq"
    key     = manager.get_active_key()
    try:
        # call the API ...
        manager.record_usage(key, tokens_used=500)
    except TpmExceededError:
        manager.mark_tpm_exceeded(key)
        key = manager.get_active_key()       # auto-rotated
    except TpdExceededError:
        manager.mark_tpd_exceeded(key)
        key = manager.get_active_key()
"""

import os
import time
import threading
import logging
from datetime import datetime, date
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


# ── Custom exceptions ──────────────────────────────────────────────────────────

class NoAvailableKeyError(Exception):
    """Raised when all API keys are exhausted (TPM or TPD)."""


class TpmExceededError(Exception):
    """Raised by callers to signal a TPM rate-limit hit."""


class TpdExceededError(Exception):
    """Raised by callers to signal a TPD quota hit."""


# ── Per-key state ──────────────────────────────────────────────────────────────

class KeyState:
    def __init__(self, key: str):
        self.key            = key
        # TPM tracking
        self.tpm_exceeded   = False
        self.tpm_reset_at   = 0.0          # epoch seconds when TPM window reopens
        # TPD tracking
        self.tpd_exceeded   = False
        self.tpd_reset_day  = None         # date object; reset when date changes
        # Token counters (informational)
        self.tokens_this_minute = 0
        self.minute_window_start = time.time()
        self.tokens_today   = 0
        self.today          = date.today()

    def is_available(self) -> bool:
        now = time.time()
        today = date.today()

        # Auto-recover TPM after 60 s
        if self.tpm_exceeded and now >= self.tpm_reset_at:
            self.tpm_exceeded = False
            self.tokens_this_minute = 0
            self.minute_window_start = now
            logger.info(f"Key ...{self.key[-6:]} TPM recovered")

        # Auto-recover TPD at midnight
        if self.tpd_exceeded and today != self.tpd_reset_day:
            self.tpd_exceeded = False
            self.tokens_today = 0
            self.today = today
            logger.info(f"Key ...{self.key[-6:]} TPD recovered (new day)")

        return not self.tpm_exceeded and not self.tpd_exceeded

    def record_usage(self, tokens: int):
        now = time.time()
        today = date.today()

        # Roll minute window
        if now - self.minute_window_start >= 60:
            self.tokens_this_minute = 0
            self.minute_window_start = now

        # Roll day counter
        if today != self.today:
            self.tokens_today = 0
            self.today = today

        self.tokens_this_minute += tokens
        self.tokens_today += tokens

    def mark_tpm_exceeded(self):
        self.tpm_exceeded = True
        self.tpm_reset_at = time.time() + 60  # re-check in 60 s
        logger.warning(f"Key ...{self.key[-6:]} hit TPM limit; cooling for 60s")

    def mark_tpd_exceeded(self):
        self.tpd_exceeded = True
        self.tpd_reset_day = date.today()
        logger.warning(f"Key ...{self.key[-6:]} hit TPD limit; excluded until midnight")


# ── Manager ────────────────────────────────────────────────────────────────────

class ApiKeyManager:
    """
    Manages rotation across multiple API keys for a single provider.
    """

    def __init__(self, provider: str, keys: list[str]):
        if not keys:
            raise ValueError(f"No API keys provided for provider '{provider}'")
        self.provider   = provider
        self._lock      = threading.Lock()
        self._states    = [KeyState(k) for k in keys]
        self._index     = 0        # current key index
        logger.info(f"[{provider}] Loaded {len(keys)} API key(s)")

    # ── Public API ─────────────────────────────────────────────────────────────

    def get_active_key(self) -> str:
        """Return the best available API key, rotating if needed."""
        with self._lock:
            return self._pick_key().key

    def record_usage(self, key: str, tokens_used: int):
        """Record token consumption for a key (informational)."""
        with self._lock:
            state = self._find_state(key)
            if state:
                state.record_usage(tokens_used)

    def mark_tpm_exceeded(self, key: str):
        """Call this when the API responds with a TPM rate-limit error."""
        with self._lock:
            state = self._find_state(key)
            if state:
                state.mark_tpm_exceeded()
            # Rotate to next available key
            self._advance()

    def mark_tpd_exceeded(self, key: str):
        """Call this when the API responds with a TPD quota error."""
        with self._lock:
            state = self._find_state(key)
            if state:
                state.mark_tpd_exceeded()
            # Rotate to next available key
            self._advance()

    def status(self) -> list[dict]:
        """Return status of all keys (for admin/debug endpoints)."""
        with self._lock:
            result = []
            for i, s in enumerate(self._states):
                result.append({
                    "index":             i,
                    "key_suffix":        f"...{s.key[-6:]}",
                    "active":            i == self._index,
                    "available":         s.is_available(),
                    "tpm_exceeded":      s.tpm_exceeded,
                    "tpm_resets_in_s":   max(0, round(s.tpm_reset_at - time.time())) if s.tpm_exceeded else 0,
                    "tpd_exceeded":      s.tpd_exceeded,
                    "tokens_this_min":   s.tokens_this_minute,
                    "tokens_today":      s.tokens_today,
                })
            return result

    # ── Internal ───────────────────────────────────────────────────────────────

    def _pick_key(self) -> KeyState:
        """
        Try current key; if unavailable, scan others.
        Raises NoAvailableKeyError if all are exhausted.
        """
        n = len(self._states)
        for _ in range(n):
            s = self._states[self._index]
            if s.is_available():
                return s
            self._advance()
        raise NoAvailableKeyError(
            f"[{self.provider}] All {n} API key(s) are currently rate-limited. "
            "Please wait for TPM recovery or add more keys."
        )

    def _advance(self):
        self._index = (self._index + 1) % len(self._states)

    def _find_state(self, key: str) -> KeyState | None:
        for s in self._states:
            if s.key == key:
                return s
        return None


# ── Singletons per provider ────────────────────────────────────────────────────

def _load_keys(env_prefix: str) -> list[str]:
    """
    Load keys from env vars like GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3
    Also falls back to legacy GEMINI_API_KEY (single-key mode).
    """
    keys = []
    # Try numbered keys first  (KEY_1, KEY_2, KEY_3)
    for i in range(1, 4):
        k = os.getenv(f"{env_prefix}_{i}", "").strip()
        if k:
            keys.append(k)
    # Fallback: single legacy key
    if not keys:
        k = os.getenv(env_prefix, "").strip()
        if k:
            keys.append(k)
    return keys


@lru_cache(maxsize=None)
def get_key_manager(provider: str) -> ApiKeyManager:
    """
    Returns a singleton ApiKeyManager for the given provider.
    provider must be 'gemini' or 'groq'.
    """
    provider = provider.lower()
    if provider == "gemini":
        keys = _load_keys("GEMINI_API_KEY")
    elif provider == "groq":
        keys = _load_keys("GROQ_API_KEY")
    else:
        raise ValueError(f"Unknown provider: {provider}. Use 'gemini' or 'groq'.")

    if not keys:
        raise EnvironmentError(
            f"No API keys found for provider '{provider}'. "
            f"Set {provider.upper()}_API_KEY_1 / _2 / _3 in your .env file."
        )
    return ApiKeyManager(provider, keys)
