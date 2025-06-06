# Changelog

All notable changes to **Pipecat Client React Native** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.5] - 2025-05-08

### Added

- Updated to the latest version of `@pipecat-ai/client-js` (0.3.5).
  - See the recent improvements [here](https://github.com/pipecat-ai/pipecat-client-web/blob/main/CHANGELOG.md#035---2025-03-20).

### Fixed

- Fixed an issue where joining would fail if the `token` was `null`.

## [0.3.2] - 2025-03-14

### Added

- Screen media sharing methods implemented:
  - Added `startScreenShare` and `stopScreenShare` methods to `RTVIClient` and `Transport`.
  - Added `isSharingScreen` getter to `RTVIClient` and `Transport`.

### Fixed

- Fixed issue that was not triggering `onSpeakerUpdated`.

### Changes

- `baseUrl` and `endpoints` are now optional parameters in the `RTVIClient` constructor (`RTVIClientParams`), allowing developers to connect directly to a transport without requiring a handshake auth bundle.
  - Note: Most transport services require an API key for secure operation, and setting these keys dangerously on the client is not recommended for production. This change intends to simplify testing and local development where running a server-side connect method can be cumbersome.


