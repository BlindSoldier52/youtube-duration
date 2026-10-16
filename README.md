# YouTube Duration

A small Chrome extension that puts the length of each YouTube video right under its title, as plain text.

YouTube shows the duration as a badge on the thumbnail, and that badge is easy to miss. Screen readers often skip it entirely. This extension adds a line like `Duration: 12:34` below the title, so you see or hear it together with the rest of the video's info.

It works on:

- the video page itself
- search results
- the home page
- recommendations next to a video
- subscriptions and playlists

Live streams show `Duration: Live`.

## Installing

The extension isn't on the Chrome Web Store, so you load it by hand. It takes a minute.

1. Download this repository. Click the green **Code** button, then **Download ZIP**, and unzip it somewhere you'll keep it.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** and pick the folder you unzipped.
5. Open YouTube, or reload it if it was already open.

Don't delete or move the folder afterwards. Chrome loads the extension from there.

## Updating

Download the new version and replace the files in the same folder. Then go to `chrome://extensions` and click the reload arrow on the YouTube Duration card. Reloading the YouTube tab alone isn't enough.

## How it works

The extension only runs on youtube.com and does nothing on other sites.

For each video you can see on the screen, it first reads the time badge YouTube already shows on the thumbnail. If there's no badge after a few seconds, it asks YouTube for the video's length directly. It only does this for videos currently on screen, with at most two requests at a time, so it doesn't slow the page down.

It doesn't collect anything and talks to no server other than YouTube.

## Problems

YouTube changes its layout often, and when it does the duration may stop showing up in some places. If that happens, please open an issue and say which page you were on.

## License

MIT. See [LICENSE](LICENSE).
