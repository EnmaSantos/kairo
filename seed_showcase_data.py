"""Seed polished, repeatable showcase content for an existing Kairo account.

This script never creates users or changes credentials. It locates the requested
account, reuses existing notebooks with matching titles, and identifies seeded
entries by their complete deterministic text.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import models
from database import SessionLocal, engine


@dataclass(frozen=True)
class DemoEntry:
    title: str
    body: str
    notebook: str
    days_ago: int
    hour: int
    minute: int
    sentiment: str
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @property
    def text_content(self) -> str:
        return f"{self.title}\n\n{self.body}"


NOTEBOOKS = (
    "Software Projects",
    "Career",
    "University",
    "Personal Growth",
    "Fitness",
    "Weekly Reflections",
)

NOTEBOOK_DAYS_AGO = {
    "Software Projects": 63,
    "Career": 58,
    "University": 54,
    "Personal Growth": 49,
    "Fitness": 43,
    "Weekly Reflections": 38,
}


ENTRIES = (
    DemoEntry(
        title="Demo story is finally coming together",
        body=(
            "Ran through the full Kairo demo this afternoon and the flow feels much more natural now. "
            "The strongest sequence is sign in, open the dashboard, record a short reflection, and then "
            "show how the same thought appears across search, the calendar, and the timeline. I wrote down "
            "three transitions to rehearse so the video can stay focused on the product instead of the setup."
        ),
        notebook="Software Projects",
        days_ago=0,
        hour=16,
        minute=42,
        sentiment="joy",
        image_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=82",
        latitude=43.6150,
        longitude=-116.2023,
    ),
    DemoEntry(
        title="A focused start to the week",
        body=(
            "Set three priorities for the week: finish the presentation outline, polish the journal search "
            "experience, and protect two evenings for interview practice. Keeping the list short already makes "
            "the workload feel more manageable."
        ),
        notebook="Weekly Reflections",
        days_ago=1,
        hour=8,
        minute=15,
        sentiment="joy",
    ),
    DemoEntry(
        title="Small details, noticeable difference",
        body=(
            "Cleaned up a handful of inconsistent spacing rules and button states in the project. None of the "
            "changes were large on their own, but together they made the interface feel calmer and more complete. "
            "It was a good reminder that polish is usually the result of many careful decisions."
        ),
        notebook="Software Projects",
        days_ago=2,
        hour=19,
        minute=8,
        sentiment="joy",
    ),
    DemoEntry(
        title="Practice interview: clearer, not faster",
        body=(
            "Worked through a system design prompt and focused on explaining tradeoffs before jumping into a "
            "solution. I paused more often than usual, but the final explanation was much easier to follow. "
            "Next time I want to make the data model section just as deliberate."
        ),
        notebook="Career",
        days_ago=4,
        hour=18,
        minute=27,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Saturday trail reset",
        body=(
            "Took an easy morning walk and left my headphones at home. The slower pace helped me think through "
            "the demo narrative without forcing it. Came back with one useful idea: lead with the journaling "
            "moment, then reveal the intelligence around it."
        ),
        notebook="Fitness",
        days_ago=6,
        hour=10,
        minute=34,
        sentiment="joy",
        image_url="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=82",
        latitude=43.8260,
        longitude=-111.7897,
    ),
    DemoEntry(
        title="Weekly review: momentum over intensity",
        body=(
            "This week went best when I worked in consistent ninety-minute blocks instead of waiting for a long "
            "open afternoon. I finished the database cleanup, completed two interview exercises, and submitted "
            "the assignment a day early. The routine is ordinary, but it is working."
        ),
        notebook="Weekly Reflections",
        days_ago=8,
        hour=20,
        minute=5,
        sentiment="joy",
    ),
    DemoEntry(
        title="TypeScript generics clicked today",
        body=(
            "Revisited generic constraints while refining a reusable API response type. The useful mental model "
            "was to think of a constraint as the minimum promise a caller has to make. Once I framed it that way, "
            "the compiler messages were much easier to reason about."
        ),
        notebook="University",
        days_ago=10,
        hour=14,
        minute=12,
        sentiment="surprise",
    ),
    DemoEntry(
        title="Search ranking experiment",
        body=(
            "Compared a plain semantic search result with a version that also considers emotional similarity. "
            "The blended ranking surfaced entries that felt more relevant to reflective questions, while the "
            "plain version was better for exact project terms. I want to keep both signals and make the weighting "
            "depend on the query."
        ),
        notebook="Software Projects",
        days_ago=12,
        hour=21,
        minute=18,
        sentiment="neutral",
    ),
    DemoEntry(
        title="A manageable setback",
        body=(
            "Lost time to a dependency conflict and initially tried to fix too many things at once. After stepping "
            "away, I restored the smallest working state and changed one variable at a time. It cost an evening, "
            "but the recovery process was solid and I documented the cause for next time."
        ),
        notebook="Software Projects",
        days_ago=14,
        hour=22,
        minute=2,
        sentiment="anger",
    ),
    DemoEntry(
        title="Mock interview notes",
        body=(
            "The behavioral answers had good examples but needed tighter endings. I rewrote each one around the "
            "decision I made, the measurable result, and what I learned. The technical section felt steady, "
            "especially when discussing API boundaries and database ownership."
        ),
        notebook="Career",
        days_ago=16,
        hour=17,
        minute=46,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Assignment submitted ahead of schedule",
        body=(
            "Finished the architecture write-up and did one final pass for clarity before submitting it. I usually "
            "keep polishing until the deadline, so sending it early felt like a small but meaningful improvement."
        ),
        notebook="University",
        days_ago=18,
        hour=15,
        minute=30,
        sentiment="joy",
        image_url="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=82",
    ),
    DemoEntry(
        title="Getting consistent with morning workouts",
        body=(
            "Completed the third short workout this week. Keeping it to thirty minutes has made it much easier to "
            "start, and I have more energy during the first work block afterward. The goal for now is consistency, "
            "not adding more volume."
        ),
        notebook="Fitness",
        days_ago=20,
        hour=7,
        minute=18,
        sentiment="joy",
    ),
    DemoEntry(
        title="Sunday planning session",
        body=(
            "Mapped the coming week around fixed commitments and left two open blocks for whatever takes longer "
            "than expected. The main outcome I want is a complete demo draft, not a perfect recording. That makes "
            "the next step obvious: finish the outline before touching transitions."
        ),
        notebook="Weekly Reflections",
        days_ago=22,
        hour=18,
        minute=52,
        sentiment="neutral",
        image_url="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1400&q=82",
    ),
    DemoEntry(
        title="FastAPI dependency injection review",
        body=(
            "Built a small example to trace how a database session moves through a request. Seeing creation, use, "
            "and cleanup in one place made the pattern much less abstract. I also noted where authentication fits "
            "into the same dependency chain."
        ),
        notebook="University",
        days_ago=24,
        hour=13,
        minute=7,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Project milestone: voice entries feel real",
        body=(
            "Tested the full record, transcribe, review, and save flow with several short recordings. The latency is "
            "now predictable enough that the experience feels intentional. I still want a clearer message when the "
            "microphone permission is denied, but the core interaction is ready to show."
        ),
        notebook="Software Projects",
        days_ago=27,
        hour=20,
        minute=41,
        sentiment="joy",
    ),
    DemoEntry(
        title="Career fair follow-up plan",
        body=(
            "Organized notes from the conversations I had and drafted concise follow-ups for the three teams whose "
            "work matched my interests. I am going to reference one specific detail from each conversation instead "
            "of sending a generic message."
        ),
        notebook="Career",
        days_ago=29,
        hour=11,
        minute=23,
        sentiment="neutral",
    ),
    DemoEntry(
        title="A quieter, more productive day",
        body=(
            "Turned off nonessential notifications for the afternoon and finished the work I had been carrying "
            "between days. The biggest difference was not working faster; it was avoiding the repeated cost of "
            "restarting my attention."
        ),
        notebook="Personal Growth",
        days_ago=31,
        hour=19,
        minute=35,
        sentiment="joy",
    ),
    DemoEntry(
        title="Midpoint reflection",
        body=(
            "The month has been busier than expected, but the important projects are still moving. I am most proud "
            "of asking for feedback earlier instead of waiting until everything looked finished. That change has "
            "prevented several hours of rework."
        ),
        notebook="Weekly Reflections",
        days_ago=34,
        hour=20,
        minute=11,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Presentation nerves are useful information",
        body=(
            "Felt nervous during the first practice run and rushed through the technical architecture. On the second "
            "run I treated the nerves as a cue to slow down, pause between sections, and let the visuals do more of "
            "the explanation. The difference was immediate."
        ),
        notebook="Career",
        days_ago=36,
        hour=18,
        minute=4,
        sentiment="fear",
    ),
    DemoEntry(
        title="Database cleanup complete",
        body=(
            "Removed old test records, verified account ownership on every journal query, and documented the seed "
            "workflow. The database is small, but taking data boundaries seriously now will make future features "
            "much easier to add safely."
        ),
        notebook="Software Projects",
        days_ago=38,
        hour=16,
        minute=58,
        sentiment="joy",
    ),
    DemoEntry(
        title="Long run, steady pace",
        body=(
            "Kept an easy pace for the entire route and finished feeling like I could have continued. This was a "
            "better session than last week's faster start and difficult finish. Patience made the workout stronger."
        ),
        notebook="Fitness",
        days_ago=41,
        hour=9,
        minute=26,
        sentiment="joy",
        image_url="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=82",
        latitude=43.4917,
        longitude=-112.0339,
    ),
    DemoEntry(
        title="Choosing the next useful feature",
        body=(
            "Reviewed the backlog and resisted starting the most technically interesting idea. Better error states "
            "will improve every demo and every real session, so that is the next feature. The decision feels less "
            "exciting and more responsible."
        ),
        notebook="Personal Growth",
        days_ago=43,
        hour=21,
        minute=14,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Group project alignment",
        body=(
            "Met with the team to divide the remaining work by clear outcomes instead of vague sections. We agreed "
            "on interface boundaries and a short integration checkpoint. Everyone left knowing what done means, "
            "which reduced a lot of uncertainty."
        ),
        notebook="University",
        days_ago=46,
        hour=12,
        minute=39,
        sentiment="neutral",
        latitude=43.8260,
        longitude=-111.7897,
    ),
    DemoEntry(
        title="Protecting time for deep work",
        body=(
            "The calendar was fragmented today, so I moved one optional meeting and created a two-hour block for "
            "the project. That single decision was enough to finish a feature that had been open all week. I want "
            "to be more deliberate about protecting those blocks before the week fills up."
        ),
        notebook="Personal Growth",
        days_ago=49,
        hour=17,
        minute=22,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Week in review: useful progress",
        body=(
            "This week included one frustrating debugging session, two strong study blocks, and a much better demo "
            "outline. The pattern I want to carry forward is ending each day with a specific first task for tomorrow. "
            "It has made starting noticeably easier."
        ),
        notebook="Weekly Reflections",
        days_ago=52,
        hour=19,
        minute=48,
        sentiment="neutral",
    ),
    DemoEntry(
        title="Rebuilding confidence one task at a time",
        body=(
            "A few unfinished items were making the whole project feel behind. I chose the smallest one, completed "
            "it, and then worked through the next two without switching contexts. Nothing dramatic changed, but the "
            "project feels possible again."
        ),
        notebook="Personal Growth",
        days_ago=55,
        hour=20,
        minute=16,
        sentiment="sadness",
        latitude=42.8713,
        longitude=-112.4455,
    ),
)


def desired_timestamp(anchor: datetime, entry: DemoEntry) -> datetime:
    entry_day = anchor - timedelta(days=entry.days_ago)
    desired = entry_day.replace(hour=entry.hour, minute=entry.minute, second=0, microsecond=0)
    if entry.days_ago == 0 and desired > anchor:
        return (anchor - timedelta(minutes=30)).replace(second=0, microsecond=0)
    return desired


def seed_showcase_data(email: str) -> dict[str, int]:
    environment = os.getenv("KAIRO_ENV", "development").strip().lower()
    if environment in {"production", "prod"}:
        raise RuntimeError("Showcase seeding is disabled when KAIRO_ENV is production.")

    if engine.url.get_backend_name() != "sqlite":
        raise RuntimeError("Showcase seeding is limited to the local SQLite database.")

    session = SessionLocal()
    counts = {
        "notebooks_created": 0,
        "notebooks_updated": 0,
        "notebooks_skipped": 0,
        "entries_created": 0,
        "entries_updated": 0,
        "entries_skipped": 0,
    }

    try:
        user = session.query(models.User).filter(models.User.email == email).one_or_none()
        if user is None:
            raise RuntimeError(
                f"No existing account was found for {email}. Create or sign in to that account first."
            )

        anchor = datetime.now().replace(microsecond=0)
        demo_texts_by_notebook = {
            title: {entry.text_content for entry in ENTRIES if entry.notebook == title}
            for title in NOTEBOOKS
        }
        notebooks_by_title: dict[str, models.Notebook] = {}
        for title in NOTEBOOKS:
            notebook = (
                session.query(models.Notebook)
                .filter(models.Notebook.user_id == user.id, models.Notebook.title == title)
                .one_or_none()
            )
            if notebook is None:
                notebook = models.Notebook(
                    user_id=user.id,
                    title=title,
                    created_at=(anchor - timedelta(days=NOTEBOOK_DAYS_AGO[title])).replace(
                        hour=9, minute=0, second=0, microsecond=0
                    ),
                )
                session.add(notebook)
                session.flush()
                counts["notebooks_created"] += 1
            else:
                existing_texts = {entry.text_content for entry in notebook.entries}
                is_seeded_notebook = bool(existing_texts) and existing_texts.issubset(
                    demo_texts_by_notebook[title]
                )
                desired_created_at = (
                    anchor - timedelta(days=NOTEBOOK_DAYS_AGO[title])
                ).replace(hour=9, minute=0, second=0, microsecond=0)
                if is_seeded_notebook and notebook.created_at != desired_created_at:
                    notebook.created_at = desired_created_at
                    counts["notebooks_updated"] += 1
                else:
                    counts["notebooks_skipped"] += 1
            notebooks_by_title[title] = notebook

        for demo_entry in ENTRIES:
            entry = (
                session.query(models.JournalEntry)
                .filter(
                    models.JournalEntry.user_id == user.id,
                    models.JournalEntry.text_content == demo_entry.text_content,
                )
                .one_or_none()
            )

            timestamp = desired_timestamp(anchor, demo_entry)
            notebook_id = notebooks_by_title[demo_entry.notebook].id
            latitude = str(demo_entry.latitude) if demo_entry.latitude is not None else None
            longitude = str(demo_entry.longitude) if demo_entry.longitude is not None else None

            if entry is None:
                session.add(
                    models.JournalEntry(
                        user_id=user.id,
                        text_content=demo_entry.text_content,
                        notebook_id=notebook_id,
                        sentiment=demo_entry.sentiment,
                        image_url=demo_entry.image_url,
                        latitude=latitude,
                        longitude=longitude,
                        created_at=timestamp,
                    )
                )
                counts["entries_created"] += 1
                continue

            desired_values = {
                "notebook_id": notebook_id,
                "sentiment": demo_entry.sentiment,
                "image_url": demo_entry.image_url,
                "latitude": latitude,
                "longitude": longitude,
                "created_at": timestamp,
            }
            changed = False
            for field, value in desired_values.items():
                if getattr(entry, field) != value:
                    setattr(entry, field, value)
                    changed = True

            if changed:
                counts["entries_updated"] += 1
            else:
                counts["entries_skipped"] += 1

        session.commit()
        counts["user_id"] = user.id
        return counts
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Populate an existing Kairo account with safe, repeatable showcase content."
    )
    parser.add_argument("--email", required=True, help="Email address of the existing showcase account.")
    args = parser.parse_args()

    counts = seed_showcase_data(args.email.strip().lower())
    print(f"Showcase data ready for user ID {counts['user_id']}.")
    print(
        "Notebooks: "
        f"{counts['notebooks_created']} created, "
        f"{counts['notebooks_updated']} refreshed, "
        f"{counts['notebooks_skipped']} reused."
    )
    print(
        "Entries: "
        f"{counts['entries_created']} created, "
        f"{counts['entries_updated']} refreshed, "
        f"{counts['entries_skipped']} unchanged."
    )


if __name__ == "__main__":
    main()
