
# ![(Acheron icon)](assets/icons/64x64.png "Acheron icon")Acheron

## About

Electron-based recreation of https://github.com/mmower/elysium, a probabilistic generative MIDI sequencer based on the [harmonic table](https://en.wikipedia.org/wiki/Harmonic_table_note_layout) note layout.

Built with https://github.com/electron-react-boilerplate/electron-react-boilerplate

Demo video by [hellvalleyskytrees](https://twitter.com/hvst_music) here: https://youtu.be/5q-6x3Tcj-4

Documentation is here: https://github.com/whisperdoll/acheron/wiki/Acheron-Documentation

## Setup

Download the latest Acheron release here: https://github.com/whisperdoll/acheron/releases

The current version as of this writing is 1.1.5

Extract the zip file and run Acheron.exe.

Please note that Acheron is a MIDI sequencer, and as such produces no sound on its own.

You'll need a Digital Audio Workstation (or other VST host/MIDI receiving application) and MIDI loopback driver (such as [loopmidi](https://www.tobias-erichsen.de/software/loopmidi.html)), or a MIDI interface and a physical MIDI device.

- If you aren't using a physical MIDI device, you should first install [loopmidi](https://www.tobias-erichsen.de/software/loopmidi.html) and use it to create a virtual midi port, then select that port as an output in Acheron's settings (and as an input in your DAW if applicable).
- An easy way to play and record MIDI from Acheron is to use [onlinesequencer.net](https://onlinesequencer.net/) in your web browser, which requires no setup beyond installing loopmidi, provides many instruments, has a fairly simple UI, and has the ability to export recorded tracks as MIDI or WAV.

## Troubleshooting

>I don't have any tokens to work with.

If you don't see all of the tokens in the Add Token menu, please click on Manage Tokens in the bar at the bottom of the window and make sure that the token search paths include /tokens/ in the root of the current Acheron version's folder, and that all of the tokens are enabled.

>I have another issue!

Contact me through the issues section of Github or however else you know how to contact me and I'll help.
## Known Issues

Deleting layers currently crashes Acheron.

If gate values are changed while a composition is running, these changes won't be applied until you stop and restart the player.

## Development

`yarn start` will start the app in the `dev` environment.

Custom tokens can be created and distributed without setting up a development environment.
See the [Custom Token Documentation](https://github.com/whisperdoll/acheron/wiki/Custom-Token-Documentation) for more information.

## Credits

* [Matt Mower](https://github.com/mmower) for creating the [original incarnation of this app](https://github.com/mmower/elysium).
* [hellvalleyskytrees](https://twitter.com/hvst_music) for the app icon, testing, demoing, randomize, twist, and lifespan tokens, documentation, and general consultation+encouragement.
    * She's released six albums of music using this sequencer!
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-4
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-5
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-6
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-7
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-8
        * https://hellvalleyskytrees.bandcamp.com/album/voidscapes-vol-9
## License

MIT - see LICENSE file.
