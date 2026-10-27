from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

RSS_SOURCES = [
    {"name": "Zoom Eco", "url": "https://zoom-eco.net/feed/"},
    {"name": "Radio Okapi", "url": "https://www.radiookapi.net/rss.xml"},
    {"name": "Actualite CD", "url": "https://actualite.cd/rss.xml"},
]

REQUEST_TIMEOUT = 8


@dataclass
class RawSignal:
    source_type: str
    source_url: str
    source_name: str
    raw_text: str
    signal_date: str
    metadata: dict = field(default_factory=dict)


def _get_text(element, tag: str, default: str = "") -> str:
    """Recupere le texte d'un sous-element XML de maniere securisee."""
    child = element.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def _parse_date(date_str: str) -> str:
    """Tente de parser une date RSS et la retourne au format ISO YYYY-MM-DD."""
    if not date_str:
        return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    for fmt in (
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S GMT",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(date_str[:31].strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


class RSSCollector:
    """
    Collecteur RSS interrogeant des flux economiques africains.
    Utilise uniquement requests et xml.etree.ElementTree (stdlib).
    """

    def collect(self, query: str, max_articles: int = 20) -> List[RawSignal]:
        """
        Interroge tous les flux RSS, filtre les articles contenant la query
        (case-insensitive dans le titre ou la description).
        Retourne les max_articles articles les plus recents.
        """
        query_lower = query.lower()
        all_signals: List[RawSignal] = []

        for source in RSS_SOURCES:
            signals = self._fetch_source(source, query_lower)
            all_signals.extend(signals)

        all_signals.sort(key=lambda s: s.signal_date, reverse=True)
        return all_signals[:max_articles]

    def _fetch_source(self, source: dict, query_lower: str) -> List[RawSignal]:
        """Recupere et parse un flux RSS. Ignore silencieusement les erreurs reseau."""
        signals: List[RawSignal] = []
        try:
            req = Request(
                source["url"],
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Onbora-MarketIntel/1.0"},
            )
            with urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                raw_xml = response.read()

            root = ET.fromstring(raw_xml)
            channel = root.find("channel")
            items = channel.findall("item") if channel is not None else root.findall(".//item")

            for item in items:
                title = _get_text(item, "title")
                description = _get_text(item, "description")
                link = _get_text(item, "link")
                pub_date = _get_text(item, "pubDate")

                combined = (title + " " + description).lower()
                if query_lower and query_lower not in combined:
                    continue

                raw_text = title + " " + description
                signal_date = _parse_date(pub_date)

                signals.append(
                    RawSignal(
                        source_type="PRESS",
                        source_url=link or source["url"],
                        source_name=source["name"],
                        raw_text=raw_text[:2000],
                        signal_date=signal_date,
                        metadata={
                            "feed_url": source["url"],
                            "title": title,
                        },
                    )
                )
        except URLError as exc:
            logger.warning("[RSSCollector] Erreur reseau pour %s : %s", source["url"], exc)
        except ET.ParseError as exc:
            logger.warning("[RSSCollector] Erreur parsing XML pour %s : %s", source["url"], exc)
        except Exception as exc:
            logger.warning("[RSSCollector] Erreur inattendue pour %s : %s", source["url"], exc)

        return signals
