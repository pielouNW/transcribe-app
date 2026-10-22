![NobodyWho](./transcriber-mobile-app.png)

[![Discord](https://img.shields.io/discord/1308812521456799765?logo=discord&style=flat-square)](https://discord.gg/qhaMc2qCYB)
[![Matrix](https://img.shields.io/badge/Matrix-000?logo=matrix&logoColor=fff)](https://matrix.to/#/#nobodywho:matrix.org)
[![Mastodon](https://img.shields.io/badge/Mastodon-6364FF?logo=mastodon&logoColor=fff&style=flat-square)](https://mastodon.gamedev.place/@nobodywho)
[![Docs](https://img.shields.io/badge/Docs-lightblue?style=flat-square)](https://docs.nobodywho.ooo)

# Transcriber app

Demonstrates the capabilities of **[NobodyWho](https://github.com/nobodywho-ooo/nobodywho)**, a library designed to run LLMs locally and efficiently on any device.

With this app, you can do transcription locally, offline and for free, thanks to Whisper Speech-to-Text model. Get the .apk to try it in the [release section](https://github.com/pielouNW/transcribe-app/releases).

### Install and Start Metro

First, you will need to run install dependencies:

```sh
npm install
```

To start the Metro dev server, run the following command :

```sh
npm start
```

### Build and run your app

**Android**

```sh
npm run android
```

**iOS**

Install CocoaPods dependencies:

```sh
cd ios && pod install
```

Run in simulator with:

```sh
npm run ios
```

You can also build it directly from Android Studio or Xcode.
