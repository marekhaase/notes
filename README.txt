NOTES (web version)
===================

HOW TO RUN
----------
Just double-click index.html - it opens in your default browser.
No installation, no Python, no server.

It works exactly like the previous desktop app:
- Categories (subjects) - add, delete, filter
- Date and period for every note, double lessons
- Weekly schedule - set once which subject you have and when
- Period times - the app uses the real current time to tell which
  period is running and pre-fills the right subject when you
  click "+ New"
- Day schedule - overview of notes by period for a chosen day
- Bold and italic formatting (select text and click, or Ctrl+B/I)
- Trash - deleted notes can be restored for 7 days
- Sharing - export the open note as a .txt file
- Text zoom - Ctrl+mouse wheel, Ctrl+/Ctrl-, Ctrl+0 to reset
- Light / dark mode button in the top bar

KEYBOARD SHORTCUTS
------------------
Ctrl+N   new note
Ctrl+F   focus the search field
Ctrl+B   bold (inside the note text)
Ctrl+I   italic (inside the note text)
Ctrl+D   toggle "Double lesson"
Ctrl+R   open the day schedule

DATA
----
Everything is saved to localStorage in your browser (on this
computer, in this browser). Nothing is sent over the network.

Note: localStorage belongs to one specific browser. If you open
the app once in Firefox and once in Chrome, you will see two
different sets of data. Stick to one browser, or set Notes as the
default app for index.html.

The app can't export a one-click backup of your data yet - if that
would be useful, just ask.
