# Changelog

## [0.1.5](https://github.com/body-clock/milkcrate/compare/v0.1.4...v0.1.5) (2026-06-22)


### Bug Fixes

* **ci:** trigger deploy from release-please step output instead of PAT ([d63fe95](https://github.com/body-clock/milkcrate/commit/d63fe9516e678903d1b525009479eb1e8f7dc0d1))
* **ci:** use PAT for release-please to trigger downstream workflows ([0567704](https://github.com/body-clock/milkcrate/commit/056770476fd86c136f1bc2711cfad57ce24d647d))

## [0.1.4](https://github.com/body-clock/milkcrate/compare/v0.1.3...v0.1.4) (2026-06-22)


### Bug Fixes

* bump nokogiri to 1.19.4 for CVE patches ([c710797](https://github.com/body-clock/milkcrate/commit/c710797d6d9df2c34e42e95c93d2abfc9e20c7ce))
* cache AppVersion.display to avoid Dir.chdir conflicts ([3102d53](https://github.com/body-clock/milkcrate/commit/3102d53e22f191fb897b02b249bb9571cd21432a))
* **ci:** remove invalid default-branch parameter from release-please workflow ([1b177aa](https://github.com/body-clock/milkcrate/commit/1b177aa7573ca915cb8e2807f414671c7a5822b2))
* **ci:** set default-branch: main for release-please ([11ebd9d](https://github.com/body-clock/milkcrate/commit/11ebd9d383e5c65abd279ceba166b666dd617b05))
* nullify click_events before deleting stale listings ([0f620cd](https://github.com/body-clock/milkcrate/commit/0f620cdf32bafd698ac92160350ca0ab053dce30))
* **release:** add version marker and sync VERSION to 0.1.3 ([fae1132](https://github.com/body-clock/milkcrate/commit/fae1132c81cc192a92f8648a20659f8e2ada11c4))
* **release:** sync manifest to 0.1.3 and add version markers ([e4a47ea](https://github.com/body-clock/milkcrate/commit/e4a47eada0dca1b0bc7d06c0ad47c6f86a77ed36))
* **release:** use block markers for VERSION to keep AppVersion parsing clean ([dcedb80](https://github.com/body-clock/milkcrate/commit/dcedb804185c0c70ab87230bfc82c9be79418327))
* resolve 5 Honeybadger production errors ([f5837d8](https://github.com/body-clock/milkcrate/commit/f5837d8c839dd31c46a9df21bc83c5dd36300d54))
* retry Discogs API network errors (timeout/connection) ([1b1ad6d](https://github.com/body-clock/milkcrate/commit/1b1ad6d468af048263497bc18ddb8bf1af101443))


### Miscellaneous

* **deps:** bump faraday from 2.14.2 to 2.14.3 ([20c0fcb](https://github.com/body-clock/milkcrate/commit/20c0fcbfac7bc100e61d30b196213ba82ea32735))
* **deps:** bump googleapis/release-please-action from 4 to 5 ([296c2c4](https://github.com/body-clock/milkcrate/commit/296c2c406b0699110c00a3bad49c40aa52a638b5))
* **deps:** bump kamal from 2.11.0 to 2.12.0 ([2fb364f](https://github.com/body-clock/milkcrate/commit/2fb364f1e73b70fb7b6eb96e96830e78e1cd7c6b))
* **deps:** bump oauth from 1.1.6 to 1.1.7 ([23aeb96](https://github.com/body-clock/milkcrate/commit/23aeb96684e4b5ce00857391e64dd76fe7074c01))
* **deps:** bump pnpm/action-setup from 4 to 6 ([ccac678](https://github.com/body-clock/milkcrate/commit/ccac6785a0dd9ff16a93c3858604d3bb6471f2f5))
* **deps:** bump rubyzip from 3.3.1 to 3.4.0 ([584726e](https://github.com/body-clock/milkcrate/commit/584726ebfe715258a5b4d0dcd75a218fd25e185a))
* **deps:** bump tailwindcss-rails from 4.4.0 to 4.6.0 ([995ddc2](https://github.com/body-clock/milkcrate/commit/995ddc237b93bc8512de6a297b890300dfee3856))
* **development:** release 0.1.4 ([#276](https://github.com/body-clock/milkcrate/issues/276)) ([9a8475f](https://github.com/body-clock/milkcrate/commit/9a8475f97dc70b101c980991eefc6ecae15f2736))

## [0.1.3](https://github.com/body-clock/milkcrate/compare/v0.1.2...v0.1.3) (2026-06-17)


### Features

* **explore:** Add horizontal scroll rail of curated records ([#271](https://github.com/body-clock/milkcrate/issues/271)) ([801f76a](https://github.com/body-clock/milkcrate/commit/801f76a96fba1cde3286b75b47d6c5c39fc3f932))


### Bug Fixes

* **ci:** reorder pnpm setup after node setup to fix cache path error ([4366b1f](https://github.com/body-clock/milkcrate/commit/4366b1fbab9ffb367a1502ec76bf6f8c274b2c9a))

## [0.1.2](https://github.com/body-clock/milkcrate/compare/v0.1.1...v0.1.2) (2026-06-17)


### Bug Fixes

* add VERSION to release-please extra-files ([6351524](https://github.com/body-clock/milkcrate/commit/63515249c79da7bbc2765381b1661b51359b9c28))
* add workflow_dispatch to deploy for manual triggers ([f9076f5](https://github.com/body-clock/milkcrate/commit/f9076f5ba14673bc3f4e5a008d679d032ad64817))
* add workflow_dispatch to deploy for manual triggers ([6c52dd2](https://github.com/body-clock/milkcrate/commit/6c52dd23dfa0d155cb16693b605407fbb9af96b6))
* configure release-please to target main branch ([dfcb9b9](https://github.com/body-clock/milkcrate/commit/dfcb9b98f811c6104d2639d109db7a525d6f04fc))
* deploy on release publish ([#267](https://github.com/body-clock/milkcrate/issues/267)) ([198c63e](https://github.com/body-clock/milkcrate/commit/198c63e5d8c97562aa32c13ea529ae0de33f5e6e))
* deploy only on release, not on push to main ([db906a4](https://github.com/body-clock/milkcrate/commit/db906a43738588c0b016f0d71c2b375c919bf804))
* trigger deploy on release publish for release-please ([d5200f9](https://github.com/body-clock/milkcrate/commit/d5200f98c3c79100144c57edc104444a684e158e))


### Miscellaneous

* clean up .env.example and README ([6ceba03](https://github.com/body-clock/milkcrate/commit/6ceba0301c3a4ff531c802654d8dbcc64fd7d8fe))
* clean up repo clutter, gitignore AI context files ([33a811c](https://github.com/body-clock/milkcrate/commit/33a811cff9884c756fa84f79e9c0bfa26eca40ba))
* consolidate version management into .mise.toml ([ba4c2e5](https://github.com/body-clock/milkcrate/commit/ba4c2e520900b13f7f8a6eeaafd3f55052f3e666))
* pin pnpm version in package.json ([5eb5e09](https://github.com/body-clock/milkcrate/commit/5eb5e09e4fd06ea774c7f916941eda4961fe8193))
* remove unused oxfmt and Kamal sample hooks ([721e7a9](https://github.com/body-clock/milkcrate/commit/721e7a9bf0226a1bdc26f31e60f3bf4519130c00))
* switch from npm to pnpm ([c9f08dc](https://github.com/body-clock/milkcrate/commit/c9f08dc42d800003a774befb98bf4e350ac9efce))
* update VERSION to 0.1.1 ([f47d202](https://github.com/body-clock/milkcrate/commit/f47d202adc7cc03678b5a929d67a2828af02a944))
* use .tool-versions as single source for tool versions ([85bd2fb](https://github.com/body-clock/milkcrate/commit/85bd2fb48e189f292edfadb81f2569b5ca8ee5a3))

## 0.1.0 (2026-06-14)


### Features

* add semantic versioning with ViteRuby digest in footer ([7b6c6d0](https://github.com/body-clock/milkcrate/commit/7b6c6d0))
