# Background music for the reels

Put 10–20 **royalty-free** tracks here (mp3, m4a, aac, wav or ogg). Good free sources:
YouTube Studio → Audio Library, Pixabay Music, Uppbeat.
Don't use film songs or other copyrighted music: YouTube gives a copyright claim and Instagram mutes the reel.

- Name a track `diwali-…` or `festive-…` and it plays twice as often during the festive season.
- Every day the order shifts, so the first reels get a different track each day.
- No tracks here → the videos are silent (as before).

On GitHub (phone or computer): open this folder → Add file → Upload files → Commit.

## AI music (Lyria)

GitHub → Actions → **Reel Music** → Run workflow → **starter** makes 30 tracks with Google's Lyria 3
(10 festive, 10 Telugu folk / mass beat, 10 upbeat, about $1.20 in all) and saves them here as `<style>-ai-<date>-<nn>.mp3`.
Every Sunday 7 AM it adds 5 more (about $0.20); only the newest 40 AI tracks are kept. Each new track is also sent
to the Telegram bot so you can listen; tap "🗑 Remove this track" under any you don't like (gone within ~15 minutes), or delete it from this folder. Needs the `GEMINI_API_KEY` secret.
